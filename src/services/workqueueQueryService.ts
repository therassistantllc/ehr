import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import { classifyChargeCaptureTab, type ChargeBlocker, type ChargeCaptureTab, type ServiceLineInput } from "./chargeCaptureService";

export type WorkqueueStatus = "open" | "in_progress" | "blocked" | "resolved" | "closed" | "all";
export type WorkqueueDashboardDomain = "eligibility" | "charge_capture" | "claims" | "claim_batches" | "other";

export type WorkqueueQueryFilters = {
  status?: WorkqueueStatus;
  workType?: string;
  sourceObjectType?: string;
  sourceObjectId?: string;
  priority?: string;
  assignedToUserId?: string;
  limit?: number;
};

export type ChargeDashboardFilters = {
  tab?: ChargeCaptureTab;
  status?: string;
  clientId?: string;
  providerId?: string;
  dosFrom?: string;
  dosTo?: string;
  limit?: number;
};

export type ClaimDashboardFilters = {
  status?: string;
  clientId?: string;
  payerProfileId?: string;
  batchId?: string;
  limit?: number;
};

export type WorkqueueDashboardItem = {
  id: string;
  domain: WorkqueueDashboardDomain;
  workType: string;
  status: string;
  priority: string;
  title: string;
  description: string | null;
  sourceObjectType: string;
  sourceObjectId: string;
  assignedToUserId: string | null;
  dueAt: string | null;
  createdAt: string | null;
  context: Record<string, unknown>;
};

export type ChargeDashboardRow = {
  id: string;
  tab: ChargeCaptureTab;
  status: string;
  dateOfService: string | null;
  clientId: string | null;
  providerId: string | null;
  appointmentId: string | null;
  cptCode: string | null;
  diagnosisCodes: string[];
  totalCharge: number;
  blockers: string[];
  actionNeeded: string;
};

export type ClaimDashboardRow = {
  id: string;
  status: string;
  clientId: string | null;
  payerProfileId: string | null;
  renderingProviderId: string | null;
  totalCharge: number;
  patientResponsibility: number;
  payerResponsibility: number;
  serviceDate: string | null;
  currentBatchId: string | null;
  actionNeeded: string;
};

export type WorkqueueSummary = {
  totalOpen: number;
  byPriority: Record<string, number>;
  byWorkType: Record<string, number>;
};

export type RcmDashboardSnapshot = {
  workqueueSummary: WorkqueueSummary;
  workqueueItems: WorkqueueDashboardItem[];
  charges: ChargeDashboardRow[];
  claims: ClaimDashboardRow[];
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function money(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.round((numeric + Number.EPSILON) * 100) / 100 : 0;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function serviceLines(value: unknown): ServiceLineInput[] {
  return Array.isArray(value) ? value as ServiceLineInput[] : [];
}

function blockerMessages(value: unknown): ChargeBlocker[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === "object") as ChargeBlocker[];
}

function domainFor(sourceObjectType: string, workType: string): WorkqueueDashboardDomain {
  const type = sourceObjectType.toLowerCase();
  const work = workType.toLowerCase();
  if (type.includes("eligibility") || work.includes("eligibility") || work.includes("authorization")) return "eligibility";
  if (type === "charge" || work.includes("charge") || work.includes("coding") || work.includes("documentation")) return "charge_capture";
  if (type.includes("claim") && !type.includes("batch")) return "claims";
  if (type.includes("batch")) return "claim_batches";
  return "other";
}

function chargeAction(tab: ChargeCaptureTab): string {
  if (tab === "ready_for_review") return "Review and approve";
  if (tab === "documentation_missing") return "Get signed note";
  if (tab === "coding_mismatch") return "Fix coding";
  if (tab === "eligibility_auth_issue") return "Verify eligibility or authorization";
  if (tab === "held_charges") return "Resolve hold";
  return "No charge-capture action needed";
}

function claimAction(status: string): string {
  if (status === "validation_failed") return "Fix claim validation errors";
  if (status === "ready_for_batch") return "Add to batch";
  if (status === "batched") return "Submit batch";
  if (status === "submitted") return "Track payer response";
  if (status === "rejected") return "Correct and resubmit";
  if (status === "paid") return "No claim action needed";
  return "Validate claim";
}

export class WorkqueueQueryService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async listWorkqueueItems(filters: WorkqueueQueryFilters = {}): Promise<WorkqueueDashboardItem[]> {
    let query = this.db
      .from("workqueue_items")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .is("archived_at", null)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.workType) query = query.eq("work_type", filters.workType);
    if (filters.sourceObjectType) query = query.eq("source_object_type", filters.sourceObjectType);
    if (filters.sourceObjectId) query = query.eq("source_object_id", filters.sourceObjectId);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.assignedToUserId) query = query.eq("assigned_to_user_id", filters.assignedToUserId);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load workqueue items.", error);
    return ((data ?? []) as TherassistantRecord[]).map((row) => this.toWorkqueueItem(row));
  }

  async summarizeOpenWorkqueues(): Promise<WorkqueueSummary> {
    const items = await this.listWorkqueueItems({ status: "open", limit: 500 });
    return items.reduce<WorkqueueSummary>((summary, item) => {
      summary.totalOpen += 1;
      summary.byPriority[item.priority] = (summary.byPriority[item.priority] ?? 0) + 1;
      summary.byWorkType[item.workType] = (summary.byWorkType[item.workType] ?? 0) + 1;
      return summary;
    }, { totalOpen: 0, byPriority: {}, byWorkType: {} });
  }

  async listChargeDashboardRows(filters: ChargeDashboardFilters = {}): Promise<ChargeDashboardRow[]> {
    let query = this.db
      .from("charges")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .is("archived_at", null)
      .order("service_date", { ascending: true });

    if (filters.status) query = query.eq("charge_status", filters.status);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.providerId) query = query.eq("provider_id", filters.providerId);
    if (filters.dosFrom) query = query.gte("service_date", filters.dosFrom);
    if (filters.dosTo) query = query.lte("service_date", filters.dosTo);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load charge dashboard rows.", error);
    const rows = ((data ?? []) as TherassistantRecord[]).map((row) => this.toChargeRow(row));
    return filters.tab ? rows.filter((row) => row.tab === filters.tab) : rows;
  }

  async listClaimDashboardRows(filters: ClaimDashboardFilters = {}): Promise<ClaimDashboardRow[]> {
    let query = this.db
      .from("claims")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .is("archived_at", null)
      .order("service_date", { ascending: true });

    if (filters.status) query = query.eq("claim_status", filters.status);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.payerProfileId) query = query.eq("payer_profile_id", filters.payerProfileId);
    if (filters.batchId) query = query.eq("current_batch_id", filters.batchId);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load claim dashboard rows.", error);
    return ((data ?? []) as TherassistantRecord[]).map((row) => this.toClaimRow(row));
  }

  async getDashboardSnapshot(options: { workqueueLimit?: number; chargeLimit?: number; claimLimit?: number } = {}): Promise<RcmDashboardSnapshot> {
    const [workqueueSummary, workqueueItems, charges, claims] = await Promise.all([
      this.summarizeOpenWorkqueues(),
      this.listWorkqueueItems({ status: "open", limit: options.workqueueLimit ?? 50 }),
      this.listChargeDashboardRows({ limit: options.chargeLimit ?? 100 }),
      this.listClaimDashboardRows({ limit: options.claimLimit ?? 100 }),
    ]);
    return { workqueueSummary, workqueueItems, charges, claims };
  }

  async resolveWorkqueueItem(workqueueItemId: string, note?: string): Promise<TherassistantRecord> {
    assertUuid(workqueueItemId, "workqueueItemId");
    return this.updateOne("workqueue_items", workqueueItemId, {
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: this.actorUserId(),
      context_payload: { resolutionNote: note ?? null },
    });
  }

  private toWorkqueueItem(row: TherassistantRecord): WorkqueueDashboardItem {
    const sourceObjectType = String(row.source_object_type ?? "");
    const workType = String(row.work_type ?? "");
    return {
      id: row.id,
      domain: domainFor(sourceObjectType, workType),
      workType,
      status: String(row.status ?? "open"),
      priority: String(row.priority ?? "normal"),
      title: String(row.title ?? workType),
      description: asString(row.description),
      sourceObjectType,
      sourceObjectId: String(row.source_object_id ?? ""),
      assignedToUserId: asString(row.assigned_to_user_id),
      dueAt: asString(row.due_at),
      createdAt: asString(row.created_at),
      context: objectValue(row.context_payload),
    };
  }

  private toChargeRow(row: TherassistantRecord): ChargeDashboardRow {
    const lines = serviceLines(row.service_lines);
    const firstLine = lines[0];
    const parsedBlockers = blockerMessages(row.blocker_reasons);
    const tab = classifyChargeCaptureTab({
      chargeStatus: String(row.charge_status ?? ""),
      blockers: parsedBlockers,
      noteSigned: Boolean(row.note_signed),
      billingFieldsComplete: Boolean(row.billing_fields_complete),
    });
    return {
      id: row.id,
      tab,
      status: String(row.charge_status ?? ""),
      dateOfService: asString(row.service_date),
      clientId: asString(row.client_id),
      providerId: asString(row.provider_id),
      appointmentId: asString(row.appointment_id),
      cptCode: firstLine?.procedureCode ?? null,
      diagnosisCodes: arrayOfStrings(row.diagnosis_codes),
      totalCharge: money(row.total_charge),
      blockers: parsedBlockers.map((blocker) => blocker.message),
      actionNeeded: chargeAction(tab),
    };
  }

  private toClaimRow(row: TherassistantRecord): ClaimDashboardRow {
    const status = String(row.claim_status ?? "draft");
    return {
      id: row.id,
      status,
      clientId: asString(row.client_id ?? row.patient_id),
      payerProfileId: asString(row.payer_profile_id),
      renderingProviderId: asString(row.rendering_provider_id),
      totalCharge: money(row.total_charge),
      patientResponsibility: money(row.patient_responsibility_amount),
      payerResponsibility: money(row.payer_responsibility_amount),
      serviceDate: asString(row.service_date),
      currentBatchId: asString(row.current_batch_id),
      actionNeeded: claimAction(status),
    };
  }
}

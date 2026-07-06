import type {
  ChargeDashboardRow,
  ClaimDashboardRow,
  RcmDashboardSnapshot,
  WorkqueueDashboardItem,
  WorkqueueSummary,
} from "../services/workqueueQueryService";
import { mockDashboardSnapshot } from "./mockDashboardData";
import {
  createBrowserSupabaseClient,
  createServiceContext,
  missingRequiredBrowserConfigKeys,
  type TenantScopedRuntimeOptions,
} from "./runtime";

export type DashboardDataMode = "supabase" | "mock";

export type DashboardLoadOptions = TenantScopedRuntimeOptions;

export type LoadedDashboardData = {
  snapshot: RcmDashboardSnapshot;
  mode: DashboardDataMode;
  message: string;
};

type DbRow = Record<string, unknown> & { id: string };

type ServiceLineRow = {
  procedureCode?: string;
  procedure_code?: string;
  chargeAmount?: number;
  charge_amount?: number;
  units?: number;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function money(value: unknown): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.round((numeric + Number.EPSILON) * 100) / 100 : 0;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)).filter(Boolean) : [];
}

function serviceLines(value: unknown): ServiceLineRow[] {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") as ServiceLineRow[] : [];
}

function dashboardDomain(sourceType: string, workType: string): WorkqueueDashboardItem["domain"] {
  const source = sourceType.toLowerCase();
  const work = workType.toLowerCase();
  if (source.includes("eligibility") || work.includes("eligibility") || work.includes("auth")) return "eligibility";
  if (source.includes("charge") || work.includes("charge") || work.includes("coding") || work.includes("documentation")) return "charge_capture";
  if (source.includes("claim") && !source.includes("batch")) return "claims";
  if (source.includes("batch")) return "claim_batches";
  return "other";
}

function chargeAction(status: string): string {
  if (status === "blocked" || status === "hold" || status === "held") return "Resolve charge blocker";
  if (status === "captured" || status === "draft") return "Validate charge";
  if (status === "ready_for_claim") return "Create claim";
  if (status === "claimed" || status === "released") return "No charge-capture action needed";
  return "Review charge";
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

function chargeTab(status: string): ChargeDashboardRow["tab"] {
  if (["blocked", "hold", "held", "void", "voided"].includes(status)) return "held_charges";
  if (status === "ready_for_claim") return "ready_for_review";
  if (["claimed", "released", "batched", "downloaded", "submitted"].includes(status)) return "released_to_claims";
  return "documentation_missing";
}

function toWorkqueueItem(row: DbRow): WorkqueueDashboardItem {
  const workType = String(row.work_type ?? row.title ?? "workqueue");
  const sourceObjectType = String(row.source_object_type ?? "");
  return {
    id: row.id,
    domain: dashboardDomain(sourceObjectType, workType),
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

function toChargeRow(row: DbRow): ChargeDashboardRow {
  const lines = serviceLines(row.service_lines);
  const firstLine = lines[0];
  const status = String(row.charge_status ?? "captured");
  return {
    id: row.id,
    tab: chargeTab(status),
    status,
    dateOfService: asString(row.service_date),
    clientId: asString(row.client_id),
    providerId: asString(row.provider_id ?? row.rendering_provider_id),
    appointmentId: asString(row.appointment_id),
    cptCode: asString(firstLine?.procedureCode ?? firstLine?.procedure_code),
    diagnosisCodes: arrayOfStrings(row.diagnosis_codes),
    totalCharge: money(row.total_charge),
    blockers: arrayOfStrings(row.blocker_reasons),
    actionNeeded: chargeAction(status),
  };
}

function toClaimRow(row: DbRow): ClaimDashboardRow {
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

function summarizeWorkqueues(items: WorkqueueDashboardItem[]): WorkqueueSummary {
  return items.reduce<WorkqueueSummary>((summary, item) => {
    summary.totalOpen += 1;
    summary.byPriority[item.priority] = (summary.byPriority[item.priority] ?? 0) + 1;
    summary.byWorkType[item.workType] = (summary.byWorkType[item.workType] ?? 0) + 1;
    return summary;
  }, { totalOpen: 0, byPriority: {}, byWorkType: {} });
}

async function loadLiveDashboardSnapshot(options: DashboardLoadOptions = {}): Promise<RcmDashboardSnapshot> {
  const db = createBrowserSupabaseClient();
  const context = createServiceContext(options);

  const [workqueuesResult, chargesResult, claimsResult] = await Promise.all([
    db.from("workqueue_items").select("*").eq("tenant_id", context.tenantId).eq("status", "open").is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(50),
    db.from("charges").select("*").eq("tenant_id", context.tenantId).is("archived_at", null).order("service_date", { ascending: true }).limit(100),
    db.from("claims").select("*").eq("tenant_id", context.tenantId).is("archived_at", null).order("service_date", { ascending: true }).limit(100),
  ]);

  const firstError = workqueuesResult.error ?? chargesResult.error ?? claimsResult.error;
  if (firstError) throw firstError;

  const workqueueItems = ((workqueuesResult.data ?? []) as DbRow[]).map(toWorkqueueItem);

  return {
    workqueueSummary: summarizeWorkqueues(workqueueItems),
    workqueueItems,
    charges: ((chargesResult.data ?? []) as DbRow[]).map(toChargeRow),
    claims: ((claimsResult.data ?? []) as DbRow[]).map(toClaimRow),
  };
}

export async function loadDashboardData(options: DashboardLoadOptions = {}): Promise<LoadedDashboardData> {
  const missing = missingRequiredBrowserConfigKeys();

  if (missing.length > 0) {
    return {
      snapshot: mockDashboardSnapshot,
      mode: "mock",
      message: `Using mock data. Missing ${missing.join(", ")}.`,
    };
  }

  try {
    const snapshot = await loadLiveDashboardSnapshot(options);

    return {
      snapshot,
      mode: "supabase",
      message: "Loaded live dashboard data.",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown dashboard load error.";

    return {
      snapshot: mockDashboardSnapshot,
      mode: "mock",
      message: `Using mock data. ${message}`,
    };
  }
}

export async function resolveDashboardWorkqueueItem(workqueueItemId: string, note: string, options: DashboardLoadOptions = {}): Promise<void> {
  const db = createBrowserSupabaseClient();
  const context = createServiceContext(options);

  const { data: previous, error: readError } = await db
    .from("workqueue_items")
    .select("context_payload")
    .eq("id", workqueueItemId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (readError) throw readError;

  const { error } = await db
    .from("workqueue_items")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: context.actorUserId ?? null,
      context_payload: {
        ...objectValue((previous as { context_payload?: unknown } | null)?.context_payload),
        resolutionNote: note,
      },
    })
    .eq("id", workqueueItemId)
    .eq("tenant_id", context.tenantId);

  if (error) throw error;
}

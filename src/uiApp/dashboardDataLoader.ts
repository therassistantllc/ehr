import type {
  ChargeDashboardRow,
  ClaimDashboardRow,
  RcmDashboardSnapshot,
  WorkqueueDashboardItem,
  WorkqueueSummary,
} from "../index";
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
  if (status === "blocked") return "Resolve charge blocker";
  if (status === "draft") return "Validate charge";
  if (status === "ready_for_claim") return "Create claim";
  if (status === "claimed") return "No charge-capture action needed";
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

function toWorkqueueItem(row: DbRow): WorkqueueDashboardItem {
  const workType = String(row.workqueue_type ?? row.name ?? "workqueue");
  const sourceObjectType = String(row.source_type ?? "");
  return {
    id: row.id,
    domain: dashboardDomain(sourceObjectType, workType),
    workType,
    status: String(row.status ?? "open"),
    priority: String(row.priority ?? "normal"),
    title: String(row.name ?? workType),
    description: asString(row.description),
    sourceObjectType,
    sourceObjectId: String(row.source_id ?? ""),
    assignedToUserId: asString(row.assigned_to),
    dueAt: asString(row.due_at),
    createdAt: asString(row.created_at),
    context: objectValue(row.data),
  };
}

function toChargeRow(row: DbRow): ChargeDashboardRow {
  const status = String(row.status ?? "draft");
  return {
    id: row.id,
    tab: status === "blocked" ? "held_charges" : status === "ready_for_claim" ? "ready_for_review" : "all",
    status,
    dateOfService: asString(row.service_date),
    clientId: asString(row.client_id),
    providerId: asString(row.provider_id),
    appointmentId: asString(row.appointment_id),
    cptCode: asString(row.cpt_code),
    diagnosisCodes: arrayOfStrings(row.diagnosis_codes),
    totalCharge: money(row.charge_amount),
    blockers: [],
    actionNeeded: chargeAction(status),
  };
}

function toClaimRow(row: DbRow): ClaimDashboardRow {
  const status = String(row.status ?? "draft");
  return {
    id: row.id,
    status,
    clientId: asString(row.client_id),
    payerProfileId: asString(row.payer_id),
    renderingProviderId: asString(row.provider_id),
    totalCharge: money(row.total_charge_amount),
    patientResponsibility: 0,
    payerResponsibility: money(row.payer_paid_amount),
    serviceDate: asString(row.service_date),
    currentBatchId: null,
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
    db.from("workqueue_items").select("*").eq("tenant_id", context.tenantId).eq("status", "open").is("deleted_at", null).order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(50),
    db.from("charges").select("*").eq("tenant_id", context.tenantId).is("deleted_at", null).order("service_date", { ascending: true }).limit(100),
    db.from("claims").select("*").eq("tenant_id", context.tenantId).is("deleted_at", null).order("service_date", { ascending: true }).limit(100),
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
    .select("data")
    .eq("id", workqueueItemId)
    .eq("tenant_id", context.tenantId)
    .maybeSingle();

  if (readError) throw readError;

  const { error } = await db
    .from("workqueue_items")
    .update({
      status: "resolved",
      data: {
        ...objectValue((previous as { data?: unknown } | null)?.data),
        resolutionNote: note,
        resolvedAt: new Date().toISOString(),
        resolvedByUserId: context.actorUserId ?? null,
      },
    })
    .eq("id", workqueueItemId)
    .eq("tenant_id", context.tenantId);

  if (error) throw error;
}

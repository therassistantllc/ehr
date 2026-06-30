import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import { createWorkqueueDashboardHook } from "../hooks/useWorkqueueDashboard";
import { buildRcmDashboardViewModel } from "../adapters/rcmDashboardAdapters";
import type { ChargeDashboardFilters, ClaimDashboardFilters, WorkqueueQueryFilters } from "../services/workqueueQueryService";
import type { RcmRouteRequest, RcmRouteResponse } from "./rcmRoutes";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function param(request: RcmRouteRequest, key: string): string {
  const body = record(request.body);
  const value = request.params?.[key] ?? body[key];
  if (typeof value !== "string" || !value) throw new Error(`Missing required parameter: ${key}`);
  return value;
}

function ok<T>(data: T, status = 200): RcmRouteResponse<T> {
  return { ok: true, status, data };
}

function fail(error: unknown): RcmRouteResponse<never> {
  if (error instanceof Error) return { ok: false, status: 400, error: error.message };
  return { ok: false, status: 400, error: "Request failed.", details: error };
}

async function handle<T>(operation: () => Promise<T>): Promise<RcmRouteResponse<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return fail(error);
  }
}

export function createWorkqueueDashboardApiHandlers(db: TherassistantSupabaseClient, context: ServiceContext) {
  const dashboard = createWorkqueueDashboardHook(db, context);

  return {
    listWorkqueueItems: (request: RcmRouteRequest) => handle(() => dashboard.listWorkqueueItems(record(request.query) as WorkqueueQueryFilters)),
    summarizeOpenWorkqueues: () => handle(() => dashboard.summarizeOpenWorkqueues()),
    listChargeRows: (request: RcmRouteRequest) => handle(() => dashboard.listChargeRows(record(request.query) as ChargeDashboardFilters)),
    listClaimRows: (request: RcmRouteRequest) => handle(() => dashboard.listClaimRows(record(request.query) as ClaimDashboardFilters)),
    snapshot: (request: RcmRouteRequest) => handle(() => dashboard.getDashboardSnapshot(record(request.query))),
    viewModel: (request: RcmRouteRequest) => handle(async () => buildRcmDashboardViewModel(await dashboard.getDashboardSnapshot(record(request.query)))),
    resolveWorkqueueItem: (request: RcmRouteRequest) => handle(() => dashboard.resolveWorkqueueItem(param(request, "workqueueItemId"), record(request.body).note as string | undefined)),
  };
}

export type WorkqueueDashboardApiHandlers = ReturnType<typeof createWorkqueueDashboardApiHandlers>;

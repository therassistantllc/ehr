import {
  type RcmDashboardSnapshot,
} from "../index";
import { mockDashboardSnapshot } from "./mockDashboardData";
import { createWorkqueueQueryService, missingRequiredBrowserConfigKeys, type TenantScopedRuntimeOptions } from "./runtime";

export type DashboardDataMode = "supabase" | "mock";

export type DashboardLoadOptions = TenantScopedRuntimeOptions;

export type LoadedDashboardData = {
  snapshot: RcmDashboardSnapshot;
  mode: DashboardDataMode;
  message: string;
};

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
    const service = createWorkqueueQueryService(options);
    const snapshot = await service.getDashboardSnapshot();

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
  const service = createWorkqueueQueryService(options);
  await service.resolveWorkqueueItem(workqueueItemId, note);
}

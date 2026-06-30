import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import {
  WorkqueueQueryService,
  type ChargeDashboardFilters,
  type ClaimDashboardFilters,
  type WorkqueueQueryFilters,
} from "../services/workqueueQueryService";
import { buildRcmDashboardViewModel } from "../adapters/rcmDashboardAdapters";

export type WorkqueueDashboardHook = ReturnType<typeof createWorkqueueDashboardHook>;

export function createWorkqueueDashboardHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new WorkqueueQueryService(db, context);

  return {
    service,
    listWorkqueueItems: (filters?: WorkqueueQueryFilters) => service.listWorkqueueItems(filters),
    summarizeOpenWorkqueues: () => service.summarizeOpenWorkqueues(),
    listChargeRows: (filters?: ChargeDashboardFilters) => service.listChargeDashboardRows(filters),
    listClaimRows: (filters?: ClaimDashboardFilters) => service.listClaimDashboardRows(filters),
    getDashboardSnapshot: (options?: Parameters<WorkqueueQueryService["getDashboardSnapshot"]>[0]) => service.getDashboardSnapshot(options),
    getDashboardViewModel: async (options?: Parameters<WorkqueueQueryService["getDashboardSnapshot"]>[0]) => buildRcmDashboardViewModel(await service.getDashboardSnapshot(options)),
    resolveWorkqueueItem: (workqueueItemId: string, note?: string) => service.resolveWorkqueueItem(workqueueItemId, note),
  };
}

export const useWorkqueueDashboard = createWorkqueueDashboardHook;

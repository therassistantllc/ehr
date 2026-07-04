import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import {
  EligibilityReadinessService,
  type EligibilityReadinessFilters,
} from "../services/eligibilityReadinessService";

export type EligibilityReadinessHook = ReturnType<typeof createEligibilityReadinessHook>;

export function createEligibilityReadinessHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new EligibilityReadinessService(db, context);

  return {
    service,
    listReadinessRows: (filters?: EligibilityReadinessFilters) => service.listReadinessRows(filters),
    listIssueRows: (filters?: EligibilityReadinessFilters) => service.listReadinessRows({ ...(filters ?? {}), onlyIssues: true }),
  };
}

export const useEligibilityReadiness = createEligibilityReadinessHook;

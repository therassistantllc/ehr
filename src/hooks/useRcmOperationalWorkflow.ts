import type { TherassistantSupabaseClient } from "../lib/supabase";
import { RcmOperationalWorkflowService } from "../services/rcmOperationalWorkflowService";
import type { ClaimFromChargeOptions } from "../services/claimsService";
import type { ServiceContext } from "../services/serviceBase";

export type RcmOperationalWorkflowHook = ReturnType<typeof createRcmOperationalWorkflowHook>;

export function createRcmOperationalWorkflowHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new RcmOperationalWorkflowService(db, context);

  return {
    service,
    reviewChargeForClaimCreation: (chargeId: string) => service.reviewChargeForClaimCreation(chargeId),
    approveChargeForClaimCreation: (chargeId: string) => service.approveChargeForClaimCreation(chargeId),
    createClaimFromChargeWorkflow: (chargeId: string, options?: ClaimFromChargeOptions) => service.createClaimFromChargeWorkflow(chargeId, options),
    createClaimsFromReadyChargesWorkflow: (chargeIds: string[], options?: ClaimFromChargeOptions) => service.createClaimsFromReadyChargesWorkflow(chargeIds, options),
  };
}

export const useRcmOperationalWorkflow = createRcmOperationalWorkflowHook;

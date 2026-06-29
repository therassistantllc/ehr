import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import { ClaimsService, type ClaimBatchInput, type ClaimFromChargeOptions } from "../services/claimsService";

export type ClaimsHook = ReturnType<typeof createClaimsHook>;

export function createClaimsHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new ClaimsService(db, context);
  return {
    service,
    createClaimFromCharge: (chargeId: string, options?: ClaimFromChargeOptions) => service.createClaimFromCharge(chargeId, options),
    createClaimsFromCharges: (chargeIds: string[], options?: ClaimFromChargeOptions) => service.createClaimsFromCharges(chargeIds, options),
    validateClaim: (claimId: string) => service.validateClaim(claimId),
    markReadyForBatch: (claimId: string) => service.markReadyForBatch(claimId),
    createClaimBatch: (input: ClaimBatchInput) => service.createClaimBatch(input),
    markBatchReady: (batchId: string) => service.markBatchReady(batchId),
    markBatchSubmitted: (batchId: string, submissionData: Record<string, unknown>) => service.markBatchSubmitted(batchId, submissionData),
    recalculateClaimBalance: (claimId: string) => service.recalculateClaimBalance(claimId),
    getClaimTimeline: (claimId: string) => service.getClaimTimeline(claimId),
  };
}

export const useClaims = createClaimsHook;

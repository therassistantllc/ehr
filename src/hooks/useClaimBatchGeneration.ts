import type { TherassistantSupabaseClient } from "../lib/supabase";
import { ClaimBatchGenerationService } from "../services/claimBatchGenerationService";
import type { GenerateClaimBatchFileInput } from "../services/claimBatchGenerationTypes";
import type { ServiceContext } from "../services/serviceBase";

export type ClaimBatchGenerationHook = ReturnType<typeof createClaimBatchGenerationHook>;

export function createClaimBatchGenerationHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new ClaimBatchGenerationService(db, context);

  return {
    service,
    validateBatch: (batchId: string) => service.validateBatch(batchId),
    generateBatchFile: (input: GenerateClaimBatchFileInput) => service.generateBatchFile(input),
    markBatchSubmitted: (batchId: string, submissionFileId?: string | null) => service.markBatchSubmitted(batchId, submissionFileId),
  };
}

export const useClaimBatchGeneration = createClaimBatchGenerationHook;

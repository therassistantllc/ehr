import type { TherassistantSupabaseClient } from "../lib/supabase";
import {
  ImportWorkflowService,
  type ImportRowInput,
  type StartImportBatchInput,
} from "../services/importWorkflowService";
import type { ServiceContext } from "../services/serviceBase";

export type ImportWorkflowHook = ReturnType<typeof createImportWorkflowHook>;

export function createImportWorkflowHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new ImportWorkflowService(db, context);

  return {
    service,
    startImportBatch: (input: StartImportBatchInput) => service.startImportBatch(input),
    addImportRow: (batchId: string, input: ImportRowInput) => service.addImportRow(batchId, input),
    validateChargeImportBatch: (batchId: string) => service.validateChargeImportBatch(batchId),
    commitChargeImportBatch: (batchId: string) => service.commitChargeImportBatch(batchId),
    rollbackChargeImportBatch: (batchId: string, reason?: string) => service.rollbackChargeImportBatch(batchId, reason),
  };
}

export const useImportWorkflow = createImportWorkflowHook;

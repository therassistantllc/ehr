import type { TherassistantSupabaseClient } from "../lib/supabase";
import {
  ImportChargeWorkflowService,
  type ImportBatchInput,
  type ImportRowInput,
} from "../services/importChargeWorkflowService";
import type { ServiceContext } from "../services/serviceBase";

export type ImportChargeWorkflowHook = ReturnType<typeof createImportChargeWorkflowHook>;

export function createImportChargeWorkflowHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new ImportChargeWorkflowService(db, context);

  return {
    service,
    createImportBatch: (input: ImportBatchInput) => service.createImportBatch(input),
    addImportRows: (batchId: string, rows: ImportRowInput[]) => service.addImportRows(batchId, rows),
    validateBatch: (batchId: string) => service.validateBatch(batchId),
    commitValidRowsToCharges: (batchId: string) => service.commitValidRowsToCharges(batchId),
  };
}

export const useImportChargeWorkflow = createImportChargeWorkflowHook;

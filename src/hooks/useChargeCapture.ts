import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import {
  ChargeCaptureService,
  type ChargeCapturePatch,
  type ChargeCaptureQueueFilters,
  type CreateChargeCaptureInput,
} from "../services/chargeCaptureService";

export type ChargeCaptureHook = ReturnType<typeof createChargeCaptureHook>;

export function createChargeCaptureHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new ChargeCaptureService(db, context);

  return {
    service,
    createCharge: (input: CreateChargeCaptureInput) => service.createChargeCaptureItem(input),
    updateCharge: (chargeId: string, patch: ChargeCapturePatch) => service.updateChargeCaptureItem(chargeId, patch),
    approveForClaim: (chargeId: string) => service.approveForClaim(chargeId),
    listQueue: (filters?: ChargeCaptureQueueFilters) => service.listChargeCaptureQueue(filters),
    validateChargePayload: (input: Parameters<ChargeCaptureService["validateChargePayload"]>[0]) => service.validateChargePayload(input),
  };
}

export const useChargeCapture = createChargeCaptureHook;

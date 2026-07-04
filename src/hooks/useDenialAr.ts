import type { TherassistantSupabaseClient } from "../lib/supabase";
import { DenialArService, type ArFollowUpInput, type DenialInput } from "../services/denialArService";
import type { ServiceContext } from "../services/serviceBase";

export type DenialArHook = ReturnType<typeof createDenialArHook>;

export function createDenialArHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new DenialArService(db, context);
  return {
    service,
    createDenial: (input: DenialInput) => service.createDenial(input),
    createArFollowUp: (input: ArFollowUpInput) => service.createArFollowUp(input),
    buildArFromOpenClaims: () => service.buildArFromOpenClaims(),
    resolveFollowUp: (table: "denials" | "ar_follow_up", id: string, note?: string) => service.resolveFollowUp(table, id, note),
  };
}

export const useDenialAr = createDenialArHook;

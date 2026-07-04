import type { TherassistantSupabaseClient } from "../lib/supabase";
import { EraPostingService } from "../services/eraPostingService";
import type { EraUploadInput } from "../services/eraPostingTypes";
import type { ServiceContext } from "../services/serviceBase";

export type EraPostingHook = ReturnType<typeof createEraPostingHook>;

export function createEraPostingHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new EraPostingService(db, context);

  return {
    service,
    uploadEraFile: (input: EraUploadInput) => service.uploadEraFile(input),
    postEraFile: (eraFileId: string) => service.postEraFile(eraFileId),
    uploadAndPostEra: (input: EraUploadInput) => service.uploadAndPostEra(input),
  };
}

export const useEraPosting = createEraPostingHook;

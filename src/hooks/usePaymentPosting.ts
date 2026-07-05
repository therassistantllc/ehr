import type { TherassistantSupabaseClient } from "../lib/supabase";
import { PaymentPostingService } from "../services/paymentPostingService";
import { PaymentSupplementalPostingService } from "../services/paymentSupplementalPostingService";
import type { HistoricalPaymentInput, ManualEobInput, PostPaymentInput } from "../services/paymentPostingTypes";
import type { ServiceContext } from "../services/serviceBase";

export type PaymentPostingHook = ReturnType<typeof createPaymentPostingHook>;

export function createPaymentPostingHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const paymentPosting = new PaymentPostingService(db, context);
  const supplementalPosting = new PaymentSupplementalPostingService(db, context);

  return {
    paymentPosting,
    supplementalPosting,
    postPayment: (input: PostPaymentInput) => paymentPosting.postPayment(input),
    reversePayment: (paymentId: string, reason?: string) => paymentPosting.reversePayment(paymentId, reason),
    postManualEob: (input: ManualEobInput) => supplementalPosting.postManualEob(input),
    postHistoricalPayment: (input: HistoricalPaymentInput) => supplementalPosting.postHistoricalPayment(input),
  };
}

export const usePaymentPosting = createPaymentPostingHook;

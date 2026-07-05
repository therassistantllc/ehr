import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { PaymentPostingService } from "./paymentPostingService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type { HistoricalPaymentInput, ManualEobInput, PostedPaymentResult } from "./paymentPostingTypes";

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ServiceError("Invalid date.");
  return d.toISOString().slice(0, 10);
}

export class PaymentSupplementalPostingService extends TherassistantService {
  private readonly posting: PaymentPostingService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.posting = new PaymentPostingService(db, context);
  }

  async postManualEob(input: ManualEobInput): Promise<PostedPaymentResult & { manualEobId: string }> {
    const result = await this.posting.postPayment({ ...input, paymentSource: "manual_eob" });
    const eob = await this.insertOne("manual_eobs", {
      payment_id: result.paymentId,
      payer_id: input.payerId ?? null,
      client_id: input.clientId ?? null,
      check_number: input.checkNumber ?? null,
      eob_date: dateOnly(input.eobDate ?? input.paymentDate),
      total_paid: money(input.totalAmount),
      status: "posted",
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "manual_eobs", targetId: eob.id, action: "create", newValues: eob });
    return { ...result, manualEobId: eob.id };
  }

  async postHistoricalPayment(input: HistoricalPaymentInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    const amount = money(input.amount);
    if (amount === 0) throw new ServiceError("Historical payment amount cannot be zero.");
    const payment = await this.insertOne("payments", {
      payment_source: "historical",
      payment_method: "other",
      payer_id: input.payerId ?? null,
      client_id: input.clientId,
      payment_date: dateOnly(input.transactionDate),
      total_amount: Math.abs(amount),
      unapplied_amount: 0,
      payment_status: "posted",
      metadata: { ...(input.metadata ?? {}), historicalWithoutClaim: true },
    });
    const historical = await this.insertOne("historical_payments", {
      payment_id: payment.id,
      client_id: input.clientId,
      provider_id: input.providerId ?? null,
      payer_id: input.payerId ?? null,
      service_date: dateOnly(input.serviceDate ?? null),
      transaction_date: dateOnly(input.transactionDate),
      amount,
      transaction_type: input.transactionType ?? "payment",
      ledger_status: "posted",
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "historical_payments", targetId: historical.id, action: "workflow", newValues: historical, metadata: { workflow: "historical_payment_without_claim", paymentId: payment.id } });
    return historical;
  }
}

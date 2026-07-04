import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type RefundCreditInput = {
  clientId?: string | null;
  payerId?: string | null;
  paymentId?: string | null;
  claimId?: string | null;
  amount: number;
  refundType?: "credit" | "refund" | "overpayment";
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

export class RefundCreditService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createRefundCredit(input: RefundCreditInput): Promise<TherassistantRecord> {
    if (input.clientId) assertUuid(input.clientId, "clientId");
    if (input.payerId) assertUuid(input.payerId, "payerId");
    if (input.paymentId) assertUuid(input.paymentId, "paymentId");
    if (input.claimId) assertUuid(input.claimId, "claimId");
    const amount = money(input.amount);
    if (amount <= 0) throw new ServiceError("Refund or credit amount must be greater than zero.");
    const record = await this.insertOne("refunds", {
      client_id: input.clientId ?? null,
      payer_id: input.payerId ?? null,
      payment_id: input.paymentId ?? null,
      claim_id: input.claimId ?? null,
      refund_type: input.refundType ?? "credit",
      refund_status: "open",
      amount,
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "refunds", targetId: record.id, action: "create", newValues: record });
    return record;
  }

  async approveRefundCredit(id: string): Promise<TherassistantRecord> {
    assertUuid(id, "id");
    return this.updateOne("refunds", id, { refund_status: "approved" });
  }

  async markRefundCreditPaid(id: string): Promise<TherassistantRecord> {
    assertUuid(id, "id");
    const current = await this.findById("refunds", id);
    if (!current) throw new ServiceError("Refund/credit not found.");
    return this.updateOne("refunds", id, { refund_status: "paid", metadata: { ...((current.metadata as Record<string, unknown>) ?? {}), paidAt: new Date().toISOString() } });
  }

  async detectOverpaymentFromPayment(paymentId: string): Promise<TherassistantRecord | null> {
    assertUuid(paymentId, "paymentId");
    const payment = await this.findById("payments", paymentId);
    if (!payment) throw new ServiceError("Payment not found.");
    const unapplied = money(payment.unapplied_amount);
    if (unapplied <= 0) return null;
    return this.createRefundCredit({
      clientId: typeof payment.client_id === "string" ? payment.client_id : null,
      payerId: typeof payment.payer_id === "string" ? payment.payer_id : null,
      paymentId,
      amount: unapplied,
      refundType: "overpayment",
      reason: "Unapplied payment balance detected",
    });
  }
}

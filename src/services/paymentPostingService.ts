import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ClaimsService } from "./claimsService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type {
  HistoricalPaymentInput,
  ManualEobInput,
  PaymentAdjustmentInput,
  PaymentAllocationInput,
  PostPaymentInput,
  PostedPaymentResult,
} from "./paymentPostingTypes";

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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function adjustmentCategory(input: PaymentAdjustmentInput): string | null {
  if (input.category) return input.category;
  const carc = String(input.carcCode ?? "").trim();
  if (["45", "253"].includes(carc)) return "contractual";
  if (["147", "170", "171", "172", "206", "207", "208", "242", "243", "279"].includes(carc)) return "credentialing_contract";
  if (["1", "2", "3"].includes(carc)) return "patient_responsibility";
  return null;
}

export class PaymentPostingService extends TherassistantService {
  private readonly claims: ClaimsService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.claims = new ClaimsService(db, context);
  }

  async postPayment(input: PostPaymentInput): Promise<PostedPaymentResult> {
    const paymentAmount = money(input.totalAmount);
    if (paymentAmount <= 0) throw new ServiceError("Payment amount must be greater than zero.");
    const allocations = input.allocations ?? [];
    const allocatedTotal = money(allocations.reduce((sum, allocation) => sum + money(allocation.appliedAmount), 0));
    if (allocatedTotal > paymentAmount) throw new ServiceError("Allocated amount cannot exceed payment total.");

    const payment = await this.insertOne("payments", {
      payment_source: input.paymentSource,
      payment_method: input.paymentMethod ?? "other",
      payer_id: input.payerId ?? null,
      client_id: input.clientId ?? null,
      payment_date: dateOnly(input.paymentDate),
      deposit_date: dateOnly(input.depositDate ?? null),
      check_number: input.checkNumber ?? null,
      trace_number: input.traceNumber ?? null,
      total_amount: paymentAmount,
      unapplied_amount: money(paymentAmount - allocatedTotal),
      payment_status: "posted",
      metadata: input.metadata ?? {},
    });

    const allocationIds: string[] = [];
    for (const allocationInput of allocations) {
      const allocation = await this.createAllocation(payment.id, allocationInput);
      allocationIds.push(allocation.id);
      for (const adjustment of allocationInput.adjustments ?? []) {
        await this.createAdjustment(payment.id, allocation.id, allocationInput.claimId ?? null, adjustment);
      }
      if (allocationInput.claimId) await this.claims.recalculateClaimBalance(allocationInput.claimId);
    }

    const updated = await this.recalculatePaymentUnapplied(payment.id);
    await this.writeAuditLog({ targetType: "payments", targetId: payment.id, action: "workflow", newValues: updated, metadata: { workflow: "payment_posting", allocationIds } });
    return { paymentId: payment.id, allocationIds, unappliedAmount: money(updated.unapplied_amount) };
  }

  async postManualEob(input: ManualEobInput): Promise<PostedPaymentResult> {
    const result = await this.postPayment({ ...input, paymentSource: "manual_eob" });
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
    await this.writeAuditLog({ targetType: "manual_eobs", targetId: eob.id, action: "workflow", newValues: eob, metadata: { paymentId: result.paymentId } });
    return result;
  }

  async postHistoricalPayment(input: HistoricalPaymentInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    if (input.providerId) assertUuid(input.providerId, "providerId");
    if (input.payerId) assertUuid(input.payerId, "payerId");
    const historical = await this.insertOne("historical_payments", {
      client_id: input.clientId,
      provider_id: input.providerId ?? null,
      payer_id: input.payerId ?? null,
      service_date: dateOnly(input.serviceDate ?? null),
      transaction_date: dateOnly(input.transactionDate),
      amount: money(input.amount),
      transaction_type: input.transactionType ?? "payment",
      ledger_status: "posted",
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "historical_payments", targetId: historical.id, action: "workflow", newValues: historical, metadata: { workflow: "historical_payment_without_claim" } });
    return historical;
  }

  async reversePayment(paymentId: string, reason?: string): Promise<TherassistantRecord> {
    assertUuid(paymentId, "paymentId");
    const payment = await this.findById("payments", paymentId);
    if (!payment) throw new ServiceError("Payment not found.");
    const reversed = await this.updateOne("payments", paymentId, { payment_status: "reversed", metadata: { ...objectValue(payment.metadata), reversalReason: reason ?? null, reversedAt: new Date().toISOString() } });
    const { data, error } = await this.db.from("payment_allocations").select("id, claim_id").eq("tenant_id", this.tenantId()).eq("payment_id", paymentId).is("archived_at", null);
    if (error) throw new ServiceError("Failed to load payment allocations.", error);
    for (const allocation of (data ?? []) as Array<{ id: string; claim_id?: string | null }>) {
      await this.updateOne("payment_allocations", allocation.id, { allocation_status: "reversed" });
      if (allocation.claim_id) await this.claims.recalculateClaimBalance(allocation.claim_id);
    }
    await this.writeAuditLog({ targetType: "payments", targetId: paymentId, action: "status_change", oldValues: payment, newValues: reversed, metadata: { reason } });
    return reversed;
  }

  async recalculatePaymentUnapplied(paymentId: string): Promise<TherassistantRecord> {
    assertUuid(paymentId, "paymentId");
    const payment = await this.findById("payments", paymentId);
    if (!payment) throw new ServiceError("Payment not found.");
    const { data, error } = await this.db
      .from("payment_allocations")
      .select("applied_amount")
      .eq("tenant_id", this.tenantId())
      .eq("payment_id", paymentId)
      .is("archived_at", null);
    if (error) throw new ServiceError("Failed to read payment allocations.", error);
    const applied = ((data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.applied_amount), 0);
    return this.updateOne("payments", paymentId, {
      unapplied_amount: Math.max(money(payment.total_amount) - applied, 0),
      metadata: { ...objectValue(payment.metadata), appliedAmount: applied },
    });
  }

  private async createAllocation(paymentId: string, input: PaymentAllocationInput): Promise<TherassistantRecord> {
    const allocation = await this.insertOne("payment_allocations", {
      payment_id: paymentId,
      claim_id: input.claimId ?? null,
      claim_service_line_id: input.claimServiceLineId ?? null,
      client_id: input.clientId ?? null,
      provider_id: input.providerId ?? null,
      service_date: dateOnly(input.serviceDate ?? null),
      applied_amount: money(input.appliedAmount),
      contractual_adjustment_amount: money(input.contractualAdjustmentAmount ?? 0),
      patient_responsibility_amount: money(input.patientResponsibilityAmount ?? 0),
      payer_responsibility_amount: money(input.payerResponsibilityAmount ?? 0),
      allocation_status: "posted",
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "payment_allocations", targetId: allocation.id, action: "create", newValues: allocation });
    return allocation;
  }

  private async createAdjustment(paymentId: string, allocationId: string, claimId: string | null, input: PaymentAdjustmentInput): Promise<TherassistantRecord> {
    const category = adjustmentCategory(input);
    return this.insertOne("payment_adjustments", {
      payment_id: paymentId,
      payment_allocation_id: allocationId,
      claim_id: claimId,
      adjustment_group_code: input.groupCode ?? null,
      carc_code: input.carcCode ?? null,
      rarc_code: input.rarcCode ?? null,
      adjustment_amount: money(input.amount),
      adjustment_category: category,
      is_writeoff: input.isWriteoff ?? category === "credentialing_contract",
      metadata: {},
    });
  }
}

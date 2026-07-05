import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ClaimsService } from "./claimsService";
import { PaymentSupplementalPostingService } from "./paymentSupplementalPostingService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type {
  HistoricalPaymentInput,
  ManualEobInput,
  PaymentAdjustmentInput,
  PaymentAllocationInput,
  PaymentSource,
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
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function paymentKind(source: PaymentSource): string {
  if (source === "manual_eob") return "manual_eob";
  if (source === "patient") return "patient";
  if (source === "historical") return "historical";
  if (source === "era") return "era";
  return "other";
}

function paymentType(source: PaymentSource, override?: string | null): string {
  if (override) return override;
  return source === "patient" ? "patient" : "payer";
}

function adjustmentCategory(input: PaymentAdjustmentInput): string | null {
  if (input.category) return input.category;
  const carc = String(input.carcCode ?? "").trim();
  if (["45", "253"].includes(carc)) return "contractual";
  if (["147", "170", "171", "172", "206", "207", "208", "242", "243", "279"].includes(carc)) return "credentialing_contract";
  if (["1", "2", "3"].includes(carc)) return "patient_responsibility";
  return null;
}

function adjustmentFlags(category: string | null) {
  return {
    is_patient_responsibility: category === "patient_responsibility",
    is_contractual: category === "contractual" || category === "credentialing_contract",
    is_denial: category === "denial" || category === "credentialing_contract",
  };
}

export class PaymentPostingService extends TherassistantService {
  private readonly claims: ClaimsService;
  private readonly supplemental: PaymentSupplementalPostingService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.claims = new ClaimsService(db, context);
    this.supplemental = new PaymentSupplementalPostingService(db, context);
  }

  async postPayment(input: PostPaymentInput): Promise<PostedPaymentResult> {
    if (input.clientId) assertUuid(input.clientId, "clientId");
    if (input.claimId) assertUuid(input.claimId, "claimId");
    if (input.payerProfileId) assertUuid(input.payerProfileId, "payerProfileId");

    const paymentAmount = money(input.totalAmount);
    if (paymentAmount <= 0) throw new ServiceError("Payment amount must be greater than zero.");

    const allocations = input.allocations ?? [];
    const allocatedTotal = money(allocations.reduce((sum, allocation) => sum + money(allocation.appliedAmount), 0));
    if (allocatedTotal > paymentAmount) throw new ServiceError("Allocated amount cannot exceed payment total.");

    const now = new Date().toISOString();
    const payment = await this.insertOne("payments", {
      payment_import_batch_id: input.paymentImportBatchId ?? null,
      payment_import_item_id: input.paymentImportItemId ?? null,
      claim_id: input.claimId ?? null,
      payer_profile_id: input.payerProfileId ?? null,
      client_id: input.clientId ?? null,
      payer_id: input.payerId ?? null,
      payer_name: input.payerName ?? null,
      payer_claim_control_number: input.payerClaimControlNumber ?? null,
      patient_account_number: input.patientAccountNumber ?? null,
      total_charge_amount: money(input.totalChargeAmount ?? input.totalAmount),
      paid_amount: paymentAmount,
      payment_amount: paymentAmount,
      patient_responsibility_amount: money(input.patientResponsibilityAmount ?? 0),
      payment_date: dateOnly(input.paymentDate),
      deposit_date: dateOnly(input.depositDate ?? null),
      received_at: input.receivedAt ?? now,
      check_or_eft_number: input.checkOrEftNumber ?? input.checkNumber ?? null,
      check_eft_number: input.checkOrEftNumber ?? input.checkNumber ?? null,
      reference_number: input.referenceNumber ?? input.checkOrEftNumber ?? input.checkNumber ?? null,
      trace_number: input.traceNumber ?? null,
      payment_batch_id: input.paymentBatchId ?? null,
      payment_source_id: input.paymentSourceId ?? null,
      payment_method_id: input.paymentMethodId ?? null,
      era_file_id: input.eraFileId ?? null,
      manual_eob_id: input.manualEobId ?? null,
      eob_file_id: input.eobFileId ?? null,
      client_payment_id: input.clientPaymentId ?? null,
      payment_type: paymentType(input.paymentSource, input.paymentType),
      posted_status: "posted",
      posting_status: "posted",
      posted_at: now,
      posted_by_user_id: this.actorUserId(),
      unapplied_amount: money(paymentAmount - allocatedTotal),
      notes: input.notes ?? null,
      source_record_type: input.sourceRecordType ?? input.paymentSource,
      source_record_id: input.sourceRecordId ?? null,
      metadata: { ...(input.metadata ?? {}), paymentSource: input.paymentSource, allocatedTotal },
    });

    const allocationIds: string[] = [];
    for (const allocationInput of allocations) {
      const allocation = await this.createAllocation(payment.id, input.paymentSource, allocationInput);
      allocationIds.push(allocation.id);
      await this.createClientLedgerEntry(payment, allocation, input.paymentSource, allocationInput);
      for (const adjustment of allocationInput.adjustments ?? []) {
        await this.createAdjustment(payment.id, allocation.id, allocationInput.claimId ?? input.claimId ?? null, allocationInput.clientId ?? input.clientId ?? null, adjustment);
      }
      if (allocationInput.claimId) await this.claims.recalculateClaimBalance(allocationInput.claimId);
    }

    if (input.claimId) await this.claims.recalculateClaimBalance(input.claimId);
    const updated = await this.recalculatePaymentUnapplied(payment.id);
    await this.writeAuditLog({ targetType: "payments", targetId: payment.id, action: "workflow", newValues: updated, metadata: { workflow: "payment_posting", allocationIds } });
    return { paymentId: payment.id, allocationIds, unappliedAmount: money(updated.unapplied_amount) };
  }

  async postManualEob(input: ManualEobInput): Promise<PostedPaymentResult> {
    return this.supplemental.postManualEob(input);
  }

  async postHistoricalPayment(input: HistoricalPaymentInput): Promise<TherassistantRecord> {
    return this.supplemental.postHistoricalPayment(input);
  }

  async reversePayment(paymentId: string, reason?: string): Promise<TherassistantRecord> {
    assertUuid(paymentId, "paymentId");
    const payment = await this.findById("payments", paymentId);
    if (!payment) throw new ServiceError("Payment not found.");
    const reversed = await this.updateOne("payments", paymentId, {
      posted_status: "voided",
      posting_status: "voided",
      reversed_at: new Date().toISOString(),
      metadata: { ...objectValue(payment.metadata), reversalReason: reason ?? null, reversedAt: new Date().toISOString() },
    });
    const { data, error } = await this.db.from("payment_allocations").select("id, claim_id").eq("tenant_id", this.tenantId()).eq("payment_id", paymentId).is("archived_at", null);
    if (error) throw new ServiceError("Failed to load payment allocations.", error);
    for (const allocation of (data ?? []) as Array<{ id: string; claim_id?: string | null }>) {
      await this.updateOne("payment_allocations", allocation.id, { allocation_status: "voided" });
      if (allocation.claim_id) await this.claims.recalculateClaimBalance(allocation.claim_id);
    }
    await this.writeAuditLog({ targetType: "payments", targetId: paymentId, action: "status_change", oldValues: payment, newValues: reversed, metadata: { reason } });
    return reversed;
  }

  async recalculatePaymentUnapplied(paymentId: string): Promise<TherassistantRecord> {
    assertUuid(paymentId, "paymentId");
    const payment = await this.findById("payments", paymentId);
    if (!payment) throw new ServiceError("Payment not found.");
    const { data, error } = await this.db.from("payment_allocations").select("applied_amount").eq("tenant_id", this.tenantId()).eq("payment_id", paymentId).is("archived_at", null);
    if (error) throw new ServiceError("Failed to read payment allocations.", error);
    const applied = ((data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.applied_amount), 0);
    const total = money(payment.payment_amount ?? payment.paid_amount ?? 0);
    return this.updateOne("payments", paymentId, {
      unapplied_amount: Math.max(money(total - applied), 0),
      metadata: { ...objectValue(payment.metadata), appliedAmount: applied },
    });
  }

  private async createAllocation(paymentId: string, source: PaymentSource, input: PaymentAllocationInput): Promise<TherassistantRecord> {
    const allocation = await this.insertOne("payment_allocations", {
      payment_kind: paymentKind(source),
      payment_id: paymentId,
      claim_id: input.claimId ?? null,
      claim_service_line_id: input.claimServiceLineId ?? null,
      patient_invoice_id: input.patientInvoiceId ?? null,
      client_invoice_line_id: input.clientInvoiceLineId ?? null,
      client_id: input.clientId ?? null,
      applied_amount: money(input.appliedAmount),
      allowed_amount: input.allowedAmount == null ? null : money(input.allowedAmount),
      charge_amount: input.chargeAmount == null ? null : money(input.chargeAmount),
      contractual_adjustment_amount: money(input.contractualAdjustmentAmount ?? 0),
      patient_responsibility_amount: money(input.patientResponsibilityAmount ?? 0),
      allocation_type: "payment",
      allocation_status: "posted",
      posted_at: new Date().toISOString(),
      posted_by_user_id: this.actorUserId(),
      notes: input.notes ?? null,
      metadata: { ...(input.metadata ?? {}), providerId: input.providerId ?? null, serviceDate: dateOnly(input.serviceDate ?? null), payerResponsibilityAmount: money(input.payerResponsibilityAmount ?? 0) },
    });
    await this.writeAuditLog({ targetType: "payment_allocations", targetId: allocation.id, action: "create", newValues: allocation });
    return allocation;
  }

  private async createAdjustment(paymentId: string, allocationId: string, claimId: string | null, clientId: string | null, input: PaymentAdjustmentInput): Promise<TherassistantRecord> {
    const category = adjustmentCategory(input);
    return this.insertOne("payment_adjustments", {
      payment_id: paymentId,
      payment_allocation_id: allocationId,
      claim_id: claimId,
      client_id: clientId,
      scope: input.scope ?? "claim",
      adjustment_type: category ?? "other",
      group_code: input.groupCode ?? null,
      reason_code: input.carcCode ?? null,
      amount: money(input.amount),
      description: input.description ?? null,
      source: "payment_posting",
      posted_at: new Date().toISOString(),
      posted_by_user_id: this.actorUserId(),
      ...adjustmentFlags(category),
      metadata: { carcCode: input.carcCode ?? null, rarcCode: input.rarcCode ?? null, isWriteoff: input.isWriteoff ?? category === "credentialing_contract" },
    });
  }

  private async createClientLedgerEntry(payment: TherassistantRecord, allocation: TherassistantRecord, source: PaymentSource, input: PaymentAllocationInput): Promise<void> {
    const clientId = input.clientId ?? payment.client_id;
    if (!clientId) return;
    const appliedAmount = money(input.appliedAmount);
    await this.insertOne("client_ledger_entries", {
      client_id: clientId,
      claim_id: input.claimId ?? payment.claim_id ?? null,
      payment_id: payment.id,
      payment_allocation_id: allocation.id,
      source_type: paymentKind(source),
      entry_type: source === "patient" ? "patient_payment" : "insurance_payment",
      description: input.notes ?? `Payment posted from ${source}.`,
      debit_amount: 0,
      credit_amount: appliedAmount,
      balance_effect: -appliedAmount,
      service_date: dateOnly(input.serviceDate ?? null),
      posting_date: dateOnly(String(payment.payment_date ?? null)),
      reference_number: String(payment.reference_number ?? payment.id),
      metadata: { providerId: input.providerId ?? null, paymentSource: source },
    });
  }
}

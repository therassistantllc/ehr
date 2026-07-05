import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type { HistoricalPaymentInput, ManualEobInput, PaymentMethod, PostedPaymentResult } from "./paymentPostingTypes";

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

function normalizePaymentMethod(method: PaymentMethod | null | undefined): PaymentMethod | null {
  if (!method) return null;
  return method === "card" ? "credit_card" : method;
}

function historicalDirection(input: HistoricalPaymentInput): "debit" | "credit" {
  if (input.transactionDirection) return input.transactionDirection;
  return input.transactionType === "refund" ? "debit" : "credit";
}

function accountingTypeForHistorical(type: HistoricalPaymentInput["transactionType"]): string {
  if (type === "adjustment") return "adjustment";
  if (type === "opening_balance") return "opening_balance";
  if (type === "credit") return "credit";
  if (type === "refund") return "refund";
  if (type === "transfer") return "transfer";
  if (type === "correction") return "correction";
  return "payer_payment";
}

export class PaymentSupplementalPostingService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async postManualEob(input: ManualEobInput): Promise<PostedPaymentResult & { manualEobId: string }> {
    if (input.clientId) assertUuid(input.clientId, "clientId");
    if (input.claimId) assertUuid(input.claimId, "claimId");
    if (input.payerProfileId) assertUuid(input.payerProfileId, "payerProfileId");

    const amount = money(input.totalAmount);
    if (amount <= 0) throw new ServiceError("Manual EOB payment amount must be greater than zero.");
    const allocatedTotal = money((input.allocations ?? []).reduce((sum, allocation) => sum + money(allocation.appliedAmount), 0));
    if (allocatedTotal > amount) throw new ServiceError("Allocated amount cannot exceed payment total.");

    const now = new Date().toISOString();
    const payment = await this.insertOne("payments", {
      payment_type: "payer",
      claim_id: input.claimId ?? null,
      payer_profile_id: input.payerProfileId ?? null,
      client_id: input.clientId ?? null,
      payer_id: input.payerId ?? null,
      payer_name: input.payerName ?? null,
      payer_claim_control_number: input.payerClaimControlNumber ?? input.payerControlNumber ?? null,
      patient_account_number: input.patientAccountNumber ?? null,
      total_charge_amount: money(input.totalChargeAmount ?? input.totalAmount),
      paid_amount: amount,
      payment_amount: amount,
      patient_responsibility_amount: money(input.patientResponsibilityAmount ?? 0),
      payment_date: dateOnly(input.paymentDate),
      deposit_date: dateOnly(input.depositDate ?? null),
      received_at: now,
      check_or_eft_number: input.checkOrEftNumber ?? input.checkNumber ?? null,
      check_eft_number: input.checkOrEftNumber ?? input.checkNumber ?? null,
      reference_number: input.referenceNumber ?? input.checkOrEftNumber ?? input.checkNumber ?? null,
      trace_number: input.traceNumber ?? null,
      manual_eob_id: input.manualEobId ?? null,
      eob_file_id: input.eobFileId ?? null,
      posting_status: "posted",
      posted_status: "posted",
      posted_at: now,
      posted_by_user_id: this.actorUserId(),
      unapplied_amount: money(amount - allocatedTotal),
      notes: input.notes ?? null,
      source_record_type: "manual_eob",
      source_record_id: input.sourceRecordId ?? null,
      metadata: { ...(input.metadata ?? {}), paymentSource: "manual_eob", paymentMethod: normalizePaymentMethod(input.paymentMethod) },
    });

    const eob = await this.insertOne("manual_eobs", {
      payment_id: payment.id,
      client_id: input.clientId ?? null,
      claim_id: input.claimId ?? null,
      payer_profile_id: input.payerProfileId ?? null,
      eob_date: dateOnly(input.eobDate ?? input.paymentDate),
      payer_control_number: input.payerControlNumber ?? input.payerClaimControlNumber ?? null,
      total_charge: money(input.totalChargeAmount ?? input.totalAmount),
      paid_amount: amount,
      adjustment_amount: money(input.adjustmentAmount ?? 0),
      patient_responsibility_amount: money(input.patientResponsibilityAmount ?? 0),
      posting_status: "posted",
      entered_by_user_id: this.actorUserId(),
      check_or_eft_number: input.checkOrEftNumber ?? input.checkNumber ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      raw_eob_data: objectValue(input.metadata?.rawEobData),
    });

    const allocationIds: string[] = [];
    for (const allocationInput of input.allocations ?? []) {
      const allocation = await this.insertOne("payment_allocations", {
        payment_kind: "manual_eob",
        payment_id: payment.id,
        client_id: allocationInput.clientId ?? input.clientId ?? null,
        claim_id: allocationInput.claimId ?? input.claimId ?? null,
        claim_service_line_id: allocationInput.claimServiceLineId ?? null,
        patient_invoice_id: allocationInput.patientInvoiceId ?? null,
        client_invoice_line_id: allocationInput.clientInvoiceLineId ?? null,
        manual_eob_id: eob.id,
        allocation_type: "payment",
        allocation_status: "posted",
        applied_amount: money(allocationInput.appliedAmount),
        allowed_amount: allocationInput.allowedAmount == null ? null : money(allocationInput.allowedAmount),
        charge_amount: allocationInput.chargeAmount == null ? null : money(allocationInput.chargeAmount),
        contractual_adjustment_amount: money(allocationInput.contractualAdjustmentAmount ?? 0),
        patient_responsibility_amount: money(allocationInput.patientResponsibilityAmount ?? 0),
        posted_at: now,
        posted_by_user_id: this.actorUserId(),
        notes: allocationInput.notes ?? null,
        metadata: allocationInput.metadata ?? {},
      });
      allocationIds.push(allocation.id);
    }

    await this.writeAuditLog({ targetType: "manual_eobs", targetId: eob.id, action: "workflow", newValues: eob, metadata: { paymentId: payment.id, allocationIds } });
    return { paymentId: payment.id, allocationIds, unappliedAmount: money(payment.unapplied_amount), manualEobId: eob.id };
  }

  async postHistoricalPayment(input: HistoricalPaymentInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    if (input.providerId) assertUuid(input.providerId, "providerId");
    if (input.payerProfileId) assertUuid(input.payerProfileId, "payerProfileId");
    if (input.claimId) assertUuid(input.claimId, "claimId");
    if (input.claimServiceLineId) assertUuid(input.claimServiceLineId, "claimServiceLineId");

    const amount = Math.abs(money(input.amount));
    if (amount === 0) throw new ServiceError("Historical payment amount cannot be zero.");

    const now = new Date().toISOString();
    const transactionType = input.transactionType ?? "payment";
    const direction = historicalDirection(input);
    const postedDate = dateOnly(input.postedDate ?? input.transactionDate);

    const historical = await this.insertOne("historical_transactions", {
      client_id: input.clientId,
      provider_id: input.providerId ?? null,
      payer_profile_id: input.payerProfileId ?? null,
      claim_id: input.claimId ?? null,
      claim_service_line_id: input.claimServiceLineId ?? null,
      transaction_date: dateOnly(input.transactionDate),
      posted_date: postedDate,
      transaction_type: transactionType,
      transaction_direction: direction,
      amount,
      payment_method: normalizePaymentMethod(input.paymentMethod ?? null),
      reference_number: input.referenceNumber ?? null,
      description: input.description ?? "Historical payment posted without a claim requirement.",
      source_system: input.sourceSystem ?? "manual_historical_posting",
      external_transaction_id: input.externalTransactionId ?? null,
      posting_status: "posted",
      ledger_posted_at: now,
      allocated_amount: amount,
      unapplied_amount: 0,
      created_by_user_id: this.actorUserId(),
      updated_by_user_id: this.actorUserId(),
      metadata: { ...(input.metadata ?? {}), payerId: input.payerId ?? null, historicalWithoutClaim: !input.claimId },
    });

    const accounting = await this.insertOne("accounting_transactions", {
      transaction_date: postedDate,
      posted_at: now,
      transaction_type: accountingTypeForHistorical(transactionType),
      source_object_type: "historical_transaction",
      source_object_id: historical.id,
      historical_transaction_id: historical.id,
      description: input.description ?? "Historical payment posted to ledger.",
      reference_number: input.referenceNumber ?? historical.id,
      total_debits: amount,
      total_credits: amount,
      status: "posted",
      created_by_user_id: this.actorUserId(),
      posted_by_user_id: this.actorUserId(),
      metadata: { transactionDirection: direction, clientId: input.clientId, claimId: input.claimId ?? null },
    });

    await this.updateOne("historical_transactions", historical.id, { accounting_transaction_id: accounting.id });

    await this.insertOne("historical_transaction_allocations", {
      historical_transaction_id: historical.id,
      client_id: input.clientId,
      claim_id: input.claimId ?? null,
      claim_service_line_id: input.claimServiceLineId ?? null,
      payer_profile_id: input.payerProfileId ?? null,
      provider_id: input.providerId ?? null,
      allocation_type: transactionType,
      allocated_amount: amount,
      service_date: dateOnly(input.serviceDate ?? null),
      description: input.description ?? null,
      accounting_transaction_id: accounting.id,
      created_by_user_id: this.actorUserId(),
      updated_by_user_id: this.actorUserId(),
      metadata: input.metadata ?? {},
    });

    await this.insertOne("client_ledger_entries", {
      client_id: input.clientId,
      claim_id: input.claimId ?? null,
      source_type: "historical_transaction",
      entry_type: transactionType,
      description: input.description ?? "Historical payment posted without a claim requirement.",
      debit_amount: direction === "debit" ? amount : 0,
      credit_amount: direction === "credit" ? amount : 0,
      balance_effect: direction === "credit" ? -amount : amount,
      service_date: dateOnly(input.serviceDate ?? null),
      posting_date: postedDate,
      reference_number: input.referenceNumber ?? historical.id,
      historical_transaction_id: historical.id,
      metadata: { ...(input.metadata ?? {}), accountingTransactionId: accounting.id },
    });

    await this.writeAuditLog({ targetType: "historical_transactions", targetId: historical.id, action: "workflow", newValues: historical, metadata: { workflow: "historical_payment_without_claim", accountingTransactionId: accounting.id } });
    return historical;
  }
}

import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { PaymentPostingService } from "./paymentPostingService";
import { parseEra835 } from "./eraParser";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type { EraPostResult, EraUploadInput, ParsedEraClaim } from "./eraPostingTypes";
import type { PaymentAllocationInput } from "./paymentPostingTypes";

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export class EraPostingService extends TherassistantService {
  private readonly payments: PaymentPostingService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.payments = new PaymentPostingService(db, context);
  }

  async uploadEraFile(input: EraUploadInput): Promise<TherassistantRecord> {
    const parsed = parseEra835(input.fileContent);
    const file = await this.insertOne("era_files", {
      file_name: input.fileName,
      file_content: input.fileContent,
      file_status: "parsed",
      parsed_at: new Date().toISOString(),
      trace_number: parsed.payment.traceNumber ?? null,
      check_number: parsed.payment.checkNumber ?? null,
      payment_amount: money(parsed.payment.paymentAmount),
      payment_date: dateOnly(parsed.payment.paymentDate),
      metadata: { ...(input.metadata ?? {}), parsed },
    });
    await this.writeAuditLog({ targetType: "era_files", targetId: file.id, action: "create", newValues: file });
    return file;
  }

  async postEraFile(eraFileId: string): Promise<EraPostResult> {
    assertUuid(eraFileId, "eraFileId");
    const eraFile = await this.findById("era_files", eraFileId);
    if (!eraFile) throw new ServiceError("ERA file not found.");
    const parsed = parseEra835(String(eraFile.file_content ?? ""));
    const postedClaimIds: string[] = [];
    const unmatchedClaims: ParsedEraClaim[] = [];
    const allocations: PaymentAllocationInput[] = [];

    for (const claim of parsed.claims) {
      const matchedClaim = await this.matchClaim(claim);
      const eraClaim = await this.insertOne("era_claims", {
        era_file_id: eraFileId,
        claim_id: matchedClaim?.id ?? null,
        payer_claim_control_number: claim.payerClaimControlNumber ?? null,
        patient_account_number: claim.patientAccountNumber ?? null,
        claim_status_code: claim.statusCode ?? null,
        total_charge_amount: money(claim.totalChargeAmount),
        paid_amount: money(claim.paidAmount),
        patient_responsibility_amount: money(claim.patientResponsibilityAmount),
        metadata: claim,
      });
      for (const line of claim.serviceLines) {
        const eraLine = await this.insertOne("era_service_lines", {
          era_claim_id: eraClaim.id,
          service_date: dateOnly(line.serviceDate),
          procedure_code: line.procedureCode ?? null,
          charge_amount: money(line.chargeAmount),
          paid_amount: money(line.paidAmount),
          units: line.units ?? null,
          metadata: line,
        });
        for (const adjustment of line.adjustments) await this.insertEraAdjustment(eraClaim.id, eraLine.id, adjustment);
      }
      for (const adjustment of claim.adjustments) await this.insertEraAdjustment(eraClaim.id, null, adjustment);

      if (!matchedClaim) {
        unmatchedClaims.push(claim);
        continue;
      }
      postedClaimIds.push(matchedClaim.id);
      allocations.push({
        claimId: matchedClaim.id,
        clientId: String(matchedClaim.client_id ?? matchedClaim.patient_id ?? "") || null,
        providerId: String(matchedClaim.rendering_provider_id ?? "") || null,
        serviceDate: dateOnly(String(matchedClaim.service_date ?? "")) ?? undefined,
        appliedAmount: money(claim.paidAmount),
        contractualAdjustmentAmount: money(claim.adjustments.reduce((sum, adj) => sum + money(adj.amount), 0)),
        patientResponsibilityAmount: money(claim.patientResponsibilityAmount),
        payerResponsibilityAmount: Math.max(money(claim.totalChargeAmount) - money(claim.paidAmount) - money(claim.patientResponsibilityAmount), 0),
        adjustments: claim.adjustments.map((adj) => ({ groupCode: adj.groupCode ?? null, carcCode: adj.reasonCode ?? null, amount: money(adj.amount) })),
        metadata: { eraFileId, payerClaimControlNumber: claim.payerClaimControlNumber ?? null },
      });
    }

    const paymentResult = await this.payments.postPayment({
      paymentSource: "era",
      paymentMethod: parsed.payment.paymentMethod === "CHK" ? "check" : "eft",
      paymentDate: parsed.payment.paymentDate ?? new Date().toISOString().slice(0, 10),
      checkNumber: parsed.payment.checkNumber ?? null,
      traceNumber: parsed.payment.traceNumber ?? null,
      totalAmount: money(parsed.payment.paymentAmount),
      allocations,
      metadata: { eraFileId },
    });

    await this.insertOne("era_payments", {
      era_file_id: eraFileId,
      payment_id: paymentResult.paymentId,
      trace_number: parsed.payment.traceNumber ?? null,
      check_number: parsed.payment.checkNumber ?? null,
      payment_method: parsed.payment.paymentMethod ?? null,
      payment_amount: money(parsed.payment.paymentAmount),
      payment_date: dateOnly(parsed.payment.paymentDate),
      metadata: parsed.payment,
    });
    await this.updateOne("era_files", eraFileId, { file_status: unmatchedClaims.length ? "posted_with_unmatched" : "posted", posted_at: new Date().toISOString(), payment_id: paymentResult.paymentId });
    return { eraFileId, paymentId: paymentResult.paymentId, postedClaimIds, unmatchedClaims };
  }

  async uploadAndPostEra(input: EraUploadInput): Promise<EraPostResult> {
    const file = await this.uploadEraFile(input);
    return this.postEraFile(file.id);
  }

  private async matchClaim(claim: ParsedEraClaim): Promise<TherassistantRecord | null> {
    if (claim.patientAccountNumber) {
      const { data } = await this.db.from("claims").select("*").eq("tenant_id", this.tenantId()).eq("id", claim.patientAccountNumber).is("archived_at", null).maybeSingle();
      if (data) return data as TherassistantRecord;
    }
    if (claim.payerClaimControlNumber) {
      const { data } = await this.db.from("claims").select("*").eq("tenant_id", this.tenantId()).eq("payer_claim_control_number", claim.payerClaimControlNumber).is("archived_at", null).maybeSingle();
      if (data) return data as TherassistantRecord;
    }
    return null;
  }

  private async insertEraAdjustment(eraClaimId: string, eraLineId: string | null, adjustment: { groupCode?: string | null; reasonCode?: string | null; amount: number; quantity?: number | null }): Promise<void> {
    await this.insertOne("era_adjustments", {
      era_claim_id: eraClaimId,
      era_service_line_id: eraLineId,
      adjustment_group_code: adjustment.groupCode ?? null,
      carc_code: adjustment.reasonCode ?? null,
      adjustment_amount: money(adjustment.amount),
      quantity: adjustment.quantity ?? null,
      metadata: adjustment,
    });
  }
}

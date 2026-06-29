import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import { ChargeCaptureService, type ServiceLineInput } from "./chargeCaptureService";

export type ClaimValidationSeverity = "error" | "warning";

export type ClaimValidationIssue = {
  field: string;
  message: string;
  severity: ClaimValidationSeverity;
};

export type ClaimStatus =
  | "draft"
  | "validation_failed"
  | "ready_for_batch"
  | "batched"
  | "submitted"
  | "accepted"
  | "rejected"
  | "paid"
  | "void"
  | "reversed";

export type ClaimFrequencyCode = "1" | "7" | "8";

export type ClaimFromChargeOptions = {
  payerId?: string | null;
  billingProviderId?: string | null;
  renderingProviderId?: string | null;
  placeOfService?: string | null;
  frequencyCode?: ClaimFrequencyCode;
  priorClaimNumber?: string | null;
};

export type ClaimBatchInput = {
  claimIds: string[];
  clearinghouseAccountId?: string | null;
  payerId?: string | null;
  name?: string;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function normalizeDiagnosisCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => text(entry).toUpperCase()).filter(Boolean) : [];
}

function normalizeServiceLines(value: unknown): ServiceLineInput[] {
  return Array.isArray(value) ? (value as ServiceLineInput[]) : [];
}

function dataValue(record: TherassistantRecord, key: string): unknown {
  return record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>)[key] : undefined;
}

export class ClaimsService extends TherassistantService {
  private readonly chargeCapture: ChargeCaptureService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.chargeCapture = new ChargeCaptureService(db, context);
  }

  async createClaimFromCharge(chargeId: string, options: ClaimFromChargeOptions = {}): Promise<TherassistantRecord> {
    const charge = await this.findById("charges", chargeId);
    if (!charge) throw new ServiceError("Charge not found.");

    if (!["ready_for_claim", "ready_for_batch", "captured"].includes(String(charge.status))) {
      await this.chargeCapture.approveForClaim(chargeId);
    }

    const latestCharge = await this.findById("charges", chargeId);
    if (!latestCharge) throw new ServiceError("Charge not found after validation.");

    if (String(latestCharge.status) !== "ready_for_claim") {
      throw new ServiceError("Charge is not ready for claim creation.", latestCharge.blocker_reasons);
    }

    const serviceLines = normalizeServiceLines(latestCharge.service_lines);
    const diagnosisCodes = normalizeDiagnosisCodes(latestCharge.diagnosis_codes);
    const total = serviceLines.length
      ? money(serviceLines.reduce((sum, line) => sum + money(line.chargeAmount) * (Number(line.units ?? 1) || 1), 0))
      : money(latestCharge.charge_amount);

    const claim = await this.insertOne("claims", {
      name: `Claim ${text(latestCharge.service_date)}`.trim(),
      status: "draft" satisfies ClaimStatus,
      charge_id: latestCharge.id,
      client_id: latestCharge.client_id,
      provider_id: options.renderingProviderId ?? latestCharge.provider_id ?? null,
      rendering_provider_id: options.renderingProviderId ?? latestCharge.provider_id ?? null,
      billing_provider_id: options.billingProviderId ?? null,
      payer_id: options.payerId ?? latestCharge.payer_id ?? null,
      service_date: latestCharge.service_date,
      place_of_service: options.placeOfService ?? latestCharge.place_of_service ?? serviceLines[0]?.placeOfService ?? null,
      frequency_code: options.frequencyCode ?? "1",
      prior_claim_number: options.priorClaimNumber ?? null,
      total_charge_amount: total,
      open_balance: total,
      payer_paid_amount: 0,
      client_paid_amount: 0,
      adjustment_amount: 0,
      diagnosis_codes: diagnosisCodes,
      data: {
        sourceChargeId: latestCharge.id,
        serviceLines,
      },
    });

    await this.createClaimLines(claim, serviceLines, diagnosisCodes);
    await this.updateOne("charges", latestCharge.id, { status: "claimed", claim_id: claim.id });

    const validation = await this.validateClaim(claim.id);
    const finalClaim = validation.valid
      ? await this.transitionStatus("claims", claim.id, "ready_for_batch", null, { validation })
      : await this.transitionStatus("claims", claim.id, "validation_failed", "Claim validation failed", { validation });

    await this.writeAuditLog({
      targetType: "claims",
      targetId: claim.id,
      action: "create",
      newValues: finalClaim,
      metadata: { sourceChargeId: latestCharge.id },
    });

    return finalClaim;
  }

  async createClaimsFromCharges(chargeIds: string[], options: ClaimFromChargeOptions = {}): Promise<TherassistantRecord[]> {
    if (!chargeIds.length) return [];
    return Promise.all(chargeIds.map((chargeId) => this.createClaimFromCharge(chargeId, options)));
  }

  async validateClaim(claimId: string): Promise<{ valid: boolean; issues: ClaimValidationIssue[] }> {
    const claim = await this.findById("claims", claimId);
    if (!claim) throw new ServiceError("Claim not found.");

    const issues: ClaimValidationIssue[] = [];
    const diagnosisCodes = normalizeDiagnosisCodes(claim.diagnosis_codes ?? dataValue(claim, "diagnosisCodes") ?? []);

    if (!claim.client_id) issues.push({ field: "client_id", message: "Client is required.", severity: "error" });
    if (!claim.provider_id && !claim.rendering_provider_id) issues.push({ field: "rendering_provider_id", message: "Rendering provider is required.", severity: "error" });
    if (!claim.service_date) issues.push({ field: "service_date", message: "Date of service is required.", severity: "error" });
    if (!claim.place_of_service) issues.push({ field: "place_of_service", message: "Place of service is required.", severity: "error" });
    if (money(claim.total_charge_amount) <= 0) issues.push({ field: "total_charge_amount", message: "Claim total must be greater than zero.", severity: "error" });
    if (!diagnosisCodes.length) issues.push({ field: "diagnosis_codes", message: "At least one diagnosis code is required.", severity: "error" });

    const { data: lines, error: lineError } = await this.db
      .from("claim_lines")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .eq("claim_id", claimId)
      .is("deleted_at", null)
      .order("line_number", { ascending: true });

    if (lineError) throw new ServiceError("Failed to read claim lines.", lineError);

    if (!lines?.length) {
      issues.push({ field: "claim_lines", message: "At least one claim line is required.", severity: "error" });
    }

    for (const line of (lines ?? []) as TherassistantRecord[]) {
      if (!line.procedure_code) issues.push({ field: "claim_lines.procedure_code", message: `Line ${line.line_number ?? "?"} is missing a procedure code.`, severity: "error" });
      if (money(line.charge_amount) <= 0) issues.push({ field: "claim_lines.charge_amount", message: `Line ${line.line_number ?? "?"} must have a positive charge amount.`, severity: "error" });
      if (!line.diagnosis_pointers || !Array.isArray(line.diagnosis_pointers) || line.diagnosis_pointers.length === 0) {
        issues.push({ field: "claim_lines.diagnosis_pointers", message: `Line ${line.line_number ?? "?"} needs diagnosis pointers.`, severity: "error" });
      }
    }

    await this.clearClaimValidationErrors(claimId);
    for (const issue of issues) {
      await this.insertOne("claim_validation_errors", {
        name: issue.field,
        status: "open",
        claim_id: claimId,
        field_name: issue.field,
        error_message: issue.message,
        severity: issue.severity,
        data: {},
      });
    }

    return { valid: issues.every((issue) => issue.severity !== "error"), issues };
  }

  async markReadyForBatch(claimId: string): Promise<TherassistantRecord> {
    const validation = await this.validateClaim(claimId);
    if (!validation.valid) {
      await this.transitionStatus("claims", claimId, "validation_failed", "Claim validation failed", { validation });
      throw new ServiceError("Claim has validation errors.", validation.issues);
    }

    return this.transitionStatus("claims", claimId, "ready_for_batch", null, { validation });
  }

  async createClaimBatch(input: ClaimBatchInput): Promise<TherassistantRecord> {
    if (!input.claimIds.length) throw new ServiceError("At least one claim is required to create a batch.");
    input.claimIds.forEach((claimId) => assertUuid(claimId, "claimId"));

    const claims = await Promise.all(input.claimIds.map((claimId) => this.findById("claims", claimId)));
    const missing = claims.findIndex((claim) => !claim);
    if (missing >= 0) throw new ServiceError(`Claim not found: ${input.claimIds[missing]}`);

    const notReady = claims.filter((claim) => !["ready_for_batch", "batched"].includes(String(claim?.status)));
    if (notReady.length) {
      throw new ServiceError("All claims must be ready for batch before batching.", notReady.map((claim) => claim?.id));
    }

    const batch = await this.insertOne("claim_batches", {
      name: input.name ?? `Claim batch ${new Date().toISOString().slice(0, 10)}`,
      status: "draft",
      clearinghouse_account_id: input.clearinghouseAccountId ?? null,
      payer_id: input.payerId ?? null,
      claim_count: input.claimIds.length,
      total_charge_amount: money(claims.reduce((sum, claim) => sum + money(claim?.total_charge_amount), 0)),
      data: {},
    });

    await Promise.all(input.claimIds.map(async (claimId, index) => {
      await this.insertOne("batched_claims", {
        name: `Batch item ${index + 1}`,
        status: "active",
        batch_id: batch.id,
        claim_id: claimId,
        line_number: index + 1,
        data: {},
      });
      await this.transitionStatus("claims", claimId, "batched", null, { batchId: batch.id });
    }));

    await this.writeAuditLog({
      targetType: "claim_batches",
      targetId: batch.id,
      action: "create",
      newValues: batch,
      metadata: { claimIds: input.claimIds },
    });

    return batch;
  }

  async markBatchReady(batchId: string): Promise<TherassistantRecord> {
    return this.transitionStatus("claim_batches", batchId, "ready", null);
  }

  async markBatchSubmitted(batchId: string, submissionData: Record<string, unknown>): Promise<TherassistantRecord> {
    const batch = await this.transitionStatus("claim_batches", batchId, "submitted", null, submissionData);

    const { data, error } = await this.db
      .from("batched_claims")
      .select("claim_id")
      .eq("tenant_id", this.tenantId())
      .eq("batch_id", batchId)
      .is("deleted_at", null);

    if (error) throw new ServiceError("Failed to load batched claims.", error);

    await Promise.all(((data ?? []) as Array<{ claim_id: string }>).map((row) => this.transitionStatus("claims", row.claim_id, "submitted", null, submissionData)));

    return batch;
  }

  async recalculateClaimBalance(claimId: string): Promise<TherassistantRecord> {
    const claim = await this.findById("claims", claimId);
    if (!claim) throw new ServiceError("Claim not found.");

    const [{ data: allocations, error: allocationError }, { data: adjustments, error: adjustmentError }] = await Promise.all([
      this.db.from("payment_allocations").select("amount, allocation_type").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("deleted_at", null),
      this.db.from("claim_adjustments").select("amount").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("deleted_at", null),
    ]);

    if (allocationError) throw new ServiceError("Failed to read claim payment allocations.", allocationError);
    if (adjustmentError && !String(adjustmentError.message ?? "").includes("claim_adjustments")) throw new ServiceError("Failed to read claim adjustments.", adjustmentError);

    const paid = ((allocations ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.amount), 0);
    const adjusted = ((adjustments ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.amount), 0);
    const total = money(claim.total_charge_amount);
    const open = money(total - paid - adjusted);

    const nextStatus: ClaimStatus = open === 0 ? "paid" : (String(claim.status) as ClaimStatus);
    return this.updateOne("claims", claimId, {
      payer_paid_amount: paid,
      adjustment_amount: adjusted,
      open_balance: open,
      status: nextStatus,
    });
  }

  async getClaimTimeline(claimId: string): Promise<Record<string, unknown>> {
    const claim = await this.findById("claims", claimId);
    if (!claim) throw new ServiceError("Claim not found.");

    const [{ data: statuses }, { data: audits }, { data: validations }] = await Promise.all([
      this.db.from("status_history").select("*").eq("tenant_id", this.tenantId()).eq("target_type", "claims").eq("target_id", claimId).order("created_at", { ascending: true }),
      this.db.from("audits_logs").select("*").eq("tenant_id", this.tenantId()).eq("target_type", "claims").eq("target_id", claimId).order("created_at", { ascending: true }),
      this.db.from("claim_validation_errors").select("*").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).order("created_at", { ascending: true }),
    ]);

    return {
      claim,
      statusHistory: statuses ?? [],
      auditTrail: audits ?? [],
      validationErrors: validations ?? [],
    };
  }

  private async createClaimLines(claim: TherassistantRecord, serviceLines: ServiceLineInput[], diagnosisCodes: string[]): Promise<void> {
    const lines = serviceLines.length
      ? serviceLines
      : [{ procedureCode: String(claim.cpt_code ?? ""), units: 1, chargeAmount: money(claim.total_charge_amount), diagnosisPointers: ["1"] }];

    await Promise.all(lines.map((line, index) => this.insertOne("claim_lines", {
      name: line.procedureCode,
      status: "active",
      claim_id: claim.id,
      line_number: index + 1,
      procedure_code: line.procedureCode,
      modifiers: line.modifiers ?? [],
      diagnosis_pointers: line.diagnosisPointers?.length ? line.diagnosisPointers : diagnosisCodes.map((_, dxIndex) => String(dxIndex + 1)).slice(0, 4),
      service_date_from: line.serviceDateFrom ?? claim.service_date ?? null,
      service_date_to: line.serviceDateTo ?? line.serviceDateFrom ?? claim.service_date ?? null,
      units: Number(line.units ?? 1) || 1,
      unit_of_measure: "UN",
      charge_amount: money(line.chargeAmount),
      place_of_service: line.placeOfService ?? claim.place_of_service ?? null,
      rendering_provider_npi: line.renderingProviderNpi ?? null,
      authorization_number: line.authorizationNumber ?? null,
      data: {},
    })));

    await Promise.all(diagnosisCodes.map((code, index) => this.insertOne("claim_diagnoses", {
      name: code,
      status: "active",
      claim_id: claim.id,
      diagnosis_code: code,
      pointer: index + 1,
      data: {},
    })));
  }

  private async clearClaimValidationErrors(claimId: string): Promise<void> {
    const { error } = await this.db
      .from("claim_validation_errors")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId())
      .eq("claim_id", claimId)
      .is("resolved_at", null);

    if (error) throw new ServiceError("Failed to clear claim validation errors.", error);
  }
}

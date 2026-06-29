import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import { ChargeCaptureService, type ServiceLineInput } from "./chargeCaptureService";

export type ClaimValidationSeverity = "error" | "warning";
export type ClaimValidationIssue = { field: string; message: string; severity: ClaimValidationSeverity };
export type ClaimStatus = "draft" | "validation_failed" | "ready_for_batch" | "batched" | "submitted" | "accepted" | "rejected" | "paid" | "void" | "reversed";
export type ClaimFrequencyCode = "1" | "7" | "8";
export type ClaimFromChargeOptions = { payerProfileId?: string | null; billingProviderId?: string | null; renderingProviderId?: string | null; placeOfService?: string | null; frequencyCode?: ClaimFrequencyCode; priorClaimNumber?: string | null };
export type ClaimBatchInput = { claimIds: string[]; clearinghouseConnectionId?: string | null; payerProfileId?: string | null; name?: string };

function text(value: unknown): string { return String(value ?? "").trim(); }
function money(value: unknown): number { const n = Number(value ?? 0); return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0; }
function diagnosisCodes(value: unknown): string[] { return Array.isArray(value) ? value.map((entry) => text(entry).toUpperCase()).filter(Boolean) : []; }
function serviceLines(value: unknown): ServiceLineInput[] { return Array.isArray(value) ? value as ServiceLineInput[] : []; }

export class ClaimsService extends TherassistantService {
  private readonly chargeCapture: ChargeCaptureService;
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) { super(db, context); this.chargeCapture = new ChargeCaptureService(db, context); }

  async createClaimFromCharge(chargeId: string, options: ClaimFromChargeOptions = {}): Promise<TherassistantRecord> {
    const charge = await this.findById("charges", chargeId);
    if (!charge) throw new ServiceError("Charge not found.");
    if (!["ready_for_claim", "ready_for_batch", "captured"].includes(String(charge.charge_status))) await this.chargeCapture.approveForClaim(chargeId);
    const latest = await this.findById("charges", chargeId);
    if (!latest) throw new ServiceError("Charge not found after validation.");
    if (String(latest.charge_status) !== "ready_for_claim") throw new ServiceError("Charge is not ready for claim creation.", latest.blocker_reasons);

    const lines = serviceLines(latest.service_lines);
    const dx = diagnosisCodes(latest.diagnosis_codes);
    const total = lines.length ? money(lines.reduce((sum, line) => sum + money(line.chargeAmount) * (Number(line.units ?? 1) || 1), 0)) : money(latest.total_charge);
    const claim = await this.insertOne("claims", {
      claim_status: "draft",
      charge_capture_item_id: latest.id,
      client_id: latest.client_id,
      patient_id: latest.client_id,
      appointment_id: latest.appointment_id ?? null,
      session_id: latest.session_id ?? null,
      insurance_policy_id: latest.insurance_policy_id ?? null,
      payer_profile_id: options.payerProfileId ?? latest.payer_profile_id ?? null,
      payer_plan_id: latest.payer_plan_id ?? null,
      rendering_provider_id: options.renderingProviderId ?? latest.rendering_provider_id ?? latest.provider_id ?? null,
      billing_provider_id: options.billingProviderId ?? latest.billing_provider_id ?? null,
      service_facility_id: latest.service_facility_id ?? null,
      place_of_service: options.placeOfService ?? latest.place_of_service ?? lines[0]?.placeOfService ?? null,
      diagnosis_codes: dx,
      claim_frequency_code: options.frequencyCode ?? "1",
      payer_claim_control_number: options.priorClaimNumber ?? null,
      total_charge: total,
      payer_responsibility_amount: total,
      patient_responsibility_amount: 0,
      service_date: latest.service_date ?? null,
      metadata: { sourceChargeId: latest.id, serviceLines: lines },
    });
    await this.createClaimLines(claim, lines, dx);
    await this.updateOne("charges", latest.id, { charge_status: "claimed", claim_id: claim.id });
    const validation = await this.validateClaim(claim.id);
    const finalClaim = validation.valid ? await this.transitionStatus("claims", claim.id, "ready_for_batch", null, { validation }) : await this.transitionStatus("claims", claim.id, "validation_failed", "Claim validation failed", { validation });
    await this.writeAuditLog({ targetType: "claims", targetId: claim.id, action: "create", newValues: finalClaim, metadata: { sourceChargeId: latest.id } });
    return finalClaim;
  }

  async createClaimsFromCharges(chargeIds: string[], options: ClaimFromChargeOptions = {}): Promise<TherassistantRecord[]> { return Promise.all(chargeIds.map((chargeId) => this.createClaimFromCharge(chargeId, options))); }

  async validateClaim(claimId: string): Promise<{ valid: boolean; issues: ClaimValidationIssue[] }> {
    const claim = await this.findById("claims", claimId); if (!claim) throw new ServiceError("Claim not found.");
    const issues: ClaimValidationIssue[] = [];
    const dx = diagnosisCodes(claim.diagnosis_codes);
    if (!claim.client_id && !claim.patient_id) issues.push({ field: "client_id", message: "Client is required.", severity: "error" });
    if (!claim.rendering_provider_id) issues.push({ field: "rendering_provider_id", message: "Rendering provider is required.", severity: "error" });
    if (!claim.place_of_service) issues.push({ field: "place_of_service", message: "Place of service is required.", severity: "error" });
    if (money(claim.total_charge) <= 0) issues.push({ field: "total_charge", message: "Claim total must be greater than zero.", severity: "error" });
    if (!dx.length) issues.push({ field: "diagnosis_codes", message: "At least one diagnosis code is required.", severity: "error" });
    const { data: lines, error } = await this.db.from("claim_service_lines").select("*").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("archived_at", null).order("line_number", { ascending: true });
    if (error) throw new ServiceError("Failed to read claim service lines.", error);
    if (!lines?.length) issues.push({ field: "claim_service_lines", message: "At least one claim line is required.", severity: "error" });
    for (const line of (lines ?? []) as TherassistantRecord[]) {
      if (!line.procedure_code) issues.push({ field: "procedure_code", message: `Line ${line.line_number ?? "?"} is missing a procedure code.`, severity: "error" });
      if (money(line.charge_amount) <= 0) issues.push({ field: "charge_amount", message: `Line ${line.line_number ?? "?"} must have a positive charge amount.`, severity: "error" });
      if (!line.service_date_from) issues.push({ field: "service_date_from", message: `Line ${line.line_number ?? "?"} needs a service date.`, severity: "error" });
    }
    await this.clearClaimValidationErrors(claimId);
    for (const issue of issues) await this.insertOne("claim_validation_errors", { claim_id: claimId, error_code: issue.field, error_category: "pre_submission", severity: issue.severity, message: issue.message, source_table: "claims", source_column: issue.field, is_blocking: issue.severity === "error", metadata: {} });
    return { valid: issues.every((issue) => issue.severity !== "error"), issues };
  }

  async markReadyForBatch(claimId: string): Promise<TherassistantRecord> { const validation = await this.validateClaim(claimId); if (!validation.valid) { await this.transitionStatus("claims", claimId, "validation_failed", "Claim validation failed", { validation }); throw new ServiceError("Claim has validation errors.", validation.issues); } return this.transitionStatus("claims", claimId, "ready_for_batch", null, { validation }); }

  async createClaimBatch(input: ClaimBatchInput): Promise<TherassistantRecord> {
    if (!input.claimIds.length) throw new ServiceError("At least one claim is required to create a batch."); input.claimIds.forEach((id) => assertUuid(id, "claimId"));
    const claims = await Promise.all(input.claimIds.map((id) => this.findById("claims", id)));
    if (claims.some((claim) => !claim)) throw new ServiceError("One or more claims were not found.");
    const notReady = claims.filter((claim) => !["ready_for_batch", "batched"].includes(String(claim?.claim_status)));
    if (notReady.length) throw new ServiceError("All claims must be ready for batch before batching.", notReady.map((claim) => claim?.id));
    const batchNumber = input.name ?? `BATCH-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
    const batch = await this.insertOne("claim_batches", { batch_number: batchNumber, batch_status: "draft", clearinghouse_connection_id: input.clearinghouseConnectionId ?? null, payer_profile_id: input.payerProfileId ?? null, claim_count: input.claimIds.length, total_charge_amount: money(claims.reduce((sum, claim) => sum + money(claim?.total_charge), 0)) });
    await Promise.all(input.claimIds.map(async (claimId) => { await this.insertOne("batched_claims", { batch_id: batch.id, claim_id: claimId }); await this.transitionStatus("claims", claimId, "batched", null, { batchId: batch.id }); }));
    await this.writeAuditLog({ targetType: "claim_batches", targetId: batch.id, action: "create", newValues: batch, metadata: { claimIds: input.claimIds } });
    return batch;
  }

  async markBatchReady(batchId: string): Promise<TherassistantRecord> { return this.transitionStatus("claim_batches", batchId, "ready", null); }
  async markBatchSubmitted(batchId: string, submissionData: Record<string, unknown>): Promise<TherassistantRecord> { const batch = await this.transitionStatus("claim_batches", batchId, "submitted", null, submissionData); await this.updateOne("claim_batches", batchId, { submitted_at: new Date().toISOString() }); const { data } = await this.db.from("batched_claims").select("claim_id").eq("tenant_id", this.tenantId()).eq("batch_id", batchId).is("archived_at", null); await Promise.all(((data ?? []) as Array<{ claim_id: string }>).map((row) => this.transitionStatus("claims", row.claim_id, "submitted", null, submissionData))); return batch; }

  async recalculateClaimBalance(claimId: string): Promise<TherassistantRecord> {
    const claim = await this.findById("claims", claimId); if (!claim) throw new ServiceError("Claim not found.");
    const { data, error } = await this.db.from("payment_allocations").select("applied_amount, contractual_adjustment_amount, patient_responsibility_amount").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("archived_at", null);
    if (error) throw new ServiceError("Failed to read payment allocations.", error);
    const paid = ((data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.applied_amount), 0);
    const adjusted = ((data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.contractual_adjustment_amount), 0);
    const patient = ((data ?? []) as Array<Record<string, unknown>>).reduce((sum, row) => sum + money(row.patient_responsibility_amount), 0);
    const open = money(money(claim.total_charge) - paid - adjusted);
    return this.updateOne("claims", claimId, { claim_status: open === 0 ? "paid" : claim.claim_status, payer_responsibility_amount: Math.max(open - patient, 0), patient_responsibility_amount: patient, metadata: { ...((claim.metadata as Record<string, unknown>) ?? {}), balanceSnapshot: { paid, adjusted, patient, open } } });
  }

  async getClaimTimeline(claimId: string): Promise<Record<string, unknown>> { const claim = await this.findById("claims", claimId); if (!claim) throw new ServiceError("Claim not found."); const [{ data: statuses }, { data: audits }, { data: validations }] = await Promise.all([this.db.from("status_history").select("*").eq("tenant_id", this.tenantId()).eq("object_type", "claims").eq("object_id", claimId).order("changed_at", { ascending: true }), this.db.from("audit_logs").select("*").eq("tenant_id", this.tenantId()).eq("object_type", "claims").eq("object_id", claimId).order("created_at", { ascending: true }), this.db.from("claim_validation_errors").select("*").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).order("created_at", { ascending: true })]); return { claim, statusHistory: statuses ?? [], auditTrail: audits ?? [], validationErrors: validations ?? [] }; }

  private async createClaimLines(claim: TherassistantRecord, lines: ServiceLineInput[], dx: string[]): Promise<void> { const effectiveLines = lines.length ? lines : [{ procedureCode: "UNKNOWN", units: 1, chargeAmount: money(claim.total_charge), diagnosisPointers: ["1"] }]; await Promise.all(effectiveLines.map((line, index) => this.insertOne("claim_service_lines", { claim_id: claim.id, line_number: index + 1, service_date_from: line.serviceDateFrom ?? claim.service_date ?? new Date().toISOString().slice(0, 10), service_date_to: line.serviceDateTo ?? line.serviceDateFrom ?? claim.service_date ?? null, procedure_code: line.procedureCode, modifiers: line.modifiers ?? [], charge_amount: money(line.chargeAmount), units: Number(line.units ?? 1) || 1, diagnosis_pointers: line.diagnosisPointers?.length ? line.diagnosisPointers : dx.map((_, i) => String(i + 1)).slice(0, 4), place_of_service: line.placeOfService ?? claim.place_of_service ?? null, rendering_provider_npi: line.renderingProviderNpi ?? null, authorization_number: line.authorizationNumber ?? null }))); await Promise.all(dx.map((code, index) => this.insertOne("claim_diagnoses", { claim_id: claim.id, diagnosis_code: code, pointer_order: index + 1, diagnosis_type: index === 0 ? "principal" : "other", metadata: {} }))); }
  private async clearClaimValidationErrors(claimId: string): Promise<void> { const { error } = await this.db.from("claim_validation_errors").update({ resolved_at: new Date().toISOString() }).eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("resolved_at", null); if (error) throw new ServiceError("Failed to clear claim validation errors.", error); }
}

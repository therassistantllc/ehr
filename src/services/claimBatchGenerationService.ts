import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ClaimsService } from "./claimsService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import type {
  ClaimBatchGenerationIssue,
  ClaimBatchGenerationMode,
  GeneratedClaimBatchFile,
  GenerateClaimBatchFileInput,
} from "./claimBatchGenerationTypes";

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => text(entry).toUpperCase()).filter(Boolean) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export class ClaimBatchGenerationService extends TherassistantService {
  private readonly claims: ClaimsService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.claims = new ClaimsService(db, context);
  }

  async generateBatchFile(input: GenerateClaimBatchFileInput): Promise<GeneratedClaimBatchFile> {
    assertUuid(input.batchId, "batchId");
    const batch = await this.findById("claim_batches", input.batchId);
    if (!batch) throw new ServiceError("Claim batch not found.");

    const claimRows = await this.loadBatchClaims(input.batchId);
    const issues = await this.validateBatchClaims(claimRows);
    const valid = issues.every((issue) => issue.severity !== "error");
    const fileName = input.fileName ?? this.defaultFileName(batch, input.mode ?? "test");
    const fileContent = JSON.stringify(this.buildStructuredArtifact(batch, claimRows, issues, input.mode ?? "test"), null, 2);

    const file = await this.insertOne("claim_submission_files", {
      claim_batch_id: input.batchId,
      batch_id: input.batchId,
      file_type: "claim_batch_structured",
      file_name: fileName,
      file_content: fileContent,
      file_status: valid ? "generated" : "validation_failed",
      validation_summary: { valid, issues },
      generated_at: new Date().toISOString(),
      metadata: { mode: input.mode ?? "test" },
    });

    await this.updateOne("claim_batches", input.batchId, {
      batch_status: valid && input.markReady !== false ? "ready" : "draft",
      generated_at: new Date().toISOString(),
      claim_count: claimRows.length,
      total_charge_amount: money(claimRows.reduce((sum, row) => sum + money(row.claim.total_charge), 0)),
      metadata: { ...objectValue(batch.metadata), latestSubmissionFileId: file.id, validation: { valid, issues } },
    });

    await this.writeAuditLog({
      targetType: "claim_submission_files",
      targetId: file.id,
      action: "workflow",
      newValues: file,
      metadata: { workflow: "claim_batch_generation", batchId: input.batchId, valid },
    });

    return { batchId: input.batchId, fileId: file.id, fileName, fileContent, claimCount: claimRows.length, valid, issues };
  }

  async validateBatch(batchId: string): Promise<{ valid: boolean; issues: ClaimBatchGenerationIssue[]; claimCount: number }> {
    assertUuid(batchId, "batchId");
    const claimRows = await this.loadBatchClaims(batchId);
    const issues = await this.validateBatchClaims(claimRows);
    return { valid: issues.every((issue) => issue.severity !== "error"), issues, claimCount: claimRows.length };
  }

  async markBatchSubmitted(batchId: string, submissionFileId?: string | null): Promise<TherassistantRecord> {
    assertUuid(batchId, "batchId");
    if (submissionFileId) assertUuid(submissionFileId, "submissionFileId");
    const batch = await this.claims.markBatchSubmitted(batchId, { submissionFileId: submissionFileId ?? null, submittedVia: "manual_or_clearinghouse" });
    await this.insertOne("claim_submissions", {
      claim_batch_id: batchId,
      batch_id: batchId,
      claim_submission_file_id: submissionFileId ?? null,
      submission_status: "submitted",
      submitted_at: new Date().toISOString(),
      metadata: {},
    });
    return batch;
  }

  private async loadBatchClaims(batchId: string): Promise<Array<{ claim: TherassistantRecord; lines: TherassistantRecord[]; diagnoses: TherassistantRecord[] }>> {
    const { data: batched, error } = await this.db
      .from("batched_claims")
      .select("claim_id")
      .eq("tenant_id", this.tenantId())
      .eq("batch_id", batchId)
      .is("archived_at", null);
    if (error) throw new ServiceError("Failed to load batched claims.", error);

    const claimIds = ((batched ?? []) as Array<{ claim_id: string }>).map((row) => row.claim_id).filter(Boolean);
    const rows: Array<{ claim: TherassistantRecord; lines: TherassistantRecord[]; diagnoses: TherassistantRecord[] }> = [];
    for (const claimId of claimIds) {
      const claim = await this.findById("claims", claimId);
      if (!claim) continue;
      const [{ data: lines, error: lineError }, { data: diagnoses, error: dxError }] = await Promise.all([
        this.db.from("claim_service_lines").select("*").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("archived_at", null).order("line_number", { ascending: true }),
        this.db.from("claim_diagnoses").select("*").eq("tenant_id", this.tenantId()).eq("claim_id", claimId).is("archived_at", null).order("pointer_order", { ascending: true }),
      ]);
      if (lineError) throw new ServiceError("Failed to load claim lines.", lineError);
      if (dxError) throw new ServiceError("Failed to load claim diagnoses.", dxError);
      rows.push({ claim, lines: (lines ?? []) as TherassistantRecord[], diagnoses: (diagnoses ?? []) as TherassistantRecord[] });
    }
    return rows;
  }

  private async validateBatchClaims(claimRows: Array<{ claim: TherassistantRecord; lines: TherassistantRecord[]; diagnoses: TherassistantRecord[] }>): Promise<ClaimBatchGenerationIssue[]> {
    const issues: ClaimBatchGenerationIssue[] = [];
    if (!claimRows.length) issues.push({ field: "batch.claims", message: "Batch has no claims.", severity: "error" });
    for (const row of claimRows) {
      const claimId = row.claim.id;
      const validation = await this.claims.validateClaim(claimId);
      for (const issue of validation.issues) issues.push({ claimId, field: issue.field, message: issue.message, severity: issue.severity });
      if (!row.claim.payer_profile_id && !row.claim.insurance_policy_id) issues.push({ claimId, field: "payer", message: "Claim needs payer profile or insurance policy before batch generation.", severity: "error" });
      if (!row.lines.length) issues.push({ claimId, field: "claim_service_lines", message: "Claim has no service lines.", severity: "error" });
      const dx = arrayOfStrings(row.claim.diagnosis_codes);
      if (!dx.length && !row.diagnoses.length) issues.push({ claimId, field: "diagnosis_codes", message: "Claim has no diagnosis codes.", severity: "error" });
    }
    return issues;
  }

  private buildStructuredArtifact(batch: TherassistantRecord, claimRows: Array<{ claim: TherassistantRecord; lines: TherassistantRecord[]; diagnoses: TherassistantRecord[] }>, issues: ClaimBatchGenerationIssue[], mode: ClaimBatchGenerationMode): Record<string, unknown> {
    return {
      artifactType: "professional_claim_batch_structured",
      mode,
      batchId: batch.id,
      batchNumber: batch.batch_number ?? null,
      generatedAt: new Date().toISOString(),
      valid: issues.every((issue) => issue.severity !== "error"),
      issues,
      claims: claimRows.map((entry) => ({
        claimId: entry.claim.id,
        patientId: entry.claim.patient_id ?? entry.claim.client_id ?? null,
        payerProfileId: entry.claim.payer_profile_id ?? null,
        insurancePolicyId: entry.claim.insurance_policy_id ?? null,
        totalCharge: money(entry.claim.total_charge),
        placeOfService: entry.claim.place_of_service ?? null,
        serviceDate: entry.claim.service_date ?? null,
        claimFrequencyCode: entry.claim.claim_frequency_code ?? "1",
        diagnosisCodes: arrayOfStrings(entry.claim.diagnosis_codes),
        serviceLines: entry.lines.map((line) => ({
          lineNumber: line.line_number ?? null,
          serviceDateFrom: line.service_date_from ?? null,
          serviceDateTo: line.service_date_to ?? null,
          procedureCode: line.procedure_code ?? null,
          modifiers: arrayOfStrings(line.modifiers),
          chargeAmount: money(line.charge_amount),
          units: Number(line.units ?? 1) || 1,
          diagnosisPointers: arrayOfStrings(line.diagnosis_pointers),
          placeOfService: line.place_of_service ?? entry.claim.place_of_service ?? null,
        })),
      })),
    };
  }

  private defaultFileName(batch: TherassistantRecord, mode: ClaimBatchGenerationMode): string {
    const batchNumber = text(batch.batch_number ?? batch.id).replace(/[^A-Za-z0-9_-]/g, "_");
    return `TA_CLAIM_BATCH_${mode}_${batchNumber}_${dateStamp()}.json`;
  }
}

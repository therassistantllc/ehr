import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import {
  ChargeCaptureService,
  type CreateChargeCaptureInput,
  type ServiceLineInput,
} from "./chargeCaptureService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type ImportBatchInput = {
  sourceName: string;
  sourceType?: "csv" | "spreadsheet" | "manual" | "api" | "other";
  fileId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ImportRowInput = {
  rowNumber: number;
  rawData: Record<string, unknown>;
  mappedData?: Record<string, unknown>;
};

export type ImportedChargeRow = {
  clientId?: string | null;
  providerId?: string | null;
  appointmentId?: string | null;
  sessionId?: string | null;
  sourceObjectId?: string | null;
  serviceDate?: string | null;
  placeOfService?: string | null;
  procedureCode?: string | null;
  modifiers?: string[];
  units?: number | null;
  chargeAmount?: number | null;
  diagnosisCodes?: string[];
  insurancePolicyId?: string | null;
};

export type ImportValidationIssue = {
  rowId: string;
  rowNumber: number;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ImportValidationResult = {
  batchId: string;
  validRows: number;
  invalidRows: number;
  issues: ImportValidationIssue[];
};

export type ImportCommitResult = {
  batchId: string;
  committedChargeIds: string[];
  skippedRowIds: string[];
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  const text = asString(value);
  return text ? text.split(/[;,|]/).map((entry) => entry.trim()).filter(Boolean) : [];
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function dateOnly(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function mapped(row: TherassistantRecord): Record<string, unknown> {
  const value = row.mapped_data ?? row.normalized_data ?? row.raw_data;
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeImportedChargeRow(data: Record<string, unknown>): ImportedChargeRow {
  return {
    clientId: asString(data.clientId ?? data.client_id ?? data.patientId ?? data.patient_id),
    providerId: asString(data.providerId ?? data.provider_id ?? data.renderingProviderId ?? data.rendering_provider_id),
    appointmentId: asString(data.appointmentId ?? data.appointment_id),
    sessionId: asString(data.sessionId ?? data.session_id),
    sourceObjectId: asString(data.sourceObjectId ?? data.source_object_id ?? data.encounterId ?? data.encounter_id),
    serviceDate: dateOnly(data.serviceDate ?? data.service_date ?? data.dos ?? data.dateOfService),
    placeOfService: asString(data.placeOfService ?? data.place_of_service ?? data.pos),
    procedureCode: asString(data.procedureCode ?? data.procedure_code ?? data.cptCode ?? data.cpt_code),
    modifiers: asStringArray(data.modifiers),
    units: asNumber(data.units) ?? 1,
    chargeAmount: asNumber(data.chargeAmount ?? data.charge_amount ?? data.fee ?? data.amount),
    diagnosisCodes: asStringArray(data.diagnosisCodes ?? data.diagnosis_codes ?? data.dx ?? data.icd10),
    insurancePolicyId: asString(data.insurancePolicyId ?? data.insurance_policy_id ?? data.policyId ?? data.policy_id),
  };
}

function validateImportedCharge(rowId: string, rowNumber: number, charge: ImportedChargeRow): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];
  if (!charge.clientId) issues.push({ rowId, rowNumber, field: "clientId", message: "Client is required.", severity: "error" });
  if (!charge.providerId) issues.push({ rowId, rowNumber, field: "providerId", message: "Provider is required.", severity: "error" });
  if (!charge.serviceDate) issues.push({ rowId, rowNumber, field: "serviceDate", message: "Date of service is required.", severity: "error" });
  if (!charge.procedureCode) issues.push({ rowId, rowNumber, field: "procedureCode", message: "Procedure/CPT code is required.", severity: "error" });
  if (!charge.diagnosisCodes?.length) issues.push({ rowId, rowNumber, field: "diagnosisCodes", message: "At least one diagnosis code is required.", severity: "error" });
  if (!charge.units || charge.units <= 0) issues.push({ rowId, rowNumber, field: "units", message: "Units must be greater than zero.", severity: "error" });
  if (!charge.chargeAmount || charge.chargeAmount <= 0) issues.push({ rowId, rowNumber, field: "chargeAmount", message: "Charge amount must be greater than zero.", severity: "error" });
  if (!charge.placeOfService) issues.push({ rowId, rowNumber, field: "placeOfService", message: "Place of service is required.", severity: "error" });
  return issues;
}

function toChargeInput(rowId: string, charge: ImportedChargeRow): CreateChargeCaptureInput {
  if (!charge.clientId || !charge.providerId || !charge.serviceDate || !charge.procedureCode || !charge.chargeAmount) {
    throw new ServiceError("Imported row is missing required claim fields.");
  }
  const serviceLine: ServiceLineInput = {
    procedureCode: charge.procedureCode,
    serviceDateFrom: charge.serviceDate,
    serviceDateTo: charge.serviceDate,
    modifiers: charge.modifiers ?? [],
    diagnosisPointers: ["1"],
    units: charge.units ?? 1,
    chargeAmount: charge.chargeAmount,
    placeOfService: charge.placeOfService ?? null,
  };
  return {
    clientId: charge.clientId,
    providerId: charge.providerId,
    appointmentId: charge.appointmentId ?? null,
    sessionId: charge.sessionId ?? charge.appointmentId ?? rowId,
    sourceObjectId: charge.sourceObjectId ?? rowId,
    serviceDate: charge.serviceDate,
    placeOfService: charge.placeOfService ?? null,
    serviceLines: [serviceLine],
    diagnosisCodes: charge.diagnosisCodes ?? [],
    insurancePolicyId: charge.insurancePolicyId ?? null,
    noteSigned: true,
    billingFieldsComplete: true,
    metadata: { source: "import", importRowId: rowId },
  };
}

export class ImportChargeWorkflowService extends TherassistantService {
  private readonly chargeCapture: ChargeCaptureService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.chargeCapture = new ChargeCaptureService(db, context);
  }

  async createImportBatch(input: ImportBatchInput): Promise<TherassistantRecord> {
    const batch = await this.insertOne("import_batches", {
      source_name: input.sourceName,
      source_type: input.sourceType ?? "manual",
      import_file_id: input.fileId ?? null,
      status: "staged",
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "import_batches", targetId: batch.id, action: "create", newValues: batch });
    return batch;
  }

  async addImportRows(batchId: string, rows: ImportRowInput[]): Promise<TherassistantRecord[]> {
    assertUuid(batchId, "batchId");
    if (!rows.length) throw new ServiceError("At least one import row is required.");
    const created: TherassistantRecord[] = [];
    for (const row of rows) {
      const normalized = normalizeImportedChargeRow(row.mappedData ?? row.rawData);
      created.push(await this.insertOne("import_rows", {
        import_batch_id: batchId,
        row_number: row.rowNumber,
        raw_data: row.rawData,
        mapped_data: row.mappedData ?? normalized,
        row_status: "staged",
        metadata: {},
      }));
    }
    await this.updateOne("import_batches", batchId, { status: "rows_staged", row_count: created.length });
    return created;
  }

  async validateBatch(batchId: string): Promise<ImportValidationResult> {
    assertUuid(batchId, "batchId");
    const { data, error } = await this.db
      .from("import_rows")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .eq("import_batch_id", batchId)
      .is("archived_at", null)
      .order("row_number", { ascending: true });
    if (error) throw new ServiceError("Failed to load import rows.", error);

    const rows = (data ?? []) as TherassistantRecord[];
    const issues: ImportValidationIssue[] = [];
    for (const row of rows) {
      const rowNumber = Number(row.row_number ?? 0);
      const charge = normalizeImportedChargeRow(mapped(row));
      const rowIssues = validateImportedCharge(row.id, rowNumber, charge);
      issues.push(...rowIssues);
      await this.updateOne("import_rows", row.id, {
        mapped_data: charge,
        row_status: rowIssues.some((issue) => issue.severity === "error") ? "invalid" : "valid",
        validation_summary: { issues: rowIssues },
      });
      for (const issue of rowIssues) {
        await this.insertOne("import_validation_errors", {
          import_batch_id: batchId,
          import_row_id: row.id,
          row_number: rowNumber,
          field_name: issue.field,
          severity: issue.severity,
          message: issue.message,
          metadata: {},
        });
      }
    }

    const invalidRowIds = new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.rowId));
    const result: ImportValidationResult = {
      batchId,
      validRows: rows.length - invalidRowIds.size,
      invalidRows: invalidRowIds.size,
      issues,
    };
    await this.updateOne("import_batches", batchId, {
      status: result.invalidRows ? "validation_failed" : "validated",
      valid_row_count: result.validRows,
      invalid_row_count: result.invalidRows,
      validation_summary: result,
    });
    return result;
  }

  async commitValidRowsToCharges(batchId: string): Promise<ImportCommitResult> {
    assertUuid(batchId, "batchId");
    const validation = await this.validateBatch(batchId);
    const { data, error } = await this.db
      .from("import_rows")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .eq("import_batch_id", batchId)
      .eq("row_status", "valid")
      .is("archived_at", null)
      .order("row_number", { ascending: true });
    if (error) throw new ServiceError("Failed to load valid import rows.", error);

    const committedChargeIds: string[] = [];
    const skippedRowIds = validation.issues.map((issue) => issue.rowId);
    for (const row of (data ?? []) as TherassistantRecord[]) {
      const charge = await this.chargeCapture.createChargeCaptureItem(toChargeInput(row.id, normalizeImportedChargeRow(mapped(row))));
      committedChargeIds.push(charge.id);
      await this.updateOne("import_rows", row.id, {
        row_status: "committed",
        committed_object_type: "charges",
        committed_object_id: charge.id,
      });
    }

    await this.insertOne("import_commits", {
      import_batch_id: batchId,
      committed_object_type: "charges",
      committed_count: committedChargeIds.length,
      skipped_count: skippedRowIds.length,
      metadata: { committedChargeIds, skippedRowIds },
    });
    await this.updateOne("import_batches", batchId, {
      status: skippedRowIds.length ? "partially_committed" : "committed",
      committed_row_count: committedChargeIds.length,
    });
    await this.writeAuditLog({
      targetType: "import_batches",
      targetId: batchId,
      action: "workflow",
      metadata: { workflow: "import_to_charge_capture", committedChargeIds, skippedRowIds },
    });
    return { batchId, committedChargeIds, skippedRowIds };
  }
}

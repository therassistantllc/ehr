import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import {
  ChargeCaptureService,
  type CreateChargeCaptureInput,
  type ServiceLineInput,
} from "./chargeCaptureService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type ImportWorkflowStatus = "draft" | "staged" | "validated" | "validation_failed" | "committed" | "rolled_back";

export type ImportRowInput = {
  rowNumber: number;
  rawData: Record<string, unknown>;
  normalizedData?: Record<string, unknown>;
};

export type StartImportBatchInput = {
  sourceSystem: string;
  importType: "charges" | "clients" | "payments" | "eligibility" | "unknown";
  fileName?: string | null;
  fileId?: string | null;
  rows?: ImportRowInput[];
  metadata?: Record<string, unknown>;
};

export type ImportValidationIssue = {
  rowId?: string | null;
  rowNumber?: number | null;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ImportValidationResult = {
  batchId: string;
  valid: boolean;
  issues: ImportValidationIssue[];
  rowCount: number;
  validRowCount: number;
};

export type CommitImportResult = {
  batchId: string;
  committedCount: number;
  createdChargeIds: string[];
  skippedRowIds: string[];
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function dateOnly(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean);
  const raw = asString(value);
  return raw ? raw.split(/[;,|]/).map((entry) => entry.trim().toUpperCase()).filter(Boolean) : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstPresent(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return null;
}

function rowToChargeInput(row: TherassistantRecord): CreateChargeCaptureInput {
  const data = objectValue(row.normalized_data ?? row.raw_data);
  const clientId = asString(firstPresent(data, ["clientId", "client_id", "patientId", "patient_id"]));
  const providerId = asString(firstPresent(data, ["providerId", "provider_id", "renderingProviderId", "rendering_provider_id"]));
  const serviceDate = dateOnly(firstPresent(data, ["serviceDate", "service_date", "dos", "dateOfService", "date_of_service"]));
  const procedureCode = asString(firstPresent(data, ["procedureCode", "procedure_code", "cpt", "cptCode", "cpt_code"]));
  const chargeAmount = money(firstPresent(data, ["chargeAmount", "charge_amount", "amount", "fee", "billedAmount", "billed_amount"]));
  const units = Number(firstPresent(data, ["units", "unit_count"]) ?? 1) || 1;
  const placeOfService = asString(firstPresent(data, ["placeOfService", "place_of_service", "pos"]));
  const diagnosisCodes = stringArray(firstPresent(data, ["diagnosisCodes", "diagnosis_codes", "icd10", "icd_10", "diagnosis"]));
  const insurancePolicyId = asString(firstPresent(data, ["insurancePolicyId", "insurance_policy_id", "policyId", "policy_id"]));
  const appointmentId = asString(firstPresent(data, ["appointmentId", "appointment_id"]));
  const sessionId = asString(firstPresent(data, ["sessionId", "session_id", "encounterId", "encounter_id"]));

  if (!clientId) throw new ServiceError("Import row is missing client id.", row);
  if (!providerId) throw new ServiceError("Import row is missing provider id.", row);
  if (!serviceDate) throw new ServiceError("Import row is missing a valid date of service.", row);
  if (!procedureCode) throw new ServiceError("Import row is missing procedure code.", row);

  const serviceLine: ServiceLineInput = {
    procedureCode,
    serviceDateFrom: serviceDate,
    serviceDateTo: serviceDate,
    units,
    chargeAmount,
    placeOfService,
    diagnosisPointers: ["1"],
  };

  return {
    clientId,
    providerId,
    appointmentId,
    sessionId: sessionId ?? appointmentId ?? row.id,
    sourceObjectId: row.id,
    serviceDate,
    placeOfService,
    serviceLines: [serviceLine],
    diagnosisCodes,
    insurancePolicyId,
    noteSigned: true,
    billingFieldsComplete: true,
    metadata: { importRowId: row.id, importBatchId: row.import_batch_id ?? row.batch_id ?? null },
  };
}

export class ImportWorkflowService extends TherassistantService {
  private readonly chargeCapture: ChargeCaptureService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.chargeCapture = new ChargeCaptureService(db, context);
  }

  async startImportBatch(input: StartImportBatchInput): Promise<TherassistantRecord> {
    const batch = await this.insertOne("import_batches", {
      source_system: input.sourceSystem,
      import_type: input.importType,
      status: "staged" satisfies ImportWorkflowStatus,
      file_name: input.fileName ?? null,
      import_file_id: input.fileId ?? null,
      row_count: input.rows?.length ?? 0,
      metadata: input.metadata ?? {},
    });

    if (input.rows?.length) {
      await Promise.all(input.rows.map((row) => this.addImportRow(batch.id, row)));
    }

    await this.writeAuditLog({ targetType: "import_batches", targetId: batch.id, action: "create", newValues: batch });
    return batch;
  }

  async addImportRow(batchId: string, input: ImportRowInput): Promise<TherassistantRecord> {
    assertUuid(batchId, "batchId");
    return this.insertOne("import_rows", {
      import_batch_id: batchId,
      batch_id: batchId,
      row_number: input.rowNumber,
      raw_data: input.rawData,
      normalized_data: input.normalizedData ?? input.rawData,
      row_status: "staged",
      status: "staged",
    });
  }

  async validateChargeImportBatch(batchId: string): Promise<ImportValidationResult> {
    assertUuid(batchId, "batchId");
    const { data, error } = await this.db
      .from("import_rows")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .or(`import_batch_id.eq.${batchId},batch_id.eq.${batchId}`)
      .is("archived_at", null)
      .order("row_number", { ascending: true });
    if (error) throw new ServiceError("Failed to load import rows.", error);

    const rows = (data ?? []) as TherassistantRecord[];
    const issues: ImportValidationIssue[] = [];

    await this.clearValidationErrors(batchId);

    for (const row of rows) {
      const rowIssues = this.validateChargeImportRow(row);
      issues.push(...rowIssues);
      const hasError = rowIssues.some((issue) => issue.severity === "error");
      await this.updateOne("import_rows", row.id, { row_status: hasError ? "validation_failed" : "validated", status: hasError ? "validation_failed" : "validated" });
      for (const issue of rowIssues) {
        await this.insertOne("import_validation_errors", {
          import_batch_id: batchId,
          import_row_id: row.id,
          row_number: row.row_number ?? null,
          field_name: issue.field,
          severity: issue.severity,
          message: issue.message,
          is_blocking: issue.severity === "error",
          metadata: issue,
        });
      }
    }

    const valid = issues.every((issue) => issue.severity !== "error");
    await this.updateOne("import_batches", batchId, { status: valid ? "validated" : "validation_failed", row_count: rows.length });
    return {
      batchId,
      valid,
      issues,
      rowCount: rows.length,
      validRowCount: rows.length - new Set(issues.filter((issue) => issue.severity === "error").map((issue) => issue.rowId)).size,
    };
  }

  async commitChargeImportBatch(batchId: string): Promise<CommitImportResult> {
    assertUuid(batchId, "batchId");
    const validation = await this.validateChargeImportBatch(batchId);
    if (!validation.valid) throw new ServiceError("Import batch has blocking validation errors.", validation.issues);

    const { data, error } = await this.db
      .from("import_rows")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .or(`import_batch_id.eq.${batchId},batch_id.eq.${batchId}`)
      .in("row_status", ["validated", "committed"])
      .is("archived_at", null)
      .order("row_number", { ascending: true });
    if (error) throw new ServiceError("Failed to load validated import rows.", error);

    const createdChargeIds: string[] = [];
    const skippedRowIds: string[] = [];

    for (const row of (data ?? []) as TherassistantRecord[]) {
      if (row.row_status === "committed") {
        skippedRowIds.push(row.id);
        continue;
      }
      const chargeInput = rowToChargeInput(row);
      const charge = await this.chargeCapture.createChargeCaptureItem(chargeInput);
      createdChargeIds.push(charge.id);
      await this.updateOne("import_rows", row.id, {
        row_status: "committed",
        status: "committed",
        committed_object_type: "charges",
        committed_object_id: charge.id,
      });
    }

    const commit = await this.insertOne("import_commits", {
      import_batch_id: batchId,
      committed_object_type: "charges",
      committed_count: createdChargeIds.length,
      committed_object_ids: createdChargeIds,
      metadata: { skippedRowIds },
    });
    await this.updateOne("import_batches", batchId, { status: "committed", committed_at: new Date().toISOString() });
    await this.writeAuditLog({ targetType: "import_commits", targetId: commit.id, action: "workflow", newValues: commit, metadata: { batchId, createdChargeIds } });

    return { batchId, committedCount: createdChargeIds.length, createdChargeIds, skippedRowIds };
  }

  private validateChargeImportRow(row: TherassistantRecord): ImportValidationIssue[] {
    const data = objectValue(row.normalized_data ?? row.raw_data);
    const issues: ImportValidationIssue[] = [];
    const rowId = row.id;
    const rowNumber = Number(row.row_number ?? 0) || null;

    if (!asString(firstPresent(data, ["clientId", "client_id", "patientId", "patient_id"]))) issues.push({ rowId, rowNumber, field: "client_id", message: "Client/patient id is required.", severity: "error" });
    if (!asString(firstPresent(data, ["providerId", "provider_id", "renderingProviderId", "rendering_provider_id"]))) issues.push({ rowId, rowNumber, field: "provider_id", message: "Provider id is required.", severity: "error" });
    if (!dateOnly(firstPresent(data, ["serviceDate", "service_date", "dos", "dateOfService", "date_of_service"]))) issues.push({ rowId, rowNumber, field: "service_date", message: "Valid date of service is required.", severity: "error" });
    if (!asString(firstPresent(data, ["procedureCode", "procedure_code", "cpt", "cptCode", "cpt_code"]))) issues.push({ rowId, rowNumber, field: "procedure_code", message: "Procedure code is required.", severity: "error" });
    if (money(firstPresent(data, ["chargeAmount", "charge_amount", "amount", "fee", "billedAmount", "billed_amount"])) <= 0) issues.push({ rowId, rowNumber, field: "charge_amount", message: "Charge amount must be greater than zero.", severity: "error" });
    if (!stringArray(firstPresent(data, ["diagnosisCodes", "diagnosis_codes", "icd10", "icd_10", "diagnosis"])).length) issues.push({ rowId, rowNumber, field: "diagnosis_codes", message: "At least one diagnosis code is required.", severity: "error" });
    if (!asString(firstPresent(data, ["placeOfService", "place_of_service", "pos"]))) issues.push({ rowId, rowNumber, field: "place_of_service", message: "Place of service is required.", severity: "error" });

    return issues;
  }

  private async clearValidationErrors(batchId: string): Promise<void> {
    const { error } = await this.db
      .from("import_validation_errors")
      .update({ archived_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId())
      .eq("import_batch_id", batchId)
      .is("archived_at", null);
    if (error) throw new ServiceError("Failed to clear import validation errors.", error);
  }
}

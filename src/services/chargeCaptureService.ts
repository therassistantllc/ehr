import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type ChargeCaptureTab = "ready_for_review" | "documentation_missing" | "coding_mismatch" | "eligibility_auth_issue" | "held_charges" | "released_to_claims";
export type ChargeCaptureAction = "approve" | "hold" | "route_back" | "void";
export type ChargeBlocker = { field: string; message: string; severity?: "error" | "warning" };
export type ServiceLineInput = { procedureCode: string; serviceDateFrom?: string; serviceDateTo?: string; modifiers?: string[]; diagnosisPointers?: string[]; units?: number; chargeAmount?: number; placeOfService?: string | null; renderingProviderNpi?: string | null; authorizationNumber?: string | null };
export type CreateChargeCaptureInput = { clientId: string; providerId: string; sessionId?: string | null; appointmentId?: string | null; sourceObjectId?: string | null; serviceDate: string; placeOfService?: string | null; serviceLines: ServiceLineInput[]; diagnosisCodes?: string[]; insurancePolicyId?: string | null; noteSigned?: boolean; billingFieldsComplete?: boolean; metadata?: Record<string, unknown> };
export type ChargeCapturePatch = { serviceDate?: string | null; placeOfService?: string | null; serviceLines?: ServiceLineInput[]; diagnosisCodes?: string[]; insurancePolicyId?: string | null; action?: ChargeCaptureAction; actionReason?: string; noteSigned?: boolean; billingFieldsComplete?: boolean };
export type ChargeCaptureQueueFilters = { tab?: ChargeCaptureTab; status?: string; clientId?: string; providerId?: string; dosFrom?: string; dosTo?: string; minAmount?: number; priority?: "urgent" | "normal" | "all"; limit?: number };

function dateOnly(value: string): string { const d = new Date(value); if (Number.isNaN(d.getTime())) throw new ServiceError("Invalid service date."); return d.toISOString().slice(0, 10); }
function money(value: unknown): number { const n = Number(value ?? 0); return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0; }
function normalizeCode(value: string): string { return value.trim().toUpperCase(); }
function normalizeLines(lines: ServiceLineInput[], serviceDate: string, pos?: string | null): ServiceLineInput[] { return lines.map((line) => ({ ...line, procedureCode: normalizeCode(line.procedureCode ?? ""), serviceDateFrom: line.serviceDateFrom ? dateOnly(line.serviceDateFrom) : dateOnly(serviceDate), serviceDateTo: line.serviceDateTo ? dateOnly(line.serviceDateTo) : line.serviceDateFrom ? dateOnly(line.serviceDateFrom) : dateOnly(serviceDate), units: Number(line.units ?? 1) || 1, chargeAmount: money(line.chargeAmount), placeOfService: line.placeOfService ?? pos ?? null, modifiers: (line.modifiers ?? []).map(normalizeCode).filter(Boolean), diagnosisPointers: line.diagnosisPointers?.length ? line.diagnosisPointers : ["1"] })).filter((line) => Boolean(line.procedureCode)); }
function total(lines: ServiceLineInput[]): number { return money(lines.reduce((sum, line) => sum + money(line.chargeAmount) * (Number(line.units ?? 1) || 1), 0)); }
function parseBlockers(value: unknown): ChargeBlocker[] { return Array.isArray(value) ? value.filter(Boolean) as ChargeBlocker[] : []; }

export function classifyChargeCaptureTab(input: { chargeStatus: string; blockers: ChargeBlocker[]; noteSigned: boolean; billingFieldsComplete?: boolean; eligibilityStatus?: string | null; authorizationRequired?: boolean }): ChargeCaptureTab {
  const status = input.chargeStatus.toLowerCase();
  if (["released", "batched", "downloaded", "submitted", "claimed"].includes(status)) return "released_to_claims";
  if (["blocked", "hold", "held", "void", "voided"].includes(status)) return "held_charges";
  const fields = new Set(input.blockers.map((blocker) => blocker.field));
  if (!input.noteSigned || input.billingFieldsComplete === false || fields.has("documentation")) return "documentation_missing";
  if (fields.has("diagnosis_codes") || fields.has("service_lines")) return "coding_mismatch";
  if (input.authorizationRequired || fields.has("eligibility") || fields.has("authorization")) return "eligibility_auth_issue";
  return "ready_for_review";
}

export class ChargeCaptureService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) { super(db, context); }

  async createChargeCaptureItem(input: CreateChargeCaptureInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId"); assertUuid(input.providerId, "providerId");
    const serviceLines = normalizeLines(input.serviceLines, input.serviceDate, input.placeOfService);
    const blockerReasons = await this.validateChargePayload({ ...input, serviceLines });
    const sourceId = input.sourceObjectId ?? input.appointmentId ?? input.sessionId;
    const sessionId = input.sessionId ?? input.appointmentId ?? sourceId;
    if (!sourceId || !sessionId) throw new ServiceError("Charge capture requires a source id.");
    const charge = await this.insertOne("charges", { session_id: sessionId, source_object_type: "encounter", source_object_id: sourceId, client_id: input.clientId, provider_id: input.providerId, appointment_id: input.appointmentId ?? null, insurance_policy_id: input.insurancePolicyId ?? null, charge_status: blockerReasons.length ? "blocked" : "captured", service_date: dateOnly(input.serviceDate), diagnosis_codes: (input.diagnosisCodes ?? []).map(normalizeCode), service_lines: serviceLines, total_charge: total(serviceLines), place_of_service: input.placeOfService ?? serviceLines[0]?.placeOfService ?? null, note_signed: input.noteSigned ?? false, billing_fields_complete: input.billingFieldsComplete ?? false, blocker_reasons: blockerReasons, metadata: input.metadata ?? {} });
    await this.writeAuditLog({ targetType: "charges", targetId: charge.id, action: "create", newValues: charge });
    return charge;
  }

  async updateChargeCaptureItem(chargeId: string, patch: ChargeCapturePatch): Promise<TherassistantRecord> {
    const existing = await this.findById("charges", chargeId); if (!existing) throw new ServiceError("Charge not found.");
    const serviceLines = patch.serviceLines ? normalizeLines(patch.serviceLines, patch.serviceDate ?? String(existing.service_date), patch.placeOfService ?? String(existing.place_of_service ?? "")) : ((existing.service_lines as ServiceLineInput[] | undefined) ?? []);
    const blockerReasons = patch.action === "hold" || patch.action === "route_back" ? [{ field: patch.action, message: patch.actionReason ?? patch.action, severity: "error" as const }] : await this.validateChargePayload({ clientId: String(existing.client_id), serviceDate: patch.serviceDate ?? String(existing.service_date), placeOfService: patch.placeOfService ?? String(existing.place_of_service ?? ""), serviceLines, diagnosisCodes: patch.diagnosisCodes ?? ((existing.diagnosis_codes as string[] | undefined) ?? []), insurancePolicyId: patch.insurancePolicyId ?? (typeof existing.insurance_policy_id === "string" ? existing.insurance_policy_id : null), noteSigned: patch.noteSigned ?? Boolean(existing.note_signed), billingFieldsComplete: patch.billingFieldsComplete ?? Boolean(existing.billing_fields_complete) });
    const chargeStatus = patch.action === "approve" ? blockerReasons.length ? "blocked" : "ready_for_claim" : patch.action === "void" ? "void" : patch.action ? "blocked" : blockerReasons.length ? "blocked" : String(existing.charge_status ?? "captured");
    const updated = await this.updateOne("charges", chargeId, { charge_status: chargeStatus, service_date: patch.serviceDate ? dateOnly(patch.serviceDate) : existing.service_date, place_of_service: patch.placeOfService ?? existing.place_of_service ?? null, diagnosis_codes: (patch.diagnosisCodes ?? ((existing.diagnosis_codes as string[] | undefined) ?? [])).map(normalizeCode), service_lines: serviceLines, total_charge: total(serviceLines), insurance_policy_id: patch.insurancePolicyId ?? existing.insurance_policy_id ?? null, note_signed: patch.noteSigned ?? existing.note_signed ?? false, billing_fields_complete: patch.billingFieldsComplete ?? existing.billing_fields_complete ?? false, blocker_reasons: blockerReasons });
    await this.writeAuditLog({ targetType: "charges", targetId: chargeId, action: patch.action ? "status_change" : "update", oldValues: existing, newValues: updated });
    return updated;
  }

  async approveForClaim(chargeId: string): Promise<TherassistantRecord> { const charge = await this.updateChargeCaptureItem(chargeId, { action: "approve" }); if (charge.charge_status !== "ready_for_claim") throw new ServiceError("Charge still has blockers.", charge.blocker_reasons); return charge; }

  async listChargeCaptureQueue(filters: ChargeCaptureQueueFilters = {}): Promise<Array<Record<string, unknown>>> {
    let query = this.db.from("charges").select("*").eq("tenant_id", this.tenantId()).is("archived_at", null).order("service_date", { ascending: true });
    if (filters.status) query = query.eq("charge_status", filters.status); if (filters.clientId) query = query.eq("client_id", filters.clientId); if (filters.providerId) query = query.eq("provider_id", filters.providerId); if (filters.dosFrom) query = query.gte("service_date", dateOnly(filters.dosFrom)); if (filters.dosTo) query = query.lte("service_date", dateOnly(filters.dosTo)); if (filters.minAmount !== undefined) query = query.gte("total_charge", filters.minAmount); if (filters.limit) query = query.limit(filters.limit);
    const { data, error } = await query; if (error) throw new ServiceError("Failed to load charge capture queue.", error);
    return ((data ?? []) as TherassistantRecord[]).map((charge) => { const serviceLines = (charge.service_lines as ServiceLineInput[] | undefined) ?? []; const blockerReasons = parseBlockers(charge.blocker_reasons); const tab = classifyChargeCaptureTab({ chargeStatus: String(charge.charge_status ?? ""), blockers: blockerReasons, noteSigned: Boolean(charge.note_signed), billingFieldsComplete: Boolean(charge.billing_fields_complete) }); return { id: charge.id, tab, status: charge.charge_status, dateOfService: charge.service_date, clientId: charge.client_id, providerId: charge.provider_id, cptCode: serviceLines[0]?.procedureCode, diagnosisCodes: charge.diagnosis_codes ?? [], serviceLines, chargeAmount: money(charge.total_charge), blockers: blockerReasons.map((blocker) => blocker.message) }; }).filter((row) => !filters.tab || row.tab === filters.tab);
  }

  async validateChargePayload(input: Pick<CreateChargeCaptureInput, "serviceDate" | "placeOfService" | "serviceLines" | "diagnosisCodes" | "noteSigned" | "billingFieldsComplete" | "clientId" | "insurancePolicyId">): Promise<ChargeBlocker[]> {
    const issues: ChargeBlocker[] = [];
    if (!input.noteSigned) issues.push({ field: "documentation", message: "Signed note is required before claim creation." });
    if (input.billingFieldsComplete === false) issues.push({ field: "required_billing_fields", message: "Required billing fields are incomplete." });
    if (!input.serviceDate) issues.push({ field: "service_date", message: "Date of service is required." });
    if (!input.serviceLines.length) issues.push({ field: "service_lines", message: "At least one service line is required." });
    if (!input.diagnosisCodes?.length) issues.push({ field: "diagnosis_codes", message: "At least one diagnosis code is required." });
    for (const line of input.serviceLines) { const pos = line.placeOfService ?? input.placeOfService; if (!line.procedureCode) issues.push({ field: "service_lines", message: "Procedure code is required." }); if (!line.units || line.units <= 0) issues.push({ field: "service_lines", message: "Units must be greater than zero." }); if (pos && !["02", "10", "11", "12", "53"].includes(pos)) issues.push({ field: "place_of_service", message: "Place of service is not allowed." }); }
    return issues;
  }
}

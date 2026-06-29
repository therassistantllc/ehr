import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import { EligibilityService } from "./eligibilityService";

export type ChargeCaptureTab =
  | "ready_for_review"
  | "documentation_missing"
  | "coding_mismatch"
  | "eligibility_auth_issue"
  | "held_charges"
  | "released_to_claims";

export type ChargeCaptureAction = "approve" | "hold" | "route_back" | "void";

export type ChargeBlocker = {
  field: string;
  message: string;
  severity?: "error" | "warning";
};

export type ServiceLineInput = {
  procedureCode: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  modifiers?: string[];
  diagnosisPointers?: string[];
  units?: number;
  chargeAmount?: number;
  placeOfService?: string | null;
  renderingProviderNpi?: string | null;
  authorizationNumber?: string | null;
};

export type CreateChargeCaptureInput = {
  clientId: string;
  providerId: string;
  appointmentId?: string | null;
  clinicalNoteId?: string | null;
  serviceDate: string;
  placeOfService?: string | null;
  serviceLines: ServiceLineInput[];
  diagnosisCodes?: string[];
  insurancePolicyId?: string | null;
  noteSigned?: boolean;
  billingFieldsComplete?: boolean;
  metadata?: Record<string, unknown>;
};

export type ChargeCapturePatch = {
  serviceDate?: string | null;
  placeOfService?: string | null;
  serviceLines?: ServiceLineInput[];
  diagnosisCodes?: string[];
  insurancePolicyId?: string | null;
  action?: ChargeCaptureAction;
  actionReason?: string;
  noteSigned?: boolean;
  billingFieldsComplete?: boolean;
};

export type ChargeCaptureQueueFilters = {
  tab?: ChargeCaptureTab;
  status?: string;
  clientId?: string;
  providerId?: string;
  payerId?: string;
  dosFrom?: string;
  dosTo?: string;
  minAmount?: number;
  priority?: "urgent" | "normal" | "all";
  limit?: number;
};

const DOWNSTREAM_CHARGE_STATUSES = new Set(["released", "batched", "downloaded", "submitted", "claim_created", "ready_for_batch", "claimed"]);
const ALLOWED_PLACE_OF_SERVICE = new Set(["02", "10", "11", "12", "53"]);

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function serviceDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ServiceError("Invalid service date.");
  return d.toISOString().slice(0, 10);
}

function normalizeServiceLines(lines: ServiceLineInput[], fallbackServiceDate?: string | null, fallbackPos?: string | null): ServiceLineInput[] {
  return lines
    .map((line) => {
      const procedureCode = normalizeCode(line.procedureCode ?? "");
      if (!procedureCode) return null;
      const from = line.serviceDateFrom ?? fallbackServiceDate ?? undefined;
      const normalizedFrom = from ? serviceDate(from) : undefined;
      return {
        procedureCode,
        serviceDateFrom: normalizedFrom,
        serviceDateTo: line.serviceDateTo ? serviceDate(line.serviceDateTo) : normalizedFrom,
        modifiers: (line.modifiers ?? []).map(normalizeCode).filter(Boolean),
        diagnosisPointers: line.diagnosisPointers?.length ? line.diagnosisPointers.map(text).filter(Boolean) : ["1"],
        units: Number(line.units ?? 1) || 1,
        chargeAmount: money(line.chargeAmount ?? 0),
        placeOfService: line.placeOfService ?? fallbackPos ?? null,
        renderingProviderNpi: line.renderingProviderNpi ?? null,
        authorizationNumber: line.authorizationNumber ?? null,
      } satisfies ServiceLineInput;
    })
    .filter((line): line is ServiceLineInput => line !== null);
}

function totalCharge(lines: ServiceLineInput[]): number {
  return money(lines.reduce((sum, line) => sum + money(line.chargeAmount) * (Number(line.units ?? 1) || 1), 0));
}

function blockerMessages(blockers: unknown): ChargeBlocker[] {
  if (!Array.isArray(blockers)) return [];
  return blockers
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      return {
        field: text(row.field || "general"),
        message: text(row.message || "Needs review"),
        severity: row.severity === "warning" ? "warning" : "error",
      } satisfies ChargeBlocker;
    })
    .filter((entry): entry is ChargeBlocker => Boolean(entry));
}

export function classifyChargeCaptureTab(input: {
  chargeStatus: string;
  blockers: ChargeBlocker[];
  noteSigned: boolean;
  billingFieldsComplete?: boolean;
  eligibilityStatus?: string | null;
  authorizationRequired?: boolean;
}): ChargeCaptureTab {
  const chargeStatus = input.chargeStatus.toLowerCase();
  if (DOWNSTREAM_CHARGE_STATUSES.has(chargeStatus)) return "released_to_claims";
  if (["blocked", "void", "voided", "held"].includes(chargeStatus)) return "held_charges";

  const fields = new Set(input.blockers.map((blocker) => blocker.field.toLowerCase()));
  if (!input.noteSigned || input.billingFieldsComplete === false || fields.has("documentation") || fields.has("note") || fields.has("required_billing_fields")) {
    return "documentation_missing";
  }

  if (fields.has("diagnosis_codes") || fields.has("service_lines") || fields.has("service_lines.procedure_code") || fields.has("cpt") || fields.has("modifier")) {
    return "coding_mismatch";
  }

  const eligibilityStatus = (input.eligibilityStatus ?? "").toLowerCase();
  if (input.authorizationRequired || (eligibilityStatus && !["active", "covered"].includes(eligibilityStatus)) || fields.has("eligibility") || fields.has("authorization") || fields.has("auth")) {
    return "eligibility_auth_issue";
  }

  return "ready_for_review";
}

export class ChargeCaptureService extends TherassistantService {
  private readonly eligibility: EligibilityService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.eligibility = new EligibilityService(db, context);
  }

  async createChargeCaptureItem(input: CreateChargeCaptureInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.providerId, "providerId");

    const normalizedLines = normalizeServiceLines(input.serviceLines, input.serviceDate, input.placeOfService);
    const blockers = await this.validateChargePayload({ ...input, serviceLines: normalizedLines });
    const status = blockers.length > 0 ? "blocked" : "captured";

    const charge = await this.insertOne("charges", {
      name: normalizedLines[0]?.procedureCode ?? "Charge capture item",
      status,
      client_id: input.clientId,
      provider_id: input.providerId,
      appointment_id: input.appointmentId ?? null,
      clinical_note_id: input.clinicalNoteId ?? null,
      service_date: serviceDate(input.serviceDate),
      place_of_service: input.placeOfService ?? normalizedLines[0]?.placeOfService ?? null,
      cpt_code: normalizedLines[0]?.procedureCode ?? null,
      units: normalizedLines.reduce((sum, line) => sum + (Number(line.units ?? 1) || 1), 0),
      charge_amount: totalCharge(normalizedLines),
      service_lines: normalizedLines,
      diagnosis_codes: (input.diagnosisCodes ?? []).map(normalizeCode).filter(Boolean),
      insurance_policy_id: input.insurancePolicyId ?? null,
      note_signed: input.noteSigned ?? false,
      billing_fields_complete: input.billingFieldsComplete ?? false,
      blocker_reasons: blockers,
      data: input.metadata ?? {},
    });

    if (blockers.length > 0) {
      await this.routeBlockersToWorkqueues(charge, blockers);
    }

    await this.writeAuditLog({
      targetType: "charges",
      targetId: charge.id,
      action: "create",
      newValues: charge,
    });

    return charge;
  }

  async updateChargeCaptureItem(chargeId: string, patch: ChargeCapturePatch): Promise<TherassistantRecord> {
    const existing = await this.findById("charges", chargeId);
    if (!existing) throw new ServiceError("Charge not found.");

    const normalizedLines = patch.serviceLines
      ? normalizeServiceLines(patch.serviceLines, patch.serviceDate ?? String(existing.service_date ?? ""), patch.placeOfService ?? String(existing.place_of_service ?? ""))
      : ((existing.service_lines as ServiceLineInput[] | undefined) ?? []);

    const mergedInput: CreateChargeCaptureInput = {
      clientId: String(existing.client_id),
      providerId: String(existing.provider_id),
      appointmentId: typeof existing.appointment_id === "string" ? existing.appointment_id : null,
      clinicalNoteId: typeof existing.clinical_note_id === "string" ? existing.clinical_note_id : null,
      serviceDate: patch.serviceDate ?? String(existing.service_date),
      placeOfService: patch.placeOfService ?? (typeof existing.place_of_service === "string" ? existing.place_of_service : null),
      serviceLines: normalizedLines,
      diagnosisCodes: patch.diagnosisCodes ?? ((existing.diagnosis_codes as string[] | undefined) ?? []),
      insurancePolicyId: patch.insurancePolicyId ?? (typeof existing.insurance_policy_id === "string" ? existing.insurance_policy_id : null),
      noteSigned: patch.noteSigned ?? Boolean(existing.note_signed),
      billingFieldsComplete: patch.billingFieldsComplete ?? Boolean(existing.billing_fields_complete),
    };

    const blockers = patch.action === "hold" || patch.action === "route_back"
      ? [
          ...blockerMessages(existing.blocker_reasons),
          {
            field: patch.action,
            message: patch.actionReason ? `${patch.action === "hold" ? "Held by biller" : "Routed back"}: ${patch.actionReason}` : patch.action === "hold" ? "Held by biller" : "Routed back",
            severity: "error" as const,
          },
        ]
      : await this.validateChargePayload(mergedInput);

    const actionStatus: Record<ChargeCaptureAction, string> = {
      approve: blockers.length > 0 ? "blocked" : "ready_for_claim",
      hold: "blocked",
      route_back: "blocked",
      void: "void",
    };

    const status = patch.action ? actionStatus[patch.action] : blockers.length > 0 ? "blocked" : String(existing.status ?? "captured");

    const updated = await this.updateOne("charges", chargeId, {
      status,
      service_date: patch.serviceDate ? serviceDate(patch.serviceDate) : existing.service_date,
      place_of_service: patch.placeOfService ?? existing.place_of_service ?? null,
      cpt_code: normalizedLines[0]?.procedureCode ?? existing.cpt_code ?? null,
      units: normalizedLines.reduce((sum, line) => sum + (Number(line.units ?? 1) || 1), 0),
      charge_amount: totalCharge(normalizedLines),
      service_lines: normalizedLines,
      diagnosis_codes: (mergedInput.diagnosisCodes ?? []).map(normalizeCode).filter(Boolean),
      insurance_policy_id: mergedInput.insurancePolicyId,
      note_signed: mergedInput.noteSigned,
      billing_fields_complete: mergedInput.billingFieldsComplete,
      blocker_reasons: blockers,
    });

    if (blockers.length > 0) {
      await this.routeBlockersToWorkqueues(updated, blockers);
    }

    await this.writeAuditLog({
      targetType: "charges",
      targetId: chargeId,
      action: patch.action ? "status_change" : "update",
      oldValues: existing,
      newValues: updated,
      metadata: { action: patch.action, actionReason: patch.actionReason },
    });

    return updated;
  }

  async approveForClaim(chargeId: string): Promise<TherassistantRecord> {
    const updated = await this.updateChargeCaptureItem(chargeId, { action: "approve" });
    if (updated.status !== "ready_for_claim") {
      throw new ServiceError("Charge still has blockers and cannot be approved for claim creation.", updated.blocker_reasons);
    }
    return updated;
  }

  async listChargeCaptureQueue(filters: ChargeCaptureQueueFilters = {}): Promise<Array<Record<string, unknown>>> {
    let query = this.db
      .from("charges")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .is("deleted_at", null)
      .order("service_date", { ascending: true });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.clientId) query = query.eq("client_id", filters.clientId);
    if (filters.providerId) query = query.eq("provider_id", filters.providerId);
    if (filters.dosFrom) query = query.gte("service_date", serviceDate(filters.dosFrom));
    if (filters.dosTo) query = query.lte("service_date", serviceDate(filters.dosTo));
    if (filters.minAmount !== undefined) query = query.gte("charge_amount", filters.minAmount);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load charge capture queue.", error);

    const rows = (data ?? []) as TherassistantRecord[];
    const result = await Promise.all(rows.map((row) => this.toQueueRow(row)));

    return result.filter((row) => {
      if (filters.tab && row.tab !== filters.tab) return false;
      if (filters.priority === "urgent" && !["documentation_missing", "coding_mismatch", "eligibility_auth_issue", "held_charges"].includes(String(row.tab))) return false;
      return true;
    });
  }

  async validateChargePayload(input: Pick<CreateChargeCaptureInput, "serviceDate" | "placeOfService" | "serviceLines" | "diagnosisCodes" | "noteSigned" | "billingFieldsComplete" | "clientId" | "insurancePolicyId">): Promise<ChargeBlocker[]> {
    const blockers: ChargeBlocker[] = [];

    if (!input.noteSigned) blockers.push({ field: "documentation", message: "Signed note is required before claim creation." });
    if (input.billingFieldsComplete === false) blockers.push({ field: "required_billing_fields", message: "Required billing fields are incomplete." });
    if (!input.serviceDate) blockers.push({ field: "service_date", message: "Date of service is required." });
    if (!input.serviceLines.length) blockers.push({ field: "service_lines", message: "At least one service line is required." });

    for (const line of input.serviceLines) {
      if (!line.procedureCode) blockers.push({ field: "service_lines.procedure_code", message: "CPT/HCPCS code is required." });
      if (!line.units || line.units <= 0) blockers.push({ field: "service_lines.units", message: "Units must be greater than zero." });
      if (line.chargeAmount === undefined || line.chargeAmount < 0) blockers.push({ field: "service_lines.charge_amount", message: "Charge amount is required and cannot be negative." });
      const pos = line.placeOfService ?? input.placeOfService;
      if (pos && !ALLOWED_PLACE_OF_SERVICE.has(pos)) blockers.push({ field: "place_of_service", message: `POS ${pos} is not configured as allowed for behavioral health billing.` });
    }

    if (!input.diagnosisCodes?.length) {
      blockers.push({ field: "diagnosis_codes", message: "At least one diagnosis code is required." });
    }

    if (input.insurancePolicyId) {
      const benefit = await this.eligibility.getLatestEligibility(input.clientId, input.serviceDate, input.serviceLines[0]?.procedureCode);
      if (!benefit) {
        blockers.push({ field: "eligibility", message: "No active eligibility check or policy snapshot found." });
      } else {
        const status = (benefit.status ?? "").toLowerCase();
        if (status && !["active", "covered"].includes(status)) blockers.push({ field: "eligibility", message: `Eligibility status is ${benefit.status}.` });
        if (benefit.authorizationRequired) blockers.push({ field: "authorization", message: "Authorization is required before claim submission." });
      }
    }

    return blockers;
  }

  private async toQueueRow(charge: TherassistantRecord): Promise<Record<string, unknown>> {
    const blockers = blockerMessages(charge.blocker_reasons);
    const benefit = typeof charge.client_id === "string" && charge.service_date
      ? await this.eligibility.getLatestEligibility(String(charge.client_id), String(charge.service_date), String(charge.cpt_code ?? "")).catch(() => null)
      : null;

    const tab = classifyChargeCaptureTab({
      chargeStatus: String(charge.status ?? ""),
      blockers,
      noteSigned: Boolean(charge.note_signed),
      billingFieldsComplete: Boolean(charge.billing_fields_complete),
      eligibilityStatus: benefit?.status ?? null,
      authorizationRequired: benefit?.authorizationRequired ?? false,
    });

    return {
      id: charge.id,
      tab,
      status: charge.status,
      dateOfService: charge.service_date ?? null,
      clientId: charge.client_id ?? null,
      providerId: charge.provider_id ?? null,
      appointmentId: charge.appointment_id ?? null,
      clinicalNoteId: charge.clinical_note_id ?? null,
      cptCode: charge.cpt_code ?? null,
      diagnosisCodes: charge.diagnosis_codes ?? [],
      serviceLines: charge.service_lines ?? [],
      chargeAmount: money(charge.charge_amount),
      claimId: charge.claim_id ?? null,
      eligibility: benefit,
      blockers: blockers.map((blocker) => blocker.message),
      actionNeeded: this.actionNeeded(tab),
    };
  }

  private actionNeeded(tab: ChargeCaptureTab): string {
    switch (tab) {
      case "ready_for_review":
        return "Review and approve";
      case "documentation_missing":
        return "Get signed note";
      case "coding_mismatch":
        return "Fix coding";
      case "eligibility_auth_issue":
        return "Verify eligibility or authorization";
      case "held_charges":
        return "Resolve hold";
      case "released_to_claims":
        return "No charge-capture action needed";
    }
  }

  private async routeBlockersToWorkqueues(charge: TherassistantRecord, blockers: ChargeBlocker[]): Promise<void> {
    const fields = new Set(blockers.map((blocker) => blocker.field.toLowerCase()));
    const workqueueType = fields.has("documentation") || fields.has("required_billing_fields")
      ? "documentation_pending"
      : fields.has("eligibility") || fields.has("authorization")
        ? "eligibility_issue"
        : fields.has("diagnosis_codes") || fields.has("service_lines.procedure_code") || fields.has("service_lines")
          ? "coding_mismatch"
          : "charge_capture";

    await this.createWorkqueueItem({
      type: workqueueType,
      sourceType: "charges",
      sourceId: charge.id,
      priority: fields.has("eligibility") || fields.has("authorization") ? "high" : "normal",
      title: "Charge capture blocker",
      description: blockers.map((blocker) => blocker.message).join(" "),
      metadata: { blockerFields: [...fields], clientId: charge.client_id ?? null },
    });
  }
}

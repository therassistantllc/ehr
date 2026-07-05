import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import {
  ChargeCaptureService,
  type ChargeBlocker,
  type ServiceLineInput,
} from "./chargeCaptureService";
import { ClaimsService, type ClaimFromChargeOptions } from "./claimsService";
import { EligibilityService, type LatestEligibilitySummary } from "./eligibilityService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type ChargeClaimReadinessResult = {
  chargeId: string;
  ready: boolean;
  chargeStatus: string;
  blockers: ChargeBlocker[];
  eligibility: LatestEligibilitySummary | null;
  actionNeeded: string;
};

export type CreateClaimWorkflowResult = {
  charge: TherassistantRecord;
  claim: TherassistantRecord | null;
  readiness: ChargeClaimReadinessResult;
};

const CLAIM_FIELD_BLOCKER_FIELDS = new Set([
  "client_id",
  "patient_id",
  "service_date",
  "service_lines",
  "procedure_code",
  "diagnosis_codes",
  "place_of_service",
  "charge_amount",
  "units",
  "rendering_provider_id",
  "billing_provider_id",
  "payer_profile_id",
  "insurance_policy_id",
]);

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseBlockers(value: unknown): ChargeBlocker[] {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") as ChargeBlocker[] : [];
}

function serviceLines(value: unknown): ServiceLineInput[] {
  return Array.isArray(value) ? value as ServiceLineInput[] : [];
}

function diagnosisCodes(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean) : [];
}

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function uniqueBlockers(blockers: ChargeBlocker[]): ChargeBlocker[] {
  const seen = new Set<string>();
  return blockers.filter((blocker) => {
    const key = `${blocker.field}:${blocker.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function claimFieldOnly(blockers: ChargeBlocker[]): ChargeBlocker[] {
  return blockers.filter((blocker) => CLAIM_FIELD_BLOCKER_FIELDS.has(blocker.field));
}

function validateClaimFields(charge: TherassistantRecord, lines: ServiceLineInput[], dx: string[]): ChargeBlocker[] {
  const blockers: ChargeBlocker[] = [];
  if (!charge.client_id && !charge.patient_id) blockers.push({ field: "client_id", message: "Client/patient is required for claim creation.", severity: "error" });
  if (!charge.service_date) blockers.push({ field: "service_date", message: "Date of service is required for claim creation.", severity: "error" });
  if (!dx.length) blockers.push({ field: "diagnosis_codes", message: "At least one diagnosis code is required for claim creation.", severity: "error" });
  if (!lines.length) blockers.push({ field: "service_lines", message: "At least one service line is required for claim creation.", severity: "error" });
  if (!charge.place_of_service && !lines.some((line) => line.placeOfService)) blockers.push({ field: "place_of_service", message: "Place of service is required for claim creation.", severity: "error" });
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    if (!line.procedureCode) blockers.push({ field: "procedure_code", message: `Line ${lineNumber} is missing a procedure code.`, severity: "error" });
    if (!line.units || Number(line.units) <= 0) blockers.push({ field: "units", message: `Line ${lineNumber} units must be greater than zero.`, severity: "error" });
    if (money(line.chargeAmount) <= 0) blockers.push({ field: "charge_amount", message: `Line ${lineNumber} charge amount must be greater than zero.`, severity: "error" });
  }
  return blockers;
}

function actionNeeded(blockers: ChargeBlocker[]): string {
  if (!blockers.length) return "Create claim";
  if (blockers.some((blocker) => blocker.field === "diagnosis_codes" || blocker.field === "service_lines" || blocker.field === "procedure_code" || blocker.field === "units" || blocker.field === "charge_amount")) return "Fix claim service-line fields";
  if (blockers.some((blocker) => blocker.field === "client_id" || blocker.field === "patient_id")) return "Select the client/patient for the claim";
  if (blockers.some((blocker) => blocker.field === "place_of_service")) return "Add place of service";
  if (blockers.some((blocker) => blocker.field === "service_date")) return "Add date of service";
  return "Resolve claim field blockers";
}

export class RcmOperationalWorkflowService extends TherassistantService {
  private readonly chargeCapture: ChargeCaptureService;
  private readonly claims: ClaimsService;
  private readonly eligibility: EligibilityService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.chargeCapture = new ChargeCaptureService(db, context);
    this.claims = new ClaimsService(db, context);
    this.eligibility = new EligibilityService(db, context);
  }

  async reviewChargeForClaimCreation(chargeId: string): Promise<ChargeClaimReadinessResult> {
    assertUuid(chargeId, "chargeId");
    const charge = await this.findById("charges", chargeId);
    if (!charge) throw new ServiceError("Charge not found.");

    const clientId = asString(charge.client_id);
    const serviceDate = asString(charge.service_date);
    const lines = serviceLines(charge.service_lines);
    const dx = diagnosisCodes(charge.diagnosis_codes);
    const firstCpt = lines[0]?.procedureCode ?? null;

    const existingClaimFieldBlockers = claimFieldOnly(parseBlockers(charge.blocker_reasons));
    const claimFieldBlockers = validateClaimFields(charge, lines, dx);

    const eligibilitySummary = clientId && serviceDate
      ? await this.eligibility.getLatestEligibilitySummary(clientId, serviceDate, firstCpt ?? undefined)
      : null;

    const blockers = uniqueBlockers([
      ...existingClaimFieldBlockers,
      ...claimFieldBlockers,
    ]);

    return {
      chargeId,
      ready: blockers.length === 0,
      chargeStatus: String(charge.charge_status ?? "captured"),
      blockers,
      eligibility: eligibilitySummary,
      actionNeeded: actionNeeded(blockers),
    };
  }

  async approveChargeForClaimCreation(chargeId: string): Promise<TherassistantRecord> {
    const readiness = await this.reviewChargeForClaimCreation(chargeId);
    if (!readiness.ready) {
      const updated = await this.updateOne("charges", chargeId, {
        charge_status: "blocked",
        blocker_reasons: readiness.blockers,
        metadata: { readiness },
      });
      await this.createWorkqueueItem({
        type: "claim_creation_blocked",
        sourceType: "charges",
        sourceId: chargeId,
        priority: "high",
        title: "Charge blocked before claim creation",
        description: readiness.actionNeeded,
        metadata: { readiness },
      });
      return updated;
    }

    return this.updateOne("charges", chargeId, {
      charge_status: "ready_for_claim",
      blocker_reasons: [],
      metadata: { readiness },
    });
  }

  async createClaimFromChargeWorkflow(chargeId: string, options: ClaimFromChargeOptions = {}): Promise<CreateClaimWorkflowResult> {
    const charge = await this.approveChargeForClaimCreation(chargeId);
    const readiness = await this.reviewChargeForClaimCreation(chargeId);
    if (!readiness.ready) {
      return { charge, claim: null, readiness };
    }
    const claim = await this.claims.createClaimFromCharge(chargeId, options);
    await this.writeAuditLog({
      targetType: "claims",
      targetId: claim.id,
      action: "workflow",
      newValues: claim,
      metadata: { workflow: "charge_to_claim", chargeId },
    });
    return { charge, claim, readiness };
  }

  async createClaimsFromReadyChargesWorkflow(chargeIds: string[], options: ClaimFromChargeOptions = {}): Promise<CreateClaimWorkflowResult[]> {
    if (!chargeIds.length) throw new ServiceError("At least one charge is required.");
    chargeIds.forEach((chargeId) => assertUuid(chargeId, "chargeId"));
    const results: CreateClaimWorkflowResult[] = [];
    for (const chargeId of chargeIds) {
      results.push(await this.createClaimFromChargeWorkflow(chargeId, options));
    }
    return results;
  }
}

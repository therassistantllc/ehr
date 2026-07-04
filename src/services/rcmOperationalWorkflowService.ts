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

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function parseBlockers(value: unknown): ChargeBlocker[] {
  return Array.isArray(value) ? value.filter((entry) => entry && typeof entry === "object") as ChargeBlocker[] : [];
}

function serviceLines(value: unknown): ServiceLineInput[] {
  return Array.isArray(value) ? value as ServiceLineInput[] : [];
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

function eligibilityBlocker(summary: LatestEligibilitySummary | null, hasPolicy: boolean): ChargeBlocker | null {
  if (!hasPolicy) {
    return { field: "eligibility", message: "Insurance policy is required before claim creation.", severity: "error" };
  }
  if (!summary) {
    return { field: "eligibility", message: "Eligibility has not been checked for this client/date of service.", severity: "error" };
  }
  if (summary.authorizationRequired) {
    return { field: "authorization", message: "Authorization is required before claim creation.", severity: "error" };
  }
  if (summary.needsRecheck) {
    return { field: "eligibility", message: "Eligibility must be rechecked before claim creation.", severity: "error" };
  }
  if (summary.displayStatus !== "Active") {
    return { field: "eligibility", message: `Eligibility status is ${summary.displayStatus}.`, severity: "error" };
  }
  return null;
}

function actionNeeded(blockers: ChargeBlocker[]): string {
  if (!blockers.length) return "Create claim";
  if (blockers.some((blocker) => blocker.field === "documentation")) return "Complete and sign documentation";
  if (blockers.some((blocker) => blocker.field === "diagnosis_codes" || blocker.field === "service_lines")) return "Fix coding and service-line details";
  if (blockers.some((blocker) => blocker.field === "authorization")) return "Obtain or attach authorization";
  if (blockers.some((blocker) => blocker.field === "eligibility")) return "Resolve eligibility before claim creation";
  return "Resolve charge blockers";
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
    const policyId = asString(charge.insurance_policy_id);
    const lines = serviceLines(charge.service_lines);
    const firstCpt = lines[0]?.procedureCode ?? null;

    const existingBlockers = parseBlockers(charge.blocker_reasons);
    const validationBlockers = await this.chargeCapture.validateChargePayload({
      clientId: clientId ?? "00000000-0000-0000-0000-000000000000",
      serviceDate: serviceDate ?? "",
      placeOfService: asString(charge.place_of_service),
      serviceLines: lines,
      diagnosisCodes: Array.isArray(charge.diagnosis_codes) ? charge.diagnosis_codes as string[] : [],
      insurancePolicyId: policyId,
      noteSigned: Boolean(charge.note_signed),
      billingFieldsComplete: Boolean(charge.billing_fields_complete),
    });

    const eligibilitySummary = clientId && serviceDate
      ? await this.eligibility.getLatestEligibilitySummary(clientId, serviceDate, firstCpt ?? undefined)
      : null;
    const eligibilityIssue = eligibilityBlocker(eligibilitySummary, Boolean(policyId));
    const blockers = uniqueBlockers([
      ...existingBlockers,
      ...validationBlockers,
      ...(eligibilityIssue ? [eligibilityIssue] : []),
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
        priority: readiness.blockers.some((blocker) => blocker.severity === "error") ? "high" : "normal",
        title: "Charge blocked before claim creation",
        description: readiness.actionNeeded,
        metadata: { readiness },
      });
      return updated;
    }

    return this.chargeCapture.approveForClaim(chargeId);
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

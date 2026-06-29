import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import { createEligibilityHook } from "../hooks/useEligibility";
import { createChargeCaptureHook } from "../hooks/useChargeCapture";
import { createClaimsHook } from "../hooks/useClaims";
import type { ClientPolicyInput, EligibilityVerificationInput } from "../services/eligibilityService";
import type { ChargeCapturePatch, ChargeCaptureQueueFilters, CreateChargeCaptureInput } from "../services/chargeCaptureService";
import type { ClaimBatchInput, ClaimFromChargeOptions } from "../services/claimsService";

export type RcmRouteRequest = {
  body?: unknown;
  params?: Record<string, string | undefined>;
  query?: Record<string, string | undefined>;
};

export type RcmRouteResponse<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; details?: unknown };

export type RcmRouteHandler<T> = (request: RcmRouteRequest) => Promise<RcmRouteResponse<T>>;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function param(request: RcmRouteRequest, key: string): string {
  const value = request.params?.[key] ?? record(request.body)[key];
  if (typeof value !== "string" || !value) throw new Error(`Missing required parameter: ${key}`);
  return value;
}

function ok<T>(data: T, status = 200): RcmRouteResponse<T> {
  return { ok: true, status, data };
}

function fail(error: unknown): RcmRouteResponse<never> {
  if (error instanceof Error) return { ok: false, status: 400, error: error.message, details: "details" in error ? error.details : undefined };
  return { ok: false, status: 400, error: "Request failed.", details: error };
}

async function handle<T>(operation: () => Promise<T>, status = 200): Promise<RcmRouteResponse<T>> {
  try {
    return ok(await operation(), status);
  } catch (error) {
    return fail(error);
  }
}

export function createRcmApiHandlers(db: TherassistantSupabaseClient, context: ServiceContext) {
  const eligibility = createEligibilityHook(db, context);
  const charges = createChargeCaptureHook(db, context);
  const claims = createClaimsHook(db, context);

  return {
    eligibility: {
      addPolicy: (request: RcmRouteRequest) => handle(() => eligibility.addPolicy(record(request.body) as ClientPolicyInput), 201),
      terminatePolicy: (request: RcmRouteRequest) => handle(() => eligibility.terminatePolicy(param(request, "policyId"), param(request, "terminationDate"), record(request.body).reason as string | undefined)),
      activePolicies: (request: RcmRouteRequest) => handle(() => eligibility.getActivePolicies(param(request, "clientId"), param(request, "serviceDate"))),
      verify: (request: RcmRouteRequest) => handle(() => eligibility.verifyEligibility(record(request.body) as EligibilityVerificationInput), 201),
      latest: (request: RcmRouteRequest) => handle(() => eligibility.getLatestEligibility(param(request, "clientId"), param(request, "serviceDate"), request.query?.cptCode)),
      expectedResponsibility: (request: RcmRouteRequest) => handle(() => eligibility.getExpectedClientResponsibility(param(request, "clientId"), param(request, "serviceDate"), request.query?.cptCode)),
      flagIssue: (request: RcmRouteRequest) => handle(() => eligibility.flagEligibilityIssue(param(request, "clientId"), param(request, "issueType"), record(request.body).note as string | undefined), 201),
    },
    chargeCapture: {
      create: (request: RcmRouteRequest) => handle(() => charges.createCharge(record(request.body) as CreateChargeCaptureInput), 201),
      update: (request: RcmRouteRequest) => handle(() => charges.updateCharge(param(request, "chargeId"), record(request.body) as ChargeCapturePatch)),
      approve: (request: RcmRouteRequest) => handle(() => charges.approveForClaim(param(request, "chargeId"))),
      queue: (request: RcmRouteRequest) => handle(() => charges.listQueue(record(request.query) as ChargeCaptureQueueFilters)),
      validate: (request: RcmRouteRequest) => handle(() => charges.validateChargePayload(record(request.body) as Parameters<typeof charges.validateChargePayload>[0])),
    },
    claims: {
      createFromCharge: (request: RcmRouteRequest) => handle(() => claims.createClaimFromCharge(param(request, "chargeId"), record(request.body).options as ClaimFromChargeOptions | undefined), 201),
      createFromCharges: (request: RcmRouteRequest) => handle(() => claims.createClaimsFromCharges(record(request.body).chargeIds as string[], record(request.body).options as ClaimFromChargeOptions | undefined), 201),
      validate: (request: RcmRouteRequest) => handle(() => claims.validateClaim(param(request, "claimId"))),
      markReadyForBatch: (request: RcmRouteRequest) => handle(() => claims.markReadyForBatch(param(request, "claimId"))),
      createBatch: (request: RcmRouteRequest) => handle(() => claims.createClaimBatch(record(request.body) as ClaimBatchInput), 201),
      markBatchReady: (request: RcmRouteRequest) => handle(() => claims.markBatchReady(param(request, "batchId"))),
      markBatchSubmitted: (request: RcmRouteRequest) => handle(() => claims.markBatchSubmitted(param(request, "batchId"), record(request.body))),
      recalculateBalance: (request: RcmRouteRequest) => handle(() => claims.recalculateClaimBalance(param(request, "claimId"))),
      timeline: (request: RcmRouteRequest) => handle(() => claims.getClaimTimeline(param(request, "claimId"))),
    },
  };
}

export type RcmApiHandlers = ReturnType<typeof createRcmApiHandlers>;

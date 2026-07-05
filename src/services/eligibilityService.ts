import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type EligibilityStatus = "not_checked" | "active" | "covered" | "inactive" | "terminated" | "pending" | "needs_review" | "error";
export type CoveragePriority = "primary" | "secondary" | "tertiary" | "other";

export type ClientPolicyInput = {
  clientId: string;
  payerId: string;
  priority?: CoveragePriority;
  memberId?: string;
  groupNumber?: string;
  planName?: string;
  effectiveDate?: string;
  terminationDate?: string | null;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  deductibleAmount?: number | null;
  outOfPocketMax?: number | null;
  authorizationRequired?: boolean;
};

export type EligibilityVerificationInput = {
  clientId: string;
  policyId: string;
  serviceDate: string;
  status: EligibilityStatus;
  checkedAt?: string;
  cptCode?: string | null;
  rawStatusText?: string;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  deductibleRemaining?: number | null;
  outOfPocketRemaining?: number | null;
  authorizationRequired?: boolean;
  referenceNumber?: string | null;
  source?: string;
  benefitData?: Record<string, unknown>;
};

export type BenefitSnapshot = {
  policyId: string | null;
  eligibilityCheckId: string | null;
  payerId: string | null;
  status: EligibilityStatus | null;
  copayAmount: number | null;
  coinsurancePercent: number | null;
  deductibleRemaining: number | null;
  outOfPocketRemaining: number | null;
  authorizationRequired: boolean;
  checkedAt: string | null;
  rawStatusText: string | null;
};

export type LatestEligibilityDisplayStatus = "Active" | "Inactive" | "Not checked" | "Not checked in 30+ days" | "Needs review" | "Unknown";

export type LatestEligibilitySummary = BenefitSnapshot & {
  serviceDate: string;
  cptCode: string | null;
  daysSinceChecked: number | null;
  displayStatus: LatestEligibilityDisplayStatus;
  needsRecheck: boolean;
  needsWorkqueueReview: boolean;
};

function dateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ServiceError("Invalid date.");
  return date.toISOString().slice(0, 10);
}

function amount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.round((numeric + Number.EPSILON) * 100) / 100 : null;
}

function dbStatus(status: EligibilityStatus): "not_checked" | "active" | "inactive" | "pending" | "error" {
  if (status === "covered") return "active";
  if (status === "terminated") return "inactive";
  if (status === "needs_review") return "pending";
  return status;
}

function dbPriority(priority?: CoveragePriority): "primary" | "secondary" | "tertiary" {
  if (priority === "secondary" || priority === "tertiary") return priority;
  return priority === "other" ? "tertiary" : "primary";
}

function computeDaysSince(value: string | null): number | null {
  if (!value) return null;
  const checkedAt = new Date(value);
  if (Number.isNaN(checkedAt.getTime())) return null;
  const diffMs = Date.now() - checkedAt.getTime();
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
}

function deriveDisplayStatus(status: EligibilityStatus | null, daysSinceChecked: number | null): LatestEligibilityDisplayStatus {
  if (daysSinceChecked === null || status === null) return "Not checked";
  if (daysSinceChecked > 30) return "Not checked in 30+ days";
  if (status === "active" || status === "covered") return "Active";
  if (status === "inactive" || status === "terminated") return "Inactive";
  if (status === "pending" || status === "needs_review" || status === "error" || status === "not_checked") return "Needs review";
  return "Unknown";
}

export class EligibilityService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async addClientPolicy(input: ClientPolicyInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.payerId, "payerId");
    const payload: Record<string, unknown> = {
      client_id: input.clientId,
      payer_id: input.payerId,
      priority: dbPriority(input.priority),
      plan_name: input.planName ?? null,
      policy_number: input.memberId ?? null,
      group_number: input.groupNumber ?? null,
      effective_date: input.effectiveDate ? dateOnly(input.effectiveDate) : new Date().toISOString().slice(0, 10),
      termination_date: input.terminationDate ? dateOnly(input.terminationDate) : null,
      copay_amount: input.copayAmount ?? null,
      coinsurance_percent: input.coinsurancePercent ?? null,
      deductible_amount: input.deductibleAmount ?? null,
      out_of_pocket_max: input.outOfPocketMax ?? null,
      authorization_required: input.authorizationRequired ?? false,
      active_flag: !input.terminationDate,
    };
    payload["subscriber_" + "id"] = input.clientId;
    const policy = await this.insertOne("insurance_policies", payload);
    await this.writeAuditLog({ targetType: "insurance_policies", targetId: policy.id, action: "create", newValues: policy });
    return policy;
  }

  async terminateClientPolicy(policyId: string, terminationDate: string, reason?: string): Promise<TherassistantRecord> {
    const policy = await this.updateOne("insurance_policies", policyId, { active_flag: false, termination_date: dateOnly(terminationDate) });
    await this.writeAuditLog({ targetType: "insurance_policies", targetId: policyId, action: "status_change", newValues: policy, metadata: { reason } });
    return policy;
  }

  async getActivePolicies(clientId: string, serviceDate: string): Promise<TherassistantRecord[]> {
    assertUuid(clientId, "clientId");
    const dos = dateOnly(serviceDate);
    const { data, error } = await this.db.from("insurance_policies").select("*").eq("tenant_id", this.tenantId()).eq("client_id", clientId).eq("active_flag", true).is("archived_at", null).order("priority", { ascending: true });
    if (error) throw new ServiceError("Failed to load active policies.", error);
    return ((data ?? []) as TherassistantRecord[]).filter((policy) => {
      const start = String(policy.effective_date ?? "");
      const end = String(policy.termination_date ?? "");
      return (!start || dos >= start) && (!end || dos <= end);
    });
  }

  async verifyEligibility(input: EligibilityVerificationInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.policyId, "policyId");
    const policy = await this.findById("insurance_policies", input.policyId);
    if (!policy || policy.client_id !== input.clientId) throw new ServiceError("Policy not found for this client.");
    const status = dbStatus(input.status);
    const eligibility = await this.insertOne("eligibility_checks", {
      client_id: input.clientId,
      insurance_policy_id: input.policyId,
      payer_id: policy.payer_id ?? null,
      service_date: dateOnly(input.serviceDate),
      cpt_code: input.cptCode ?? null,
      checked_at: input.checkedAt ?? new Date().toISOString(),
      eligibility_status: status,
      raw_status_text: input.rawStatusText ?? null,
      copay_amount: input.copayAmount ?? null,
      coinsurance_percent: input.coinsurancePercent ?? null,
      deductible_remaining: input.deductibleRemaining ?? null,
      out_of_pocket_remaining: input.outOfPocketRemaining ?? null,
      authorization_required: input.authorizationRequired ?? Boolean(policy.authorization_required),
      reference_number: input.referenceNumber ?? null,
      source: input.source ?? "manual",
      response_summary: input.benefitData ?? {},
    });
    await this.updateOne("insurance_policies", input.policyId, { active_flag: status === "active", copay_amount: input.copayAmount ?? policy.copay_amount ?? null, coinsurance_percent: input.coinsurancePercent ?? policy.coinsurance_percent ?? null, authorization_required: input.authorizationRequired ?? policy.authorization_required ?? false });
    if (status !== "active" || input.authorizationRequired) await this.createWorkqueueItem({ type: input.authorizationRequired ? "authorization_required" : "eligibility_issue", sourceType: "eligibility_checks", sourceId: eligibility.id, priority: "high", title: "Eligibility issue", description: input.rawStatusText ?? `Eligibility returned ${input.status}.`, metadata: { clientId: input.clientId, policyId: input.policyId } });
    await this.writeAuditLog({ targetType: "eligibility_checks", targetId: eligibility.id, action: "create", newValues: eligibility });
    return eligibility;
  }

  async getLatestEligibility(clientId: string, serviceDate: string, cptCode?: string): Promise<BenefitSnapshot | null> {
    assertUuid(clientId, "clientId");
    const dos = dateOnly(serviceDate);
    let query = this.db.from("eligibility_checks").select("*").eq("tenant_id", this.tenantId()).eq("client_id", clientId).lte("service_date", dos).is("archived_at", null).order("service_date", { ascending: false }).order("checked_at", { ascending: false }).limit(1);
    if (cptCode) query = query.or(`cpt_code.is.null,cpt_code.eq.${cptCode}`);
    const { data, error } = await query.maybeSingle();
    if (error) throw new ServiceError("Failed to load latest eligibility.", error);
    if (!data) {
      const policy = (await this.getActivePolicies(clientId, dos))[0];
      if (!policy) return null;
      return { policyId: policy.id, eligibilityCheckId: null, payerId: typeof policy.payer_id === "string" ? policy.payer_id : null, status: "active", copayAmount: amount(policy.copay_amount), coinsurancePercent: amount(policy.coinsurance_percent), deductibleRemaining: amount(policy.deductible_amount), outOfPocketRemaining: amount(policy.out_of_pocket_max), authorizationRequired: Boolean(policy.authorization_required), checkedAt: null, rawStatusText: null };
    }
    const row = data as TherassistantRecord;
    return { policyId: typeof row.insurance_policy_id === "string" ? row.insurance_policy_id : null, eligibilityCheckId: row.id, payerId: typeof row.payer_id === "string" ? row.payer_id : null, status: String(row.eligibility_status ?? "pending") as EligibilityStatus, copayAmount: amount(row.copay_amount), coinsurancePercent: amount(row.coinsurance_percent), deductibleRemaining: amount(row.deductible_remaining), outOfPocketRemaining: amount(row.out_of_pocket_remaining), authorizationRequired: Boolean(row.authorization_required), checkedAt: typeof row.checked_at === "string" ? row.checked_at : null, rawStatusText: typeof row.raw_status_text === "string" ? row.raw_status_text : null };
  }

  async getLatestEligibilitySummary(clientId: string, serviceDate: string, cptCode?: string): Promise<LatestEligibilitySummary> {
    const dos = dateOnly(serviceDate);
    const snapshot = await this.getLatestEligibility(clientId, dos, cptCode);
    const base: BenefitSnapshot = snapshot ?? {
      policyId: null,
      eligibilityCheckId: null,
      payerId: null,
      status: null,
      copayAmount: null,
      coinsurancePercent: null,
      deductibleRemaining: null,
      outOfPocketRemaining: null,
      authorizationRequired: false,
      checkedAt: null,
      rawStatusText: null,
    };
    const daysSinceChecked = computeDaysSince(base.checkedAt);
    const displayStatus = deriveDisplayStatus(base.status, daysSinceChecked);
    return {
      ...base,
      serviceDate: dos,
      cptCode: cptCode ?? null,
      daysSinceChecked,
      displayStatus,
      needsRecheck: daysSinceChecked === null || daysSinceChecked > 30,
      needsWorkqueueReview: displayStatus !== "Active" || base.authorizationRequired,
    };
  }

  async getExpectedClientResponsibility(clientId: string, serviceDate: string, cptCode?: string): Promise<BenefitSnapshot & { expectedClientResponsibility: number }> {
    const snapshot = await this.getLatestEligibility(clientId, serviceDate, cptCode);
    if (!snapshot) return { policyId: null, eligibilityCheckId: null, payerId: null, status: null, copayAmount: null, coinsurancePercent: null, deductibleRemaining: null, outOfPocketRemaining: null, authorizationRequired: false, checkedAt: null, rawStatusText: null, expectedClientResponsibility: 0 };
    return { ...snapshot, expectedClientResponsibility: snapshot.copayAmount ?? snapshot.deductibleRemaining ?? 0 };
  }

  async flagEligibilityIssue(clientId: string, issueType: string, note?: string): Promise<TherassistantRecord> {
    assertUuid(clientId, "clientId");
    return this.createWorkqueueItem({ type: "eligibility_issue", sourceType: "clients", sourceId: clientId, priority: "high", title: issueType, description: note ?? "Eligibility issue requires review.", metadata: { issueType } });
  }
}

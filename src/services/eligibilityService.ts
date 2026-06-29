import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type EligibilityStatus =
  | "active"
  | "covered"
  | "inactive"
  | "terminated"
  | "not_found"
  | "needs_review"
  | "error";

export type CoveragePriority = "primary" | "secondary" | "tertiary" | "other";

export type ClientPolicyInput = {
  clientId: string;
  payerId: string;
  priority?: CoveragePriority;
  memberId?: string;
  groupNumber?: string;
  planName?: string;
  subscriberName?: string;
  subscriberRelationship?: string;
  effectiveDate?: string;
  terminationDate?: string | null;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  deductibleRemaining?: number | null;
  outOfPocketRemaining?: number | null;
  authorizationRequired?: boolean;
  metadata?: Record<string, unknown>;
};

export type EligibilityVerificationInput = {
  clientId: string;
  policyId: string;
  serviceDate: string;
  status: EligibilityStatus;
  checkedAt?: string;
  rawStatusText?: string;
  copayAmount?: number | null;
  coinsurancePercent?: number | null;
  deductibleRemaining?: number | null;
  outOfPocketRemaining?: number | null;
  authorizationRequired?: boolean;
  visitLimit?: number | null;
  visitsUsed?: number | null;
  referenceNumber?: string | null;
  source?: "manual" | "portal" | "270_271" | "import";
  benefitData?: Record<string, unknown>;
};

export type BenefitSnapshot = {
  policyId: string | null;
  eligibilityCheckId: string | null;
  status: EligibilityStatus | null;
  copayAmount: number | null;
  coinsurancePercent: number | null;
  deductibleRemaining: number | null;
  outOfPocketRemaining: number | null;
  authorizationRequired: boolean;
  checkedAt: string | null;
  rawStatusText: string | null;
};

const ACTIVE_STATUSES = new Set(["active", "covered"]);

function roundMoney(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : null;
}

function normalizedDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new ServiceError("Invalid service date.");
  }

  return d.toISOString().slice(0, 10);
}

function isCoverageActive(policy: TherassistantRecord, serviceDate: string): boolean {
  const dos = normalizedDate(serviceDate);
  const effectiveDate = String(policy.effective_date ?? "");
  const terminationDate = String(policy.termination_date ?? "");

  if (effectiveDate && dos < effectiveDate) return false;
  if (terminationDate && dos > terminationDate) return false;

  return !["inactive", "terminated", "cancelled", "canceled", "deleted"].includes(String(policy.status ?? "").toLowerCase());
}

export class EligibilityService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async addClientPolicy(input: ClientPolicyInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.payerId, "payerId");

    const policy = await this.insertOne("client_case_policies", {
      name: input.planName ?? input.memberId ?? "Client coverage",
      status: input.terminationDate ? "terminated" : "active",
      client_id: input.clientId,
      payer_id: input.payerId,
      priority: input.priority ?? "primary",
      member_id: input.memberId ?? null,
      group_number: input.groupNumber ?? null,
      plan_name: input.planName ?? null,
      subscriber_name: input.subscriberName ?? null,
      subscriber_relationship: input.subscriberRelationship ?? "self",
      effective_date: input.effectiveDate ?? null,
      termination_date: input.terminationDate ?? null,
      copay_amount: input.copayAmount ?? null,
      coinsurance_percent: input.coinsurancePercent ?? null,
      deductible_remaining: input.deductibleRemaining ?? null,
      out_of_pocket_remaining: input.outOfPocketRemaining ?? null,
      authorization_required: input.authorizationRequired ?? false,
      data: input.metadata ?? {},
    });

    await this.writeAuditLog({
      targetType: "client_case_policies",
      targetId: policy.id,
      action: "create",
      newValues: policy,
    });

    return policy;
  }

  async terminateClientPolicy(policyId: string, terminationDate: string, reason?: string): Promise<TherassistantRecord> {
    const policy = await this.updateOne("client_case_policies", policyId, {
      status: "terminated",
      termination_date: normalizedDate(terminationDate),
      data: { terminationReason: reason ?? null },
    });

    await this.writeAuditLog({
      targetType: "client_case_policies",
      targetId: policyId,
      action: "status_change",
      newValues: policy,
      metadata: { reason },
    });

    return policy;
  }

  async getActivePolicies(clientId: string, serviceDate: string): Promise<TherassistantRecord[]> {
    assertUuid(clientId, "clientId");
    const dos = normalizedDate(serviceDate);

    const { data, error } = await this.db
      .from("client_case_policies")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .eq("client_id", clientId)
      .is("deleted_at", null)
      .or(`effective_date.is.null,effective_date.lte.${dos}`)
      .or(`termination_date.is.null,termination_date.gte.${dos}`)
      .order("priority", { ascending: true });

    if (error) {
      throw new ServiceError("Failed to load active client policies.", error);
    }

    return ((data ?? []) as TherassistantRecord[]).filter((policy) => isCoverageActive(policy, dos));
  }

  async verifyEligibility(input: EligibilityVerificationInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.policyId, "policyId");

    const policy = await this.findById("client_case_policies", input.policyId);

    if (!policy || policy.client_id !== input.clientId) {
      throw new ServiceError("Policy not found for this client.");
    }

    const serviceDate = normalizedDate(input.serviceDate);
    const eligibility = await this.insertOne("eligibility_checks", {
      name: `Eligibility ${serviceDate}`,
      status: input.status,
      client_id: input.clientId,
      policy_id: input.policyId,
      payer_id: policy.payer_id ?? null,
      service_date: serviceDate,
      checked_at: input.checkedAt ?? new Date().toISOString(),
      eligibility_status: input.status,
      raw_status_text: input.rawStatusText ?? null,
      copay_amount: input.copayAmount ?? null,
      coinsurance_percent: input.coinsurancePercent ?? null,
      deductible_remaining: input.deductibleRemaining ?? null,
      out_of_pocket_remaining: input.outOfPocketRemaining ?? null,
      authorization_required: input.authorizationRequired ?? Boolean(policy.authorization_required),
      visit_limit: input.visitLimit ?? null,
      visits_used: input.visitsUsed ?? null,
      reference_number: input.referenceNumber ?? null,
      source: input.source ?? "manual",
      data: input.benefitData ?? {},
    });

    await this.updateOne("client_case_policies", input.policyId, {
      status: ACTIVE_STATUSES.has(input.status) ? "active" : "needs_review",
      copay_amount: input.copayAmount ?? policy.copay_amount ?? null,
      coinsurance_percent: input.coinsurancePercent ?? policy.coinsurance_percent ?? null,
      deductible_remaining: input.deductibleRemaining ?? policy.deductible_remaining ?? null,
      out_of_pocket_remaining: input.outOfPocketRemaining ?? policy.out_of_pocket_remaining ?? null,
      authorization_required: input.authorizationRequired ?? policy.authorization_required ?? false,
      data: {
        ...(policy.data ?? {}),
        latestEligibilityCheckId: eligibility.id,
        latestEligibilityStatus: input.status,
      },
    });

    if (!ACTIVE_STATUSES.has(input.status) || input.authorizationRequired) {
      await this.createWorkqueueItem({
        type: input.authorizationRequired ? "authorization_required" : "eligibility_issue",
        sourceType: "eligibility_checks",
        sourceId: eligibility.id,
        priority: input.status === "inactive" || input.status === "terminated" ? "high" : "normal",
        title: input.authorizationRequired ? "Authorization required" : "Eligibility issue",
        description: input.rawStatusText ?? `Eligibility returned ${input.status}.`,
        metadata: { clientId: input.clientId, policyId: input.policyId, serviceDate },
      });
    }

    await this.writeAuditLog({
      targetType: "eligibility_checks",
      targetId: eligibility.id,
      action: "create",
      newValues: eligibility,
    });

    return eligibility;
  }

  async getLatestEligibility(clientId: string, serviceDate: string, cptCode?: string): Promise<BenefitSnapshot | null> {
    assertUuid(clientId, "clientId");
    const dos = normalizedDate(serviceDate);

    let query = this.db
      .from("eligibility_checks")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .eq("client_id", clientId)
      .lte("service_date", dos)
      .is("deleted_at", null)
      .order("service_date", { ascending: false })
      .order("checked_at", { ascending: false })
      .limit(1);

    if (cptCode) {
      query = query.or(`cpt_code.is.null,cpt_code.eq.${cptCode}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new ServiceError("Failed to load latest eligibility.", error);
    }

    if (!data) {
      const policies = await this.getActivePolicies(clientId, dos);
      const policy = policies[0];
      if (!policy) return null;

      return {
        policyId: policy.id,
        eligibilityCheckId: null,
        status: String(policy.status ?? "active") as EligibilityStatus,
        copayAmount: roundMoney(policy.copay_amount),
        coinsurancePercent: roundMoney(policy.coinsurance_percent),
        deductibleRemaining: roundMoney(policy.deductible_remaining),
        outOfPocketRemaining: roundMoney(policy.out_of_pocket_remaining),
        authorizationRequired: Boolean(policy.authorization_required),
        checkedAt: null,
        rawStatusText: null,
      };
    }

    const row = data as TherassistantRecord;
    return {
      policyId: typeof row.policy_id === "string" ? row.policy_id : null,
      eligibilityCheckId: row.id,
      status: String(row.eligibility_status ?? row.status ?? "needs_review") as EligibilityStatus,
      copayAmount: roundMoney(row.copay_amount),
      coinsurancePercent: roundMoney(row.coinsurance_percent),
      deductibleRemaining: roundMoney(row.deductible_remaining),
      outOfPocketRemaining: roundMoney(row.out_of_pocket_remaining),
      authorizationRequired: Boolean(row.authorization_required),
      checkedAt: typeof row.checked_at === "string" ? row.checked_at : null,
      rawStatusText: typeof row.raw_status_text === "string" ? row.raw_status_text : null,
    };
  }

  async getExpectedClientResponsibility(clientId: string, serviceDate: string, cptCode?: string): Promise<BenefitSnapshot & { expectedClientResponsibility: number }> {
    const snapshot = await this.getLatestEligibility(clientId, serviceDate, cptCode);

    if (!snapshot) {
      return {
        policyId: null,
        eligibilityCheckId: null,
        status: null,
        copayAmount: null,
        coinsurancePercent: null,
        deductibleRemaining: null,
        outOfPocketRemaining: null,
        authorizationRequired: false,
        checkedAt: null,
        rawStatusText: null,
        expectedClientResponsibility: 0,
      };
    }

    const copay = snapshot.copayAmount ?? 0;
    const deductible = snapshot.deductibleRemaining && snapshot.deductibleRemaining > 0 ? snapshot.deductibleRemaining : 0;

    return {
      ...snapshot,
      expectedClientResponsibility: copay > 0 ? copay : deductible,
    };
  }

  async flagEligibilityIssue(clientId: string, issueType: string, note?: string): Promise<TherassistantRecord> {
    assertUuid(clientId, "clientId");

    return this.createWorkqueueItem({
      type: "eligibility_issue",
      sourceType: "clients",
      sourceId: clientId,
      priority: "high",
      title: issueType,
      description: note ?? "Eligibility issue requires review.",
      metadata: { issueType },
    });
  }
}

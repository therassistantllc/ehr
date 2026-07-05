import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";
import {
  classifyEligibilityIssue,
  type EligibilityIssueClassification,
} from "./eligibilityIssueClassifier";

export type EligibilityReadinessRow = {
  id: string;
  clientId: string;
  policyId: string | null;
  payerId: string | null;
  serviceDate: string | null;
  cptCode: string | null;
  checkedAt: string | null;
  status: string;
  rawStatusText: string | null;
  issue: EligibilityIssueClassification | null;
  readyForClaimCreation: boolean;
  actionNeeded: string;
};

export type EligibilityReadinessFilters = {
  clientId?: string;
  payerId?: string;
  serviceDateFrom?: string;
  serviceDateTo?: string;
  onlyIssues?: boolean;
  limit?: number;
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function actionFor(issue: EligibilityIssueClassification | null): string {
  if (!issue) return "No eligibility action needed";
  if (issue.type === "inactive_coverage") return "Confirm coverage or collect updated insurance";
  if (issue.type === "terminated_plan") return "Get replacement coverage or update policy dates";
  if (issue.type === "missing_subscriber_info") return "Complete subscriber/member fields";
  if (issue.type === "payer_mismatch") return "Correct payer/policy selection before claim submission";
  if (issue.type === "cob_issue") return "Confirm primary/secondary order and COB details";
  if (issue.type === "stale_eligibility") return "Run a fresh eligibility check";
  return "Review eligibility";
}

export class EligibilityReadinessService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async listReadinessRows(filters: EligibilityReadinessFilters = {}): Promise<EligibilityReadinessRow[]> {
    let query = this.db
      .from("eligibility_checks")
      .select("*")
      .eq("tenant_id", this.tenantId())
      .is("archived_at", null)
      .order("service_date", { ascending: true })
      .order("checked_at", { ascending: false });

    if (filters.clientId) {
      assertUuid(filters.clientId, "clientId");
      query = query.eq("client_id", filters.clientId);
    }
    if (filters.payerId) query = query.eq("payer_id", filters.payerId);
    if (filters.serviceDateFrom) query = query.gte("service_date", filters.serviceDateFrom);
    if (filters.serviceDateTo) query = query.lte("service_date", filters.serviceDateTo);
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load eligibility readiness rows.", error);

    const rows = ((data ?? []) as TherassistantRecord[]).map((row) => this.toReadinessRow(row));
    return filters.onlyIssues ? rows.filter((row) => row.issue !== null) : rows;
  }

  private toReadinessRow(row: TherassistantRecord): EligibilityReadinessRow {
    const responseSummary = jsonObject(row.response_summary);
    const status = String(row.eligibility_status ?? "not_checked");
    const issue = classifyEligibilityIssue({
      checkStatus: status,
      checkedAt: asString(row.checked_at),
      coverageEnd: asString(responseSummary.coverage_end_date ?? responseSummary.coverageEnd),
      policyTermination: asString(responseSummary.policy_termination_date ?? responseSummary.policyTermination),
      memberId: asString(responseSummary.member_id ?? responseSummary.memberId ?? responseSummary.policy_number),
      subscriberDob: asString(responseSummary.subscriber_dob ?? responseSummary.subscriberDob),
      policyCount: Number(responseSummary.policy_count ?? responseSummary.policyCount ?? 1),
      checkPolicyId: asString(row.insurance_policy_id),
      appointmentPolicyId: asString(responseSummary.appointment_policy_id ?? responseSummary.appointmentPolicyId),
      claimPayerExternalId: asString(responseSummary.claim_payer_external_id ?? responseSummary.claimPayerExternalId),
      policyPayerExternalId: asString(responseSummary.policy_payer_external_id ?? responseSummary.policyPayerExternalId),
      responseSummary,
    });

    return {
      id: row.id,
      clientId: String(row.client_id ?? ""),
      policyId: asString(row.insurance_policy_id),
      payerId: asString(row.payer_id),
      serviceDate: asString(row.service_date),
      cptCode: asString(row.cpt_code),
      checkedAt: asString(row.checked_at),
      status,
      rawStatusText: asString(row.raw_status_text),
      issue,
      readyForClaimCreation: issue === null,
      actionNeeded: actionFor(issue),
    };
  }
}

export type EligibilityIssueType =
  | "inactive_coverage"
  | "stale_eligibility"
  | "cob_issue"
  | "missing_subscriber_info"
  | "terminated_plan"
  | "payer_mismatch";

export const ELIGIBILITY_ISSUE_TABS: Array<{ id: EligibilityIssueType; label: string }> = [
  { id: "inactive_coverage", label: "Inactive Coverage" },
  { id: "stale_eligibility", label: "Stale Eligibility" },
  { id: "cob_issue", label: "COB Issue" },
  { id: "missing_subscriber_info", label: "Missing Subscriber Info" },
  { id: "terminated_plan", label: "Terminated Plan" },
  { id: "payer_mismatch", label: "Payer Mismatch" },
];

export type EligibilityIssueClassificationInput = {
  checkStatus?: string | null;
  checkedAt?: string | null;
  coverageEnd?: string | null;
  policyTermination?: string | null;
  memberId?: string | null;
  subscriberDob?: string | null;
  policyCount?: number | null;
  checkPolicyId?: string | null;
  appointmentPolicyId?: string | null;
  claimPayerExternalId?: string | null;
  policyPayerExternalId?: string | null;
  responseSummary?: unknown;
};

export type EligibilityIssueClassification = {
  type: EligibilityIssueType;
  label: string;
  severity: "high" | "medium" | "low";
  requiresReviewBeforeSubmission: boolean;
};

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000)));
}

function responseSummaryHasCobSignal(responseSummary: unknown): boolean {
  if (!responseSummary || typeof responseSummary !== "object") return false;
  const summary = responseSummary as Record<string, unknown>;
  return summary.cob === true || Boolean(text(summary.cob_indicator));
}

export function classifyEligibilityIssue(input: EligibilityIssueClassificationInput): EligibilityIssueClassification | null {
  const today = todayYmd();
  const checkStatus = text(input.checkStatus).toLowerCase();
  const memberId = text(input.memberId);
  const policyCount = Number(input.policyCount ?? 0);

  if ((input.coverageEnd && input.coverageEnd < today) || (input.policyTermination && input.policyTermination < today)) {
    return {
      type: "terminated_plan",
      label: "Coverage end date is in the past",
      severity: "high",
      requiresReviewBeforeSubmission: true,
    };
  }

  if (checkStatus === "inactive" || checkStatus === "terminated") {
    return {
      type: "inactive_coverage",
      label: "Payer returned coverage inactive",
      severity: "high",
      requiresReviewBeforeSubmission: true,
    };
  }

  if (!memberId || !input.subscriberDob) {
    return {
      type: "missing_subscriber_info",
      label: !memberId ? "Missing member ID" : "Missing subscriber DOB",
      severity: "high",
      requiresReviewBeforeSubmission: true,
    };
  }

  const claimPayerExternalId = text(input.claimPayerExternalId).toUpperCase();
  const policyPayerExternalId = text(input.policyPayerExternalId).toUpperCase();
  if (
    (claimPayerExternalId && policyPayerExternalId && claimPayerExternalId !== policyPayerExternalId) ||
    (input.checkPolicyId && input.appointmentPolicyId && input.checkPolicyId !== input.appointmentPolicyId)
  ) {
    return {
      type: "payer_mismatch",
      label: "Claim/check payer differs from policy on file",
      severity: "high",
      requiresReviewBeforeSubmission: true,
    };
  }

  if (policyCount > 1 || responseSummaryHasCobSignal(input.responseSummary)) {
    return {
      type: "cob_issue",
      label: "Multiple active policies / COB on file",
      severity: "medium",
      requiresReviewBeforeSubmission: true,
    };
  }

  if (!input.checkedAt) {
    return {
      type: "stale_eligibility",
      label: "Eligibility never checked",
      severity: "medium",
      requiresReviewBeforeSubmission: true,
    };
  }

  const days = daysBetween(input.checkedAt);
  if (days !== null && days > 30) {
    return {
      type: "stale_eligibility",
      label: `Last check ${days} days ago`,
      severity: days > 60 ? "high" : "medium",
      requiresReviewBeforeSubmission: true,
    };
  }

  return null;
}

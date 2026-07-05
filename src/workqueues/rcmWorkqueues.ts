import type { ChargeCaptureQueueFilters, ChargeCaptureTab } from "../services/chargeCaptureService";

export type WorkqueueDomain = "eligibility" | "charge_capture" | "claims" | "claim_batches";
export type WorkqueueActionKind = "open" | "approve" | "validate" | "route" | "batch" | "submit" | "resolve";

export type WorkqueueColumn = {
  key: string;
  label: string;
  width?: "sm" | "md" | "lg";
};

export type WorkqueueAction = {
  key: string;
  label: string;
  kind: WorkqueueActionKind;
  routeKey: string;
};

export type RcmWorkqueueDefinition = {
  key: string;
  title: string;
  description: string;
  domain: WorkqueueDomain;
  routeKey: string;
  defaultFilters: Record<string, unknown>;
  columns: WorkqueueColumn[];
  actions: WorkqueueAction[];
};

const eligibilityColumns: WorkqueueColumn[] = [
  { key: "clientId", label: "Client", width: "md" },
  { key: "payerId", label: "Payer", width: "md" },
  { key: "serviceDate", label: "DOS", width: "sm" },
  { key: "issue.type", label: "Issue Type", width: "md" },
  { key: "issue.label", label: "Issue", width: "lg" },
  { key: "actionNeeded", label: "Action Needed", width: "lg" },
];

const chargeColumns: WorkqueueColumn[] = [
  { key: "dateOfService", label: "DOS", width: "sm" },
  { key: "clientId", label: "Client", width: "md" },
  { key: "providerId", label: "Provider", width: "md" },
  { key: "cptCode", label: "CPT", width: "sm" },
  { key: "chargeAmount", label: "Charge", width: "sm" },
  { key: "blockers", label: "Blockers", width: "lg" },
];

const claimColumns: WorkqueueColumn[] = [
  { key: "claimId", label: "Claim", width: "md" },
  { key: "clientId", label: "Client", width: "md" },
  { key: "payerProfileId", label: "Payer", width: "md" },
  { key: "claimStatus", label: "Status", width: "sm" },
  { key: "totalCharge", label: "Total", width: "sm" },
  { key: "actionNeeded", label: "Action", width: "lg" },
];

export const RCM_WORKQUEUES: RcmWorkqueueDefinition[] = [
  {
    key: "eligibility_issues",
    title: "Eligibility Issues",
    description: "Coverage, inactive payer, COB, missing subscriber, stale eligibility, and authorization items that must be resolved before claim creation.",
    domain: "eligibility",
    routeKey: "eligibilityReadiness.listIssueRows",
    defaultFilters: { onlyIssues: true, status: "open" },
    columns: eligibilityColumns,
    actions: [
      { key: "open", label: "Open eligibility", kind: "open", routeKey: "eligibility.latest" },
      { key: "resolve", label: "Resolve", kind: "resolve", routeKey: "workqueue.resolve" },
    ],
  },
  {
    key: "charge_capture_ready",
    title: "Ready for Charge Review",
    description: "Captured charges with enough information for billing review and approval.",
    domain: "charge_capture",
    routeKey: "chargeCapture.queue",
    defaultFilters: { tab: "ready_for_review" satisfies ChargeCaptureTab },
    columns: chargeColumns,
    actions: [
      { key: "open", label: "Open charge", kind: "open", routeKey: "chargeCapture.update" },
      { key: "approve", label: "Approve for claim", kind: "approve", routeKey: "chargeCapture.approve" },
    ],
  },
  {
    key: "documentation_missing",
    title: "Documentation Missing",
    description: "Charges blocked because the note or required billing fields are missing.",
    domain: "charge_capture",
    routeKey: "chargeCapture.queue",
    defaultFilters: { tab: "documentation_missing" satisfies ChargeCaptureTab },
    columns: chargeColumns,
    actions: [
      { key: "open", label: "Open charge", kind: "open", routeKey: "chargeCapture.update" },
      { key: "route", label: "Route back", kind: "route", routeKey: "chargeCapture.update" },
    ],
  },
  {
    key: "coding_mismatch",
    title: "Coding Mismatch",
    description: "Charges blocked for CPT, modifier, diagnosis, units, or service-line corrections.",
    domain: "charge_capture",
    routeKey: "chargeCapture.queue",
    defaultFilters: { tab: "coding_mismatch" satisfies ChargeCaptureTab },
    columns: chargeColumns,
    actions: [
      { key: "open", label: "Open charge", kind: "open", routeKey: "chargeCapture.update" },
      { key: "validate", label: "Validate", kind: "validate", routeKey: "chargeCapture.validate" },
    ],
  },
  {
    key: "eligibility_auth_blocked",
    title: "Eligibility/Auth Blocked",
    description: "Charges blocked because eligibility is inactive, missing, or authorization is required.",
    domain: "charge_capture",
    routeKey: "chargeCapture.queue",
    defaultFilters: { tab: "eligibility_auth_issue" satisfies ChargeCaptureTab },
    columns: chargeColumns,
    actions: [
      { key: "open", label: "Open charge", kind: "open", routeKey: "chargeCapture.update" },
      { key: "eligibility", label: "Check eligibility", kind: "open", routeKey: "eligibility.latest" },
    ],
  },
  {
    key: "claims_validation_failed",
    title: "Claim Build Errors",
    description: "Claims that failed pre-submission validation and need correction before batching.",
    domain: "claims",
    routeKey: "claims.validate",
    defaultFilters: { claimStatus: "validation_failed" },
    columns: claimColumns,
    actions: [
      { key: "open", label: "Open claim", kind: "open", routeKey: "claims.timeline" },
      { key: "validate", label: "Revalidate", kind: "validate", routeKey: "claims.validate" },
    ],
  },
  {
    key: "claims_ready_for_batch",
    title: "Ready to Batch",
    description: "Validated claims ready to be added to a claim batch.",
    domain: "claims",
    routeKey: "claims.createBatch",
    defaultFilters: { claimStatus: "ready_for_batch" },
    columns: claimColumns,
    actions: [
      { key: "batch", label: "Create batch", kind: "batch", routeKey: "claims.createBatch" },
    ],
  },
  {
    key: "claim_batches_ready",
    title: "Batches Ready to Submit",
    description: "Claim batches that are generated and ready for clearinghouse submission or file download.",
    domain: "claim_batches",
    routeKey: "claims.markBatchSubmitted",
    defaultFilters: { batchStatus: "ready" },
    columns: [
      { key: "batchId", label: "Batch", width: "md" },
      { key: "claimCount", label: "Claims", width: "sm" },
      { key: "totalChargeAmount", label: "Total", width: "sm" },
      { key: "batchStatus", label: "Status", width: "sm" },
    ],
    actions: [
      { key: "submit", label: "Submit batch", kind: "submit", routeKey: "claims.markBatchSubmitted" },
    ],
  },
];

export function getRcmWorkqueueDefinition(key: string): RcmWorkqueueDefinition | null {
  return RCM_WORKQUEUES.find((queue) => queue.key === key) ?? null;
}

export function buildChargeCaptureFilters(queueKey: string, overrides: Partial<ChargeCaptureQueueFilters> = {}): ChargeCaptureQueueFilters {
  const queue = getRcmWorkqueueDefinition(queueKey);
  return { ...((queue?.defaultFilters ?? {}) as ChargeCaptureQueueFilters), ...overrides };
}

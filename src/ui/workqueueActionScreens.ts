import type { UiAction, UiField, UiIntent } from "./rcmDashboardComponents";

export type ActionScreenField = UiField & {
  required?: boolean;
  helperText?: string;
};

export type ActionScreenSection = {
  key: string;
  title: string;
  description: string;
  fields: ActionScreenField[];
};

export type ActionScreenDefinition = {
  key: string;
  title: string;
  description: string;
  domain: "eligibility" | "charge_capture" | "claims" | "claim_batches" | "workqueue";
  primaryAction: UiAction;
  secondaryActions: UiAction[];
  sections: ActionScreenSection[];
  successMessage: string;
};

function action(key: string, label: string, intent: UiIntent, routeKey: string): UiAction {
  return { key, label, intent, routeKey, requiresSelection: false };
}

export const WORKQUEUE_ACTION_SCREENS: ActionScreenDefinition[] = [
  {
    key: "eligibility_review",
    title: "Eligibility Review",
    description: "Review coverage, payer, COB, and authorization details before charge approval or claim creation.",
    domain: "eligibility",
    primaryAction: action("verify_eligibility", "Verify Eligibility", "primary", "eligibility.verify"),
    secondaryActions: [action("flag_issue", "Flag Issue", "warning", "eligibility.flagIssue")],
    successMessage: "Eligibility review saved.",
    sections: [
      {
        key: "coverage",
        title: "Coverage",
        description: "Policy and coverage fields needed for a clean behavioral-health claim.",
        fields: [
          { key: "clientId", label: "Client", valueType: "text", priority: "primary", required: true },
          { key: "serviceDate", label: "Service Date", valueType: "date", priority: "primary", required: true },
          { key: "cptCode", label: "CPT", valueType: "text", priority: "secondary" },
          { key: "coverageStatus", label: "Coverage Status", valueType: "status", priority: "primary", required: true },
          { key: "authorizationRequired", label: "Authorization Required", valueType: "status", priority: "secondary" },
        ],
      },
    ],
  },
  {
    key: "charge_review",
    title: "Charge Review",
    description: "Review documentation, CPT, diagnosis, units, and eligibility blockers before releasing a charge to claims.",
    domain: "charge_capture",
    primaryAction: action("approve_charge", "Approve for Claim", "success", "chargeCapture.approve"),
    secondaryActions: [
      action("validate_charge", "Validate", "secondary", "chargeCapture.validate"),
      action("hold_charge", "Hold Charge", "warning", "chargeCapture.update"),
    ],
    successMessage: "Charge released to claims.",
    sections: [
      {
        key: "charge_details",
        title: "Charge Details",
        description: "Required billing fields and service-line details.",
        fields: [
          { key: "dateOfService", label: "DOS", valueType: "date", priority: "primary", required: true },
          { key: "clientId", label: "Client", valueType: "text", priority: "primary", required: true },
          { key: "providerId", label: "Provider", valueType: "text", priority: "secondary", required: true },
          { key: "cptCode", label: "CPT", valueType: "text", priority: "primary", required: true },
          { key: "diagnosisCodes", label: "Diagnosis", valueType: "badgeList", priority: "secondary", required: true },
          { key: "totalCharge", label: "Charge", valueType: "currency", priority: "secondary", required: true },
        ],
      },
      {
        key: "blockers",
        title: "Blockers",
        description: "Issues preventing clean claim creation.",
        fields: [
          { key: "blockers", label: "Blockers", valueType: "badgeList", priority: "primary" },
          { key: "actionNeeded", label: "Action Needed", valueType: "text", priority: "primary" },
        ],
      },
    ],
  },
  {
    key: "claim_validation",
    title: "Claim Validation",
    description: "Correct claim-level and service-line errors before batching.",
    domain: "claims",
    primaryAction: action("validate_claim", "Validate Claim", "primary", "claims.validate"),
    secondaryActions: [action("mark_ready", "Mark Ready for Batch", "success", "claims.markReadyForBatch")],
    successMessage: "Claim validation completed.",
    sections: [
      {
        key: "claim_details",
        title: "Claim Details",
        description: "Claim data used for pre-submission validation.",
        fields: [
          { key: "serviceDate", label: "DOS", valueType: "date", priority: "primary", required: true },
          { key: "clientId", label: "Client", valueType: "text", priority: "primary", required: true },
          { key: "payerProfileId", label: "Payer", valueType: "text", priority: "secondary", required: true },
          { key: "status", label: "Status", valueType: "status", priority: "secondary" },
          { key: "totalCharge", label: "Charge", valueType: "currency", priority: "secondary" },
          { key: "actionNeeded", label: "Action Needed", valueType: "text", priority: "primary" },
        ],
      },
    ],
  },
  {
    key: "batch_submission",
    title: "Batch Submission",
    description: "Review claim batch readiness before submission or file generation.",
    domain: "claim_batches",
    primaryAction: action("submit_batch", "Submit Batch", "success", "claims.markBatchSubmitted"),
    secondaryActions: [action("mark_ready", "Mark Batch Ready", "primary", "claims.markBatchReady")],
    successMessage: "Batch submission recorded.",
    sections: [
      {
        key: "batch_details",
        title: "Batch Details",
        description: "Batch-level claim count, total charge, and submission status.",
        fields: [
          { key: "batchId", label: "Batch", valueType: "text", priority: "primary", required: true },
          { key: "claimCount", label: "Claims", valueType: "number", priority: "secondary" },
          { key: "totalChargeAmount", label: "Total", valueType: "currency", priority: "secondary" },
          { key: "batchStatus", label: "Status", valueType: "status", priority: "primary" },
        ],
      },
    ],
  },
  {
    key: "workqueue_resolution",
    title: "Resolve Workqueue Item",
    description: "Close a staff task after the blocking issue has been corrected.",
    domain: "workqueue",
    primaryAction: action("resolve", "Resolve", "success", "workqueue.resolve"),
    secondaryActions: [action("open_source", "Open Source", "secondary", "workqueue.open")],
    successMessage: "Workqueue item resolved.",
    sections: [
      {
        key: "resolution",
        title: "Resolution",
        description: "Resolution details for the task history.",
        fields: [
          { key: "title", label: "Task", valueType: "text", priority: "primary" },
          { key: "description", label: "Issue", valueType: "text", priority: "secondary" },
          { key: "resolutionNote", label: "Resolution Note", valueType: "text", priority: "primary", helperText: "Document what was corrected before resolving." },
        ],
      },
    ],
  },
];

export function getActionScreenDefinition(key: string): ActionScreenDefinition | null {
  return WORKQUEUE_ACTION_SCREENS.find((screen) => screen.key === key) ?? null;
}

export function getActionScreenForRoute(routeKey: string): ActionScreenDefinition | null {
  return WORKQUEUE_ACTION_SCREENS.find((screen) => screen.primaryAction.routeKey === routeKey || screen.secondaryActions.some((screenAction) => screenAction.routeKey === routeKey)) ?? null;
}

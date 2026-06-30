import type { DashboardCard, DashboardMetric, DashboardSection } from "../adapters/rcmDashboardAdapters";
import type { ChargeDashboardRow, ClaimDashboardRow, WorkqueueDashboardItem } from "../services/workqueueQueryService";

export type UiDensity = "compact" | "comfortable" | "spacious";
export type UiIntent = "primary" | "secondary" | "warning" | "critical" | "success";

export type UiField = {
  key: string;
  label: string;
  valueType: "text" | "number" | "currency" | "date" | "status" | "badgeList";
  priority: "primary" | "secondary" | "detail";
};

export type UiAction = {
  key: string;
  label: string;
  intent: UiIntent;
  routeKey: string;
  requiresSelection?: boolean;
};

export type UiTableSpec = {
  key: string;
  title: string;
  emptyState: string;
  density: UiDensity;
  fields: UiField[];
  actions: UiAction[];
};

export type UiDashboardSpec = {
  key: string;
  title: string;
  description: string;
  metrics: DashboardMetric[];
  cards: DashboardCard[];
  workqueueTable: UiTableSpec;
  chargeTable: UiTableSpec;
  claimTable: UiTableSpec;
};

export const WORKQUEUE_TABLE_SPEC: UiTableSpec = {
  key: "workqueue_items",
  title: "Open Workqueue Items",
  emptyState: "No open workqueue items need action.",
  density: "comfortable",
  fields: [
    { key: "priority", label: "Priority", valueType: "status", priority: "primary" },
    { key: "title", label: "Task", valueType: "text", priority: "primary" },
    { key: "description", label: "Issue", valueType: "text", priority: "secondary" },
    { key: "domain", label: "Area", valueType: "status", priority: "secondary" },
    { key: "dueAt", label: "Due", valueType: "date", priority: "detail" },
  ],
  actions: [
    { key: "open", label: "Open", intent: "primary", routeKey: "workqueue.open", requiresSelection: true },
    { key: "resolve", label: "Resolve", intent: "success", routeKey: "workqueue.resolve", requiresSelection: true },
  ],
};

export const CHARGE_TABLE_SPEC: UiTableSpec = {
  key: "charge_capture_rows",
  title: "Charge Capture",
  emptyState: "No charge-capture rows match this view.",
  density: "comfortable",
  fields: [
    { key: "dateOfService", label: "DOS", valueType: "date", priority: "primary" },
    { key: "clientId", label: "Client", valueType: "text", priority: "primary" },
    { key: "providerId", label: "Provider", valueType: "text", priority: "secondary" },
    { key: "cptCode", label: "CPT", valueType: "text", priority: "secondary" },
    { key: "totalCharge", label: "Charge", valueType: "currency", priority: "secondary" },
    { key: "blockers", label: "Blockers", valueType: "badgeList", priority: "detail" },
    { key: "actionNeeded", label: "Action Needed", valueType: "text", priority: "primary" },
  ],
  actions: [
    { key: "open_charge", label: "Open Charge", intent: "primary", routeKey: "chargeCapture.update", requiresSelection: true },
    { key: "approve_charge", label: "Approve", intent: "success", routeKey: "chargeCapture.approve", requiresSelection: true },
    { key: "validate_charge", label: "Validate", intent: "secondary", routeKey: "chargeCapture.validate", requiresSelection: true },
  ],
};

export const CLAIM_TABLE_SPEC: UiTableSpec = {
  key: "claim_rows",
  title: "Claims",
  emptyState: "No claims match this view.",
  density: "comfortable",
  fields: [
    { key: "serviceDate", label: "DOS", valueType: "date", priority: "primary" },
    { key: "clientId", label: "Client", valueType: "text", priority: "primary" },
    { key: "payerProfileId", label: "Payer", valueType: "text", priority: "secondary" },
    { key: "status", label: "Status", valueType: "status", priority: "secondary" },
    { key: "totalCharge", label: "Charge", valueType: "currency", priority: "secondary" },
    { key: "actionNeeded", label: "Action Needed", valueType: "text", priority: "primary" },
  ],
  actions: [
    { key: "open_claim", label: "Open Claim", intent: "primary", routeKey: "claims.timeline", requiresSelection: true },
    { key: "validate_claim", label: "Validate", intent: "secondary", routeKey: "claims.validate", requiresSelection: true },
    { key: "batch_claim", label: "Batch", intent: "success", routeKey: "claims.createBatch", requiresSelection: true },
  ],
};

export function buildRcmDashboardSpec(input: {
  metrics: DashboardMetric[];
  cards: DashboardCard[];
}): UiDashboardSpec {
  return {
    key: "rcm_dashboard",
    title: "RCM Workqueues",
    description: "Eligibility, charge capture, claim build, and batch submission work needing attention.",
    metrics: input.metrics,
    cards: input.cards,
    workqueueTable: WORKQUEUE_TABLE_SPEC,
    chargeTable: CHARGE_TABLE_SPEC,
    claimTable: CLAIM_TABLE_SPEC,
  };
}

export function sectionCount<T>(section: DashboardSection<T>): number {
  return section.rows.length;
}

export type DashboardRenderableRows = WorkqueueDashboardItem | ChargeDashboardRow | ClaimDashboardRow;

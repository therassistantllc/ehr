import { RCM_WORKQUEUES, type RcmWorkqueueDefinition } from "../workqueues/rcmWorkqueues";
import type {
  ChargeDashboardRow,
  ClaimDashboardRow,
  RcmDashboardSnapshot,
  WorkqueueDashboardItem,
  WorkqueueSummary,
} from "../services/workqueueQueryService";

export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
  description?: string;
};

export type DashboardCard = {
  key: string;
  title: string;
  subtitle: string;
  count: number;
  severity: "normal" | "warning" | "critical";
  routeKey: string;
  queue: RcmWorkqueueDefinition | null;
};

export type DashboardSection<T> = {
  key: string;
  title: string;
  description: string;
  rows: T[];
};

export type RcmDashboardViewModel = {
  metrics: DashboardMetric[];
  cards: DashboardCard[];
  workqueueSections: DashboardSection<WorkqueueDashboardItem>[];
  chargeSections: DashboardSection<ChargeDashboardRow>[];
  claimSections: DashboardSection<ClaimDashboardRow>[];
};

function countBy<T>(rows: T[], getKey: (row: T) => string): Record<string, number> {
  return rows.reduce<Record<string, number>>((result, row) => {
    const key = getKey(row);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
}

function severity(count: number, criticalAt = 10, warningAt = 1): DashboardCard["severity"] {
  if (count >= criticalAt) return "critical";
  if (count >= warningAt) return "warning";
  return "normal";
}

function queueByKey(key: string): RcmWorkqueueDefinition | null {
  return RCM_WORKQUEUES.find((queue) => queue.key === key) ?? null;
}

export function buildWorkqueueMetrics(summary: WorkqueueSummary): DashboardMetric[] {
  return [
    { key: "open_workqueues", label: "Open workqueues", value: summary.totalOpen, description: "Items requiring staff action." },
    { key: "urgent_workqueues", label: "Urgent", value: summary.byPriority.urgent ?? 0, description: "Open workqueue items marked urgent." },
    { key: "high_priority_workqueues", label: "High priority", value: summary.byPriority.high ?? 0, description: "Open workqueue items marked high." },
  ];
}

export function buildDashboardCards(snapshot: RcmDashboardSnapshot): DashboardCard[] {
  const chargesByTab = countBy(snapshot.charges, (row) => row.tab);
  const claimsByStatus = countBy(snapshot.claims, (row) => row.status);

  const cardInputs: Array<{ key: string; count: number; title: string; subtitle: string; routeKey: string }> = [
    { key: "eligibility_issues", count: snapshot.workqueueSummary.byWorkType.eligibility_issue ?? 0, title: "Eligibility issues", subtitle: "Coverage/auth problems", routeKey: "eligibility.latest" },
    { key: "charge_capture_ready", count: chargesByTab.ready_for_review ?? 0, title: "Ready for charge review", subtitle: "Approve or hold charges", routeKey: "chargeCapture.queue" },
    { key: "documentation_missing", count: chargesByTab.documentation_missing ?? 0, title: "Documentation missing", subtitle: "Signed note or billing fields needed", routeKey: "chargeCapture.queue" },
    { key: "coding_mismatch", count: chargesByTab.coding_mismatch ?? 0, title: "Coding mismatch", subtitle: "CPT, modifier, units, or diagnosis fixes", routeKey: "chargeCapture.queue" },
    { key: "eligibility_auth_blocked", count: chargesByTab.eligibility_auth_issue ?? 0, title: "Eligibility/auth blocked", subtitle: "Eligibility or authorization must be fixed", routeKey: "chargeCapture.queue" },
    { key: "claims_validation_failed", count: claimsByStatus.validation_failed ?? 0, title: "Claim build errors", subtitle: "Claims failed validation", routeKey: "claims.validate" },
    { key: "claims_ready_for_batch", count: claimsByStatus.ready_for_batch ?? 0, title: "Ready to batch", subtitle: "Validated claims ready for batching", routeKey: "claims.createBatch" },
    { key: "claim_batches_ready", count: snapshot.workqueueSummary.byWorkType.claim_batch_ready ?? 0, title: "Batches ready", subtitle: "Prepared batches awaiting submission", routeKey: "claims.markBatchSubmitted" },
  ];

  return cardInputs.map((card) => ({
    ...card,
    severity: severity(card.count),
    queue: queueByKey(card.key),
  }));
}

export function groupWorkqueueItems(items: WorkqueueDashboardItem[]): DashboardSection<WorkqueueDashboardItem>[] {
  const groups = ["eligibility", "charge_capture", "claims", "claim_batches", "other"] as const;
  return groups.map((domain) => ({
    key: domain,
    title: domain.replace(/_/g, " "),
    description: `Open ${domain.replace(/_/g, " ")} workqueue items.`,
    rows: items.filter((item) => item.domain === domain),
  })).filter((section) => section.rows.length > 0);
}

export function groupChargeRows(rows: ChargeDashboardRow[]): DashboardSection<ChargeDashboardRow>[] {
  const tabs = ["ready_for_review", "documentation_missing", "coding_mismatch", "eligibility_auth_issue", "held_charges", "released_to_claims"] as const;
  return tabs.map((tab) => ({
    key: tab,
    title: tab.replace(/_/g, " "),
    description: `Charges categorized as ${tab.replace(/_/g, " ")}.`,
    rows: rows.filter((row) => row.tab === tab),
  })).filter((section) => section.rows.length > 0);
}

export function groupClaimRows(rows: ClaimDashboardRow[]): DashboardSection<ClaimDashboardRow>[] {
  const statuses = ["validation_failed", "ready_for_batch", "batched", "submitted", "rejected", "paid", "draft"];
  return statuses.map((status) => ({
    key: status,
    title: status.replace(/_/g, " "),
    description: `Claims currently in ${status.replace(/_/g, " ")} status.`,
    rows: rows.filter((row) => row.status === status),
  })).filter((section) => section.rows.length > 0);
}

export function buildRcmDashboardViewModel(snapshot: RcmDashboardSnapshot): RcmDashboardViewModel {
  return {
    metrics: buildWorkqueueMetrics(snapshot.workqueueSummary),
    cards: buildDashboardCards(snapshot),
    workqueueSections: groupWorkqueueItems(snapshot.workqueueItems),
    chargeSections: groupChargeRows(snapshot.charges),
    claimSections: groupClaimRows(snapshot.claims),
  };
}

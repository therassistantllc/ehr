import type { SupabaseClient } from "@supabase/supabase-js";

type Severity = "blocking" | "warning" | "info";

export const CATEGORIES = [
  "organization",
  "providers",
  "locations",
  "payers",
  "clearinghouse",
  "feeSchedules",
  "billingDefaults",
  "claimDiagnoses",
  "claimServiceLines",
  "claimParties",
  "claimDates",
  "claimTelehealth",
  "claimAuthorization",
  "claimPayerRules",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const SYSTEM_READINESS_CATEGORIES: Category[] = [
  "organization",
  "providers",
  "locations",
  "payers",
  "clearinghouse",
  "feeSchedules",
  "billingDefaults",
];

export const CLAIM_CONTENT_CATEGORIES: Category[] = [
  "claimDiagnoses",
  "claimServiceLines",
  "claimParties",
  "claimDates",
  "claimTelehealth",
  "claimAuthorization",
  "claimPayerRules",
];

export interface ValidationFinding {
  ruleId: string;
  category: Category;
  severity: Severity;
  message: string;
  fixRoute: string;
  whyItMatters: string;
  resolution: string;
  evidence?: Record<string, unknown>;
}

export interface ValidationSummary {
  total: number;
  blocking: number;
  warning: number;
  info: number;
  ready: boolean;
}

export type FindingsByCategory = Record<Category, ValidationFinding[]>;

export interface ValidationReport {
  organizationId: string;
  organizationName: string | null;
  generatedAt: string;
  summary: ValidationSummary;
  findings: ValidationFinding[];
  findingsByCategory: FindingsByCategory;
}

export interface FactContext {
  organizationId: string;
  supabase: SupabaseClient;
  claimId?: string | null;
}

export interface FactLoader {
  name: string;
  load: (ctx: FactContext) => Promise<Record<string, unknown>>;
}

export interface RuleSpec {
  id: string;
  category: Category;
  severity: Severity;
  message: string;
  fixRoute: string;
  whyItMatters: string;
  resolution: string;
  conditions: Record<string, unknown>;
}

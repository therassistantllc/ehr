import { Engine, type RuleProperties } from "json-rules-engine";
import type { Category, FactContext, FactLoader, RuleSpec, ValidationFinding } from "./types";

const LOADER_CATEGORY: Record<string, Category> = {
  organization: "organization",
  providers: "providers",
  locations: "locations",
  payers: "payers",
  clearinghouse: "clearinghouse",
  feeSchedules: "feeSchedules",
  billingDefaults: "billingDefaults",
  claim: "claimParties",
  serviceLines: "claimServiceLines",
  claimDates: "claimDates",
  parties: "claimParties",
  telehealth: "claimTelehealth",
  authorization: "claimAuthorization",
};

export async function runEngine(
  ctx: FactContext,
  loaders: FactLoader[],
  rules: RuleSpec[],
): Promise<ValidationFinding[]> {
  const engine = new Engine([], { allowUndefinedFacts: true });
  const loaderErrors = new Map<string, string>();

  for (const loader of loaders) {
    engine.addFact(loader.name, async () => {
      try {
        return await loader.load(ctx);
      } catch (err) {
        loaderErrors.set(loader.name, err instanceof Error ? err.message : String(err));
        return {};
      }
    });
  }

  for (const spec of rules) {
    const rule: RuleProperties = {
      conditions: spec.conditions as RuleProperties["conditions"],
      event: {
        type: spec.id,
        params: {
          category: spec.category,
          severity: spec.severity,
          message: spec.message,
          fixRoute: spec.fixRoute,
          whyItMatters: spec.whyItMatters,
          resolution: spec.resolution,
        },
      },
    };
    engine.addRule(rule);
  }

  const findings: ValidationFinding[] = [];
  engine.on("success", (event, almanac) => {
    const params = event.params ?? {};
    findings.push({
      ruleId: event.type,
      category: params.category,
      severity: params.severity,
      message: params.message,
      fixRoute: params.fixRoute,
      whyItMatters: params.whyItMatters,
      resolution: params.resolution,
    });
    void almanac;
  });

  await engine.run();

  for (const [loaderName, errMsg] of loaderErrors) {
    findings.push({
      ruleId: `engine.fact_unavailable.${loaderName}`,
      category: LOADER_CATEGORY[loaderName] ?? "organization",
      severity: "blocking",
      message: `Could not load configuration data for "${loaderName}".`,
      fixRoute: "/settings",
      whyItMatters:
        "The validation engine could not read this configuration domain, so its rules were skipped. " +
        "Treat the engine result as incomplete until the underlying data source is available.",
      resolution:
        "Check database connectivity, table permissions, and recent schema changes. Re-run validation after the underlying error is resolved.",
      evidence: { loader: loaderName, error: errMsg },
    });
  }

  return findings;
}

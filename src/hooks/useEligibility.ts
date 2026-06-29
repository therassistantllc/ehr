import type { TherassistantSupabaseClient } from "../lib/supabase";
import type { ServiceContext } from "../services/serviceBase";
import {
  EligibilityService,
  type ClientPolicyInput,
  type EligibilityVerificationInput,
} from "../services/eligibilityService";

export type EligibilityHook = ReturnType<typeof createEligibilityHook>;

export function createEligibilityHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const service = new EligibilityService(db, context);

  return {
    service,
    addPolicy: (input: ClientPolicyInput) => service.addClientPolicy(input),
    terminatePolicy: (policyId: string, terminationDate: string, reason?: string) => service.terminateClientPolicy(policyId, terminationDate, reason),
    getActivePolicies: (clientId: string, serviceDate: string) => service.getActivePolicies(clientId, serviceDate),
    verifyEligibility: (input: EligibilityVerificationInput) => service.verifyEligibility(input),
    getLatestEligibility: (clientId: string, serviceDate: string, cptCode?: string) => service.getLatestEligibility(clientId, serviceDate, cptCode),
    getExpectedClientResponsibility: (clientId: string, serviceDate: string, cptCode?: string) => service.getExpectedClientResponsibility(clientId, serviceDate, cptCode),
    flagEligibilityIssue: (clientId: string, issueType: string, note?: string) => service.flagEligibilityIssue(clientId, issueType, note),
  };
}

export const useEligibility = createEligibilityHook;

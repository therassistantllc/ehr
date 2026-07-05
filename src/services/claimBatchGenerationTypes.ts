export type ClaimBatchGenerationMode = "test" | "production";

export type ClaimBatchGenerationIssue = {
  claimId?: string | null;
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type GenerateClaimBatchFileInput = {
  batchId: string;
  mode?: ClaimBatchGenerationMode;
  fileName?: string | null;
  markReady?: boolean;
};

export type GeneratedClaimBatchFile = {
  batchId: string;
  fileId: string | null;
  fileName: string;
  fileContent: string;
  claimCount: number;
  valid: boolean;
  issues: ClaimBatchGenerationIssue[];
};

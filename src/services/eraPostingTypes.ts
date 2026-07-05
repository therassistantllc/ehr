export type EraUploadInput = {
  fileName: string;
  fileContent: string;
  metadata?: Record<string, unknown>;
};

export type ParsedEraPayment = {
  traceNumber?: string | null;
  checkNumber?: string | null;
  paymentMethod?: string | null;
  paymentAmount: number;
  paymentDate?: string | null;
};

export type ParsedEraAdjustment = {
  groupCode?: string | null;
  reasonCode?: string | null;
  amount: number;
  quantity?: number | null;
};

export type ParsedEraServiceLine = {
  procedureCode?: string | null;
  chargeAmount: number;
  paidAmount: number;
  units?: number | null;
  serviceDate?: string | null;
  adjustments: ParsedEraAdjustment[];
};

export type ParsedEraClaim = {
  claimId?: string | null;
  patientAccountNumber?: string | null;
  payerClaimControlNumber?: string | null;
  statusCode?: string | null;
  totalChargeAmount: number;
  paidAmount: number;
  patientResponsibilityAmount: number;
  adjustments: ParsedEraAdjustment[];
  serviceLines: ParsedEraServiceLine[];
};

export type ParsedEraFile = {
  payment: ParsedEraPayment;
  claims: ParsedEraClaim[];
};

export type EraPostResult = {
  eraFileId: string;
  paymentId: string;
  postedClaimIds: string[];
  unmatchedClaims: ParsedEraClaim[];
};

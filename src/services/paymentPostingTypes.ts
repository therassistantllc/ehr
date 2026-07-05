export type PaymentSource = "era" | "manual_eob" | "patient" | "historical" | "other";
export type PaymentMethod = "eft" | "ach" | "check" | "credit_card" | "debit_card" | "card" | "cash" | "money_order" | "portal" | "manual" | "other";

export type PaymentAdjustmentInput = {
  groupCode?: "CO" | "PR" | "OA" | "PI" | null;
  carcCode?: string | null;
  rarcCode?: string | null;
  amount: number;
  category?: string | null;
  scope?: string | null;
  description?: string | null;
  isWriteoff?: boolean;
};

export type PaymentAllocationInput = {
  claimId?: string | null;
  claimServiceLineId?: string | null;
  patientInvoiceId?: string | null;
  clientInvoiceLineId?: string | null;
  clientId?: string | null;
  providerId?: string | null;
  serviceDate?: string | null;
  appliedAmount: number;
  allowedAmount?: number | null;
  chargeAmount?: number | null;
  contractualAdjustmentAmount?: number;
  patientResponsibilityAmount?: number;
  payerResponsibilityAmount?: number;
  adjustments?: PaymentAdjustmentInput[];
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

export type PostPaymentInput = {
  paymentSource: PaymentSource;
  paymentMethod?: PaymentMethod;
  paymentType?: string | null;
  payerId?: string | null;
  payerProfileId?: string | null;
  clientId?: string | null;
  claimId?: string | null;
  paymentImportBatchId?: string | null;
  paymentImportItemId?: string | null;
  paymentBatchId?: string | null;
  paymentSourceId?: string | null;
  paymentMethodId?: string | null;
  eraFileId?: string | null;
  manualEobId?: string | null;
  eobFileId?: string | null;
  clientPaymentId?: string | null;
  paymentDate: string;
  depositDate?: string | null;
  receivedAt?: string | null;
  checkNumber?: string | null;
  checkOrEftNumber?: string | null;
  referenceNumber?: string | null;
  traceNumber?: string | null;
  payerClaimControlNumber?: string | null;
  patientAccountNumber?: string | null;
  payerName?: string | null;
  totalAmount: number;
  totalChargeAmount?: number | null;
  patientResponsibilityAmount?: number | null;
  allocations?: PaymentAllocationInput[];
  notes?: string | null;
  sourceRecordType?: string | null;
  sourceRecordId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ManualEobInput = PostPaymentInput & {
  eobDate?: string | null;
  payerControlNumber?: string | null;
  adjustmentAmount?: number | null;
};

export type HistoricalPaymentInput = {
  clientId: string;
  providerId?: string | null;
  payerId?: string | null;
  payerProfileId?: string | null;
  claimId?: string | null;
  claimServiceLineId?: string | null;
  serviceDate?: string | null;
  transactionDate: string;
  postedDate?: string | null;
  amount: number;
  transactionType?: "payment" | "adjustment" | "opening_balance" | "credit" | "refund" | "transfer" | "correction";
  transactionDirection?: "debit" | "credit";
  paymentMethod?: PaymentMethod | null;
  referenceNumber?: string | null;
  description?: string | null;
  sourceSystem?: string | null;
  externalTransactionId?: string | null;
  metadata?: Record<string, unknown>;
};

export type PostedPaymentResult = {
  paymentId: string;
  allocationIds: string[];
  unappliedAmount: number;
};

export type PaymentSource = "era" | "manual_eob" | "patient" | "historical" | "other";
export type PaymentMethod = "eft" | "check" | "card" | "cash" | "other";

export type PaymentAdjustmentInput = {
  groupCode?: string | null;
  carcCode?: string | null;
  rarcCode?: string | null;
  amount: number;
  category?: string | null;
  isWriteoff?: boolean;
};

export type PaymentAllocationInput = {
  claimId?: string | null;
  claimServiceLineId?: string | null;
  clientId?: string | null;
  providerId?: string | null;
  serviceDate?: string | null;
  appliedAmount: number;
  contractualAdjustmentAmount?: number;
  patientResponsibilityAmount?: number;
  payerResponsibilityAmount?: number;
  adjustments?: PaymentAdjustmentInput[];
  metadata?: Record<string, unknown>;
};

export type PostPaymentInput = {
  paymentSource: PaymentSource;
  paymentMethod?: PaymentMethod;
  payerId?: string | null;
  clientId?: string | null;
  paymentDate: string;
  depositDate?: string | null;
  checkNumber?: string | null;
  traceNumber?: string | null;
  totalAmount: number;
  allocations?: PaymentAllocationInput[];
  metadata?: Record<string, unknown>;
};

export type ManualEobInput = PostPaymentInput & {
  eobDate?: string | null;
};

export type HistoricalPaymentInput = {
  clientId: string;
  providerId?: string | null;
  payerId?: string | null;
  serviceDate?: string | null;
  transactionDate: string;
  amount: number;
  transactionType?: "payment" | "adjustment" | "credit" | "refund";
  metadata?: Record<string, unknown>;
};

export type PostedPaymentResult = {
  paymentId: string;
  allocationIds: string[];
  unappliedAmount: number;
};

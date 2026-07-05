import type { TherassistantSupabaseClient } from "../lib/supabase";
import { AppealsService, type AppealInput } from "../services/appealsService";
import { BalanceStatementService, type BalanceStatementInput } from "../services/balanceStatementService";
import { RefundCreditService, type RefundCreditInput } from "../services/refundCreditService";
import { RcmReportingService } from "../services/rcmReportingService";
import type { ServiceContext } from "../services/serviceBase";

export type PostPaymentOpsHook = ReturnType<typeof createPostPaymentOpsHook>;

export function createPostPaymentOpsHook(db: TherassistantSupabaseClient, context: ServiceContext) {
  const appeals = new AppealsService(db, context);
  const statements = new BalanceStatementService(db, context);
  const refunds = new RefundCreditService(db, context);
  const reporting = new RcmReportingService(db, context);
  return {
    appeals,
    statements,
    refunds,
    reporting,
    createAppeal: (input: AppealInput) => appeals.createAppeal(input),
    submitAppeal: (appealId: string, metadata?: Record<string, unknown>) => appeals.submitAppeal(appealId, metadata),
    createCorrectedClaimFromAppeal: (appealId: string) => appeals.createCorrectedClaimFromAppeal(appealId),
    createStatement: (input: BalanceStatementInput) => statements.createStatement(input),
    updateStatementStatus: (statementId: string, status: "draft" | "finalized" | "sent" | "void") => statements.updateStatementStatus(statementId, status),
    createRefundCredit: (input: RefundCreditInput) => refunds.createRefundCredit(input),
    approveRefundCredit: (id: string) => refunds.approveRefundCredit(id),
    markRefundCreditPaid: (id: string) => refunds.markRefundCreditPaid(id),
    detectOverpaymentFromPayment: (paymentId: string) => refunds.detectOverpaymentFromPayment(paymentId),
    getOperationalSummary: () => reporting.getOperationalSummary(),
  };
}

export const usePostPaymentOps = createPostPaymentOpsHook;

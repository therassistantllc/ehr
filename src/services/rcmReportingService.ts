import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type RcmReport = {
  asOf: string;
  openClaimCount: number;
  openArAmount: number;
  denialCount: number;
  openRefundCreditAmount: number;
  statementDraftAmount: number;
  paymentPostedAmount: number;
};

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

export class RcmReportingService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async getOperationalSummary(): Promise<RcmReport> {
    const [claims, ar, denials, refunds, statements, payments] = await Promise.all([
      this.select("claims"),
      this.select("ar_follow_up"),
      this.select("denials"),
      this.select("refunds"),
      this.select("patient_statements"),
      this.select("payments"),
    ]);
    return {
      asOf: new Date().toISOString(),
      openClaimCount: claims.filter((row) => !["paid", "void", "reversed"].includes(String(row.claim_status ?? ""))).length,
      openArAmount: ar.filter((row) => String(row.follow_up_status ?? "open") === "open").reduce((sum, row) => sum + money(row.balance_amount), 0),
      denialCount: denials.filter((row) => String(row.follow_up_status ?? "open") === "open").length,
      openRefundCreditAmount: refunds.filter((row) => !["paid", "void"].includes(String(row.refund_status ?? ""))).reduce((sum, row) => sum + money(row.amount), 0),
      statementDraftAmount: statements.filter((row) => String(row.statement_status ?? "") === "draft").reduce((sum, row) => sum + money(row.total_balance), 0),
      paymentPostedAmount: payments.filter((row) => String(row.payment_status ?? "posted") === "posted").reduce((sum, row) => sum + money(row.total_amount), 0),
    };
  }

  private async select(table: string): Promise<TherassistantRecord[]> {
    const { data, error } = await this.db.from(table).select("*").eq("tenant_id", this.tenantId()).is("archived_at", null);
    if (error) throw new ServiceError(`Failed to read ${table}.`, error);
    return (data ?? []) as TherassistantRecord[];
  }
}

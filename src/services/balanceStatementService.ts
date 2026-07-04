import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type BalanceStatementInput = {
  clientId: string;
  dueDate?: string | null;
  claimIds?: string[];
  metadata?: Record<string, unknown>;
};

function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round((n + Number.EPSILON) * 100) / 100 : 0;
}

function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export class BalanceStatementService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createStatement(input: BalanceStatementInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    const claims = await this.loadClaims(input.clientId, input.claimIds);
    const statementTotal = money(claims.reduce((sum, claim) => sum + money(claim.patient_responsibility_amount), 0));
    const statement = await this.insertOne("patient_statements", {
      client_id: input.clientId,
      statement_date: new Date().toISOString().slice(0, 10),
      due_date: dateOnly(input.dueDate),
      statement_status: "draft",
      total_balance: statementTotal,
      metadata: input.metadata ?? {},
    });
    for (const claim of claims) {
      const amount = money(claim.patient_responsibility_amount);
      if (amount <= 0) continue;
      await this.insertOne("statement_lines", {
        statement_id: statement.id,
        claim_id: claim.id,
        service_date: typeof claim.service_date === "string" ? claim.service_date : null,
        description: `Balance for claim ${claim.id}`,
        amount,
        metadata: {},
      });
    }
    await this.writeAuditLog({ targetType: "patient_statements", targetId: statement.id, action: "create", newValues: statement });
    return statement;
  }

  async updateStatementStatus(statementId: string, status: "draft" | "finalized" | "sent" | "void"): Promise<TherassistantRecord> {
    assertUuid(statementId, "statementId");
    const statement = await this.findById("patient_statements", statementId);
    if (!statement) throw new ServiceError("Statement not found.");
    return this.updateOne("patient_statements", statementId, { statement_status: status });
  }

  private async loadClaims(clientId: string, claimIds?: string[]): Promise<TherassistantRecord[]> {
    let query = this.db.from("claims").select("*").eq("tenant_id", this.tenantId()).or(`client_id.eq.${clientId},patient_id.eq.${clientId}`).is("archived_at", null).gt("patient_responsibility_amount", 0);
    if (claimIds?.length) query = query.in("id", claimIds);
    const { data, error } = await query;
    if (error) throw new ServiceError("Failed to load claims for statement.", error);
    return (data ?? []) as TherassistantRecord[];
  }
}

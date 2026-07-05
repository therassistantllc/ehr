import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type DenialInput = {
  claimId: string;
  paymentAdjustmentId?: string | null;
  denialDate?: string | null;
  carcCode?: string | null;
  rarcCode?: string | null;
  amount: number;
  nextAction?: string | null;
  dueDate?: string | null;
  metadata?: Record<string, unknown>;
};

export type ArFollowUpInput = {
  claimId: string;
  clientId?: string | null;
  payerId?: string | null;
  balanceAmount: number;
  agingBucket?: string | null;
  nextAction?: string | null;
  dueDate?: string | null;
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

function denialCategory(carc?: string | null): string {
  const code = String(carc ?? "").trim();
  if (["147", "170", "171", "172", "206", "207", "208", "242", "243", "279"].includes(code)) return "credentialing_contract";
  if (["16", "197", "198"].includes(code)) return "information_needed";
  if (["29"].includes(code)) return "timely_filing";
  if (["45", "253"].includes(code)) return "contractual";
  if (["1", "2", "3"].includes(code)) return "patient_responsibility";
  return "payer_denial";
}

function agingBucket(days: number): string {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export class DenialArService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createDenial(input: DenialInput): Promise<TherassistantRecord> {
    assertUuid(input.claimId, "claimId");
    const category = denialCategory(input.carcCode);
    const denial = await this.insertOne("denials", {
      claim_id: input.claimId,
      payment_adjustment_id: input.paymentAdjustmentId ?? null,
      denial_date: dateOnly(input.denialDate) ?? new Date().toISOString().slice(0, 10),
      denial_category: category,
      carc_code: input.carcCode ?? null,
      rarc_code: input.rarcCode ?? null,
      denial_amount: money(input.amount),
      follow_up_status: category === "credentialing_contract" ? "writeoff" : "open",
      next_action: input.nextAction ?? this.defaultAction(category),
      due_date: dateOnly(input.dueDate),
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "denials", targetId: denial.id, action: "create", newValues: denial });
    return denial;
  }

  async createArFollowUp(input: ArFollowUpInput): Promise<TherassistantRecord> {
    assertUuid(input.claimId, "claimId");
    const claim = await this.findById("claims", input.claimId);
    const followUp = await this.insertOne("ar_follow_up", {
      claim_id: input.claimId,
      client_id: input.clientId ?? claim?.client_id ?? claim?.patient_id ?? null,
      payer_id: input.payerId ?? claim?.payer_profile_id ?? null,
      balance_amount: money(input.balanceAmount),
      aging_bucket: input.agingBucket ?? agingBucket(this.daysSince(String(claim?.service_date ?? new Date().toISOString()))),
      follow_up_status: "open",
      next_action: input.nextAction ?? "Check payer status and document outcome",
      due_date: dateOnly(input.dueDate),
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "ar_follow_up", targetId: followUp.id, action: "create", newValues: followUp });
    return followUp;
  }

  async buildArFromOpenClaims(): Promise<TherassistantRecord[]> {
    const { data, error } = await this.db.from("claims").select("*").eq("tenant_id", this.tenantId()).is("archived_at", null).not("claim_status", "in", "(paid,void,reversed)");
    if (error) throw new ServiceError("Failed to load open claims.", error);
    const created: TherassistantRecord[] = [];
    for (const claim of (data ?? []) as TherassistantRecord[]) {
      const snapshot = (claim.metadata as Record<string, unknown> | undefined)?.balanceSnapshot as Record<string, unknown> | undefined;
      const balance = money(snapshot?.open ?? claim.payer_responsibility_amount ?? claim.total_charge);
      if (balance > 0) created.push(await this.createArFollowUp({ claimId: claim.id, balanceAmount: balance }));
    }
    return created;
  }

  async resolveFollowUp(table: "denials" | "ar_follow_up", id: string, note?: string): Promise<TherassistantRecord> {
    assertUuid(id, "id");
    const statusColumn = table === "denials" ? "follow_up_status" : "follow_up_status";
    return this.updateOne(table, id, { [statusColumn]: "resolved", metadata: { resolvedNote: note ?? null, resolvedAt: new Date().toISOString() } });
  }

  private defaultAction(category: string): string {
    if (category === "credentialing_contract") return "Write off per credentialing/contract denial policy";
    if (category === "information_needed") return "Correct missing claim information or submit documentation";
    if (category === "timely_filing") return "Review timely filing proof and appeal if appropriate";
    return "Review denial and determine next payer action";
  }

  private daysSince(date: string): number {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  }
}

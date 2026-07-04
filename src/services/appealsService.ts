import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid } from "../lib/supabase";
import { ClaimsService } from "./claimsService";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type AppealType = "appeal" | "reconsideration" | "corrected_claim";

export type AppealInput = {
  claimId: string;
  denialId?: string | null;
  appealType: AppealType;
  reason?: string | null;
  dueDate?: string | null;
  metadata?: Record<string, unknown>;
};

function dateOnly(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export class AppealsService extends TherassistantService {
  private readonly claims: ClaimsService;

  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
    this.claims = new ClaimsService(db, context);
  }

  async createAppeal(input: AppealInput): Promise<TherassistantRecord> {
    assertUuid(input.claimId, "claimId");
    if (input.denialId) assertUuid(input.denialId, "denialId");
    const claim = await this.findById("claims", input.claimId);
    if (!claim) throw new ServiceError("Claim not found.");
    const appeal = await this.insertOne("appeals", {
      claim_id: input.claimId,
      denial_id: input.denialId ?? null,
      appeal_type: input.appealType,
      appeal_status: "draft",
      due_date: dateOnly(input.dueDate),
      reason: input.reason ?? null,
      metadata: input.metadata ?? {},
    });
    await this.writeAuditLog({ targetType: "appeals", targetId: appeal.id, action: "create", newValues: appeal });
    return appeal;
  }

  async submitAppeal(appealId: string, submissionMetadata: Record<string, unknown> = {}): Promise<TherassistantRecord> {
    assertUuid(appealId, "appealId");
    const appeal = await this.findById("appeals", appealId);
    if (!appeal) throw new ServiceError("Appeal not found.");
    const updated = await this.updateOne("appeals", appealId, {
      appeal_status: "submitted",
      submitted_at: new Date().toISOString(),
      metadata: { ...((appeal.metadata as Record<string, unknown>) ?? {}), submissionMetadata },
    });
    await this.writeAuditLog({ targetType: "appeals", targetId: appealId, action: "status_change", oldValues: appeal, newValues: updated });
    return updated;
  }

  async createCorrectedClaimFromAppeal(appealId: string): Promise<TherassistantRecord> {
    assertUuid(appealId, "appealId");
    const appeal = await this.findById("appeals", appealId);
    if (!appeal) throw new ServiceError("Appeal not found.");
    const claim = await this.findById("claims", String(appeal.claim_id));
    if (!claim) throw new ServiceError("Original claim not found.");
    const sourceChargeId = (claim.metadata as Record<string, unknown> | undefined)?.sourceChargeId;
    if (typeof sourceChargeId !== "string") throw new ServiceError("Corrected claim requires source charge reference.");
    const corrected = await this.claims.createClaimFromCharge(sourceChargeId, {
      frequencyCode: "7",
      priorClaimNumber: typeof claim.payer_claim_control_number === "string" ? claim.payer_claim_control_number : null,
      payerProfileId: typeof claim.payer_profile_id === "string" ? claim.payer_profile_id : null,
      billingProviderId: typeof claim.billing_provider_id === "string" ? claim.billing_provider_id : null,
      renderingProviderId: typeof claim.rendering_provider_id === "string" ? claim.rendering_provider_id : null,
      placeOfService: typeof claim.place_of_service === "string" ? claim.place_of_service : null,
    });
    await this.updateOne("appeals", appealId, { metadata: { ...((appeal.metadata as Record<string, unknown>) ?? {}), correctedClaimId: corrected.id } });
    return corrected;
  }
}

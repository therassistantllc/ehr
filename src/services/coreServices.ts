import type { TherassistantRecord, TherassistantSupabaseClient } from "../lib/supabase";
import { assertUuid, removeUndefined } from "../lib/supabase";
import { ServiceError, TherassistantService, type ServiceContext } from "./serviceBase";

export type TenantType = "platform" | "practice" | "billing_company";
export type AppointmentStatus = "scheduled" | "on_my_way" | "arrived" | "checked_in" | "completed" | "cancelled" | "no_show";
export type ChargeStatus = "draft" | "blocked" | "ready_for_claim" | "claimed" | "void";
export type ClaimStatus = "draft" | "validation_failed" | "ready_for_batch" | "batched" | "submitted" | "accepted" | "rejected" | "paid" | "void" | "reversed";

export type CreateTenantInput = {
  name: string;
  tenantType: TenantType;
  legalName?: string;
  timezone?: string;
  billingNpi?: string;
  taxIdLast4?: string;
};

export type CreateClientInput = {
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  externalId?: string;
  demographics?: Record<string, unknown>;
};

export type CreateAppointmentInput = {
  clientId: string;
  providerId: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  locationId?: string;
  telehealth?: boolean;
  data?: Record<string, unknown>;
};

export type CheckInInput = {
  appointmentId: string;
  status?: "checked_in" | "on_my_way" | "arrived";
  responses?: Record<string, unknown>;
  safetyConcern?: boolean;
  clientNote?: string;
};

export type CreateChargeInput = {
  appointmentId?: string;
  clientId: string;
  providerId?: string;
  serviceDate: string;
  cptCode: string;
  units?: number;
  chargeAmount?: number;
  diagnosisCodes?: string[];
  modifiers?: string[];
};

export type PostHistoricalPaymentInput = {
  clientId: string;
  amount: number;
  paymentDate: string;
  source: "payer" | "client" | "third_party" | "historical";
  method?: string;
  referenceNumber?: string;
  note?: string;
  originalSystem?: string;
};

function fullName(firstName: string, lastName: string, preferredName?: string): string {
  return [preferredName || firstName, lastName].filter(Boolean).join(" ").trim();
}

export class TenantService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createTenant(input: CreateTenantInput): Promise<TherassistantRecord> {
    const tenant = await this.insertOne("tenants", {
      name: input.name,
      display_name: input.name,
      tenant_type: input.tenantType,
      status: "active",
      data: {
        legalName: input.legalName ?? input.name,
        timezone: input.timezone ?? "America/Denver",
        billingNpi: input.billingNpi ?? null,
        taxIdLast4: input.taxIdLast4 ?? null,
      },
    });

    await this.writeAuditLog({
      targetType: "tenants",
      targetId: tenant.id,
      action: "create",
      newValues: tenant,
    });

    return tenant;
  }

  async linkBillingCompanyToPractice(billingCompanyTenantId: string, practiceTenantId: string): Promise<TherassistantRecord> {
    assertUuid(billingCompanyTenantId, "billingCompanyTenantId");
    assertUuid(practiceTenantId, "practiceTenantId");

    const link = await this.insertOne("billing_company_practice_links", {
      name: "Billing company practice link",
      status: "active",
      billing_company_tenant_id: billingCompanyTenantId,
      practice_tenant_id: practiceTenantId,
      data: {},
    });

    await this.writeAuditLog({
      targetType: "billing_company_practice_links",
      targetId: link.id,
      action: "create",
      newValues: link,
    });

    return link;
  }

  async userHasTenantAccess(userId: string, tenantId = this.tenantId()): Promise<boolean> {
    assertUuid(userId, "userId");
    assertUuid(tenantId, "tenantId");

    const { data, error } = await this.db.rpc("user_has_tenants_access", {
      p_user_id: userId,
      p_tenants_id: tenantId,
    });

    if (error) {
      throw new ServiceError("Failed to evaluate tenant access.", error);
    }

    return Boolean(data);
  }

  async userCanAccessPractice(userId: string, practiceTenantId: string): Promise<boolean> {
    assertUuid(userId, "userId");
    assertUuid(practiceTenantId, "practiceTenantId");

    const { data, error } = await this.db.rpc("user_can_access_practice", {
      p_user_id: userId,
      p_practice_id: practiceTenantId,
    });

    if (error) {
      throw new ServiceError("Failed to evaluate practice access.", error);
    }

    return Boolean(data);
  }
}

export class ClientService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createClient(input: CreateClientInput): Promise<TherassistantRecord> {
    const client = await this.insertOne("clients", {
      name: fullName(input.firstName, input.lastName, input.preferredName),
      status: "active",
      external_id: input.externalId ?? null,
      first_name: input.firstName,
      last_name: input.lastName,
      preferred_name: input.preferredName ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      data: input.demographics ?? {},
    });

    await this.writeAuditLog({
      targetType: "clients",
      targetId: client.id,
      action: "create",
      newValues: client,
    });

    return client;
  }

  async updateClientDemographics(clientId: string, demographics: Record<string, unknown>): Promise<TherassistantRecord> {
    const previous = await this.findById("clients", clientId);
    const nextData = { ...(previous?.data ?? {}), ...demographics };

    const client = await this.updateOne("clients", clientId, {
      data: nextData,
      first_name: demographics.firstName,
      last_name: demographics.lastName,
      preferred_name: demographics.preferredName,
      date_of_birth: demographics.dateOfBirth,
      email: demographics.email,
      phone: demographics.phone,
    });

    await this.writeAuditLog({
      targetType: "clients",
      targetId: clientId,
      action: "update",
      oldValues: previous,
      newValues: client,
    });

    return client;
  }

  async getClientSummary(clientId: string): Promise<Record<string, unknown>> {
    const client = await this.findById("clients", clientId);

    if (!client) {
      throw new ServiceError("Client not found.");
    }

    const [{ data: appointments }, { data: charges }, { data: claims }, { data: payments }] = await Promise.all([
      this.db.from("appointments").select("id,status,start_time,end_time,service_type").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null).order("start_time", { ascending: false }).limit(5),
      this.db.from("charges").select("id,status,service_date,cpt_code,charge_amount").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null).order("service_date", { ascending: false }).limit(10),
      this.db.from("claims").select("id,status,total_charge_amount,open_balance").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
      this.db.from("payments").select("id,status,amount,payment_date,source").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null).order("payment_date", { ascending: false }).limit(10),
    ]);

    return {
      client,
      recentAppointments: appointments ?? [],
      recentCharges: charges ?? [],
      recentClaims: claims ?? [],
      recentPayments: payments ?? [],
    };
  }
}

export class AppointmentService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createAppointment(input: CreateAppointmentInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");
    assertUuid(input.providerId, "providerId");

    const appointment = await this.insertOne("appointments", {
      name: input.serviceType,
      status: "scheduled" satisfies AppointmentStatus,
      client_id: input.clientId,
      provider_id: input.providerId,
      start_time: input.startTime,
      end_time: input.endTime,
      service_type: input.serviceType,
      location_id: input.locationId ?? null,
      telehealth: input.telehealth ?? false,
      checkin_status: null,
      data: input.data ?? {},
    });

    await this.writeAuditLog({
      targetType: "appointments",
      targetId: appointment.id,
      action: "create",
      newValues: appointment,
    });

    return appointment;
  }

  async cancelAppointment(appointmentId: string, reason: string): Promise<TherassistantRecord> {
    return this.transitionStatus("appointments", appointmentId, "cancelled", reason);
  }

  async markNoShow(appointmentId: string, reason?: string): Promise<TherassistantRecord> {
    return this.transitionStatus("appointments", appointmentId, "no_show", reason ?? null);
  }

  async markCompleted(appointmentId: string): Promise<TherassistantRecord> {
    return this.transitionStatus("appointments", appointmentId, "completed", null);
  }

  async submitCheckIn(input: CheckInInput): Promise<TherassistantRecord> {
    assertUuid(input.appointmentId, "appointmentId");

    const appointment = await this.findById("appointments", input.appointmentId);

    if (!appointment) {
      throw new ServiceError("Appointment not found.");
    }

    const checkInStatus = input.status ?? "checked_in";

    const checkIn = await this.insertOne("client_checkins", {
      name: checkInStatus,
      status: "submitted",
      appointment_id: input.appointmentId,
      client_id: appointment.client_id,
      provider_id: appointment.provider_id,
      checkin_status: checkInStatus,
      safety_concern: input.safetyConcern ?? false,
      client_note: input.clientNote ?? null,
      data: input.responses ?? {},
    });

    await this.updateOne("appointments", input.appointmentId, {
      status: checkInStatus,
      checkin_status: checkInStatus,
      data: {
        ...(appointment.data ?? {}),
        lastCheckInId: checkIn.id,
        safetyConcern: input.safetyConcern ?? false,
      },
    });

    if (input.responses) {
      await this.insertOne("pre_session_responses", {
        name: "Pre-session response",
        status: input.safetyConcern ? "needs_safety_review" : "submitted",
        appointment_id: input.appointmentId,
        client_id: appointment.client_id,
        provider_id: appointment.provider_id,
        response_data: input.responses,
        safety_concern: input.safetyConcern ?? false,
        data: { checkInId: checkIn.id },
      });
    }

    if (input.safetyConcern) {
      await this.createWorkqueueItem({
        type: "safety_review",
        sourceType: "appointments",
        sourceId: input.appointmentId,
        priority: "urgent",
        title: "Pre-session safety concern",
        description: "Client reported a safety concern during pre-session check-in.",
      });
    }

    await this.writeAuditLog({
      targetType: "client_checkins",
      targetId: checkIn.id,
      action: "create",
      newValues: checkIn,
    });

    return checkIn;
  }
}

export class BillingService extends TherassistantService {
  constructor(db: TherassistantSupabaseClient, context: ServiceContext) {
    super(db, context);
  }

  async createCharge(input: CreateChargeInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");

    if (input.appointmentId) {
      assertUuid(input.appointmentId, "appointmentId");
    }

    const chargeAmount = input.chargeAmount ?? 0;

    const charge = await this.insertOne("charges", {
      name: input.cptCode,
      status: "draft" satisfies ChargeStatus,
      appointment_id: input.appointmentId ?? null,
      client_id: input.clientId,
      provider_id: input.providerId ?? null,
      service_date: input.serviceDate,
      cpt_code: input.cptCode,
      units: input.units ?? 1,
      charge_amount: chargeAmount,
      diagnosis_codes: input.diagnosisCodes ?? [],
      modifiers: input.modifiers ?? [],
      data: {},
    });

    await this.writeAuditLog({
      targetType: "charges",
      targetId: charge.id,
      action: "create",
      newValues: charge,
    });

    return charge;
  }

  async createChargeFromAppointment(appointmentId: string, overrides?: Partial<CreateChargeInput>): Promise<TherassistantRecord> {
    const appointment = await this.findById("appointments", appointmentId);

    if (!appointment) {
      throw new ServiceError("Appointment not found.");
    }

    return this.createCharge({
      appointmentId,
      clientId: String(appointment.client_id),
      providerId: String(appointment.provider_id),
      serviceDate: String(appointment.start_time).slice(0, 10),
      cptCode: overrides?.cptCode ?? String(appointment.service_type ?? "90837"),
      units: overrides?.units ?? 1,
      chargeAmount: overrides?.chargeAmount ?? 0,
      diagnosisCodes: overrides?.diagnosisCodes ?? [],
      modifiers: overrides?.modifiers ?? [],
    });
  }

  async validateCharge(chargeId: string): Promise<{ valid: boolean; errors: string[]; charge: TherassistantRecord }> {
    const charge = await this.findById("charges", chargeId);

    if (!charge) {
      throw new ServiceError("Charge not found.");
    }

    const errors: string[] = [];

    if (!charge.client_id) errors.push("Missing client.");
    if (!charge.provider_id) errors.push("Missing rendering provider.");
    if (!charge.service_date) errors.push("Missing service date.");
    if (!charge.cpt_code) errors.push("Missing CPT/HCPCS code.");
    if (Number(charge.charge_amount ?? 0) < 0) errors.push("Charge amount cannot be negative.");

    if (errors.length > 0) {
      await this.updateOne("charges", chargeId, { status: "blocked" });

      await this.createWorkqueueItem({
        type: "charge_validation",
        sourceType: "charges",
        sourceId: chargeId,
        priority: "high",
        title: "Charge validation failed",
        description: errors.join(" "),
        metadata: { errors },
      });
    } else {
      await this.transitionStatus("charges", chargeId, "ready_for_claim", null);
    }

    return { valid: errors.length === 0, errors, charge };
  }

  async createClaimFromCharge(chargeId: string): Promise<TherassistantRecord> {
    const charge = await this.findById("charges", chargeId);

    if (!charge) {
      throw new ServiceError("Charge not found.");
    }

    const validation = await this.validateCharge(chargeId);

    if (!validation.valid) {
      throw new ServiceError("Charge is not ready for claim creation.", validation.errors);
    }

    const claim = await this.insertOne("claims", {
      name: `Claim ${String(charge.service_date ?? "")}`.trim(),
      status: "draft" satisfies ClaimStatus,
      charge_id: chargeId,
      client_id: charge.client_id,
      provider_id: charge.provider_id,
      service_date: charge.service_date,
      total_charge_amount: charge.charge_amount ?? 0,
      open_balance: charge.charge_amount ?? 0,
      data: {
        sourceChargeId: chargeId,
        cptCode: charge.cpt_code,
        diagnosisCodes: charge.diagnosis_codes ?? [],
        modifiers: charge.modifiers ?? [],
      },
    });

    await this.updateOne("charges", chargeId, { status: "claimed", claim_id: claim.id });

    await this.writeAuditLog({
      targetType: "claims",
      targetId: claim.id,
      action: "create",
      newValues: claim,
      metadata: { sourceChargeId: chargeId },
    });

    return claim;
  }

  async postHistoricalPayment(input: PostHistoricalPaymentInput): Promise<TherassistantRecord> {
    assertUuid(input.clientId, "clientId");

    if (input.amount === 0) {
      throw new ServiceError("Historical payment amount cannot be zero.");
    }

    const payment = await this.insertOne("payments", {
      name: "Historical payment",
      status: "posted",
      client_id: input.clientId,
      amount: input.amount,
      payment_date: input.paymentDate,
      source: input.source,
      method: input.method ?? null,
      reference_number: input.referenceNumber ?? null,
      is_historical: true,
      data: {
        note: input.note ?? null,
        originalSystem: input.originalSystem ?? null,
      },
    });

    await this.insertOne("payment_allocations", {
      name: "Historical payment allocation",
      status: "posted",
      payment_id: payment.id,
      client_id: input.clientId,
      claim_id: null,
      amount: input.amount,
      allocation_type: "historical_client_ledger",
      data: {},
    });

    await this.writeAuditLog({
      targetType: "payments",
      targetId: payment.id,
      action: "create",
      newValues: payment,
      metadata: { historical: true },
    });

    return payment;
  }

  async getClientBalance(clientId: string): Promise<number> {
    assertUuid(clientId, "clientId");

    const [{ data: claims, error: claimError }, { data: allocations, error: allocationError }] = await Promise.all([
      this.db.from("claims").select("open_balance,total_charge_amount,status").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null),
      this.db.from("payment_allocations").select("amount").eq("tenant_id", this.tenantId()).eq("client_id", clientId).is("deleted_at", null),
    ]);

    if (claimError) throw new ServiceError("Failed to read claim balances.", claimError);
    if (allocationError) throw new ServiceError("Failed to read payment allocations.", allocationError);

    const claimBalance = (claims ?? []).reduce((total: number, claim: Record<string, unknown>) => {
      if (["void", "reversed"].includes(String(claim.status))) return total;
      return total + Number(claim.open_balance ?? claim.total_charge_amount ?? 0);
    }, 0);

    const historicalCredits = (allocations ?? []).reduce((total: number, allocation: Record<string, unknown>) => {
      return total + Number(allocation.amount ?? 0);
    }, 0);

    return Math.round((claimBalance - historicalCredits + Number.EPSILON) * 100) / 100;
  }
}

export function createCoreServices(db: TherassistantSupabaseClient, context: ServiceContext) {
  return {
    tenants: new TenantService(db, context),
    clients: new ClientService(db, context),
    appointments: new AppointmentService(db, context),
    billing: new BillingService(db, context),
  };
}

export function toRpcPayload(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(removeUndefined(input)).map(([key, value]) => {
      const rpcKey = key.startsWith("p_") ? key : `p_${key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;
      return [rpcKey, value];
    }),
  );
}

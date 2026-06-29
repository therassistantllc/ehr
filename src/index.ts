export {
  createTherassistantSupabaseClient,
  assertUuid,
  removeUndefined,
  type Json,
  type TherassistantRecord,
  type TherassistantSupabaseClient,
} from "./lib/supabase";

export {
  ServiceError,
  TherassistantService,
  type AuditAction,
  type ServiceContext,
  type StatusChangeInput,
  type WorkqueueInput,
  type WorkqueuePriority,
} from "./services/serviceBase";

export {
  AppointmentService,
  BillingService,
  ClientService,
  TenantService,
  createCoreServices,
  toRpcPayload,
  type AppointmentStatus,
  type ChargeStatus,
  type CheckInInput,
  type ClaimStatus,
  type CreateAppointmentInput,
  type CreateChargeInput,
  type CreateClientInput,
  type CreateTenantInput,
  type PostHistoricalPaymentInput,
  type TenantType,
} from "./services/coreServices";

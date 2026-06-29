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
  type ClaimStatus as CoreClaimStatus,
  type CreateAppointmentInput,
  type CreateChargeInput,
  type CreateClientInput,
  type CreateTenantInput,
  type PostHistoricalPaymentInput,
  type TenantType,
} from "./services/coreServices";

export {
  EligibilityService,
  type BenefitSnapshot,
  type ClientPolicyInput,
  type CoveragePriority,
  type EligibilityStatus,
  type EligibilityVerificationInput,
} from "./services/eligibilityService";

export {
  ChargeCaptureService,
  classifyChargeCaptureTab,
  type ChargeBlocker,
  type ChargeCaptureAction,
  type ChargeCapturePatch,
  type ChargeCaptureQueueFilters,
  type ChargeCaptureTab,
  type CreateChargeCaptureInput,
  type ServiceLineInput,
} from "./services/chargeCaptureService";

export {
  ClaimsService,
  type ClaimBatchInput,
  type ClaimFrequencyCode,
  type ClaimFromChargeOptions,
  type ClaimStatus,
  type ClaimValidationIssue,
  type ClaimValidationSeverity,
} from "./services/claimsService";

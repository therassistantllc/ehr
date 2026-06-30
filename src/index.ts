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

export {
  createEligibilityHook,
  useEligibility,
  type EligibilityHook,
} from "./hooks/useEligibility";

export {
  createChargeCaptureHook,
  useChargeCapture,
  type ChargeCaptureHook,
} from "./hooks/useChargeCapture";

export {
  createClaimsHook,
  useClaims,
  type ClaimsHook,
} from "./hooks/useClaims";

export {
  createRcmApiHandlers,
  type RcmApiHandlers,
  type RcmRouteHandler,
  type RcmRouteRequest,
  type RcmRouteResponse,
} from "./api/rcmRoutes";

export {
  RCM_WORKQUEUES,
  buildChargeCaptureFilters,
  getRcmWorkqueueDefinition,
  type RcmWorkqueueDefinition,
  type WorkqueueAction,
  type WorkqueueActionKind,
  type WorkqueueColumn,
  type WorkqueueDomain,
} from "./workqueues/rcmWorkqueues";

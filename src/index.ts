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
  WorkqueueQueryService,
  type ChargeDashboardFilters,
  type ChargeDashboardRow,
  type ClaimDashboardFilters,
  type ClaimDashboardRow,
  type RcmDashboardSnapshot,
  type WorkqueueDashboardItem,
  type WorkqueueQueryFilters,
  type WorkqueueStatus,
  type WorkqueueSummary,
} from "./services/workqueueQueryService";

export { createEligibilityHook, useEligibility, type EligibilityHook } from "./hooks/useEligibility";
export { createChargeCaptureHook, useChargeCapture, type ChargeCaptureHook } from "./hooks/useChargeCapture";
export { createClaimsHook, useClaims, type ClaimsHook } from "./hooks/useClaims";
export { createWorkqueueDashboardHook, useWorkqueueDashboard, type WorkqueueDashboardHook } from "./hooks/useWorkqueueDashboard";

export {
  createRcmApiHandlers,
  type RcmApiHandlers,
  type RcmRouteHandler,
  type RcmRouteRequest,
  type RcmRouteResponse,
} from "./api/rcmRoutes";

export { createWorkqueueDashboardApiHandlers, type WorkqueueDashboardApiHandlers } from "./api/workqueueDashboardRoutes";

export {
  buildDashboardCards,
  buildRcmDashboardViewModel,
  buildWorkqueueMetrics,
  groupChargeRows,
  groupClaimRows,
  groupWorkqueueItems,
  type DashboardCard,
  type DashboardMetric,
  type DashboardSection,
  type RcmDashboardViewModel,
} from "./adapters/rcmDashboardAdapters";

export {
  buildRcmDashboardUiModel,
  type RcmDashboardUiModel,
} from "./adapters/rcmDashboardUiAdapter";

export {
  buildRcmDashboardSpec,
  sectionCount,
  CHARGE_TABLE_SPEC,
  CLAIM_TABLE_SPEC,
  WORKQUEUE_TABLE_SPEC,
  type DashboardRenderableRows,
  type UiAction,
  type UiDashboardSpec,
  type UiDensity,
  type UiField,
  type UiIntent,
  type UiTableSpec,
} from "./ui/rcmDashboardComponents";

export {
  WORKQUEUE_ACTION_SCREENS,
  getActionScreenDefinition,
  getActionScreenForRoute,
  type ActionScreenDefinition,
  type ActionScreenField,
  type ActionScreenSection,
} from "./ui/workqueueActionScreens";

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

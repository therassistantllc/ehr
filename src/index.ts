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
  type LatestEligibilityDisplayStatus,
  type LatestEligibilitySummary,
} from "./services/eligibilityService";

export {
  classifyEligibilityIssue,
  ELIGIBILITY_ISSUE_TABS,
  type EligibilityIssueClassification,
  type EligibilityIssueClassificationInput,
  type EligibilityIssueType,
} from "./services/eligibilityIssueClassifier";

export { EligibilityReadinessService, type EligibilityReadinessFilters, type EligibilityReadinessRow } from "./services/eligibilityReadinessService";
export { ChargeCaptureService, classifyChargeCaptureTab, type ChargeBlocker, type ChargeCaptureAction, type ChargeCapturePatch, type ChargeCaptureQueueFilters, type ChargeCaptureTab, type CreateChargeCaptureInput, type ServiceLineInput } from "./services/chargeCaptureService";
export { ClaimsService, type ClaimBatchInput, type ClaimFrequencyCode, type ClaimFromChargeOptions, type ClaimStatus, type ClaimValidationIssue, type ClaimValidationSeverity } from "./services/claimsService";
export { ClaimBatchGenerationService } from "./services/claimBatchGenerationService";
export { type ClaimBatchGenerationIssue, type ClaimBatchGenerationMode, type GeneratedClaimBatchFile, type GenerateClaimBatchFileInput } from "./services/claimBatchGenerationTypes";
export { PaymentPostingService } from "./services/paymentPostingService";
export { PaymentSupplementalPostingService } from "./services/paymentSupplementalPostingService";
export { type HistoricalPaymentInput, type ManualEobInput, type PaymentAdjustmentInput, type PaymentAllocationInput, type PaymentMethod, type PaymentSource, type PostedPaymentResult, type PostPaymentInput } from "./services/paymentPostingTypes";
export { parseEra835 } from "./services/eraParser";
export { EraPostingService } from "./services/eraPostingService";
export { type EraPostResult, type EraUploadInput, type ParsedEraAdjustment, type ParsedEraClaim, type ParsedEraFile, type ParsedEraPayment, type ParsedEraServiceLine } from "./services/eraPostingTypes";
export { DenialArService, type ArFollowUpInput, type DenialInput } from "./services/denialArService";
export { AppealsService, type AppealInput, type AppealType } from "./services/appealsService";
export { BalanceStatementService, type BalanceStatementInput } from "./services/balanceStatementService";
export { RefundCreditService, type RefundCreditInput } from "./services/refundCreditService";
export { RcmReportingService, type RcmReport } from "./services/rcmReportingService";
export { RcmOperationalWorkflowService, type ChargeClaimReadinessResult, type CreateClaimWorkflowResult } from "./services/rcmOperationalWorkflowService";
export { ImportWorkflowService, type CommitImportResult, type ImportRowInput, type ImportValidationIssue, type ImportValidationResult, type ImportWorkflowStatus, type RollbackImportResult, type StartImportBatchInput } from "./services/importWorkflowService";
export { WorkqueueQueryService, type ChargeDashboardFilters, type ChargeDashboardRow, type ClaimDashboardFilters, type ClaimDashboardRow, type RcmDashboardSnapshot, type WorkqueueDashboardItem, type WorkqueueQueryFilters, type WorkqueueStatus, type WorkqueueSummary } from "./services/workqueueQueryService";

export { createEligibilityHook, useEligibility, type EligibilityHook } from "./hooks/useEligibility";
export { createEligibilityReadinessHook, useEligibilityReadiness, type EligibilityReadinessHook } from "./hooks/useEligibilityReadiness";
export { createChargeCaptureHook, useChargeCapture, type ChargeCaptureHook } from "./hooks/useChargeCapture";
export { createClaimsHook, useClaims, type ClaimsHook } from "./hooks/useClaims";
export { createClaimBatchGenerationHook, useClaimBatchGeneration, type ClaimBatchGenerationHook } from "./hooks/useClaimBatchGeneration";
export { createRcmOperationalWorkflowHook, useRcmOperationalWorkflow, type RcmOperationalWorkflowHook } from "./hooks/useRcmOperationalWorkflow";
export { createImportWorkflowHook, useImportWorkflow, type ImportWorkflowHook } from "./hooks/useImportWorkflow";
export { createPaymentPostingHook, usePaymentPosting, type PaymentPostingHook } from "./hooks/usePaymentPosting";
export { createEraPostingHook, useEraPosting, type EraPostingHook } from "./hooks/useEraPosting";
export { createDenialArHook, useDenialAr, type DenialArHook } from "./hooks/useDenialAr";
export { createPostPaymentOpsHook, usePostPaymentOps, type PostPaymentOpsHook } from "./hooks/usePostPaymentOps";
export { createWorkqueueDashboardHook, useWorkqueueDashboard, type WorkqueueDashboardHook } from "./hooks/useWorkqueueDashboard";

export { createRcmApiHandlers, type RcmApiHandlers, type RcmRouteHandler, type RcmRouteRequest, type RcmRouteResponse } from "./api/rcmRoutes";
export { createWorkqueueDashboardApiHandlers, type WorkqueueDashboardApiHandlers } from "./api/workqueueDashboardRoutes";
export { buildDashboardCards, buildRcmDashboardViewModel, buildWorkqueueMetrics, groupChargeRows, groupClaimRows, groupWorkqueueItems, type DashboardCard, type DashboardMetric, type DashboardSection, type RcmDashboardViewModel } from "./adapters/rcmDashboardAdapters";
export { buildRcmDashboardUiModel, type RcmDashboardUiModel } from "./adapters/rcmDashboardUiAdapter";
export { buildRcmDashboardSpec, sectionCount, CHARGE_TABLE_SPEC, CLAIM_TABLE_SPEC, WORKQUEUE_TABLE_SPEC, type DashboardRenderableRows, type UiAction, type UiDashboardSpec, type UiDensity, type UiField, type UiIntent, type UiTableSpec } from "./ui/rcmDashboardComponents";
export { WORKQUEUE_ACTION_SCREENS, getActionScreenDefinition, getActionScreenForRoute, type ActionScreenDefinition, type ActionScreenField, type ActionScreenSection } from "./ui/workqueueActionScreens";
export { RCM_WORKQUEUES, buildChargeCaptureFilters, getRcmWorkqueueDefinition, type RcmWorkqueueDefinition, type WorkqueueAction, type WorkqueueActionKind, type WorkqueueColumn, type WorkqueueDomain } from "./workqueues/rcmWorkqueues";

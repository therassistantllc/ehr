/**
 * THERASSISTANT EHR service registry.
 *
 * This file lists the planned application services and their responsibilities.
 * Service implementations can be added beside this registry as modules are built.
 */

export const SERVICE_DEFINITIONS = [
  {
    serviceType: "Tenants",
    serviceName: "TenantService",
    servicePurpose: "Creates and manages practices, billing company tenants, and tenant settings.",
  },
  {
    serviceType: "Tenants",
    serviceName: "TenantSwitchingService",
    servicePurpose: "Handles switching between linked practices for billing company users.",
  },
  {
    serviceType: "Tenants",
    serviceName: "BillingCompanyAccessService",
    servicePurpose: "Manages billing company-to-practice links and scoped access.",
  },
  {
    serviceType: "Tenants",
    serviceName: "TenantSettingsService",
    servicePurpose: "Stores practice-level defaults for billing, claims, calendar, and clinical workflows.",
  },
  {
    serviceType: "Tenants",
    serviceName: "FeatureFlagService",
    servicePurpose: "Enables/disables features by tenant.",
  },
  {
    serviceType: "Tenants",
    serviceName: "PlatformAdminService",
    servicePurpose: "Supports platform-level admin tools and tenant oversight.",
  },
  {
    serviceType: "Security",
    serviceName: "AuthService",
    servicePurpose: "Handles login/session logic through Supabase Auth.",
  },
  {
    serviceType: "Security",
    serviceName: "UserService",
    servicePurpose: "Manages users, profiles, invitations, and account status.",
  },
  {
    serviceType: "Security",
    serviceName: "RoleService",
    servicePurpose: "Manages user roles.",
  },
  {
    serviceType: "Security",
    serviceName: "PermissionService",
    servicePurpose: "Evaluates granular permissions.",
  },
  {
    serviceType: "Security",
    serviceName: "AccessControlService",
    servicePurpose: "Enforces tenant isolation and role-based access.",
  },
  {
    serviceType: "Security",
    serviceName: "RlsPolicyService",
    servicePurpose: "Central helper for row-level security support.",
  },
  {
    serviceType: "Security",
    serviceName: "PhiAccessService",
    servicePurpose: "Logs PHI record access.",
  },
  {
    serviceType: "Audits",
    serviceName: "AuditLogService",
    servicePurpose: "Writes audit logs for major system actions.",
  },
  {
    serviceType: "Audits",
    serviceName: "StatusHistoryService",
    servicePurpose: "Records status transitions for claims, charges, auths, workqueues, etc.",
  },
  {
    serviceType: "Audits",
    serviceName: "ComplianceExportService",
    servicePurpose: "Generates client record exports and financial record exports.",
  },
  {
    serviceType: "Audits",
    serviceName: "SoftDeleteService",
    servicePurpose: "Handles safe deletion and restoration.",
  },
  {
    serviceType: "Audits",
    serviceName: "RecordLockingService",
    servicePurpose: "Prevents edits to signed notes, posted payments, and closed periods.",
  },
  {
    serviceType: "Audits",
    serviceName: "SystemEventService",
    servicePurpose: "Tracks internal events, syncs, imports, and workflow actions.",
  },
  {
    serviceType: "Audits",
    serviceName: "ErrorLogService",
    servicePurpose: "Captures validation failures, system errors, and failed jobs",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientService",
    servicePurpose: "Creates and manages client master records.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientProfileService",
    servicePurpose: "Handles demographics, contact info, addresses, and identifiers.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientContactService",
    servicePurpose: "Manages guardians, emergency contacts, responsible parties, and billing contacts.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientDuplicateService",
    servicePurpose: "Detects and merges possible duplicate clients.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientTimelineService",
    servicePurpose: "Builds unified client timeline across notes, claims, payments, messages, and tasks.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientFinancialSnapshotService",
    servicePurpose: "Returns balances, credits, open claims, and payment history.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientDocumentService",
    servicePurpose: "Links documents to client records.",
  },
  {
    serviceType: "Clients",
    serviceName: "ClientStatusService",
    servicePurpose: "Handles intake, active, inactive, discharged, archived, and deceased statuses.",
  },
  {
    serviceType: "Registration",
    serviceName: "IntakeService",
    servicePurpose: "Manages client intake workflow.",
  },
  {
    serviceType: "Registration",
    serviceName: "PortalIntakeService",
    servicePurpose: "Handles client-submitted portal/app intake.",
  },
  {
    serviceType: "Registration",
    serviceName: "RegistrationChecklistService",
    servicePurpose: "Tracks missing demographics, insurance, consents, and billing readiness.",
  },
  {
    serviceType: "Registration",
    serviceName: "InsuranceCardReviewService",
    servicePurpose: "Handles uploaded insurance card review.",
  },
  {
    serviceType: "Registration",
    serviceName: "ConsentFormService",
    servicePurpose: "Manages intake forms and consent tracking.",
  },
  {
    serviceType: "Registration",
    serviceName: "ResponsiblePartyService",
    servicePurpose: "Handles guardian, subscriber, and billing-responsible-party logic.",
  },
  {
    serviceType: "Registration",
    serviceName: "ClientDataReviewService",
    servicePurpose: "Allows staff to approve/reject portal-submitted client data before updating the chart.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "InsuranceService",
    servicePurpose: "Manages client insurance policies.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "InsurancePolicyService",
    servicePurpose: "Handles primary, secondary, tertiary coverage records.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "EligibilityService",
    servicePurpose: "Stores and retrieves eligibility checks.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "BenefitVerificationService",
    servicePurpose: "Manages copay, deductible, coinsurance, OOP, and visit limits.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "CoverageDateService",
    servicePurpose: "Determines active insurance by date of service.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "CopayCoinsuranceService",
    servicePurpose: "Returns expected client responsibility for a service.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "EligibilityIssueService",
    servicePurpose: "Creates and resolves eligibility workqueue items.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "InsuranceSnapshotService",
    servicePurpose: "Stores latest benefit summary for quick reference.",
  },
  {
    serviceType: "Eligibility",
    serviceName: "PayerPlanMatchingService",
    servicePurpose: "Matches payer/plan names from imports, ERAs, or staff entry.",
  },
  {
    serviceType: "Calendar",
    serviceName: "AppointmentService",
    servicePurpose: "Creates, updates, cancels, completes, and no-shows appointments.",
  },
  {
    serviceType: "Calendar",
    serviceName: "CalendarService",
    servicePurpose: "Provides calendar views by provider, practice, or billing company.",
  },
  {
    serviceType: "Calendar",
    serviceName: "RecurringAppointmentService",
    servicePurpose: "Manages recurring appointment rules.",
  },
  {
    serviceType: "Calendar",
    serviceName: "ProviderAvailabilityService",
    servicePurpose: "Handles provider schedules and blocked time.",
  },
  {
    serviceType: "Calendar",
    serviceName: "AppointmentStatusService",
    servicePurpose: "Updates appointment status and status history.",
  },
  {
    serviceType: "Calendar",
    serviceName: "AppointmentBillingReadinessService",
    servicePurpose: "Determines whether appointment can become a charge.",
  },
  {
    serviceType: "Calendar",
    serviceName: "NoShowService",
    servicePurpose: "Handles no-show/late-cancel workflow.",
  },
  {
    serviceType: "Calendar",
    serviceName: "AppointmentConflictService",
    servicePurpose: "Prevents provider double booking.",
  },
  {
    serviceType: "Check-In",
    serviceName: "CheckInService",
    servicePurpose: "Handles client check-in from portal/app.",
  },
  {
    serviceType: "Check-In",
    serviceName: "OnMyWayService",
    servicePurpose: "Records in-person client “On my way” status.",
  },
  {
    serviceType: "Check-In",
    serviceName: "ArrivalService",
    servicePurpose: "Records “I’m here” status.",
  },
  {
    serviceType: "Check-In",
    serviceName: "PreSessionQuestionService",
    servicePurpose: "Manages pre-session questions.",
  },
  {
    serviceType: "Check-In",
    serviceName: "PreSessionResponseService",
    servicePurpose: "Stores client answers.",
  },
  {
    serviceType: "Check-In",
    serviceName: "CheckInStatusService",
    servicePurpose: "Updates appointment calendar colors/statuses.",
  },
  {
    serviceType: "Check-In",
    serviceName: "ProviderCheckInNotificationService",
    servicePurpose: "Notifies provider/admin when client checks in.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ClinicalNoteService",
    servicePurpose: "Creates and manages clinical notes.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ClinicalNoteTemplateService",
    servicePurpose: "Manages note templates.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ClinicalNoteSignatureService",
    servicePurpose: "Signs, locks, and timestamps notes.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ClinicalNoteAmendmentService",
    servicePurpose: "Adds amendments to locked notes.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ClinicalDocumentationValidationService",
    servicePurpose: "Checks whether note supports billing.",
  },
  {
    serviceType: "Documentation",
    serviceName: "PsychotherapyNoteValidationService",
    servicePurpose: "Validates start/end time, duration, and goal addressed.",
  },
  {
    serviceType: "Documentation",
    serviceName: "AssessmentDocumentationService",
    servicePurpose: "Handles H0031, H0001, H0002, 90791 assessment documentation.",
  },
  {
    serviceType: "Documentation",
    serviceName: "TreatmentPlanService",
    servicePurpose: "Manages treatment plans.",
  },
  {
    serviceType: "Documentation",
    serviceName: "TreatmentPlanGoalService",
    servicePurpose: "Manages treatment plan goals and objectives.",
  },
  {
    serviceType: "Documentation",
    serviceName: "TreatmentPlanReviewService",
    servicePurpose: "Handles treatment plan review workflow.",
  },
  {
    serviceType: "Documentation",
    serviceName: "DiagnosisService",
    servicePurpose: "Manages client diagnoses.",
  },
  {
    serviceType: "Documentation",
    serviceName: "GoldenThreadService",
    servicePurpose: "Links assessment, diagnosis, treatment plan, goal, note, and billing record.",
  },
  {
    serviceType: "Documentation",
    serviceName: "ScreeningService",
    servicePurpose: "Handles PHQ-9, GAD-7, CAGE-AID, and similar tools.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeCaptureService",
    servicePurpose: "Creates billable charge records from appointments/notes.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeValidationService",
    servicePurpose: "Checks charge readiness before claim creation.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeStatusService",
    servicePurpose: "Handles charge status transitions.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeCorrectionService",
    servicePurpose: "Allows safe correction before claim creation.",
  },
  {
    serviceType: "Charges",
    serviceName: "UnbilledAppointmentService",
    servicePurpose: "Finds completed appointments without charges.",
  },
  {
    serviceType: "Charges",
    serviceName: "BlockedChargeService",
    servicePurpose: "Manages blocked charges and reasons.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeToClaimService",
    servicePurpose: "Converts valid charges into claims.",
  },
  {
    serviceType: "Charges",
    serviceName: "ChargeWorkqueueService",
    servicePurpose: "Creates/resolves charge-related tasks.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimService",
    servicePurpose: "Main claim creation and management service.",
  },
  {
    serviceType: "Claims",
    serviceName: "ProfessionalClaimService",
    servicePurpose: "Handles CMS-1500 / 837P claim logic.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimLineService",
    servicePurpose: "Manages claim service lines.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimDiagnosisService",
    servicePurpose: "Handles diagnosis pointers and claim diagnoses.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimValidationService",
    servicePurpose: "Validates claims before batching/submission.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimStatusService",
    servicePurpose: "Handles claim status transitions.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimTimelineService",
    servicePurpose: "Builds full claim activity history.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimCorrectionService",
    servicePurpose: "Handles corrected claim workflows.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimReversalService",
    servicePurpose: "Handles void/reversal workflows.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimAttachmentService",
    servicePurpose: "Manages claim attachments and documents.",
  },
  {
    serviceType: "Claims",
    serviceName: "ClaimBalanceService",
    servicePurpose: "Calculates claim balance from ledger/payment activity.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClaimBatchService",
    servicePurpose: "Creates and manages claim batches.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClaimBatchItemService",
    servicePurpose: "Adds/removes claims from batches.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClaimBatchValidationService",
    servicePurpose: "Validates batches before submission.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClaimSubmissionService",
    servicePurpose: "Tracks claim submission attempts.",
  },
  {
    serviceType: "Batches",
    serviceName: "SubmissionFileService",
    servicePurpose: "Stores generated/downloaded 837P files.",
  },
  {
    serviceType: "Batches",
    serviceName: "837PGenerationService",
    servicePurpose: "Generates professional claim submission data.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClearinghouseService",
    servicePurpose: "Manages clearinghouse account and submission flow.",
  },
  {
    serviceType: "Batches",
    serviceName: "SubmissionResponseService",
    servicePurpose: "Processes clearinghouse/payer responses.",
  },
  {
    serviceType: "Batches",
    serviceName: "ClaimStatusResponseService",
    servicePurpose: "Handles 276/277 claim status responses.",
  },
  {
    serviceType: "Batches",
    serviceName: "PayerClaimNumberService",
    servicePurpose: "Stores payer claim/control numbers.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PaymentPostingService",
    servicePurpose: "Main payment posting coordinator.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "InsurancePaymentService",
    servicePurpose: "Posts payer payments.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "clientPaymentService",
    servicePurpose: "Posts client payments.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PaymentAllocationService",
    servicePurpose: "Applies payments to claim, claim line, client balance, or unapplied funds.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "ZeroPayPostingService",
    servicePurpose: "Posts zero-pay EOBs/ERAs with denials or PR.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PartialPaymentService",
    servicePurpose: "Handles partial payment logic.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "UnappliedPaymentService",
    servicePurpose: "Manages unapplied and partially applied payments.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PaymentReversalService",
    servicePurpose: "Reverses payments without deleting history.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PaymentTransferService",
    servicePurpose: "Transfers payment from wrong claim/client to correct target.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "OverpaymentDetectionService",
    servicePurpose: "Detects payer or client overpayments.",
  },
  {
    serviceType: "Payment Posting",
    serviceName: "PaymentBatchService",
    servicePurpose: "Optional batch posting by EFT/check/ERA.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalPostingService",
    servicePurpose: "Main service for legacy financial activity.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalPaymentService",
    servicePurpose: "Posts prior payments without requiring a claim.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalAdjustmentService",
    servicePurpose: "Posts prior write-offs, corrections, and adjustments.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "OpeningBalanceService",
    servicePurpose: "Establishes beginning client/payer balances.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalCreditService",
    servicePurpose: "Records legacy credit balances.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalTransactionLinkingService",
    servicePurpose: "Links historical transactions to later-created/imported claims.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "HistoricalTransactionReversalService",
    servicePurpose: "Reverses historical transactions.",
  },
  {
    serviceType: "Historical Posting Services",
    serviceName: "LegacyFinancialImportService",
    servicePurpose: "Imports historical payments/balances from prior systems.",
  },
  {
    serviceType: "Accounting",
    serviceName: "LedgerService",
    servicePurpose: "Main financial source-of-truth service.",
  },
  {
    serviceType: "Accounting",
    serviceName: "LedgerTransactionService",
    servicePurpose: "Groups related financial entries.",
  },
  {
    serviceType: "Accounting",
    serviceName: "LedgerEntryService",
    servicePurpose: "Creates individual ledger entries.",
  },
  {
    serviceType: "Accounting",
    serviceName: "LedgerAccountService",
    servicePurpose: "Manages AR, revenue, adjustment, refund, credit, and write-off accounts.",
  },
  {
    serviceType: "Accounting",
    serviceName: "ClientBalanceService",
    servicePurpose: "Calculates client balances.",
  },
  {
    serviceType: "Accounting",
    serviceName: "ClaimBalanceSummaryService",
    servicePurpose: "Calculates claim balances.",
  },
  {
    serviceType: "Accounting",
    serviceName: "PayerBalanceService",
    servicePurpose: "Calculates payer AR and payer balances.",
  },
  {
    serviceType: "Accounting",
    serviceName: "AccountingPeriodService",
    servicePurpose: "Opens/closes/locks accounting periods.",
  },
  {
    serviceType: "Accounting",
    serviceName: "ReconciliationService",
    servicePurpose: "Reconciles ERA/EFT/check/bank/payment data.",
  },
  {
    serviceType: "Accounting",
    serviceName: "FinancialIntegrityService",
    servicePurpose: "Prevents deletion/editing of posted financial records.",
  },
  {
    serviceType: "Accounting",
    serviceName: "RecoupmentService",
    servicePurpose: "Handles payer recoupments.",
  },
  {
    serviceType: "Accounting",
    serviceName: "RefundLedgerService",
    servicePurpose: "Posts refund-related ledger entries.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraImportService",
    servicePurpose: "Uploads/imports 835 files.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraParsingService",
    servicePurpose: "Parses ERA file data.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraClaimService",
    servicePurpose: "Manages ERA claim records.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraServiceLineService",
    servicePurpose: "Manages ERA service lines.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraAdjustmentService",
    servicePurpose: "Handles CARC/RARC adjustments from ERA.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraMatchingService",
    servicePurpose: "Matches ERA records to internal claims.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraPostingService",
    servicePurpose: "Posts matched ERA payments/adjustments.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EraExceptionService",
    servicePurpose: "Handles unmatched or ambiguous ERA records.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "ManualEobService",
    servicePurpose: "Supports manual EOB entry.",
  },
  {
    serviceType: "ERA / EOB",
    serviceName: "EobDocumentService",
    servicePurpose: "Stores EOB documents.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialService",
    servicePurpose: "Main denial record service.",
  },
  {
    serviceType: "Denials",
    serviceName: "CarcRarcService",
    servicePurpose: "Manages CARC/RARC references.",
  },
  {
    serviceType: "Denials",
    serviceName: "CarcMappingService",
    servicePurpose: "Maps CARCs to categories and workability.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialClassificationService",
    servicePurpose: "Classifies denial by type.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialWorkabilityService",
    servicePurpose: "Determines workable vs non-workable.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialFollowupService",
    servicePurpose: "Tracks payer calls, portal messages, and next actions.",
  },
  {
    serviceType: "Denials",
    serviceName: "CredentialingWriteoffService",
    servicePurpose: "Routes credentialing/contract denials to write-off.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialResolutionService",
    servicePurpose: "Handles paid, upheld, written off, corrected, or appealed outcomes.",
  },
  {
    serviceType: "Denials",
    serviceName: "DenialAnalyticsService",
    servicePurpose: "Aggregates denial trends.",
  },
  {
    serviceType: "Appeals",
    serviceName: "AppealService",
    servicePurpose: "Main appeal workflow service.",
  },
  {
    serviceType: "Appeals",
    serviceName: "AppealDeadlineService",
    servicePurpose: "Calculates and tracks appeal deadlines.",
  },
  {
    serviceType: "Appeals",
    serviceName: "AppealDocumentService",
    servicePurpose: "Manages appeal packets and supporting documents.",
  },
  {
    serviceType: "Appeals",
    serviceName: "AppealSubmissionService",
    servicePurpose: "Records appeal submissions.",
  },
  {
    serviceType: "Appeals",
    serviceName: "AppealOutcomeService",
    servicePurpose: "Records outcomes and updates claim/ledger if needed.",
  },
  {
    serviceType: "Appeals",
    serviceName: "ReconsiderationService",
    servicePurpose: "Handles payer reconsideration workflow.",
  },
  {
    serviceType: "Appeals",
    serviceName: "CorrectedClaimService",
    servicePurpose: "Prepares and tracks corrected claims.",
  },
  {
    serviceType: "Appeals",
    serviceName: "PayerFollowupService",
    servicePurpose: "Tracks calls, portals, fax, mail, and payer communication.",
  },
  {
    serviceType: "Appeals",
    serviceName: "ProofOfTimelyFilingService",
    servicePurpose: "Stores and retrieves proof of timely filing.",
  },
  {
    serviceType: "Collections",
    serviceName: "clientResponsibilityService",
    servicePurpose: "Creates copay, deductible, coinsurance, non-covered, and self-pay balances.",
  },
  {
    serviceType: "Collections",
    serviceName: "clientBalanceTransferService",
    servicePurpose: "Moves claim balance to client responsibility.",
  },
  {
    serviceType: "Collections",
    serviceName: "clientStatementService",
    servicePurpose: "Generates statements.",
  },
  {
    serviceType: "Collections",
    serviceName: "StatementLineService",
    servicePurpose: "Builds statement line items.",
  },
  {
    serviceType: "Collections",
    serviceName: "StatementDeliveryService",
    servicePurpose: "Tracks mailed, emailed, portal, and SMS statements.",
  },
  {
    serviceType: "Collections",
    serviceName: "PaymentPlanService",
    servicePurpose: "Creates and manages payment plans.",
  },
  {
    serviceType: "Collections",
    serviceName: "PaymentPlanInstallmentService",
    servicePurpose: "Handles installment schedules.",
  },
  {
    serviceType: "Collections",
    serviceName: "CollectionWorkflowService",
    servicePurpose: "Manages past-due client balances.",
  },
  {
    serviceType: "Collections",
    serviceName: "HardshipService",
    servicePurpose: "Tracks hardship applications and decisions.",
  },
  {
    serviceType: "Collections",
    serviceName: "SmallBalanceWriteoffService",
    servicePurpose: "Handles small-balance write-offs.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "CreditBalanceService",
    servicePurpose: "Detects and manages client/payer credits.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "RefundRequestService",
    servicePurpose: "Creates refund requests.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "RefundApprovalService",
    servicePurpose: "Handles approval/denial workflow.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "RefundPostingService",
    servicePurpose: "Posts approved refunds to ledger.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "CreditTransferService",
    servicePurpose: "Transfers credit to another open balance.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "OverpaymentReviewService",
    servicePurpose: "Reviews suspected overpayments.",
  },
  {
    serviceType: "Overpayments",
    serviceName: "PayerRecoupmentService",
    servicePurpose: "Handles payer recoupments and offsets.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueService",
    servicePurpose: "Main task/workqueue service.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueRuleService",
    servicePurpose: "Applies rules that create tasks from system events.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueAssignmentService",
    servicePurpose: "Assigns tasks to users, teams, or roles.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueSnoozeService",
    servicePurpose: "Handles snooze and follow-up dates.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueCommentService",
    servicePurpose: "Manages workqueue comments.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueHistoryService",
    servicePurpose: "Tracks task changes.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueDuplicateService",
    servicePurpose: "Prevents duplicate open tasks for the same issue.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "WorkqueueDashboardService",
    servicePurpose: "Provides filtered workqueue counts and lists.",
  },
  {
    serviceType: "Workqueues",
    serviceName: "ArFollowupService",
    servicePurpose: "Creates AR follow-up workqueue items.",
  },
  {
    serviceType: "Communication",
    serviceName: "AccountNoteService",
    servicePurpose: "Manages non-clinical client account notes.",
  },
  {
    serviceType: "Communication",
    serviceName: "ClaimNoteService",
    servicePurpose: "Manages claim-specific notes.",
  },
  {
    serviceType: "Communication",
    serviceName: "PaymentNoteService",
    servicePurpose: "Manages payment notes.",
  },
  {
    serviceType: "Communication",
    serviceName: "AdminNoteService",
    servicePurpose: "Manages internal admin notes.",
  },
  {
    serviceType: "Communication",
    serviceName: "CommunicationLogService",
    servicePurpose: "Logs calls, emails, faxes, portal messages, and payer contacts.",
  },
  {
    serviceType: "Communication",
    serviceName: "ClientMessageService",
    servicePurpose: "Handles portal/app messages.",
  },
  {
    serviceType: "Communication",
    serviceName: "MessageThreadService",
    servicePurpose: "Groups messages into threads.",
  },
  {
    serviceType: "Communication",
    serviceName: "FollowupTaskService",
    servicePurpose: "Creates follow-up tasks from communication logs.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderService",
    servicePurpose: "Manages provider profiles.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderIdentifierService",
    servicePurpose: "Manages NPI, taxonomy, Medicaid ID, payer IDs, PTAN, etc.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderLicenseService",
    servicePurpose: "Tracks licenses and expiration dates.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderCredentialService",
    servicePurpose: "Tracks credentials such as LPC, LCSW, LAC, PMHNP, psychologist, peer specialist.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderPayerEnrollmentService",
    servicePurpose: "Tracks credentialing/enrollment by payer.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderContractService",
    servicePurpose: "Tracks payer participation and contracts.",
  },
  {
    serviceType: "Providers",
    serviceName: "SupervisionService",
    servicePurpose: "Manages supervision relationships.",
  },
  {
    serviceType: "Providers",
    serviceName: "CredentialingTaskService",
    servicePurpose: "Creates tasks for expiring or missing enrollments.",
  },
  {
    serviceType: "Providers",
    serviceName: "ProviderBillingEligibilityService",
    servicePurpose: "Determines whether provider can bill a payer for a DOS.",
  },
  {
    serviceType: "Payers",
    serviceName: "PayerService",
    servicePurpose: "Manages payer master records.",
  },
  {
    serviceType: "Payers",
    serviceName: "PayerPlanService",
    servicePurpose: "Manages payer plans.",
  },
  {
    serviceType: "Payers",
    serviceName: "PayerAliasService",
    servicePurpose: "Normalizes payer names from imports/ERAs.",
  },
  {
    serviceType: "Payers",
    serviceName: "PayerRuleService",
    servicePurpose: "Handles payer-specific billing, coding, auth, and submission rules.",
  },
  {
    serviceType: "Payers",
    serviceName: "ContractService",
    servicePurpose: "Manages payer contracts.",
  },
  {
    serviceType: "Payers",
    serviceName: "FeeScheduleService",
    servicePurpose: "Manages fee schedules.",
  },
  {
    serviceType: "Payers",
    serviceName: "ContractRateService",
    servicePurpose: "Manages CPT/modifier rates.",
  },
  {
    serviceType: "Payers",
    serviceName: "ExpectedReimbursementService",
    servicePurpose: "Calculates expected allowed/payment amount.",
  },
  {
    serviceType: "Payers",
    serviceName: "ContractVarianceService",
    servicePurpose: "Flags underpayments and overpayments.",
  },
  {
    serviceType: "Payers",
    serviceName: "UnderpaymentReviewService",
    servicePurpose: "Reviews payment variance against contracts.",
  },
  {
    serviceType: "Coding",
    serviceName: "CptCodeService",
    servicePurpose: "Manages CPT/HCPCS reference data.",
  },
  {
    serviceType: "Coding",
    serviceName: "DiagnosisCodeService",
    servicePurpose: "Manages ICD-10 reference data.",
  },
  {
    serviceType: "Coding",
    serviceName: "ModifierService",
    servicePurpose: "Manages modifier references.",
  },
  {
    serviceType: "Coding",
    serviceName: "PlaceOfServiceService",
    servicePurpose: "Manages POS code reference.",
  },
  {
    serviceType: "Coding",
    serviceName: "TaxonomyService",
    servicePurpose: "Manages taxonomy codes.",
  },
  {
    serviceType: "Coding",
    serviceName: "CodingRuleService",
    servicePurpose: "Validates CPT/modifier/POS/provider compatibility.",
  },
  {
    serviceType: "Coding",
    serviceName: "PayerCodingRuleService",
    servicePurpose: "Applies payer-specific coding rules.",
  },
  {
    serviceType: "Coding",
    serviceName: "NcciEditService",
    servicePurpose: "Optional NCCI edit validation.",
  },
  {
    serviceType: "Coding",
    serviceName: "ColoradoMedicaidRuleService",
    servicePurpose: "Handles Colorado Medicaid behavioral health billing rules.",
  },
  {
    serviceType: "Coding",
    serviceName: "UnitCalculationService",
    servicePurpose: "Calculates units for timed or unit-based services.",
  },
  {
    serviceType: "Reporting",
    serviceName: "DashboardService",
    servicePurpose: "Provides dashboard metrics.",
  },
  {
    serviceType: "Reporting",
    serviceName: "DailyFlashService",
    servicePurpose: "Generates daily operational snapshot.",
  },
  {
    serviceType: "Reporting",
    serviceName: "ArReportService",
    servicePurpose: "Builds AR aging reports.",
  },
  {
    serviceType: "Reporting",
    serviceName: "DenialReportService",
    servicePurpose: "Builds denial reports.",
  },
  {
    serviceType: "Reporting",
    serviceName: "PaymentReportService",
    servicePurpose: "Reports payments, adjustments, refunds, reversals, and recoupments.",
  },
  {
    serviceType: "Reporting",
    serviceName: "ClaimSubmissionReportService",
    servicePurpose: "Reports submitted, accepted, rejected, denied, and paid claims.",
  },
  {
    serviceType: "Reporting",
    serviceName: "CleanClaimRateService",
    servicePurpose: "Calculates clean claim rate.",
  },
  {
    serviceType: "Reporting",
    serviceName: "FirstPassYieldService",
    servicePurpose: "Calculates first-pass payment success.",
  },
  {
    serviceType: "Reporting",
    serviceName: "NetCollectionRateService",
    servicePurpose: "Calculates net collection rate.",
  },
  {
    serviceType: "Reporting",
    serviceName: "GrossCollectionRateService",
    servicePurpose: "Calculates gross collection rate.",
  },
  {
    serviceType: "Reporting",
    serviceName: "clientCollectionReportService",
    servicePurpose: "Reports client AR and collections.",
  },
  {
    serviceType: "Reporting",
    serviceName: "ProviderProductivityService",
    servicePurpose: "Reports visits, charges, and reimbursement by provider.",
  },
  {
    serviceType: "Reporting",
    serviceName: "PayerMixService",
    servicePurpose: "Reports payer mix by visits, charges, payments, and AR.",
  },
  {
    serviceType: "Reporting",
    serviceName: "ContractVarianceReportService",
    servicePurpose: "Reports expected vs actual reimbursement.",
  },
  {
    serviceType: "Reporting",
    serviceName: "ExportService",
    servicePurpose: "Generates CSV/PDF exports.",
  },
  {
    serviceType: "Imports",
    serviceName: "ImportService",
    servicePurpose: "Main import workflow coordinator.",
  },
  {
    serviceType: "Imports",
    serviceName: "CsvImportService",
    servicePurpose: "Handles CSV/Excel uploads.",
  },
  {
    serviceType: "Imports",
    serviceName: "ImportMappingService",
    servicePurpose: "Maps source columns to system fields.",
  },
  {
    serviceType: "Imports",
    serviceName: "ImportValidationService",
    servicePurpose: "Validates rows before commit.",
  },
  {
    serviceType: "Imports",
    serviceName: "ImportCommitService",
    servicePurpose: "Commits validated import batches.",
  },
  {
    serviceType: "Imports",
    serviceName: "ImportRollbackService",
    servicePurpose: "Rolls back failed or uncommitted imports.",
  },
  {
    serviceType: "Imports",
    serviceName: "LegacyRecordLinkService",
    servicePurpose: "Maps prior-system IDs to THERASSISTANT records.",
  },
  {
    serviceType: "Imports",
    serviceName: "DuplicateDetectionService",
    servicePurpose: "Finds duplicate clients, claims, payers, and payments.",
  },
  {
    serviceType: "Imports",
    serviceName: "SimplePracticeImportService",
    servicePurpose: "Handles SimplePractice import structure.",
  },
  {
    serviceType: "Imports",
    serviceName: "TherapyNotesImportService",
    servicePurpose: "Handles TherapyNotes import structure.",
  },
  {
    serviceType: "Integrations",
    serviceName: "IntegrationConnectionService",
    servicePurpose: "Manages external system connections.",
  },
  {
    serviceType: "Integrations",
    serviceName: "ClearinghouseIntegrationService",
    servicePurpose: "Handles 837/835/276/277 clearinghouse workflows.",
  },
  {
    serviceType: "Integrations",
    serviceName: "AvailityIntegrationService",
    servicePurpose: "Optional eligibility/claim status connection.",
  },
  {
    serviceType: "Integrations",
    serviceName: "PaymentProcessorService",
    servicePurpose: "Handles Stripe or other payment processor integration.",
  },
  {
    serviceType: "Integrations",
    serviceName: "GoogleCalendarIntegrationService",
    servicePurpose: "Optional calendar sync.",
  },
  {
    serviceType: "Integrations",
    serviceName: "GmailIntegrationService",
    servicePurpose: "Optional user-scoped Gmail connection.",
  },
  {
    serviceType: "Integrations",
    serviceName: "DocumentStorageService",
    servicePurpose: "Handles Supabase Storage or external storage.",
  },
  {
    serviceType: "Integrations",
    serviceName: "WebhookService",
    servicePurpose: "Processes incoming and outgoing webhooks.",
  },
  {
    serviceType: "Integrations",
    serviceName: "SyncJobService",
    servicePurpose: "Manages sync status, retries, and failures.",
  },
  {
    serviceType: "Integrations",
    serviceName: "ExternalMappingService",
    servicePurpose: "Maps external IDs to internal records.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentService",
    servicePurpose: "Main document management service.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentUploadService",
    servicePurpose: "Handles file uploads.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentReviewService",
    servicePurpose: "Approves/rejects documents.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentLinkingService",
    servicePurpose: "Links documents to clients, claims, auths, appeals, EOBs, etc.",
  },
  {
    serviceType: "Files",
    serviceName: "GeneratedDocumentService",
    servicePurpose: "Generates statements, appeal letters, exports, and claim PDFs.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentRetentionService",
    servicePurpose: "Handles archive/retention rules.",
  },
  {
    serviceType: "Files",
    serviceName: "DocumentAccessService",
    servicePurpose: "Enforces document permissions.",
  },
  {
    serviceType: "Notifications",
    serviceName: "NotificationService",
    servicePurpose: "Creates in-app notifications.",
  },
  {
    serviceType: "Notifications",
    serviceName: "NotificationPreferenceService",
    servicePurpose: "Manages user notification preferences.",
  },
  {
    serviceType: "Notifications",
    serviceName: "NotificationDeliveryService",
    servicePurpose: "Sends email/SMS/push/in-app delivery records.",
  },
  {
    serviceType: "Notifications",
    serviceName: "NotificationTemplateService",
    servicePurpose: "Manages reusable notification templates.",
  },
  {
    serviceType: "Notifications",
    serviceName: "AlertRoutingService",
    servicePurpose: "Determines who should receive alerts.",
  },
  {
    serviceType: "Search",
    serviceName: "GlobalSearchService",
    servicePurpose: "Searches clients, claims, payments, notes, providers, and documents.",
  },
  {
    serviceType: "Search",
    serviceName: "ClientSearchService",
    servicePurpose: "Searches clients by name, DOB, phone, email, member ID.",
  },
  {
    serviceType: "Search",
    serviceName: "ClaimSearchService",
    servicePurpose: "Searches claims by client, payer, claim number, DOS, status.",
  },
  {
    serviceType: "Search",
    serviceName: "PaymentSearchService",
    servicePurpose: "Searches payments by check number, EFT trace, payer, client, amount.",
  },
  {
    serviceType: "Search",
    serviceName: "DocumentSearchService",
    servicePurpose: "Searches uploaded/generated documents.",
  },
  {
    serviceType: "Search",
    serviceName: "PayerSearchService",
    servicePurpose: "Searches payer and plan records.",
  },
  {
    serviceType: "Validation",
    serviceName: "ClientValidationService",
    servicePurpose: "Validates required client fields.",
  },
  {
    serviceType: "Validation",
    serviceName: "InsuranceValidationService",
    servicePurpose: "Validates coverage dates, member ID, subscriber, policy order.",
  },
  {
    serviceType: "Validation",
    serviceName: "ProviderValidationService",
    servicePurpose: "Validates provider identifiers, licenses, and payer enrollment.",
  },
  {
    serviceType: "Validation",
    serviceName: "AppointmentValidationService",
    servicePurpose: "Validates scheduling rules.",
  },
  {
    serviceType: "Validation",
    serviceName: "ClinicalValidationService",
    servicePurpose: "Validates documentation requirements.",
  },
  {
    serviceType: "Pre-Session Dashboard",
    serviceName: "PreSessionDashboardService",
    servicePurpose: "Loads the provider Pre-Session Dashboard, including appointment, client, active treatment goals, prior plan/next steps, check-in response, goal updates, and safety review status.",
  },
  {
    serviceType: "Pre-Session Dashboard",
    serviceName: "PreSessionGoalUpdateService",
    servicePurpose: "Creates, reviews, approves, rejects, and merges client-submitted treatment goal updates.",
  },
  {
    serviceType: "Pre-Session Dashboard",
    serviceName: "PreSessionSafetyService",
    servicePurpose: "Creates safety review records, handles provider acknowledgement/escalation, and creates safety notifications or workqueue items when needed.",
  },
  {
    serviceType: "Pre-Session Dashboard",
    serviceName: "ClinicalNoteImportService",
    servicePurpose: "Imports selected pre-session response content into a draft clinical note and tracks source provenance.",
  },
  {
    serviceType: "Validation",
    serviceName: "ChargeValidationService",
    servicePurpose: "Validates charge readiness.",
  },
  {
    serviceType: "Validation",
    serviceName: "ClaimValidationService",
    servicePurpose: "Validates claim readiness.",
  },
  {
    serviceType: "Validation",
    serviceName: "PaymentValidationService",
    servicePurpose: "Validates payment posting and allocations.",
  },
  {
    serviceType: "Validation",
    serviceName: "LedgerValidationService",
    servicePurpose: "Validates financial integrity.",
  },
  {
    serviceType: "Validation",
    serviceName: "ImportValidationService",
    servicePurpose: "Validates import rows.",
  },
] as const;

export type ServiceDefinition = (typeof SERVICE_DEFINITIONS)[number];
export type ServiceType = ServiceDefinition['serviceType'];
export type ServiceName = ServiceDefinition['serviceName'];

export const SERVICE_TYPES = Array.from(
  new Set(SERVICE_DEFINITIONS.map((service) => service.serviceType)),
);

export const getAllServiceDefinitions = (): readonly ServiceDefinition[] =>
  SERVICE_DEFINITIONS;

export const getServiceDefinitionsByType = (
  serviceType: ServiceType,
): readonly ServiceDefinition[] =>
  SERVICE_DEFINITIONS.filter((service) => service.serviceType === serviceType);

export const findServiceDefinition = (
  serviceName: ServiceName | string,
  serviceType?: ServiceType,
): ServiceDefinition | undefined =>
  SERVICE_DEFINITIONS.find(
    (service) =>
      service.serviceName === serviceName &&
      (serviceType === undefined || service.serviceType === serviceType),
  );

export const serviceExists = (
  serviceName: ServiceName | string,
  serviceType?: ServiceType,
): boolean => findServiceDefinition(serviceName, serviceType) !== undefined;

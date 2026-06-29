-- THERASSISTANT EHR module catalog
-- Generated from uploaded module list on 2026-06-29.
-- Notes:
-- - This migration creates the public.modules catalog table if needed.
-- - Module names and purposes are preserved from the source list.
-- - The migration is idempotent and uses module_key as the stable upsert key.

create extension if not exists pgcrypto;

create table if not exists public.modules (
    id uuid primary key default gen_random_uuid(),
    module_key text not null,
    module_type text not null,
    module_name text not null,
    module_purpose text not null,
    sort_order integer not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint modules_module_key_key unique (module_key),
    constraint modules_module_name_key unique (module_name)
);

comment on table public.modules is 'Catalog of THERASSISTANT EHR application modules.';
comment on column public.modules.module_type is 'High-level module group from the THERASSISTANT module blueprint.';
comment on column public.modules.module_key is 'Stable snake_case key generated from module_name.';
comment on column public.modules.module_name is 'Canonical application module name.';
comment on column public.modules.module_purpose is 'Business purpose of the module.';

create index if not exists modules_module_type_idx on public.modules (module_type);
create index if not exists modules_sort_order_idx on public.modules (sort_order);
create index if not exists modules_is_active_idx on public.modules (is_active);

create or replace function public.set_modules_updated_at()
returns trigger
language plpgsql
as $fn$
begin
    new.updated_at = now();
    return new;
end;
$fn$;

drop trigger if exists trg_modules_updated_at on public.modules;

create trigger trg_modules_updated_at
before update on public.modules
for each row
execute function public.set_modules_updated_at();

alter table public.modules enable row level security;

drop policy if exists "Authenticated users can read modules" on public.modules;

create policy "Authenticated users can read modules"
on public.modules
for select
to authenticated
using (true);

with module_rows as (
    select *
    from jsonb_to_recordset($json$[
      {"module_key":"platform_admin_module","module_type":"Platform","module_name":"PlatformAdminModule","module_purpose":"Platform-wide control panel for THERASSISTANT admins.","sort_order":1,"is_active":true},
      {"module_key":"tenants_management_module","module_type":"Platform","module_name":"TenantsManagementModule","module_purpose":"Manages Practices, billing company Tenantss, and Tenants settings.","sort_order":2,"is_active":true},
      {"module_key":"billing_company_access_module","module_type":"Platform","module_name":"BillingCompanyAccessModule","module_purpose":"Links billing company users to Clients Practices with scoped access.","sort_order":3,"is_active":true},
      {"module_key":"user_management_module","module_type":"Platform","module_name":"UserManagementModule","module_purpose":"Users, invitations, roles, permissions, and account status.","sort_order":4,"is_active":true},
      {"module_key":"role_permission_module","module_type":"Platform","module_name":"RolePermissionModule","module_purpose":"Role hierarchy and permission mapping.","sort_order":5,"is_active":true},
      {"module_key":"feature_flag_module","module_type":"Platform","module_name":"FeatureFlagModule","module_purpose":"Enables/disables features by Tenants.","sort_order":6,"is_active":true},
      {"module_key":"tenants_settings_module","module_type":"Platform","module_name":"TenantsSettingsModule","module_purpose":"Practice-specific billing, Claims, scheduling, and branding settings.","sort_order":7,"is_active":true},
      {"module_key":"auth_module","module_type":"Security","module_name":"AuthModule","module_purpose":"Login/session handling through Supabase auth.","sort_order":8,"is_active":true},
      {"module_key":"access_control_module","module_type":"Security","module_name":"AccessControlModule","module_purpose":"Tenants isolation, role checks, and row-level Security support.","sort_order":9,"is_active":true},
      {"module_key":"phi_access_module","module_type":"Security","module_name":"PhiAccessModule","module_purpose":"Tracks PHI access and sensitive record views.","sort_order":10,"is_active":true},
      {"module_key":"audits_log_module","module_type":"Security","module_name":"AuditsLogModule","module_purpose":"Centralized Audits logging for all critical actions.","sort_order":11,"is_active":true},
      {"module_key":"data_export_module","module_type":"Security","module_name":"DataExportModule","module_purpose":"Clients record exports, financial exports, and compliance packets.","sort_order":12,"is_active":true},
      {"module_key":"soft_delete_module","module_type":"Security","module_name":"SoftDeleteModule","module_purpose":"Safe delete/restore behavior for non-financial records.","sort_order":13,"is_active":true},
      {"module_key":"record_locking_module","module_type":"Security","module_name":"RecordLockingModule","module_purpose":"Prevents improper edits to signed notes, posted payments, and closed periods.","sort_order":14,"is_active":true},
      {"module_key":"clients_module","module_type":"Clients","module_name":"ClientsModule","module_purpose":"Main Clients proFiles, demographics, status, and identifiers.","sort_order":15,"is_active":true},
      {"module_key":"clients_contacts_module","module_type":"Clients","module_name":"ClientsContactsModule","module_purpose":"Guardians, emergency contacts, responsible parties, and billing contacts.","sort_order":16,"is_active":true},
      {"module_key":"clients_payers_module","module_type":"Clients","module_name":"ClientsPayersModule","module_purpose":"Payers policies, primary/secondary order, coverage dates.","sort_order":17,"is_active":true},
      {"module_key":"clients_files_module","module_type":"Clients","module_name":"ClientsFilesModule","module_purpose":"Payers cards, intake forms, EOBs, authorizations, and uploaded Files.","sort_order":18,"is_active":true},
      {"module_key":"clients_timeline_module","module_type":"Clients","module_name":"ClientsTimelineModule","module_purpose":"Unified Clients activity timeline: Appointmentss, Claims, payments, notes, messages.","sort_order":19,"is_active":true},
      {"module_key":"clients_financial_snapshot_module","module_type":"Clients","module_name":"ClientsFinancialSnapshotModule","module_purpose":"Shows balances, credits, open Claims, and payment history.","sort_order":20,"is_active":true},
      {"module_key":"clients_portal_module","module_type":"Clients","module_name":"ClientsPortalModule","module_purpose":"Clients-facing access, check-in, forms, messages, balances, and Collections.","sort_order":21,"is_active":true},
      {"module_key":"calendar_module","module_type":"Calendar","module_name":"CalendarModule","module_purpose":"Main Appointments calendar for Providerss/admins.","sort_order":22,"is_active":true},
      {"module_key":"appointments_module","module_type":"Calendar","module_name":"AppointmentsModule","module_purpose":"Appointments creation, editing, cancellation, no-show, completion.","sort_order":23,"is_active":true},
      {"module_key":"recurring_appointments_module","module_type":"Calendar","module_name":"RecurringAppointmentsModule","module_purpose":"Repeating Appointments and recurrence rules.","sort_order":24,"is_active":true},
      {"module_key":"appointments_service_module","module_type":"Calendar","module_name":"AppointmentsServiceModule","module_purpose":"CPT/service assignment to Appointmentss.","sort_order":25,"is_active":true},
      {"module_key":"providers_availability_module","module_type":"Calendar","module_name":"ProvidersAvailabilityModule","module_purpose":"Providers schedules, blocked time, and availability.","sort_order":26,"is_active":true},
      {"module_key":"check_in_module","module_type":"Calendar","module_name":"CheckInModule","module_purpose":"Clients mobile/app check-in.","sort_order":27,"is_active":true},
      {"module_key":"pre_session_question_module","module_type":"Calendar","module_name":"PreSessionQuestionModule","module_purpose":"Pre-session questions completed before the visit.","sort_order":28,"is_active":true},
      {"module_key":"calendar_status_module","module_type":"Calendar","module_name":"CalendarStatusModule","module_purpose":"Appointments color/status changes based on check-in and documentation status.","sort_order":29,"is_active":true},
      {"module_key":"clinical_note_module","module_type":"Documentation","module_name":"ClinicalNoteModule","module_purpose":"Session notes, assessments, crisis notes, case management notes, etc.","sort_order":30,"is_active":true},
      {"module_key":"note_template_module","module_type":"Documentation","module_name":"NoteTemplateModule","module_purpose":"Clinical note templates by service type.","sort_order":31,"is_active":true},
      {"module_key":"note_signature_module","module_type":"Documentation","module_name":"NoteSignatureModule","module_purpose":"Signature, co-signature, locking, and amendment workflow.","sort_order":32,"is_active":true},
      {"module_key":"treatment_plan_module","module_type":"Documentation","module_name":"TreatmentPlanModule","module_purpose":"Treatment Planss, reviews, goals, objectives, and expiration tracking.","sort_order":33,"is_active":true},
      {"module_key":"diagnosis_module","module_type":"Documentation","module_name":"DiagnosisModule","module_purpose":"Clients diagnoses and Claims diagnosis mapping.","sort_order":34,"is_active":true},
      {"module_key":"assessment_module","module_type":"Documentation","module_name":"AssessmentModule","module_purpose":"H0031, H0001, H0002, 90791, biopsychosocial assessments.","sort_order":35,"is_active":true},
      {"module_key":"screening_module","module_type":"Documentation","module_name":"ScreeningModule","module_purpose":"PHQ-9, GAD-7, CAGE-AID, and similar tools.","sort_order":36,"is_active":true},
      {"module_key":"documentation_validation_module","module_type":"Documentation","module_name":"DocumentationValidationModule","module_purpose":"Checks note completeness before billing.","sort_order":37,"is_active":true},
      {"module_key":"golden_thread_module","module_type":"Documentation","module_name":"GoldenThreadModule","module_purpose":"Links assessment, diagnosis, Treatment Plans, goals, note, and Claims.","sort_order":38,"is_active":true},
      {"module_key":"charge_capture_module","module_type":"Charges","module_name":"ChargeCaptureModule","module_purpose":"Creates and manages pre-Claims billable service records.","sort_order":39,"is_active":true},
      {"module_key":"charge_validation_module","module_type":"Charges","module_name":"ChargeValidationModule","module_purpose":"Validates charge readiness before Claims creation.","sort_order":40,"is_active":true},
      {"module_key":"charge_workqueues_module","module_type":"Charges","module_name":"ChargeWorkqueuesModule","module_purpose":"Displays blocked, missing, or unClaimsed charges.","sort_order":41,"is_active":true},
      {"module_key":"charge_status_module","module_type":"Charges","module_name":"ChargeStatusModule","module_purpose":"Manages charge status transitions.","sort_order":42,"is_active":true},
      {"module_key":"charge_correction_module","module_type":"Charges","module_name":"ChargeCorrectionModule","module_purpose":"Allows safe correction before Claims creation.","sort_order":43,"is_active":true},
      {"module_key":"unbilled_appointmentss_module","module_type":"Charges","module_name":"UnbilledAppointmentssModule","module_purpose":"Finds completed Appointments without charges.","sort_order":44,"is_active":true},
      {"module_key":"claims_module","module_type":"Claims","module_name":"ClaimsModule","module_purpose":"Main professional Claims management.","sort_order":45,"is_active":true},
      {"module_key":"claims_line_module","module_type":"Claims","module_name":"ClaimsLineModule","module_purpose":"CPT/service line management.","sort_order":46,"is_active":true},
      {"module_key":"claims_diagnosis_module","module_type":"Claims","module_name":"ClaimsDiagnosisModule","module_purpose":"Diagnosis and diagnosis pointer handling.","sort_order":47,"is_active":true},
      {"module_key":"claims_validation_module","module_type":"Claims","module_name":"ClaimsValidationModule","module_purpose":"Claims-level validation before batching/submission.","sort_order":48,"is_active":true},
      {"module_key":"claimstatus_module","module_type":"Claims","module_name":"ClaimstatusModule","module_purpose":"Claims status transitions and history.","sort_order":49,"is_active":true},
      {"module_key":"claims_correction_module","module_type":"Claims","module_name":"ClaimsCorrectionModule","module_purpose":"Corrected Claims workflow.","sort_order":50,"is_active":true},
      {"module_key":"claims_reversal_module","module_type":"Claims","module_name":"ClaimsReversalModule","module_purpose":"Reversal/void workflow.","sort_order":51,"is_active":true},
      {"module_key":"claims_timeline_module","module_type":"Claims","module_name":"ClaimsTimelineModule","module_purpose":"Full Claims activity timeline.","sort_order":52,"is_active":true},
      {"module_key":"claims_attachment_module","module_type":"Claims","module_name":"ClaimsAttachmentModule","module_purpose":"Attachments, EOBs, payer letters, appeal Files.","sort_order":53,"is_active":true},
      {"module_key":"claims_batch_module","module_type":"Batches","module_name":"ClaimsBatchModule","module_purpose":"Creates and manages Claims batches.","sort_order":54,"is_active":true},
      {"module_key":"claims_batch_item_module","module_type":"Batches","module_name":"ClaimsBatchItemModule","module_purpose":"Links Claims to batches.","sort_order":55,"is_active":true},
      {"module_key":"claimsubmission_module","module_type":"Batches","module_name":"ClaimsubmissionModule","module_purpose":"Tracks Claims Submission attempts.","sort_order":56,"is_active":true},
      {"module_key":"837_generation_module","module_type":"Batches","module_name":"837GenerationModule","module_purpose":"Generates 837P Claims data/Files.","sort_order":57,"is_active":true},
      {"module_key":"clearinghouse_module","module_type":"Batches","module_name":"ClearinghouseModule","module_purpose":"Clearinghouse account setup and submission response handling.","sort_order":58,"is_active":true},
      {"module_key":"submission_response_module","module_type":"Batches","module_name":"SubmissionResponseModule","module_purpose":"Stores clearinghouse/payer responses.","sort_order":59,"is_active":true},
      {"module_key":"claimstatus_response_module","module_type":"Batches","module_name":"ClaimstatusResponseModule","module_purpose":"276/277 status response tracking.","sort_order":60,"is_active":true},
      {"module_key":"submission_files_module","module_type":"Batches","module_name":"SubmissionFilesModule","module_purpose":"Stores generated/downloaded/submitted Claims Files.","sort_order":61,"is_active":true},
      {"module_key":"eligibility_module","module_type":"Payers","module_name":"EligibilityModule","module_purpose":"Eligibility verification history.","sort_order":62,"is_active":true},
      {"module_key":"benefit_verification_module","module_type":"Payers","module_name":"BenefitVerificationModule","module_purpose":"Copay, deductible, coPayers, OOP, visit limits, auth requirements.","sort_order":63,"is_active":true},
      {"module_key":"eligibility_issue_module","module_type":"Payers","module_name":"EligibilityIssueModule","module_purpose":"Failed or unclear eligibility Workqueues items.","sort_order":64,"is_active":true},
      {"module_key":"payersnapshot_module","module_type":"Payers","module_name":"PayersnapshotModule","module_purpose":"Stores latest benefit snapshot for easy review.","sort_order":65,"is_active":true},
      {"module_key":"coverage_date_module","module_type":"Payers","module_name":"CoverageDateModule","module_purpose":"Determines active policy by date of service.","sort_order":66,"is_active":true},
      {"module_key":"copay_co_payers_module","module_type":"Payers","module_name":"CopayCoPayersModule","module_purpose":"Helps staff determine whether the Clients has copay, coPayers, deductible, or PR.","sort_order":67,"is_active":true},
      {"module_key":"payment_posting_module","module_type":"Payment Posting","module_name":"PaymentPostingModule","module_purpose":"Manual and ERA-based payment posting.","sort_order":68,"is_active":true},
      {"module_key":"payers_payment_module","module_type":"Payment Posting","module_name":"PayersPaymentModule","module_purpose":"Payer payments, EFTs, checks, and ERA payments.","sort_order":69,"is_active":true},
      {"module_key":"client_payment_module","module_type":"Payment Posting","module_name":"clientPaymentModule","module_purpose":"client payments, card payments, portal payments, cash/check.","sort_order":70,"is_active":true},
      {"module_key":"payment_allocation_module","module_type":"Payment Posting","module_name":"PaymentAllocationModule","module_purpose":"Applies payments to Claims, lines, Clients balances, or unapplied funds.","sort_order":71,"is_active":true},
      {"module_key":"zero_pay_posting_module","module_type":"Payment Posting","module_name":"ZeroPayPostingModule","module_purpose":"Posts zero-pay EOBs/ERAs with Denials or PR.","sort_order":72,"is_active":true},
      {"module_key":"partial_payment_module","module_type":"Payment Posting","module_name":"PartialPaymentModule","module_purpose":"Handles partial payer payments.","sort_order":73,"is_active":true},
      {"module_key":"payment_reversal_module","module_type":"Payment Posting","module_name":"PaymentReversalModule","module_purpose":"Reverses payments without deleting history.","sort_order":74,"is_active":true},
      {"module_key":"unapplied_payment_module","module_type":"Payment Posting","module_name":"UnappliedPaymentModule","module_purpose":"Manages unapplied or partially applied money.","sort_order":75,"is_active":true},
      {"module_key":"overpayments_module","module_type":"Payment Posting","module_name":"OverpaymentsModule","module_purpose":"Detects and routes Overpayments review.","sort_order":76,"is_active":true},
      {"module_key":"historical_posting_module","module_type":"Historical Posting","module_name":"HistoricalPostingModule","module_purpose":"Posts old payments, credits, balances, and Adjustments without a Claims.","sort_order":77,"is_active":true},
      {"module_key":"opening_balance_module","module_type":"Historical Posting","module_name":"OpeningBalanceModule","module_purpose":"Establishes beginning balances from prior systems.","sort_order":78,"is_active":true},
      {"module_key":"historical_payment_module","module_type":"Historical Posting","module_name":"HistoricalPaymentModule","module_purpose":"Records legacy payments.","sort_order":79,"is_active":true},
      {"module_key":"historical_adjustments_module","module_type":"Historical Posting","module_name":"HistoricalAdjustmentsModule","module_purpose":"Records legacy write-offs, Adjustmentss, and corrections.","sort_order":80,"is_active":true},
      {"module_key":"historical_credit_module","module_type":"Historical Posting","module_name":"HistoricalCreditModule","module_purpose":"Records prior credit balances.","sort_order":81,"is_active":true},
      {"module_key":"historical_linking_module","module_type":"Historical Posting","module_name":"HistoricalLinkingModule","module_purpose":"Links historical transactions to later-created/Importsed Claims when needed.","sort_order":82,"is_active":true},
      {"module_key":"historical_reversal_module","module_type":"Historical Posting","module_name":"HistoricalReversalModule","module_purpose":"Reverses historical transactions without deleting them.","sort_order":83,"is_active":true},
      {"module_key":"accounting_module","module_type":"Accounting","module_name":"AccountingModule","module_purpose":"Financial source of truth.","sort_order":84,"is_active":true},
      {"module_key":"accounting_transaction_module","module_type":"Accounting","module_name":"AccountingTransactionModule","module_purpose":"Groups related Accounting entries.","sort_order":85,"is_active":true},
      {"module_key":"accounting_entry_module","module_type":"Accounting","module_name":"AccountingEntryModule","module_purpose":"Individual financial entries.","sort_order":86,"is_active":true},
      {"module_key":"accounting_account_module","module_type":"Accounting","module_name":"AccountingAccountModule","module_purpose":"AR, revenue, Adjustmentss, refunds, credits, write-offs.","sort_order":87,"is_active":true},
      {"module_key":"balance_summary_module","module_type":"Accounting","module_name":"BalanceSummaryModule","module_purpose":"Cached Clients and Claims balances.","sort_order":88,"is_active":true},
      {"module_key":"accounting_period_module","module_type":"Accounting","module_name":"AccountingPeriodModule","module_purpose":"Month-end period close/lock.","sort_order":89,"is_active":true},
      {"module_key":"reconciliation_module","module_type":"Accounting","module_name":"ReconciliationModule","module_purpose":"Bank/EFT/ERA/payment reconciliation.","sort_order":90,"is_active":true},
      {"module_key":"financial_integrity_module","module_type":"Accounting","module_name":"FinancialIntegrityModule","module_purpose":"Prevents deletion/editing of posted financial records.","sort_order":91,"is_active":true},
      {"module_key":"era_imports_module","module_type":"ERA / EOB","module_name":"EraImportsModule","module_purpose":"Upload/Imports 835 Files.","sort_order":92,"is_active":true},
      {"module_key":"era_parsing_module","module_type":"ERA / EOB","module_name":"EraParsingModule","module_purpose":"Parses ERA Claims/service/payment details.","sort_order":93,"is_active":true},
      {"module_key":"era_matching_module","module_type":"ERA / EOB","module_name":"EraMatchingModule","module_purpose":"Matches ERA Claims to internal Claims.","sort_order":94,"is_active":true},
      {"module_key":"era_posting_module","module_type":"ERA / EOB","module_name":"EraPostingModule","module_purpose":"Posts matched ERA payments and Adjustmentss.","sort_order":95,"is_active":true},
      {"module_key":"era_exception_module","module_type":"ERA / EOB","module_name":"EraExceptionModule","module_purpose":"Handles unmatched/ambiguous ERAs.","sort_order":96,"is_active":true},
      {"module_key":"manual_eob_module","module_type":"ERA / EOB","module_name":"ManualEobModule","module_purpose":"Manual EOB entry when no ERA exists.","sort_order":97,"is_active":true},
      {"module_key":"eob_document_module","module_type":"ERA / EOB","module_name":"EobDocumentModule","module_purpose":"Stores EOB Files/images/PDFs.","sort_order":98,"is_active":true},
      {"module_key":"denials_module","module_type":"Denials","module_name":"DenialsModule","module_purpose":"Main Denials records.","sort_order":99,"is_active":true},
      {"module_key":"carc_rarc_module","module_type":"Denials","module_name":"CarcRarcModule","module_purpose":"CARC/RARC reference and mapping logic.","sort_order":100,"is_active":true},
      {"module_key":"denials_classification_module","module_type":"Denials","module_name":"DenialsClassificationModule","module_purpose":"Categorizes Denials by issue type.","sort_order":101,"is_active":true},
      {"module_key":"denials_workability_module","module_type":"Denials","module_name":"DenialsWorkabilityModule","module_purpose":"Determines workable vs non-workable.","sort_order":102,"is_active":true},
      {"module_key":"denials_followup_module","module_type":"Denials","module_name":"DenialsFollowupModule","module_purpose":"Tracks payer calls, portal messages, reconsiderations, appeals.","sort_order":103,"is_active":true},
      {"module_key":"credentialing_writeoff_module","module_type":"Denials","module_name":"CredentialingWriteoffModule","module_purpose":"Auto-routes credentialing/Payers issues to write-off if configured.","sort_order":104,"is_active":true},
      {"module_key":"denials_analytics_module","module_type":"Denials","module_name":"DenialsAnalyticsModule","module_purpose":"Denials trends by payer, Providers, CPT, CARC, category.","sort_order":105,"is_active":true},
      {"module_key":"appeal_module","module_type":"Appeals","module_name":"AppealModule","module_purpose":"Appeal workflow tracking.","sort_order":106,"is_active":true},
      {"module_key":"reconsideration_module","module_type":"Appeals","module_name":"ReconsiderationModule","module_purpose":"Payer reconsideration workflow.","sort_order":107,"is_active":true},
      {"module_key":"corrected_claims_module","module_type":"Appeals","module_name":"CorrectedClaimsModule","module_purpose":"Corrected Claims preparation and submission.","sort_order":108,"is_active":true},
      {"module_key":"appeal_deadline_module","module_type":"Appeals","module_name":"AppealDeadlineModule","module_purpose":"Deadline calculation and alerts.","sort_order":109,"is_active":true},
      {"module_key":"appeal_document_module","module_type":"Appeals","module_name":"AppealDocumentModule","module_purpose":"Appeal letters, medical records, payer forms, proof of timely filing.","sort_order":110,"is_active":true},
      {"module_key":"appeal_outcome_module","module_type":"Appeals","module_name":"AppealOutcomeModule","module_purpose":"Tracks outcome and updates Claims/Accounting as needed.","sort_order":111,"is_active":true},
      {"module_key":"client_responsibility_module","module_type":"Collections","module_name":"clientResponsibilityModule","module_purpose":"Copay, deductible, coPayers, non-covered balances.","sort_order":112,"is_active":true},
      {"module_key":"client_collections_module","module_type":"Collections","module_name":"clientCollectionsModule","module_purpose":"Collections generation.","sort_order":113,"is_active":true},
      {"module_key":"collections_delivery_module","module_type":"Collections","module_name":"CollectionsDeliveryModule","module_purpose":"Mail, email, portal, SMS delivery tracking.","sort_order":114,"is_active":true},
      {"module_key":"payment_plan_module","module_type":"Collections","module_name":"PaymentPlanModule","module_purpose":"client payment plans.","sort_order":115,"is_active":true},
      {"module_key":"collection_workflow_module","module_type":"Collections","module_name":"CollectionWorkflowModule","module_purpose":"Past-due balances and collection status.","sort_order":116,"is_active":true},
      {"module_key":"hardship_module","module_type":"Collections","module_name":"HardshipModule","module_purpose":"Hardship applications and reduced-payment arrangements.","sort_order":117,"is_active":true},
      {"module_key":"small_balance_writeoff_module","module_type":"Collections","module_name":"SmallBalanceWriteoffModule","module_purpose":"Optional small-balance cleanup.","sort_order":118,"is_active":true},
      {"module_key":"credit_balance_module","module_type":"Overpayments","module_name":"CreditBalanceModule","module_purpose":"Identifies client or payer credits.","sort_order":119,"is_active":true},
      {"module_key":"refund_request_module","module_type":"Overpayments","module_name":"RefundRequestModule","module_purpose":"Creates refund request.","sort_order":120,"is_active":true},
      {"module_key":"refund_approval_module","module_type":"Overpayments","module_name":"RefundApprovalModule","module_purpose":"Approval/Denials process.","sort_order":121,"is_active":true},
      {"module_key":"refund_posting_module","module_type":"Overpayments","module_name":"RefundPostingModule","module_purpose":"Posts refund to Accounting.","sort_order":122,"is_active":true},
      {"module_key":"credit_transfer_module","module_type":"Overpayments","module_name":"CreditTransferModule","module_purpose":"Transfers credit to another balance.","sort_order":123,"is_active":true},
      {"module_key":"overpayments_review_module","module_type":"Overpayments","module_name":"OverpaymentsReviewModule","module_purpose":"Reviews suspected payer/client Overpayments.","sort_order":124,"is_active":true},
      {"module_key":"recoupment_module","module_type":"Overpayments","module_name":"RecoupmentModule","module_purpose":"Handles payer recoupments.","sort_order":125,"is_active":true},
      {"module_key":"workqueues_module","module_type":"Workqueues","module_name":"WorkqueuesModule","module_purpose":"Main operational task engine.","sort_order":126,"is_active":true},
      {"module_key":"workqueues_rules_module","module_type":"Workqueues","module_name":"WorkqueuesRulesModule","module_purpose":"Rules that create tasks from statuses/errors.","sort_order":127,"is_active":true},
      {"module_key":"workqueues_assignment_module","module_type":"Workqueues","module_name":"WorkqueuesAssignmentModule","module_purpose":"Assigns tasks to user/team/role.","sort_order":128,"is_active":true},
      {"module_key":"workqueues_snooze_module","module_type":"Workqueues","module_name":"WorkqueuesSnoozeModule","module_purpose":"Follow-up and snooze behavior.","sort_order":129,"is_active":true},
      {"module_key":"workqueues_history_module","module_type":"Workqueues","module_name":"WorkqueuesHistoryModule","module_purpose":"Task status and assignment history.","sort_order":130,"is_active":true},
      {"module_key":"workqueues_comment_module","module_type":"Workqueues","module_name":"WorkqueuesCommentModule","module_purpose":"Comments and internal notes on tasks.","sort_order":131,"is_active":true},
      {"module_key":"workqueues_dashboard_module","module_type":"Workqueues","module_name":"WorkqueuesDashboardModule","module_purpose":"Filtered queues by task type, payer, Providers, priority, due date.","sort_order":132,"is_active":true},
      {"module_key":"account_note_module","module_type":"Communication","module_name":"AccountNoteModule","module_purpose":"Non-clinical Clients account notes.","sort_order":133,"is_active":true},
      {"module_key":"claims_note_module","module_type":"Communication","module_name":"ClaimsNoteModule","module_purpose":"Claims-specific billing notes.","sort_order":134,"is_active":true},
      {"module_key":"payment_note_module","module_type":"Communication","module_name":"PaymentNoteModule","module_purpose":"Payment posting notes.","sort_order":135,"is_active":true},
      {"module_key":"admin_note_module","module_type":"Communication","module_name":"AdminNoteModule","module_purpose":"Internal administrative notes.","sort_order":136,"is_active":true},
      {"module_key":"communication_log_module","module_type":"Communication","module_name":"CommunicationLogModule","module_purpose":"Phone, email, fax, portal, mail, payer calls.","sort_order":137,"is_active":true},
      {"module_key":"clients_message_module","module_type":"Communication","module_name":"ClientsMessageModule","module_purpose":"Clients portal/app messages.","sort_order":138,"is_active":true},
      {"module_key":"message_thread_module","module_type":"Communication","module_name":"MessageThreadModule","module_purpose":"Groups message conversations.","sort_order":139,"is_active":true},
      {"module_key":"followup_task_module","module_type":"Communication","module_name":"FollowupTaskModule","module_purpose":"Creates follow-up tasks from communication logs.","sort_order":140,"is_active":true},
      {"module_key":"providers_module","module_type":"Providers","module_name":"ProvidersModule","module_purpose":"Providers proFiles and status.","sort_order":141,"is_active":true},
      {"module_key":"providers_identifier_module","module_type":"Providers","module_name":"ProvidersIdentifierModule","module_purpose":"NPI, taxonomy, Medicaid ID, payer IDs, PTAN, etc.","sort_order":142,"is_active":true},
      {"module_key":"providers_license_module","module_type":"Providers","module_name":"ProvidersLicenseModule","module_purpose":"Licenses and expiration tracking.","sort_order":143,"is_active":true},
      {"module_key":"providers_credential_module","module_type":"Providers","module_name":"ProvidersCredentialModule","module_purpose":"LPC, LCSW, LAC, PMHNP, psychologist, peer specialist, etc.","sort_order":144,"is_active":true},
      {"module_key":"providers_payer_enrollment_module","module_type":"Providers","module_name":"ProvidersPayerEnrollmentModule","module_purpose":"Credentialing/enrollment status by payer.","sort_order":145,"is_active":true},
      {"module_key":"providers_payers_module","module_type":"Providers","module_name":"ProvidersPayersModule","module_purpose":"Participating/non-participating status and Payers linkage.","sort_order":146,"is_active":true},
      {"module_key":"supervision_module","module_type":"Providers","module_name":"SupervisionModule","module_purpose":"Supervisory relationships when required.","sort_order":147,"is_active":true},
      {"module_key":"credentialing_workqueues_module","module_type":"Providers","module_name":"CredentialingWorkqueuesModule","module_purpose":"Credentialing issues and expiring enrollment tasks.","sort_order":148,"is_active":true},
      {"module_key":"payer_module","module_type":"Payers","module_name":"PayerModule","module_purpose":"Payer master records.","sort_order":149,"is_active":true},
      {"module_key":"payer_plan_module","module_type":"Payers","module_name":"PayerPlanModule","module_purpose":"Plan-level details.","sort_order":150,"is_active":true},
      {"module_key":"payer_alias_module","module_type":"Payers","module_name":"PayerAliasModule","module_purpose":"Normalizes payer name variations from ERAs/Imports.","sort_order":151,"is_active":true},
      {"module_key":"payer_rule_module","module_type":"Payers","module_name":"PayerRuleModule","module_purpose":"Payer-specific billing, coding, submission, and auth rules.","sort_order":152,"is_active":true},
      {"module_key":"payers_module","module_type":"Payers","module_name":"PayersModule","module_purpose":"Payer Payers.","sort_order":153,"is_active":true},
      {"module_key":"fee_schedule_module","module_type":"Payers","module_name":"FeeScheduleModule","module_purpose":"Fee schedule headers and CPT-level rates.","sort_order":154,"is_active":true},
      {"module_key":"expected_reimbursement_module","module_type":"Payers","module_name":"ExpectedReimbursementModule","module_purpose":"Calculates expected allowed/payment amount.","sort_order":155,"is_active":true},
      {"module_key":"payers_variance_module","module_type":"Payers","module_name":"PayersVarianceModule","module_purpose":"Detects underpayments and Overpayments.","sort_order":156,"is_active":true},
      {"module_key":"cpt_code_module","module_type":"Coding","module_name":"CptCodeModule","module_purpose":"CPT/HCPCS reference.","sort_order":157,"is_active":true},
      {"module_key":"diagnosis_code_module","module_type":"Coding","module_name":"DiagnosisCodeModule","module_purpose":"ICD-10 reference.","sort_order":158,"is_active":true},
      {"module_key":"modifier_module","module_type":"Coding","module_name":"ModifierModule","module_purpose":"Modifier reference.","sort_order":159,"is_active":true},
      {"module_key":"place_of_service_module","module_type":"Coding","module_name":"PlaceOfServiceModule","module_purpose":"POS code reference.","sort_order":160,"is_active":true},
      {"module_key":"taxonomy_module","module_type":"Coding","module_name":"TaxonomyModule","module_purpose":"Taxonomy code reference.","sort_order":161,"is_active":true},
      {"module_key":"coding_rule_module","module_type":"Coding","module_name":"CodingRuleModule","module_purpose":"CPT/modifier/POS/Providers compatibility rules.","sort_order":162,"is_active":true},
      {"module_key":"payer_coding_rule_module","module_type":"Coding","module_name":"PayerCodingRuleModule","module_purpose":"Payer-specific code rules.","sort_order":163,"is_active":true},
      {"module_key":"ncci_edit_module","module_type":"Coding","module_name":"NcciEditModule","module_purpose":"Optional NCCI edit validation.","sort_order":164,"is_active":true},
      {"module_key":"medicaid_behavioral_health_rule_module","module_type":"Coding","module_name":"MedicaidBehavioralHealthRuleModule","module_purpose":"Colorado Medicaid behavioral health-specific billing rules.","sort_order":165,"is_active":true},
      {"module_key":"dashboard_module","module_type":"Reporting","module_name":"DashboardModule","module_purpose":"High-level operational dashboard.","sort_order":166,"is_active":true},
      {"module_key":"daily_flash_module","module_type":"Reporting","module_name":"DailyFlashModule","module_purpose":"Daily cash, Claims, AR, Denials, and Workqueues snapshot.","sort_order":167,"is_active":true},
      {"module_key":"ar_report_module","module_type":"Reporting","module_name":"ArReportModule","module_purpose":"AR aging by payer, Providers, Clients, and Claims.","sort_order":168,"is_active":true},
      {"module_key":"denials_report_module","module_type":"Reporting","module_name":"DenialsReportModule","module_purpose":"Denials analysis by category, payer, Providers, CPT, CARC.","sort_order":169,"is_active":true},
      {"module_key":"payment_report_module","module_type":"Reporting","module_name":"PaymentReportModule","module_purpose":"Payments, Adjustmentss, refunds, reversals, recoupments.","sort_order":170,"is_active":true},
      {"module_key":"claimsubmission_report_module","module_type":"Reporting","module_name":"ClaimsubmissionReportModule","module_purpose":"Submission, rejection, acceptance, and payment trends.","sort_order":171,"is_active":true},
      {"module_key":"providers_productivity_module","module_type":"Reporting","module_name":"ProvidersProductivityModule","module_purpose":"Visits, charges, reimbursement, wRVU/productivity.","sort_order":172,"is_active":true},
      {"module_key":"payer_mix_module","module_type":"Reporting","module_name":"PayerMixModule","module_purpose":"Payer mix by visits, charges, payments, AR.","sort_order":173,"is_active":true},
      {"module_key":"payers_variance_report_module","module_type":"Reporting","module_name":"PayersVarianceReportModule","module_purpose":"Expected vs actual reimbursement.","sort_order":174,"is_active":true},
      {"module_key":"clean_claims_rate_module","module_type":"Reporting","module_name":"CleanClaimsRateModule","module_purpose":"Clean Claims rate and first-pass yield.","sort_order":175,"is_active":true},
      {"module_key":"client_collection_report_module","module_type":"Reporting","module_name":"clientCollectionReportModule","module_purpose":"client AR and collection performance.","sort_order":176,"is_active":true},
      {"module_key":"imports_module","module_type":"Imports","module_name":"ImportsModule","module_purpose":"Main Imports workflow.","sort_order":177,"is_active":true},
      {"module_key":"csv_imports_module","module_type":"Imports","module_name":"CsvImportsModule","module_purpose":"CSV upload/Imports.","sort_order":178,"is_active":true},
      {"module_key":"imports_mapping_module","module_type":"Imports","module_name":"ImportsMappingModule","module_purpose":"Maps external columns to THERASSISTANT fields.","sort_order":179,"is_active":true},
      {"module_key":"imports_validation_module","module_type":"Imports","module_name":"ImportsValidationModule","module_purpose":"Validates Importsed rows before commit.","sort_order":180,"is_active":true},
      {"module_key":"imports_commit_module","module_type":"Imports","module_name":"ImportsCommitModule","module_purpose":"Commits validated Imports batches.","sort_order":181,"is_active":true},
      {"module_key":"imports_rollback_module","module_type":"Imports","module_name":"ImportsRollbackModule","module_purpose":"Rolls back uncommitted or failed Imports.","sort_order":182,"is_active":true},
      {"module_key":"legacy_record_link_module","module_type":"Imports","module_name":"LegacyRecordLinkModule","module_purpose":"Maps prior-system IDs to THERASSISTANT records.","sort_order":183,"is_active":true},
      {"module_key":"duplicate_detection_module","module_type":"Imports","module_name":"DuplicateDetectionModule","module_purpose":"Finds duplicate Clients, Claims, payments, and payers.","sort_order":184,"is_active":true},
      {"module_key":"integrations_connection_module","module_type":"Integrations","module_name":"IntegrationsConnectionModule","module_purpose":"Stores external connection setup.","sort_order":185,"is_active":true},
      {"module_key":"clearinghouse_integrations_module","module_type":"Integrations","module_name":"ClearinghouseIntegrationsModule","module_purpose":"837/835/276/277 clearinghouse connection.","sort_order":186,"is_active":true},
      {"module_key":"availity_integrations_module","module_type":"Integrations","module_name":"AvailityIntegrationsModule","module_purpose":"Eligibility, Claims status, payer portal references if supported.","sort_order":187,"is_active":true},
      {"module_key":"payment_processor_module","module_type":"Integrations","module_name":"PaymentProcessorModule","module_purpose":"Stripe or other client payment processor.","sort_order":188,"is_active":true},
      {"module_key":"google_calendar_integrations_module","module_type":"Integrations","module_name":"GoogleCalendarIntegrationsModule","module_purpose":"Optional calendar sync.","sort_order":189,"is_active":true},
      {"module_key":"gmail_integrations_module","module_type":"Integrations","module_name":"GmailIntegrationsModule","module_purpose":"Optional user-scoped Gmail connection.","sort_order":190,"is_active":true},
      {"module_key":"filestorage_module","module_type":"Integrations","module_name":"FilestorageModule","module_purpose":"Supabase Storage or external document storage.","sort_order":191,"is_active":true},
      {"module_key":"webhook_module","module_type":"Integrations","module_name":"WebhookModule","module_purpose":"Incoming/outgoing webhook tracking.","sort_order":192,"is_active":true},
      {"module_key":"sync_job_module","module_type":"Integrations","module_name":"SyncJobModule","module_purpose":"Sync job status, failures, retries, and logs.","sort_order":193,"is_active":true},
      {"module_key":"external_mapping_module","module_type":"Integrations","module_name":"ExternalMappingModule","module_purpose":"External IDs mapped to internal records.","sort_order":194,"is_active":true},
      {"module_key":"notifications_module","module_type":"Notifications","module_name":"NotificationsModule","module_purpose":"In-app Notifications.","sort_order":195,"is_active":true},
      {"module_key":"notifications_preference_module","module_type":"Notifications","module_name":"NotificationsPreferenceModule","module_purpose":"User Notifications settings.","sort_order":196,"is_active":true},
      {"module_key":"notifications_delivery_module","module_type":"Notifications","module_name":"NotificationsDeliveryModule","module_purpose":"Email/SMS/push/in-app delivery tracking.","sort_order":197,"is_active":true},
      {"module_key":"notifications_template_module","module_type":"Notifications","module_name":"NotificationsTemplateModule","module_purpose":"Reusable alert templates.","sort_order":198,"is_active":true},
      {"module_key":"alert_routing_module","module_type":"Notifications","module_name":"AlertRoutingModule","module_purpose":"Determines who receives alerts.","sort_order":199,"is_active":true},
      {"module_key":"document_module","module_type":"Files","module_name":"DocumentModule","module_purpose":"Main document management.","sort_order":200,"is_active":true},
      {"module_key":"document_upload_module","module_type":"Files","module_name":"DocumentUploadModule","module_purpose":"Files upload handling.","sort_order":201,"is_active":true},
      {"module_key":"document_review_module","module_type":"Files","module_name":"DocumentReviewModule","module_purpose":"Review/approve/reject Files.","sort_order":202,"is_active":true},
      {"module_key":"document_linking_module","module_type":"Files","module_name":"DocumentLinkingModule","module_purpose":"Links Files to Clients, Claims, auths, appeals, EOBs.","sort_order":203,"is_active":true},
      {"module_key":"generated_document_module","module_type":"Files","module_name":"GeneratedDocumentModule","module_purpose":"Generated Collections, appeals, exports, Claims PDFs.","sort_order":204,"is_active":true},
      {"module_key":"document_retention_module","module_type":"Files","module_name":"DocumentRetentionModule","module_purpose":"Retention/archive rules.","sort_order":205,"is_active":true}
    ]$json$::jsonb) as x(
        module_key text,
        module_type text,
        module_name text,
        module_purpose text,
        sort_order integer,
        is_active boolean
    )
)
insert into public.modules (
    module_key,
    module_type,
    module_name,
    module_purpose,
    sort_order,
    is_active
)
select
    module_key,
    module_type,
    module_name,
    module_purpose,
    sort_order,
    is_active
from module_rows
on conflict (module_key) do update
set
    module_type = excluded.module_type,
    module_name = excluded.module_name,
    module_purpose = excluded.module_purpose,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active,
    updated_at = now();

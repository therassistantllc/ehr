-- THERASSISTANT EHR core enum types
-- Generated from uploaded enum workbook on 2026-06-29.
-- Notes:
-- - Type identifiers are normalized to lowercase snake_case for PostgreSQL/Supabase.
-- - Enum labels are preserved exactly from the source list.
-- - The source row with Enum_sql = 'Historical Posting' was normalized to historical_posting_enum.

set check_function_bodies = off;

-- Tenants / source: Tenants_type_enum
do $$
begin
  create type public.tenants_type_enum as enum (
    'platform',
    'Practice',
    'billing_company',
    'facility'
  );
exception
  when duplicate_object then null;
end $$;

-- Tenants / source: Tenants_status_enum
do $$
begin
  create type public.tenants_status_enum as enum (
    'active',
    'inactive',
    'suspended',
    'terminated',
    'pending_setup'
  );
exception
  when duplicate_object then null;
end $$;

-- Tenants / source: billing_company_link_status_enum
do $$
begin
  create type public.billing_company_link_status_enum as enum (
    'active',
    'inactive',
    'pending',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

-- Security / source: user_status_enum
do $$
begin
  create type public.user_status_enum as enum (
    'active',
    'inactive',
    'invited',
    'suspended',
    'terminated'
  );
exception
  when duplicate_object then null;
end $$;

-- Security / source: role_scope_enum
do $$
begin
  create type public.role_scope_enum as enum (
    'platform',
    'Tenants',
    'Practice',
    'billing_company',
    'Clients'
  );
exception
  when duplicate_object then null;
end $$;

-- Security / source: system_role_enum
do $$
begin
  create type public.system_role_enum as enum (
    'platform_admin',
    'Practice_admin',
    'billing_company_admin',
    'billing_manager',
    'biller',
    'clinician',
    'front_desk',
    'credentialing_specialist',
    'read_only',
    'Clients'
  );
exception
  when duplicate_object then null;
end $$;

-- Security / source: permission_action_enum
do $$
begin
  create type public.permission_action_enum as enum (
    'create',
    'read',
    'update',
    'delete',
    'approve',
    'submit',
    'post',
    'reverse',
    'export',
    'manage'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: Clients_status_enum
do $$
begin
  create type public.clients_status_enum as enum (
    'active',
    'inactive',
    'intake',
    'waitlist',
    'discharged',
    'deceased',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: Clients_type_enum
do $$
begin
  create type public.clients_type_enum as enum (
    'adult',
    'minor',
    'couple',
    'family',
    'group'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: relationship_type_enum
do $$
begin
  create type public.relationship_type_enum as enum (
    'self',
    'parent',
    'guardian',
    'spouse',
    'partner',
    'child',
    'sibling',
    'responsible_party',
    'emergency_contact',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: contact_type_enum
do $$
begin
  create type public.contact_type_enum as enum (
    'primary',
    'emergency',
    'guardian',
    'responsible_party',
    'billing',
    'authorized_representative',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: address_type_enum
do $$
begin
  create type public.address_type_enum as enum (
    'home',
    'mailing',
    'billing',
    'service_location',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: phone_type_enum
do $$
begin
  create type public.phone_type_enum as enum (
    'mobile',
    'home',
    'work',
    'fax',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: email_type_enum
do $$
begin
  create type public.email_type_enum as enum (
    'personal',
    'work',
    'billing',
    'portal',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Clients / source: communication_preference_enum
do $$
begin
  create type public.communication_preference_enum as enum (
    'portal',
    'email',
    'phone',
    'sms',
    'mail',
    'none'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_policy_status_enum
do $$
begin
  create type public.payers_policy_status_enum as enum (
    'active',
    'inactive',
    'pending_verification',
    'terminated',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_order_enum
do $$
begin
  create type public.payers_order_enum as enum (
    'primary',
    'secondary',
    'tertiary',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_relationship_enum
do $$
begin
  create type public.payers_relationship_enum as enum (
    'self',
    'spouse',
    'child',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: eligibility_status_enum
do $$
begin
  create type public.eligibility_status_enum as enum (
    'active',
    'inactive',
    'eligible',
    'ineligible',
    'coverage_terminated',
    'unable_to_verify',
    'pending',
    'error'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: benefit_type_enum
do $$
begin
  create type public.benefit_type_enum as enum (
    'copay',
    'coPayers',
    'deductible',
    'out_of_pocket',
    'visit_limit',
    'authorization_required',
    'non_covered',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: network_status_enum
do $$
begin
  create type public.network_status_enum as enum (
    'in_network',
    'out_of_network',
    'unknown',
    'not_applicable'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: benefit_level_enum
do $$
begin
  create type public.benefit_level_enum as enum (
    'individual',
    'family',
    'embedded',
    'non_embedded',
    'not_applicable'
  );
exception
  when duplicate_object then null;
end $$;

-- Appointments / source: Appointments_status_enum
do $$
begin
  create type public.appointments_status_enum as enum (
    'scheduled',
    'confirmed',
    'Clients_on_my_way',
    'Clients_arrived',
    'checked_in',
    'in_session',
    'completed',
    'cancelled',
    'no_show',
    'late_cancel',
    'rescheduled'
  );
exception
  when duplicate_object then null;
end $$;

-- Appointments / source: Appointments_type_enum
do $$
begin
  create type public.appointments_type_enum as enum (
    'individual_therapy',
    'family_therapy',
    'couples_therapy',
    'group_therapy',
    'MH assessment',
    'SUD assessment',
    'treatment_planning',
    'case_management',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Appointments / source: Appointments_location_type_enum
do $$
begin
  create type public.appointments_location_type_enum as enum (
    'in_person',
    'telehealth',
    'phone',
    'community',
    'home',
    'school',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Appointments / source: checkin_status_enum
do $$
begin
  create type public.checkin_status_enum as enum (
    'not_started',
    'on_my_way',
    'arrived',
    'questions_started',
    'questions_completed',
    'checked_in',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- Appointments / source: recurrence_frequency_enum
do $$
begin
  create type public.recurrence_frequency_enum as enum (
    'none',
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'custom'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: clinical_note_status_enum
do $$
begin
  create type public.clinical_note_status_enum as enum (
    'draft',
    'in_progress',
    'ready_for_signature',
    'signed',
    'locked',
    'amended',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: clinical_note_type_enum
do $$
begin
  create type public.clinical_note_type_enum as enum (
    'psychotherapy',
    'assessment',
    'intake',
    'treatment_plan',
    'treatment_plan_review',
    'crisis',
    'case_management',
    'group',
    'collateral',
    'peer_support',
    'medication_management',
    'administrative',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: signature_status_enum
do $$
begin
  create type public.signature_status_enum as enum (
    'unsigned',
    'signed',
    'cosigned',
    'rejected',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: treatment_plan_status_enum
do $$
begin
  create type public.treatment_plan_status_enum as enum (
    'draft',
    'active',
    'under_review',
    'expired',
    'discontinued',
    'superseded',
    'signed'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: goal_status_enum
do $$
begin
  create type public.goal_status_enum as enum (
    'active',
    'met',
    'partially_met',
    'not_met',
    'discontinued',
    'deferred'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: diagnosis_status_enum
do $$
begin
  create type public.diagnosis_status_enum as enum (
    'active',
    'rule_out',
    'resolved',
    'inactive',
    'entered_in_error'
  );
exception
  when duplicate_object then null;
end $$;

-- Documentation / source: assessment_status_enum
do $$
begin
  create type public.assessment_status_enum as enum (
    'not_started',
    'in_progress',
    'completed',
    'signed',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Charges / source: charge_status_enum
do $$
begin
  create type public.charge_status_enum as enum (
    'captured',
    'ready_for_Claims',
    'Claims_created',
    'blocked',
    'voided',
    'client_responsibility'
  );
exception
  when duplicate_object then null;
end $$;

-- Charges / source: charge_source_enum
do $$
begin
  create type public.charge_source_enum as enum (
    'Appointments',
    'clinical_note',
    'manual_entry',
    'Imports',
    'historical'
  );
exception
  when duplicate_object then null;
end $$;

-- Charges / source: charge_block_reason_enum
do $$
begin
  create type public.charge_block_reason_enum as enum (
    'missing_diagnosis',
    'missing_Providers',
    'missing_payer',
    'missing_authorization',
    'missing_eligibility',
    'missing_cpt',
    'invalid_pos',
    'Providers_not_enrolled',
    'Clients_not_active',
    'note_unsigned',
    'duplicate_charge',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_status_enum
do $$
begin
  create type public.claims_status_enum as enum (
    'ready_for_validation',
    'validation_failed',
    'ready_for_batch',
    'batched',
    'submitted',
    'accepted',
    'rejected',
    'denied',
    'partially_paid',
    'paid',
    'appealed',
    'corrected',
    'voided',
    'reversed',
    'client_responsibility'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_type_enum
do $$
begin
  create type public.claims_type_enum as enum (
    'professional'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_frequency_code_enum
do $$
begin
  create type public.claims_frequency_code_enum as enum (
    'original',
    'corrected',
    'replacement',
    'void'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_submission_method_enum
do $$
begin
  create type public.claims_submission_method_enum as enum (
    'electronic_837',
    'payer_portal',
    'paper',
    'clearinghouse',
    'manual',
    'Imports'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_validation_status_enum
do $$
begin
  create type public.claims_validation_status_enum as enum (
    'not_validated',
    'passed',
    'failed',
    'warning'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_rejection_source_enum
do $$
begin
  create type public.claims_rejection_source_enum as enum (
    'clearinghouse',
    'payer',
    'system_validation',
    'manual_review'
  );
exception
  when duplicate_object then null;
end $$;

-- Claims / source: Claims_balance_status_enum
do $$
begin
  create type public.claims_balance_status_enum as enum (
    'open',
    'payer_balance',
    'client_balance',
    'credit_balance',
    'zero_balance',
    'overpaid'
  );
exception
  when duplicate_object then null;
end $$;

-- Batches / source: Claims_batch_status_enum
do $$
begin
  create type public.claims_batch_status_enum as enum (
    'created',
    'validating',
    'ready',
    'downloaded',
    'submitted',
    'accepted',
    'rejected',
    'partially_accepted',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Batches / source: submission_status_enum
do $$
begin
  create type public.submission_status_enum as enum (
    'created',
    'submitted',
    'accepted',
    'rejected',
    'failed',
    'pending_response',
    'resubmitted',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- Batches / source: submission_Files_type_enum
do $$
begin
  create type public.submission_files_type_enum as enum (
    '837p',
    'cms1500_pdf',
    'attachment',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Batches / source: payer_response_status_enum
do $$
begin
  create type public.payer_response_status_enum as enum (
    'accepted',
    'rejected',
    'pending',
    'paid',
    'denied',
    'not_found',
    'in_process',
    'needs_information'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_status_enum
do $$
begin
  create type public.payment_status_enum as enum (
    'pending',
    'posted',
    'partially_applied',
    'unapplied',
    'reversed',
    'voided',
    'refunded'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_source_enum
do $$
begin
  create type public.payment_source_enum as enum (
    'Payers',
    'client',
    'third_party',
    'historical',
    'transfer',
    'refund',
    'Adjustments',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_method_enum
do $$
begin
  create type public.payment_method_enum as enum (
    'eft',
    'ach',
    'check',
    'credit_card',
    'debit_card',
    'cash',
    'money_order',
    'portal',
    'manual',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_posting_source_enum
do $$
begin
  create type public.payment_posting_source_enum as enum (
    'era_835',
    'manual_eob',
    'client_payment',
    'historical_Imports',
    'manual_entry',
    'stripe',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_allocation_target_enum
do $$
begin
  create type public.payment_allocation_target_enum as enum (
    'Claims',
    'Claims_line',
    'Clients_balance',
    'Accounting_account',
    'historical_transaction',
    'unapplied'
  );
exception
  when duplicate_object then null;
end $$;

-- Payment Posting / source: payment_reversal_reason_enum
do $$
begin
  create type public.payment_reversal_reason_enum as enum (
    'posted_in_error',
    'duplicate_payment',
    'wrong_Clients',
    'wrong_Claims',
    'payer_recoupment',
    'refund_issued',
    'chargeback',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Adjustments / source: Adjustments_status_enum
do $$
begin
  create type public.adjustments_status_enum as enum (
    'pending',
    'posted',
    'reversed',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Adjustments / source: Adjustments_type_enum
do $$
begin
  create type public.adjustments_type_enum as enum (
    'Payersual',
    'payer_writeoff',
    'client_writeoff',
    'credentialing_writeoff',
    'timely_filing_writeoff',
    'bad_debt',
    'refund_correction',
    'balance_correction',
    'recoupment',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Adjustments / source: Adjustments_group_code_enum
do $$
begin
  create type public.adjustments_group_code_enum as enum (
    'CO',
    'PR',
    'OA',
    'PI'
  );
exception
  when duplicate_object then null;
end $$;

-- Adjustments / source: writeoff_reason_enum
do $$
begin
  create type public.writeoff_reason_enum as enum (
    'Payersual_obligation',
    'credentialing_issue',
    'Payers_issue',
    'timely_filing',
    'non_covered_service',
    'Providers_decision',
    'hardship',
    'bad_debt',
    'small_balance',
    'billing_error',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Historical Posting / source: Historical Posting
do $$
begin
  create type public.historical_posting_enum as enum (
    'payment',
    'Adjustments',
    'opening_balance',
    'credit',
    'refund',
    'transfer',
    'correction'
  );
exception
  when duplicate_object then null;
end $$;

-- Historical Posting / source: historical_transaction_status_enum
do $$
begin
  create type public.historical_transaction_status_enum as enum (
    'draft',
    'posted',
    'linked',
    'partially_linked',
    'reversed',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Historical Posting / source: legacy_source_type_enum
do $$
begin
  create type public.legacy_source_type_enum as enum (
    'simplePractice',
    'therapy_notes',
    'excel',
    'csv',
    'manual',
    'other_ehr',
    'paper_record',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Accounting / source: Accounting_entry_type_enum
do $$
begin
  create type public.accounting_entry_type_enum as enum (
    'charge',
    'Payers_payment',
    'client_payment',
    'Adjustments',
    'writeoff',
    'refund',
    'credit',
    'transfer',
    'opening_balance',
    'reversal',
    'recoupment',
    'correction'
  );
exception
  when duplicate_object then null;
end $$;

-- Accounting / source: Accounting_account_type_enum
do $$
begin
  create type public.accounting_account_type_enum as enum (
    'asset',
    'liability',
    'revenue',
    'expense',
    'contra_revenue',
    'receivable',
    'Adjustments',
    'equity'
  );
exception
  when duplicate_object then null;
end $$;

-- Accounting / source: Accounting_side_enum
do $$
begin
  create type public.accounting_side_enum as enum (
    'debit',
    'credit'
  );
exception
  when duplicate_object then null;
end $$;

-- Accounting / source: Accounting_period_status_enum
do $$
begin
  create type public.accounting_period_status_enum as enum (
    'open',
    'closed',
    'locked',
    'reopened'
  );
exception
  when duplicate_object then null;
end $$;

-- Accounting / source: reconciliation_status_enum
do $$
begin
  create type public.reconciliation_status_enum as enum (
    'unreconciled',
    'matched',
    'partially_matched',
    'reconciled',
    'exception',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- ERA / EOB / source: era_Files_status_enum
do $$
begin
  create type public.era_files_status_enum as enum (
    'uploaded',
    'parsed',
    'matched',
    'partially_matched',
    'posted',
    'failed',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- ERA / EOB / source: era_match_status_enum
do $$
begin
  create type public.era_match_status_enum as enum (
    'unmatched',
    'matched',
    'partially_matched',
    'ambiguous',
    'posted',
    'ignored'
  );
exception
  when duplicate_object then null;
end $$;

-- ERA / EOB / source: eob_source_enum
do $$
begin
  create type public.eob_source_enum as enum (
    'era_835',
    'manual_entry',
    'payer_portal',
    'paper_eob',
    'Imports'
  );
exception
  when duplicate_object then null;
end $$;

-- ERA / EOB / source: era_payment_type_enum
do $$
begin
  create type public.era_payment_type_enum as enum (
    'check',
    'eft',
    'ach',
    'virtual_card',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: Denials_status_enum
do $$
begin
  create type public.denials_status_enum as enum (
    'new',
    'reviewing',
    'workable',
    'non_workable',
    'appealed',
    'corrected_Claims_needed',
    'reconsideration_needed',
    'resolved_paid',
    'resolved_writeoff',
    'upheld',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: Denials_category_enum
do $$
begin
  create type public.denials_category_enum as enum (
    'eligibility',
    'authorization',
    'credentialing',
    'Payersing',
    'coding',
    'documentation',
    'timely_filing',
    'medical_necessity',
    'coordination_of_benefits',
    'duplicate',
    'benefit_limit',
    'client_responsibility',
    'payer_processing_error',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: Denials_workability_enum
do $$
begin
  create type public.denials_workability_enum as enum (
    'workable',
    'non_workable',
    'needs_review',
    'auto_writeoff'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: appeal_status_enum
do $$
begin
  create type public.appeal_status_enum as enum (
    'not_started',
    'drafting',
    'submitted',
    'pending',
    'approved',
    'denied',
    'partially_approved',
    'withdrawn',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: appeal_level_enum
do $$
begin
  create type public.appeal_level_enum as enum (
    'first_level',
    'second_level',
    'external_review',
    'state_fair_hearing',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: appeal_outcome_enum
do $$
begin
  create type public.appeal_outcome_enum as enum (
    'overturned',
    'upheld',
    'partially_overturned',
    'paid',
    'denied',
    'pending',
    'no_response',
    'withdrawn'
  );
exception
  when duplicate_object then null;
end $$;

-- Denials / source: followup_action_type_enum
do $$
begin
  create type public.followup_action_type_enum as enum (
    'corrected_Claims',
    'reconsideration',
    'appeal',
    'payer_call',
    'portal_message',
    'fax',
    'mail',
    'writeoff',
    'client_bill',
    'rebill',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Collections / source: client_responsibility_type_enum
do $$
begin
  create type public.client_responsibility_type_enum as enum (
    'copay',
    'deductible',
    'coPayers',
    'non_covered',
    'self_pay',
    'no_show_fee',
    'late_cancel_fee',
    'balance_transfer',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Collections / source: Collections_status_enum
do $$
begin
  create type public.collections_status_enum as enum (
    'draft',
    'ready',
    'sent',
    'viewed',
    'partially_paid',
    'paid',
    'voided',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- Collections / source: Collections_delivery_method_enum
do $$
begin
  create type public.collections_delivery_method_enum as enum (
    'portal',
    'email',
    'mail',
    'sms',
    'manual'
  );
exception
  when duplicate_object then null;
end $$;

-- Collections / source: payment_plan_status_enum
do $$
begin
  create type public.payment_plan_status_enum as enum (
    'active',
    'pending',
    'completed',
    'defaulted',
    'cancelled',
    'paused'
  );
exception
  when duplicate_object then null;
end $$;

-- Collections / source: collection_status_enum
do $$
begin
  create type public.collection_status_enum as enum (
    'not_started',
    'current',
    'past_due',
    'in_review',
    'payment_plan',
    'hardship',
    'collections',
    'written_off',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- Overpayments / source: credit_balance_status_enum
do $$
begin
  create type public.credit_balance_status_enum as enum (
    'open',
    'under_review',
    'approved_for_refund',
    'transferred',
    'refunded',
    'resolved',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Overpayments / source: refund_status_enum
do $$
begin
  create type public.refund_status_enum as enum (
    'requested',
    'under_review',
    'approved',
    'denied',
    'posted',
    'sent',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Overpayments / source: refund_reason_enum
do $$
begin
  create type public.refund_reason_enum as enum (
    'Overpayments',
    'duplicate_payment',
    'payer_recoupment',
    'client_request',
    'wrong_Clients',
    'wrong_Claims',
    'credit_transfer',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Overpayments / source: credit_transfer_status_enum
do $$
begin
  create type public.credit_transfer_status_enum as enum (
    'pending',
    'posted',
    'reversed',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Workqueues / source: Workqueues_status_enum
do $$
begin
  create type public.workqueues_status_enum as enum (
    'open',
    'in_progress',
    'pending',
    'snoozed',
    'completed',
    'cancelled',
    'reopened'
  );
exception
  when duplicate_object then null;
end $$;

-- Workqueues / source: Workqueues_priority_enum
do $$
begin
  create type public.workqueues_priority_enum as enum (
    'low',
    'normal',
    'high',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

-- Workqueues / source: Workqueues_source_object_type_enum
do $$
begin
  create type public.workqueues_source_object_type_enum as enum (
    'Clients',
    'Appointments',
    'charge',
    'Claims',
    'Claims_batch',
    'authorization',
    'eligibility',
    'payment',
    'Adjustments',
    'historical_transaction',
    'era',
    'Denials',
    'appeal',
    'Accounting_entry',
    'Providers',
    'payer_Payers'
  );
exception
  when duplicate_object then null;
end $$;

-- Workqueues / source: Workqueues_type_enum
do $$
begin
  create type public.workqueues_type_enum as enum (
    'eligibility_issue',
    'authorization_issue',
    'missing_documentation',
    'charge_validation',
    'Claims_validation',
    'Claims_rejection',
    'Denials_followup',
    'appeal_deadline',
    'ar_followup',
    'payment_posting_issue',
    'unmatched_era',
    'Overpayments_review',
    'credit_balance_review',
    'refund_review',
    'credentialing_issue',
    'Payers_variance',
    'client_balance_review',
    'Imports_error',
    'sync_error',
    'general_task'
  );
exception
  when duplicate_object then null;
end $$;

-- Workqueues / source: assignment_type_enum
do $$
begin
  create type public.assignment_type_enum as enum (
    'user',
    'team',
    'role',
    'unassigned'
  );
exception
  when duplicate_object then null;
end $$;

-- Communication / source: note_type_enum
do $$
begin
  create type public.note_type_enum as enum (
    'account',
    'Claims',
    'payment',
    'authorization',
    'eligibility',
    'clinical',
    'admin',
    'Workqueues',
    'general'
  );
exception
  when duplicate_object then null;
end $$;

-- Communication / source: note_visibility_enum
do $$
begin
  create type public.note_visibility_enum as enum (
    'internal',
    'Clients_visible',
    'Providers_visible',
    'billing_only',
    'admin_only'
  );
exception
  when duplicate_object then null;
end $$;

-- Communication / source: communication_type_enum
do $$
begin
  create type public.communication_type_enum as enum (
    'phone_call',
    'voicemail',
    'email',
    'portal_message',
    'sms',
    'fax',
    'mail',
    'payer_portal',
    'in_person',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Communication / source: communication_direction_enum
do $$
begin
  create type public.communication_direction_enum as enum (
    'inbound',
    'outbound',
    'internal'
  );
exception
  when duplicate_object then null;
end $$;

-- Communication / source: communication_status_enum
do $$
begin
  create type public.communication_status_enum as enum (
    'draft',
    'sent',
    'received',
    'failed',
    'logged',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Providers / source: Providers_status_enum
do $$
begin
  create type public.providers_status_enum as enum (
    'active',
    'inactive',
    'pending',
    'terminated',
    'on_leave'
  );
exception
  when duplicate_object then null;
end $$;

-- Providers / source: Providers_type_enum
do $$
begin
  create type public.providers_type_enum as enum (
    'individual',
    'group',
    'facility',
    'supervisor',
    'billing_Providers',
    'rendering_Providers'
  );
exception
  when duplicate_object then null;
end $$;

-- Providers / source: Providers_enrollment_status_enum
do $$
begin
  create type public.providers_enrollment_status_enum as enum (
    'not_started',
    'in_progress',
    'submitted',
    'approved',
    'denied',
    'terminated',
    'expired',
    'needs_revalidation',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Providers / source: license_status_enum
do $$
begin
  create type public.license_status_enum as enum (
    'active',
    'expired',
    'pending',
    'suspended',
    'revoked',
    'inactive'
  );
exception
  when duplicate_object then null;
end $$;

-- Providers / source: Payers_participation_status_enum
do $$
begin
  create type public.payers_participation_status_enum as enum (
    'participating',
    'non_participating',
    'pending',
    'terminated',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_status_enum
do $$
begin
  create type public.payers_status_enum as enum (
    'draft',
    'active',
    'pending',
    'expired',
    'terminated',
    'superseded'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: rate_type_enum
do $$
begin
  create type public.rate_type_enum as enum (
    'flat_rate',
    'percent_of_allowed',
    'percent_of_medicare',
    'case_rate',
    'per_diem',
    'hourly',
    'unit_based',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_variance_status_enum
do $$
begin
  create type public.payers_variance_status_enum as enum (
    'not_reviewed',
    'under_review',
    'confirmed_underpayment',
    'confirmed_Overpayments',
    'resolved',
    'written_off',
    'closed'
  );
exception
  when duplicate_object then null;
end $$;

-- Payers / source: Payers_variance_type_enum
do $$
begin
  create type public.payers_variance_type_enum as enum (
    'underpayment',
    'Overpayments',
    'wrong_fee_schedule',
    'wrong_modifier',
    'wrong_Providers_Payers',
    'payer_error',
    'system_error',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Imports / source: Imports_status_enum
do $$
begin
  create type public.imports_status_enum as enum (
    'uploaded',
    'mapping',
    'validating',
    'validated',
    'failed_validation',
    'committed',
    'rolled_back',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- Imports / source: Imports_row_status_enum
do $$
begin
  create type public.imports_row_status_enum as enum (
    'pending',
    'valid',
    'invalid',
    'warning',
    'Importsed',
    'skipped',
    'failed'
  );
exception
  when duplicate_object then null;
end $$;

-- Imports / source: Imports_entity_type_enum
do $$
begin
  create type public.imports_entity_type_enum as enum (
    'Clients',
    'Payers',
    'Providers',
    'Appointments',
    'Claims',
    'payment',
    'Adjustments',
    'Accounting',
    'authorization',
    'document',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Imports / source: validation_severity_enum
do $$
begin
  create type public.validation_severity_enum as enum (
    'info',
    'warning',
    'error',
    'critical'
  );
exception
  when duplicate_object then null;
end $$;

-- Integrations / source: Integrations_type_enum
do $$
begin
  create type public.integrations_type_enum as enum (
    'clearinghouse',
    'payer_portal',
    'calendar',
    'email',
    'payment_processor',
    'document_storage',
    'ehr_Imports',
    'sms',
    'analytics',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Integrations / source: Integrations_status_enum
do $$
begin
  create type public.integrations_status_enum as enum (
    'active',
    'inactive',
    'error',
    'expired',
    'pending_setup',
    'revoked'
  );
exception
  when duplicate_object then null;
end $$;

-- Integrations / source: sync_job_status_enum
do $$
begin
  create type public.sync_job_status_enum as enum (
    'queued',
    'running',
    'completed',
    'failed',
    'cancelled',
    'partial_success'
  );
exception
  when duplicate_object then null;
end $$;

-- Integrations / source: webhook_status_enum
do $$
begin
  create type public.webhook_status_enum as enum (
    'received',
    'processed',
    'failed',
    'ignored',
    'duplicate'
  );
exception
  when duplicate_object then null;
end $$;

-- Notifications / source: Notifications_type_enum
do $$
begin
  create type public.notifications_type_enum as enum (
    'Workqueues_assignment',
    'Claims_rejected',
    'Claims_denied',
    'payment_posted',
    'Clients_checked_in',
    'missing_documentation',
    'authorization_expiring',
    'authorization_exhausted',
    'appeal_deadline',
    'credit_balance',
    'refund_request',
    'system_alert',
    'general'
  );
exception
  when duplicate_object then null;
end $$;

-- Notifications / source: Notifications_status_enum
do $$
begin
  create type public.notifications_status_enum as enum (
    'unread',
    'read',
    'dismissed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Notifications / source: Notifications_channel_enum
do $$
begin
  create type public.notifications_channel_enum as enum (
    'in_app',
    'email',
    'sms',
    'push'
  );
exception
  when duplicate_object then null;
end $$;

-- Notifications / source: delivery_status_enum
do $$
begin
  create type public.delivery_status_enum as enum (
    'pending',
    'sent',
    'delivered',
    'failed',
    'bounced',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- Files / source: document_type_enum
do $$
begin
  create type public.document_type_enum as enum (
    'Payers_card',
    'intake_form',
    'consent_form',
    'clinical_note',
    'treatment_plan',
    'assessment',
    'authorization_letter',
    'eob',
    'era',
    'appeal_letter',
    'payer_correspondence',
    'Clients_correspondence',
    'Claims_attachment',
    'invoice',
    'Collections',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

-- Files / source: document_status_enum
do $$
begin
  create type public.document_status_enum as enum (
    'uploaded',
    'pending_review',
    'approved',
    'rejected',
    'archived',
    'voided'
  );
exception
  when duplicate_object then null;
end $$;

-- Files / source: Files_source_enum
do $$
begin
  create type public.files_source_enum as enum (
    'upload',
    'Imports',
    'generated',
    'Integrations',
    'scan',
    'manual'
  );
exception
  when duplicate_object then null;
end $$;

-- System / source: record_status_enum
do $$
begin
  create type public.record_status_enum as enum (
    'active',
    'inactive',
    'archived',
    'deleted'
  );
exception
  when duplicate_object then null;
end $$;

-- System / source: task_status_enum
do $$
begin
  create type public.task_status_enum as enum (
    'open',
    'in_progress',
    'pending',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- System / source: yes_no_unknown_enum
do $$
begin
  create type public.yes_no_unknown_enum as enum (
    'yes',
    'no',
    'unknown'
  );
exception
  when duplicate_object then null;
end $$;

-- System / source: gender_identity_enum
do $$
begin
  create type public.gender_identity_enum as enum (
    'female',
    'male',
    'nonbinary',
    'transgender_female',
    'transgender_male',
    'genderqueer',
    'other',
    'unknown',
    'declined'
  );
exception
  when duplicate_object then null;
end $$;

-- System / source: marital_status_enum
do $$
begin
  create type public.marital_status_enum as enum (
    'single',
    'married',
    'divorced',
    'widowed',
    'separated',
    'partnered',
    'unknown',
    'declined'
  );
exception
  when duplicate_object then null;
end $$;

-- Pre-Session Dashboard / source: pre_session_response_status_enum
do $$
begin
  create type public.pre_session_response_status_enum as enum (
    'draft',
    'sent',
    'opened',
    'submitted',
    'skipped',
    'expired',
    'reviewed',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Pre-Session Dashboard / source: pre_session_goal_update_status_enum
do $$
begin
  create type public.pre_session_goal_update_status_enum as enum (
    'pending',
    'approved',
    'rejected',
    'merged',
    'discuss_first',
    'archived'
  );
exception
  when duplicate_object then null;
end $$;

-- Pre-Session Dashboard / source: pre_session_goal_update_action_enum
do $$
begin
  create type public.pre_session_goal_update_action_enum as enum (
    'progress_update',
    'request_goal_change',
    'request_goal_completion',
    'request_goal_discontinue',
    'general_comment'
  );
exception
  when duplicate_object then null;
end $$;

-- Pre-Session Dashboard / source: pre_session_safety_flag_enum
do $$
begin
  create type public.pre_session_safety_flag_enum as enum (
    'none',
    'concern',
    'elevated',
    'urgent'
  );
exception
  when duplicate_object then null;
end $$;

-- Pre-Session Dashboard / source: pre_session_safety_review_status_enum
do $$
begin
  create type public.pre_session_safety_review_status_enum as enum (
    'pending_review',
    'reviewed',
    'escalated',
    'resolved',
    'dismissed'
  );
exception
  when duplicate_object then null;
end $$;

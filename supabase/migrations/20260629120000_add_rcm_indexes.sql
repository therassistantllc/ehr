-- THERASSISTANT EHR RCM index migration
-- Generated from the index inventory pasted on 2026-06-29.
--
-- This migration is defensive: it creates each index only when the target
-- table and listed columns already exist in public. It resolves exact
-- identifier names first, then lower-case names, so it can work with either
-- quoted/Pascal-style names from the design workbook or conventional
-- lowercase Supabase table names.
--
-- Template rows from the pasted inventory are intentionally not executed:
--   - Universal: idx_<table>_Tenants_id ON Most Tenants tables (Tenants_id) -- template/non-concrete table; Fast Tenants filtering.
--   - Universal: idx_<table>_Tenants_created_at ON Most Tenants tables (Tenants_id, created_at DESC) -- template/non-concrete table; Fast recent-record views.
--   - Universal: idx_<table>_Tenants_status ON Status tables (Tenants_id, status) -- template/non-concrete table; Fast status filtering.
--   - Universal: idx_<table>_Tenants_deleted_at ON Soft-delete tables (Tenants_id, deleted_at) -- template/non-concrete table; Fast active/deleted filtering.
--   - Files: idx_Clients_Files_Clients ON Clients_Files (Clients_id, created_at DESC) -- duplicate index name already included; Clients Files.
--   - Files: idx_Files_storage_path ON Document tables (storage_path) -- template/non-concrete table; Supabase storage lookup.

set search_path = public;

create or replace function public.therassistant_resolve_relation(p_table_name text)
returns regclass
language plpgsql
as $$
declare
  v_relation regclass;
begin
  select format('%I.%I', n.nspname, c.relname)::regclass
    into v_relation
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and (c.relname = p_table_name or c.relname = lower(p_table_name))
  order by (c.relname = p_table_name) desc, c.relname
  limit 1;

  return v_relation;
end;
$$;

create or replace function public.therassistant_resolve_column(
  p_relation regclass,
  p_column_name text
)
returns text
language plpgsql
as $$
declare
  v_column text;
begin
  select a.attname
    into v_column
  from pg_attribute a
  where a.attrelid = p_relation
    and a.attnum > 0
    and not a.attisdropped
    and (a.attname = p_column_name or a.attname = lower(p_column_name))
  order by (a.attname = p_column_name) desc, a.attname
  limit 1;

  return v_column;
end;
$$;

create or replace function public.therassistant_create_index_if_ready(
  p_index_name text,
  p_table_name text,
  p_column_specs text[],
  p_where_boolean_column text default null
)
returns void
language plpgsql
as $$
declare
  v_relation regclass;
  v_spec text;
  v_base_column text;
  v_order_clause text;
  v_resolved_column text;
  v_column_sql text[] := array[]::text[];
  v_where_column text;
  v_where_sql text := '';
  v_match text[];
begin
  v_relation := public.therassistant_resolve_relation(p_table_name);

  if v_relation is null then
    raise notice 'Skipping index %, missing table %', p_index_name, p_table_name;
    return;
  end if;

  foreach v_spec in array p_column_specs loop
    v_spec := btrim(v_spec);
    v_match := regexp_match(v_spec, '^(.+?)\s+(ASC|DESC)(?:\s+NULLS\s+(FIRST|LAST))?$', 'i');

    if v_match is null then
      v_base_column := v_spec;
      v_order_clause := '';
    else
      v_base_column := btrim(v_match[1]);
      v_order_clause := ' ' || upper(v_match[2]) || coalesce(' NULLS ' || upper(v_match[3]), '');
    end if;

    v_resolved_column := public.therassistant_resolve_column(v_relation, v_base_column);

    if v_resolved_column is null then
      raise notice 'Skipping index %, missing column %.%', p_index_name, p_table_name, v_base_column;
      return;
    end if;

    v_column_sql := array_append(v_column_sql, format('%I%s', v_resolved_column, v_order_clause));
  end loop;

  if p_where_boolean_column is not null then
    v_where_column := public.therassistant_resolve_column(v_relation, p_where_boolean_column);

    if v_where_column is null then
      raise notice 'Skipping index %, missing partial-index column %.%', p_index_name, p_table_name, p_where_boolean_column;
      return;
    end if;

    v_where_sql := format(' WHERE %I = true', v_where_column);
  end if;

  execute format(
    'CREATE INDEX IF NOT EXISTS %I ON %s (%s)%s',
    lower(p_index_name),
    v_relation,
    array_to_string(v_column_sql, ', '),
    v_where_sql
  );
end;
$$;


-- Tenants
-- Find users in a Tenants.
select public.therassistant_create_index_if_ready('idx_Tenants_users_Tenants_id', 'Tenants_users', array['Tenants_id'], null);
-- Find Tenants for a user.
select public.therassistant_create_index_if_ready('idx_Tenants_users_user_id', 'Tenants_users', array['user_id'], null);
-- Fast access checks.
select public.therassistant_create_index_if_ready('idx_Tenants_users_Tenants_user', 'Tenants_users', array['Tenants_id', 'user_id'], null);
-- Active Tenants membership.
select public.therassistant_create_index_if_ready('idx_Tenants_users_active', 'Tenants_users', array['Tenants_id', 'user_id'], 'active');
-- Find user roles.
select public.therassistant_create_index_if_ready('idx_Tenants_user_roles_user', 'Tenants_user_roles', array['Tenants_user_id'], null);
-- Find users by role.
select public.therassistant_create_index_if_ready('idx_Tenants_user_roles_role', 'Tenants_user_roles', array['Tenants_id', 'role_id'], null);
-- Resolve permissions.
select public.therassistant_create_index_if_ready('idx_role_permissions_role', 'role_permissions', array['role_id'], null);
-- Permission lookup.
select public.therassistant_create_index_if_ready('idx_role_permissions_permission', 'role_permissions', array['permission_id'], null);
-- Find billing company for Practice.
select public.therassistant_create_index_if_ready('idx_billing_company_links_Practice', 'billing_company_Practice_links', array['Practice_Tenants_id'], null);
-- Find linked Practices.
select public.therassistant_create_index_if_ready('idx_billing_company_links_billing_company', 'billing_company_Practice_links', array['billing_company_Tenants_id'], null);
-- Cross-Tenants access checks.
select public.therassistant_create_index_if_ready('idx_billing_company_links_active', 'billing_company_Practice_links', array['billing_company_Tenants_id', 'Practice_Tenants_id'], 'active');

-- Audits
-- Show record Audits trail.
select public.therassistant_create_index_if_ready('idx_Audits_logs_target', 'Audits_logs', array['target_type', 'target_id'], null);
-- Tenants Audits history.
select public.therassistant_create_index_if_ready('idx_Audits_logs_Tenants_created', 'Audits_logs', array['Tenants_id', 'created_at DESC'], null);
-- User activity review.
select public.therassistant_create_index_if_ready('idx_Audits_logs_actor', 'Audits_logs', array['actor_id', 'created_at DESC'], null);
-- Filter by action.
select public.therassistant_create_index_if_ready('idx_Audits_logs_action', 'Audits_logs', array['Tenants_id', 'action'], null);
-- Status timeline.
select public.therassistant_create_index_if_ready('idx_status_history_target', 'status_history', array['target_type', 'target_id'], null);
-- Reporting/status Audits.
select public.therassistant_create_index_if_ready('idx_status_history_Tenants_created', 'status_history', array['Tenants_id', 'created_at DESC'], null);
-- Clients PHI access trail.
select public.therassistant_create_index_if_ready('idx_phi_access_logs_Clients', 'phi_access_logs', array['Clients_id', 'accessed_at DESC'], null);
-- User PHI access review.
select public.therassistant_create_index_if_ready('idx_phi_access_logs_user', 'phi_access_logs', array['user_id', 'accessed_at DESC'], null);

-- Clients
-- Active/inactive Clients lists.
select public.therassistant_create_index_if_ready('idx_Clients_Tenants_status', 'Clients', array['Tenants_id', 'Clients_status'], null);
-- Clients search/sort.
select public.therassistant_create_index_if_ready('idx_Clients_Tenants_name', 'Clients', array['Tenants_id', 'last_name', 'first_name'], null);
-- Demographic matching.
select public.therassistant_create_index_if_ready('idx_Clients_dob', 'Clients', array['Tenants_id', 'date_of_birth'], null);
-- Imports/Integrations matching.
select public.therassistant_create_index_if_ready('idx_Clients_external_id', 'Clients_external_ids', array['external_system', 'external_id'], null);
-- Clients contact lookup.
select public.therassistant_create_index_if_ready('idx_Clients_contacts_Clients', 'Clients_contacts', array['Clients_id'], null);
-- Address lookup.
select public.therassistant_create_index_if_ready('idx_Clients_addresses_Clients', 'Clients_addresses', array['Clients_id'], null);
-- Clients document list.
select public.therassistant_create_index_if_ready('idx_Clients_Files_Clients', 'Clients_Files', array['Clients_id', 'created_at DESC'], null);

-- Payers
-- All policies for Clients.
select public.therassistant_create_index_if_ready('idx_Clients_Payers_Clients', 'Clients_Payers_policies', array['Clients_id'], null);
-- Active coverage by DOS.
select public.therassistant_create_index_if_ready('idx_Clients_Payers_active_dates', 'Clients_Payers_policies', array['Clients_id', 'effective_date', 'termination_date'], null);
-- Payer lookup.
select public.therassistant_create_index_if_ready('idx_Clients_Payers_payer', 'Clients_Payers_policies', array['payer_id'], null);
-- Primary/secondary lookup.
select public.therassistant_create_index_if_ready('idx_Clients_Payers_order', 'Clients_Payers_policies', array['Clients_id', 'Payers_order'], null);
-- Latest eligibility by DOS.
select public.therassistant_create_index_if_ready('idx_eligibility_checks_Clients_dos', 'eligibility_checks', array['Clients_id', 'service_date DESC'], null);
-- Policy eligibility history.
select public.therassistant_create_index_if_ready('idx_eligibility_checks_policy_date', 'eligibility_checks', array['Payers_policy_id', 'service_date DESC'], null);
-- Failed/pending eligibility queue.
select public.therassistant_create_index_if_ready('idx_eligibility_checks_status', 'eligibility_checks', array['Tenants_id', 'eligibility_status'], null);
-- Benefits under verification.
select public.therassistant_create_index_if_ready('idx_eligibility_benefits_check', 'eligibility_benefits', array['eligibility_check_id'], null);
-- CPT-specific benefits.
select public.therassistant_create_index_if_ready('idx_eligibility_service_details_cpt', 'eligibility_service_details', array['eligibility_check_id', 'cpt_code'], null);

-- Providers
-- Active Providers lists.
select public.therassistant_create_index_if_ready('idx_Providerss_Tenants_status', 'Providerss', array['Tenants_id', 'Providers_status'], null);
-- Providers identifiers.
select public.therassistant_create_index_if_ready('idx_Providers_identifiers_Providers', 'Providers_identifiers', array['Providers_id'], null);
-- NPI/Medicaid ID lookup.
select public.therassistant_create_index_if_ready('idx_Providers_identifiers_type_value', 'Providers_identifiers', array['identifier_type', 'identifier_value'], null);
-- License lookup.
select public.therassistant_create_index_if_ready('idx_Providers_licenses_Providers', 'Providers_licenses', array['Providers_id'], null);
-- Expiring license queue.
select public.therassistant_create_index_if_ready('idx_Providers_licenses_expiration', 'Providers_licenses', array['Tenants_id', 'expiration_date'], null);
-- Credentialing check.
select public.therassistant_create_index_if_ready('idx_Providers_payer_enrollments_Providers_payer', 'Providers_payer_enrollments', array['Providers_id', 'payer_id'], null);
-- Pending/expired enrollment queue.
select public.therassistant_create_index_if_ready('idx_Providers_payer_enrollments_status', 'Providers_payer_enrollments', array['Tenants_id', 'enrollment_status'], null);
-- Active Payers lookup.
select public.therassistant_create_index_if_ready('idx_Providers_Payers_Providers_payer_dates', 'Providers_Payers', array['Providers_id', 'payer_id', 'effective_date', 'termination_date'], null);

-- Appointments
-- Calendar date range.
select public.therassistant_create_index_if_ready('idx_Appointmentss_Tenants_start', 'Appointmentss', array['Tenants_id', 'start_time'], null);
-- Providers calendar.
select public.therassistant_create_index_if_ready('idx_Appointmentss_Providers_start', 'Appointmentss', array['Providers_id', 'start_time'], null);
-- Clients Appointments history.
select public.therassistant_create_index_if_ready('idx_Appointmentss_Clients_start', 'Appointmentss', array['Clients_id', 'start_time DESC'], null);
-- Completed/no-show/cancelled filters.
select public.therassistant_create_index_if_ready('idx_Appointmentss_status', 'Appointmentss', array['Tenants_id', 'Appointments_status'], null);
-- Providers schedule workflow.
select public.therassistant_create_index_if_ready('idx_Appointmentss_Providers_status_start', 'Appointmentss', array['Providers_id', 'Appointments_status', 'start_time'], null);
-- Services for Appointments.
select public.therassistant_create_index_if_ready('idx_Appointments_services_Appointments', 'Appointments_services', array['Appointments_id'], null);
-- Check-in lookup.
select public.therassistant_create_index_if_ready('idx_Clients_checkins_Appointments', 'Clients_checkins', array['Appointments_id'], null);
-- Checked-in/arrived/on-my-way queue.
select public.therassistant_create_index_if_ready('idx_Clients_checkins_status', 'Clients_checkins', array['Tenants_id', 'checkin_status'], null);
-- Pre-session answers.
select public.therassistant_create_index_if_ready('idx_pre_session_responses_Appointments', 'pre_session_responses', array['Appointments_id'], null);

-- Documentation
-- Clients note history.
select public.therassistant_create_index_if_ready('idx_clinical_notes_Clients', 'clinical_notes', array['Clients_id', 'service_date DESC'], null);
-- Providers documentation list.
select public.therassistant_create_index_if_ready('idx_clinical_notes_Providers', 'clinical_notes', array['Providers_id', 'service_date DESC'], null);
-- Note for Appointments.
select public.therassistant_create_index_if_ready('idx_clinical_notes_Appointments', 'clinical_notes', array['Appointments_id'], null);
-- Draft/unsigned note queue.
select public.therassistant_create_index_if_ready('idx_clinical_notes_status', 'clinical_notes', array['Tenants_id', 'clinical_note_status'], null);
-- Signature lookup.
select public.therassistant_create_index_if_ready('idx_clinical_note_signatures_note', 'clinical_note_signatures', array['clinical_note_id'], null);
-- Active Treatment Plans.
select public.therassistant_create_index_if_ready('idx_treatment_plans_Clients_status', 'treatment_plans', array['Clients_id', 'treatment_plan_status'], null);
-- Treatment Plans review queue.
select public.therassistant_create_index_if_ready('idx_treatment_plans_review_due', 'treatment_plans', array['Tenants_id', 'review_due_date'], null);
-- Active diagnoses.
select public.therassistant_create_index_if_ready('idx_Clients_diagnoses_Clients_status', 'Clients_diagnoses', array['Clients_id', 'diagnosis_status'], null);
-- Diagnosis reporting.
select public.therassistant_create_index_if_ready('idx_Clients_diagnoses_code', 'Clients_diagnoses', array['diagnosis_code'], null);
-- Assessment history.
select public.therassistant_create_index_if_ready('idx_assessment_records_Clients', 'assessment_records', array['Clients_id', 'assessment_date DESC'], null);

-- Charges
-- Charge Workqueues.
select public.therassistant_create_index_if_ready('idx_charge_capture_Tenants_status', 'charge_capture_items', array['Tenants_id', 'charge_status'], null);
-- Clients charge history.
select public.therassistant_create_index_if_ready('idx_charge_capture_Clients', 'charge_capture_items', array['Clients_id', 'service_date DESC'], null);
-- Providers charges.
select public.therassistant_create_index_if_ready('idx_charge_capture_Providers', 'charge_capture_items', array['Providers_id', 'service_date DESC'], null);
-- Prevent duplicate charge.
select public.therassistant_create_index_if_ready('idx_charge_capture_Appointments', 'charge_capture_items', array['Appointments_id'], null);
-- Reporting/date range.
select public.therassistant_create_index_if_ready('idx_charge_capture_service_date', 'charge_capture_items', array['Tenants_id', 'service_date DESC'], null);
-- Payer billing queue.
select public.therassistant_create_index_if_ready('idx_charge_capture_payer', 'charge_capture_items', array['payer_id', 'service_date DESC'], null);
-- Errors for charge.
select public.therassistant_create_index_if_ready('idx_charge_validation_errors_charge', 'charge_validation_errors', array['charge_id'], null);
-- Open validation errors.
select public.therassistant_create_index_if_ready('idx_charge_validation_errors_unresolved', 'charge_validation_errors', array['Tenants_id', 'created_at DESC'], null);
-- Charge timeline.
select public.therassistant_create_index_if_ready('idx_charge_status_history_charge', 'charge_status_history', array['charge_id', 'created_at DESC'], null);

-- Claims
-- Claims Workqueues/status filters.
select public.therassistant_create_index_if_ready('idx_Claims_Tenants_status', 'professional_Claims', array['Tenants_id', 'Claims_status'], null);
-- Clients Claims history.
select public.therassistant_create_index_if_ready('idx_Claims_Clients', 'professional_Claims', array['Clients_id', 'service_date_from DESC'], null);
-- Providers Claims reporting.
select public.therassistant_create_index_if_ready('idx_Claims_Providers', 'professional_Claims', array['rendering_Providers_id', 'service_date_from DESC'], null);
-- Payer AR/reporting.
select public.therassistant_create_index_if_ready('idx_Claims_payer', 'professional_Claims', array['payer_id', 'service_date_from DESC'], null);
-- Date-range reporting.
select public.therassistant_create_index_if_ready('idx_Claims_service_date', 'professional_Claims', array['Tenants_id', 'service_date_from DESC'], null);
-- Submission reporting.
select public.therassistant_create_index_if_ready('idx_Claims_submitted_date', 'professional_Claims', array['Tenants_id', 'submitted_at DESC'], null);
-- Workqueues with date sort.
select public.therassistant_create_index_if_ready('idx_Claims_status_dos', 'professional_Claims', array['Tenants_id', 'Claims_status', 'service_date_from'], null);
-- Payer Claims lookup.
select public.therassistant_create_index_if_ready('idx_Claims_payer_Claims_number', 'professional_Claims', array['payer_Claims_number'], null);
-- Clearinghouse lookup.
select public.therassistant_create_index_if_ready('idx_Claims_clearinghouse_id', 'professional_Claims', array['clearinghouse_Claims_id'], null);
-- Claims line lookup.
select public.therassistant_create_index_if_ready('idx_Claims_lines_Claims', 'professional_Claims_lines', array['Claims_id'], null);
-- CPT reporting.
select public.therassistant_create_index_if_ready('idx_Claims_lines_cpt', 'professional_Claims_lines', array['Tenants_id', 'cpt_code', 'service_date'], null);
-- Claims diagnoses.
select public.therassistant_create_index_if_ready('idx_Claims_diagnoses_Claims', 'Claims_diagnoses', array['Claims_id'], null);
-- Claims timeline.
select public.therassistant_create_index_if_ready('idx_Claims_status_history_Claims', 'Claims_status_history', array['Claims_id', 'created_at DESC'], null);
-- Errors for Claims.
select public.therassistant_create_index_if_ready('idx_Claims_validation_errors_Claims', 'Claims_validation_errors', array['Claims_id'], null);
-- External Claims matching.
select public.therassistant_create_index_if_ready('idx_Claims_external_ids_value', 'Claims_external_ids', array['external_system', 'external_id'], null);

-- Batches
-- Batch queue.
select public.therassistant_create_index_if_ready('idx_Claims_batches_Tenants_status', 'Claims_batches', array['Tenants_id', 'batch_status'], null);
-- Recent batches.
select public.therassistant_create_index_if_ready('idx_Claims_batches_created', 'Claims_batches', array['Tenants_id', 'created_at DESC'], null);
-- Claims in batch.
select public.therassistant_create_index_if_ready('idx_Claims_batch_items_batch', 'Claims_batch_items', array['batch_id'], null);
-- Batch containing Claims.
select public.therassistant_create_index_if_ready('idx_Claims_batch_items_Claims', 'Claims_batch_items', array['Claims_id'], null);
-- Claims Submission history.
select public.therassistant_create_index_if_ready('idx_Claims_submissions_Claims', 'Claims_submissions', array['Claims_id', 'submitted_at DESC'], null);
-- Batch submissions.
select public.therassistant_create_index_if_ready('idx_Claims_submissions_batch', 'Claims_submissions', array['batch_id', 'submitted_at DESC'], null);
-- Claims response history.
select public.therassistant_create_index_if_ready('idx_submission_responses_Claims', 'submission_responses', array['Claims_id', 'created_at DESC'], null);
-- Rejected/pending response queue.
select public.therassistant_create_index_if_ready('idx_submission_responses_status', 'submission_responses', array['Tenants_id', 'response_status'], null);
-- Files for batch.
select public.therassistant_create_index_if_ready('idx_Claims_submission_Files_batch', 'Claims_submission_Files', array['batch_id'], null);
-- Duplicate Files prevention.
select public.therassistant_create_index_if_ready('idx_Claims_submission_Files_checksum', 'Claims_submission_Files', array['checksum'], null);
-- 277 status history.
select public.therassistant_create_index_if_ready('idx_Claims_status_responses_Claims', 'Claims_status_responses', array['Claims_id', 'response_date DESC'], null);

-- Payment Posting
-- Posted/unapplied/reversed filters.
select public.therassistant_create_index_if_ready('idx_payments_Tenants_status', 'payments', array['Tenants_id', 'payment_status'], null);
-- Clients payment history.
select public.therassistant_create_index_if_ready('idx_payments_Clients', 'payments', array['Clients_id', 'payment_date DESC'], null);
-- Payer payment history.
select public.therassistant_create_index_if_ready('idx_payments_payer', 'payments', array['payer_id', 'payment_date DESC'], null);
-- Payment reporting.
select public.therassistant_create_index_if_ready('idx_payments_payment_date', 'payments', array['Tenants_id', 'payment_date DESC'], null);
-- EFT/check trace lookup.
select public.therassistant_create_index_if_ready('idx_payments_trace_number', 'payments', array['trace_number'], null);
-- Check lookup.
select public.therassistant_create_index_if_ready('idx_payments_check_number', 'payments', array['check_number'], null);
-- Allocations under payment.
select public.therassistant_create_index_if_ready('idx_payment_allocations_payment', 'payment_allocations', array['payment_id'], null);
-- Payments for Claims.
select public.therassistant_create_index_if_ready('idx_payment_allocations_Claims', 'payment_allocations', array['Claims_id'], null);
-- Line-level posting.
select public.therassistant_create_index_if_ready('idx_payment_allocations_Claims_line', 'payment_allocations', array['Claims_line_id'], null);
-- Payments applied to Clients.
select public.therassistant_create_index_if_ready('idx_payment_allocations_Clients', 'payment_allocations', array['Clients_id'], null);
-- Reversal lookup.
select public.therassistant_create_index_if_ready('idx_payment_reversals_payment', 'payment_reversals', array['payment_id'], null);
-- Clients unapplied money.
select public.therassistant_create_index_if_ready('idx_unapplied_payments_Clients', 'unapplied_payments', array['Clients_id'], null);
-- Unapplied payment queue.
select public.therassistant_create_index_if_ready('idx_unapplied_payments_Tenants', 'unapplied_payments', array['Tenants_id', 'created_at DESC'], null);

-- Adjustments
-- Posted/reversed filters.
select public.therassistant_create_index_if_ready('idx_Adjustmentss_Tenants_status', 'Adjustmentss', array['Tenants_id', 'Adjustments_status'], null);
-- Write-off reporting.
select public.therassistant_create_index_if_ready('idx_Adjustmentss_type', 'Adjustmentss', array['Tenants_id', 'Adjustments_type'], null);
-- Clients Adjustments history.
select public.therassistant_create_index_if_ready('idx_Adjustmentss_Clients', 'Adjustmentss', array['Clients_id', 'Adjustments_date DESC'], null);
-- Claims Adjustmentss.
select public.therassistant_create_index_if_ready('idx_Adjustmentss_Claims', 'Adjustmentss', array['Claims_id', 'Adjustments_date DESC'], null);
-- Allocation lookup.
select public.therassistant_create_index_if_ready('idx_Adjustments_allocations_Adjustments', 'Adjustments_allocations', array['Adjustments_id'], null);
-- Claims Adjustments totals.
select public.therassistant_create_index_if_ready('idx_Adjustments_allocations_Claims', 'Adjustments_allocations', array['Claims_id'], null);
-- Clients Adjustments totals.
select public.therassistant_create_index_if_ready('idx_Adjustments_allocations_Clients', 'Adjustments_allocations', array['Clients_id'], null);
-- Adjustments reversal history.
select public.therassistant_create_index_if_ready('idx_Adjustments_reversals_Adjustments', 'Adjustments_reversals', array['Adjustments_id'], null);
-- CARC classification.
select public.therassistant_create_index_if_ready('idx_carc_mappings_code', 'carc_mappings', array['carc_code'], null);

-- Historical Posting
-- Clients historical Accounting.
select public.therassistant_create_index_if_ready('idx_historical_transactions_Clients', 'historical_transactions', array['Clients_id', 'transaction_date DESC'], null);
-- Draft/posted/reversed queue.
select public.therassistant_create_index_if_ready('idx_historical_transactions_Tenants_status', 'historical_transactions', array['Tenants_id', 'historical_transaction_status'], null);
-- Payment/credit/opening balance reporting.
select public.therassistant_create_index_if_ready('idx_historical_transactions_type', 'historical_transactions', array['Tenants_id', 'historical_transaction_type'], null);
-- Imports traceability.
select public.therassistant_create_index_if_ready('idx_historical_transactions_legacy_source', 'historical_transactions', array['legacy_source_id'], null);
-- Allocation lookup.
select public.therassistant_create_index_if_ready('idx_historical_allocations_transaction', 'historical_transaction_allocations', array['historical_transaction_id'], null);
-- Linked historical-to-Claims lookup.
select public.therassistant_create_index_if_ready('idx_historical_allocations_Claims', 'historical_transaction_allocations', array['Claims_id'], null);
-- Clients opening balance lookup.
select public.therassistant_create_index_if_ready('idx_opening_balances_Clients', 'opening_balances', array['Clients_id'], null);
-- Legacy record matching.
select public.therassistant_create_index_if_ready('idx_legacy_record_links_external', 'legacy_record_links', array['source_system', 'external_id'], null);

-- Accounting
-- Financial reporting.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_Tenants_posting_date', 'Accounting_entries', array['Tenants_id', 'posting_date DESC'], null);
-- Clients Accounting.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_Clients', 'Accounting_entries', array['Clients_id', 'posting_date DESC'], null);
-- Claims Accounting.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_Claims', 'Accounting_entries', array['Claims_id', 'posting_date DESC'], null);
-- Account activity.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_account', 'Accounting_entries', array['Accounting_account_id', 'posting_date DESC'], null);
-- Payment/write-off/refund reporting.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_type', 'Accounting_entries', array['Tenants_id', 'Accounting_entry_type', 'posting_date DESC'], null);
-- Grouped transaction lookup.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_transaction', 'Accounting_entries', array['Accounting_transaction_id'], null);
-- Payer Accounting/AR.
select public.therassistant_create_index_if_ready('idx_Accounting_entries_payer', 'Accounting_entries', array['payer_id', 'posting_date DESC'], null);
-- Transaction history.
select public.therassistant_create_index_if_ready('idx_Accounting_transactions_Tenants_date', 'Accounting_transactions', array['Tenants_id', 'transaction_date DESC'], null);
-- Trace Accounting back to payment/Claims/etc.
select public.therassistant_create_index_if_ready('idx_Accounting_transactions_source', 'Accounting_transactions', array['source_type', 'source_id'], null);
-- Fast Clients balance lookup.
select public.therassistant_create_index_if_ready('idx_Clients_balance_summaries_Clients', 'Clients_balance_summaries', array['Clients_id'], null);
-- Fast Claims balance lookup.
select public.therassistant_create_index_if_ready('idx_Claims_balance_summaries_Claims', 'Claims_balance_summaries', array['Claims_id'], null);
-- Open AR queries.
select public.therassistant_create_index_if_ready('idx_Claims_balance_summaries_open_balance', 'Claims_balance_summaries', array['Tenants_id', 'open_balance'], null);
-- Period close checks.
select public.therassistant_create_index_if_ready('idx_Accounting_periods_Tenants_dates', 'Accounting_periods', array['Tenants_id', 'start_date', 'end_date'], null);
-- Reconciliation detail.
select public.therassistant_create_index_if_ready('idx_reconciliation_items_batch', 'reconciliation_items', array['reconciliation_batch_id'], null);

-- ERA / EOB
-- ERA Imports queue.
select public.therassistant_create_index_if_ready('idx_era_Files_Tenants_status', 'era_Files', array['Tenants_id', 'era_Files_status'], null);
-- Duplicate detection.
select public.therassistant_create_index_if_ready('idx_era_Files_check_trace', 'era_Files', array['check_or_trace_number'], null);
-- Claims in ERA.
select public.therassistant_create_index_if_ready('idx_era_Claims_Files', 'era_Claims', array['era_Files_id'], null);
-- Match ERA to Claims.
select public.therassistant_create_index_if_ready('idx_era_Claims_Claims_number', 'era_Claims', array['payer_Claims_number'], null);
-- Match by control number.
select public.therassistant_create_index_if_ready('idx_era_Claims_Clients_control', 'era_Claims', array['client_control_number'], null);
-- ERA service lines.
select public.therassistant_create_index_if_ready('idx_era_service_lines_era_Claims', 'era_service_lines', array['era_Claims_id'], null);
-- CARCs/RARCs for ERA Claims.
select public.therassistant_create_index_if_ready('idx_era_Adjustmentss_Claims', 'era_Adjustmentss', array['era_Claims_id'], null);
-- Denials classification/reporting.
select public.therassistant_create_index_if_ready('idx_era_Adjustmentss_carc', 'era_Adjustmentss', array['carc_code'], null);
-- Matched internal Claims.
select public.therassistant_create_index_if_ready('idx_era_matches_internal_Claims', 'era_matches', array['Claims_id'], null);
-- Unmatched/ambiguous queue.
select public.therassistant_create_index_if_ready('idx_era_matches_status', 'era_matches', array['Tenants_id', 'era_match_status'], null);
-- Manual EOB history.
select public.therassistant_create_index_if_ready('idx_manual_eobs_Claims', 'manual_eobs', array['Claims_id', 'eob_date DESC'], null);

-- Denials
-- Denials Workqueues.
select public.therassistant_create_index_if_ready('idx_Denials_Tenants_status', 'Denials', array['Tenants_id', 'Denials_status'], null);
-- Denials for Claims.
select public.therassistant_create_index_if_ready('idx_Denials_Claims', 'Denials', array['Claims_id'], null);
-- Clients Denials history.
select public.therassistant_create_index_if_ready('idx_Denials_Clients', 'Denials', array['Clients_id', 'Denials_date DESC'], null);
-- Payer Denials trends.
select public.therassistant_create_index_if_ready('idx_Denials_payer', 'Denials', array['payer_id', 'Denials_date DESC'], null);
-- Denials reporting.
select public.therassistant_create_index_if_ready('idx_Denials_category', 'Denials', array['Tenants_id', 'Denials_category'], null);
-- CARC reporting.
select public.therassistant_create_index_if_ready('idx_Denials_carc', 'Denials', array['carc_code'], null);
-- Appeals for Claims.
select public.therassistant_create_index_if_ready('idx_appeals_Claims', 'appeals', array['Claims_id'], null);
-- Appeal queue.
select public.therassistant_create_index_if_ready('idx_appeals_status', 'appeals', array['Tenants_id', 'appeal_status'], null);
-- Upcoming deadlines.
select public.therassistant_create_index_if_ready('idx_appeal_deadlines_due', 'appeal_deadlines', array['Tenants_id', 'deadline_date'], null);
-- Appeal outcome history.
select public.therassistant_create_index_if_ready('idx_appeal_outcomes_appeal', 'appeal_outcomes', array['appeal_id'], null);
-- Reconsideration history.
select public.therassistant_create_index_if_ready('idx_reconsiderations_Claims', 'reconsiderations', array['Claims_id'], null);

-- Collections
-- Clients PR history.
select public.therassistant_create_index_if_ready('idx_client_responsibility_Clients', 'client_responsibility_items', array['Clients_id', 'created_at DESC'], null);
-- PR by Claims.
select public.therassistant_create_index_if_ready('idx_client_responsibility_Claims', 'client_responsibility_items', array['Claims_id'], null);
-- Collections queue.
select public.therassistant_create_index_if_ready('idx_client_responsibility_status', 'client_responsibility_items', array['Tenants_id', 'collection_status'], null);
-- Clients Collections history.
select public.therassistant_create_index_if_ready('idx_client_Collections_Clients', 'client_Collections', array['Clients_id', 'Collections_date DESC'], null);
-- Draft/sent/paid filters.
select public.therassistant_create_index_if_ready('idx_client_Collections_status', 'client_Collections', array['Tenants_id', 'Collections_status'], null);
-- Collections lines.
select public.therassistant_create_index_if_ready('idx_client_Collections_lines_Collections', 'client_Collections_lines', array['Collections_id'], null);
-- Collections delivery history.
select public.therassistant_create_index_if_ready('idx_Collections_delivery_logs_Collections', 'Collections_delivery_logs', array['Collections_id'], null);
-- Payment plan lookup.
select public.therassistant_create_index_if_ready('idx_payment_plans_Clients', 'payment_plans', array['Clients_id'], null);
-- Upcoming/past due installments.
select public.therassistant_create_index_if_ready('idx_payment_plan_installments_due', 'payment_plan_installments', array['Tenants_id', 'due_date'], null);

-- Overpayments
-- Clients credit lookup.
select public.therassistant_create_index_if_ready('idx_credit_balances_Clients', 'credit_balances', array['Clients_id'], null);
-- Credit review queue.
select public.therassistant_create_index_if_ready('idx_credit_balances_status', 'credit_balances', array['Tenants_id', 'credit_balance_status'], null);
-- Clients refund history.
select public.therassistant_create_index_if_ready('idx_refund_requests_Clients', 'refund_requests', array['Clients_id', 'created_at DESC'], null);
-- Refund approval queue.
select public.therassistant_create_index_if_ready('idx_refund_requests_status', 'refund_requests', array['Tenants_id', 'refund_status'], null);
-- Refund payment lookup.
select public.therassistant_create_index_if_ready('idx_refund_payments_refund', 'refund_payments', array['refund_request_id'], null);
-- Credit transfer source.
select public.therassistant_create_index_if_ready('idx_credit_transfers_source', 'credit_transfers', array['source_credit_balance_id'], null);
-- Claims Overpayments reviews.
select public.therassistant_create_index_if_ready('idx_Overpayments_reviews_Claims', 'Overpayments_reviews', array['Claims_id'], null);

-- Workqueues
-- Open/completed filters.
select public.therassistant_create_index_if_ready('idx_Workqueues_Tenants_status', 'Workqueues_items', array['Tenants_id', 'Workqueues_status'], null);
-- Workqueues category filters.
select public.therassistant_create_index_if_ready('idx_Workqueues_Tenants_type_status', 'Workqueues_items', array['Tenants_id', 'Workqueues_type', 'Workqueues_status'], null);
-- Prioritized task list.
select public.therassistant_create_index_if_ready('idx_Workqueues_priority_due', 'Workqueues_items', array['Tenants_id', 'priority', 'due_date'], null);
-- Due/past due tasks.
select public.therassistant_create_index_if_ready('idx_Workqueues_due_date', 'Workqueues_items', array['Tenants_id', 'due_date'], null);
-- Link task to Claims/Clients/etc.
select public.therassistant_create_index_if_ready('idx_Workqueues_source', 'Workqueues_items', array['source_object_type', 'source_object_id'], null);
-- User task list.
select public.therassistant_create_index_if_ready('idx_Workqueues_assigned_user', 'Workqueues_assignments', array['assigned_user_id'], null);
-- Team task list.
select public.therassistant_create_index_if_ready('idx_Workqueues_assigned_team', 'Workqueues_assignments', array['assigned_team_id'], null);
-- Task history.
select public.therassistant_create_index_if_ready('idx_Workqueues_history_item', 'Workqueues_history', array['Workqueues_item_id', 'created_at DESC'], null);
-- Task comments.
select public.therassistant_create_index_if_ready('idx_Workqueues_comments_item', 'Workqueues_comments', array['Workqueues_item_id', 'created_at DESC'], null);

-- Communication
-- Clients account notes.
select public.therassistant_create_index_if_ready('idx_account_notes_Clients', 'account_notes', array['Clients_id', 'created_at DESC'], null);
-- Claims notes.
select public.therassistant_create_index_if_ready('idx_Claims_notes_Claims', 'Claims_notes', array['Claims_id', 'created_at DESC'], null);
-- Payment notes.
select public.therassistant_create_index_if_ready('idx_payment_notes_payment', 'payment_notes', array['payment_id', 'created_at DESC'], null);
-- Admin notes.
select public.therassistant_create_index_if_ready('idx_admin_notes_Clients', 'admin_notes', array['Clients_id', 'created_at DESC'], null);
-- Clients communication history.
select public.therassistant_create_index_if_ready('idx_communication_logs_Clients', 'communication_logs', array['Clients_id', 'created_at DESC'], null);
-- Claims-related communication.
select public.therassistant_create_index_if_ready('idx_communication_logs_Claims', 'communication_logs', array['Claims_id', 'created_at DESC'], null);
-- Payer call history.
select public.therassistant_create_index_if_ready('idx_communication_logs_payer', 'communication_logs', array['payer_id', 'created_at DESC'], null);
-- Message thread.
select public.therassistant_create_index_if_ready('idx_Clients_messages_thread', 'Clients_messages', array['thread_id', 'created_at'], null);
-- Clients message threads.
select public.therassistant_create_index_if_ready('idx_message_threads_Clients', 'message_threads', array['Clients_id', 'updated_at DESC'], null);

-- Payers
-- Payers by payer.
select public.therassistant_create_index_if_ready('idx_payer_Payers_payer', 'payer_Payers', array['payer_id'], null);
-- Active/expired Payers.
select public.therassistant_create_index_if_ready('idx_payer_Payers_Tenants_status', 'payer_Payers', array['Tenants_id', 'Payers_status'], null);
-- Rates under Payers.
select public.therassistant_create_index_if_ready('idx_Payers_rates_Payers', 'Payers_rates', array['Payers_id'], null);
-- Rate lookup by DOS.
select public.therassistant_create_index_if_ready('idx_Payers_rates_cpt_dates', 'Payers_rates', array['Payers_id', 'cpt_code', 'effective_date', 'termination_date'], null);
-- Active fee schedules.
select public.therassistant_create_index_if_ready('idx_fee_schedules_Tenants_status', 'fee_schedules', array['Tenants_id', 'status'], null);
-- Expected reimbursement lookup.
select public.therassistant_create_index_if_ready('idx_fee_schedule_lines_schedule_cpt', 'fee_schedule_lines', array['fee_schedule_id', 'cpt_code', 'modifier'], null);
-- Variance by Claims.
select public.therassistant_create_index_if_ready('idx_Payers_variance_Claims', 'Payers_variance_reviews', array['Claims_id'], null);
-- Underpayment queue.
select public.therassistant_create_index_if_ready('idx_Payers_variance_status', 'Payers_variance_reviews', array['Tenants_id', 'Payers_variance_status'], null);

-- Coding
-- CPT lookup.
select public.therassistant_create_index_if_ready('idx_cpt_codes_code', 'cpt_codes', array['code'], null);
-- Active CPT lookup.
select public.therassistant_create_index_if_ready('idx_cpt_codes_active', 'cpt_codes', array['code'], null);
-- Modifier lookup.
select public.therassistant_create_index_if_ready('idx_modifier_codes_code', 'modifier_codes', array['code'], null);
-- ICD-10 lookup.
select public.therassistant_create_index_if_ready('idx_diagnosis_codes_code', 'diagnosis_codes', array['code'], null);
-- POS lookup.
select public.therassistant_create_index_if_ready('idx_place_of_service_codes_code', 'place_of_service_codes', array['code'], null);
-- Taxonomy lookup.
select public.therassistant_create_index_if_ready('idx_taxonomy_codes_code', 'taxonomy_codes', array['code'], null);
-- Billing rule validation.
select public.therassistant_create_index_if_ready('idx_code_compatibility_rules_lookup', 'code_compatibility_rules', array['cpt_code', 'modifier', 'place_of_service_code', 'Providers_type'], null);
-- Payer-specific rule lookup.
select public.therassistant_create_index_if_ready('idx_payer_coding_rules_lookup', 'payer_coding_rules', array['payer_id', 'cpt_code', 'effective_date'], null);
-- NCCI validation.
select public.therassistant_create_index_if_ready('idx_ncci_edit_rules_lookup', 'ncci_edit_rules', array['primary_code', 'secondary_code', 'effective_date'], null);

-- Imports
-- Imports queue.
select public.therassistant_create_index_if_ready('idx_Imports_batches_Tenants_status', 'Imports_batches', array['Tenants_id', 'Imports_status'], null);
-- Rows in batch.
select public.therassistant_create_index_if_ready('idx_Imports_rows_batch', 'Imports_rows', array['Imports_batch_id'], null);
-- Invalid/warning rows.
select public.therassistant_create_index_if_ready('idx_Imports_rows_status', 'Imports_rows', array['Imports_batch_id', 'Imports_row_status'], null);
-- Errors for row.
select public.therassistant_create_index_if_ready('idx_Imports_validation_errors_row', 'Imports_validation_errors', array['Imports_row_id'], null);
-- Batch error summary.
select public.therassistant_create_index_if_ready('idx_Imports_validation_errors_batch', 'Imports_validation_errors', array['Imports_batch_id', 'severity'], null);
-- Mapping lookup.
select public.therassistant_create_index_if_ready('idx_Imports_mappings_batch', 'Imports_mappings', array['Imports_batch_id'], null);
-- Commit history.
select public.therassistant_create_index_if_ready('idx_Imports_commits_batch', 'Imports_commits', array['Imports_batch_id'], null);
-- Rollback history.
select public.therassistant_create_index_if_ready('idx_Imports_rollbacks_batch', 'Imports_rollbacks', array['Imports_batch_id'], null);

-- Integrations
-- Connected systems by Tenants.
select public.therassistant_create_index_if_ready('idx_Integrations_connections_Tenants_type', 'Integrations_connections', array['Tenants_id', 'Integrations_type'], null);
-- Broken/expired Integrations.
select public.therassistant_create_index_if_ready('idx_Integrations_connections_status', 'Integrations_connections', array['Tenants_id', 'Integrations_status'], null);
-- Sync history.
select public.therassistant_create_index_if_ready('idx_Integrations_sync_jobs_connection', 'Integrations_sync_jobs', array['Integrations_connection_id', 'created_at DESC'], null);
-- Failed/running jobs.
select public.therassistant_create_index_if_ready('idx_Integrations_sync_jobs_status', 'Integrations_sync_jobs', array['Tenants_id', 'sync_job_status'], null);
-- Errors for sync job.
select public.therassistant_create_index_if_ready('idx_Integrations_sync_errors_job', 'Integrations_sync_errors', array['sync_job_id'], null);
-- External-to-internal lookup.
select public.therassistant_create_index_if_ready('idx_external_system_mappings_external', 'external_system_mappings', array['external_system', 'external_id'], null);
-- Internal-to-external lookup.
select public.therassistant_create_index_if_ready('idx_external_system_mappings_internal', 'external_system_mappings', array['internal_table', 'internal_id'], null);
-- Failed/pending webhooks.
select public.therassistant_create_index_if_ready('idx_webhook_events_status', 'webhook_events', array['webhook_status', 'received_at DESC'], null);
-- Duplicate webhook prevention.
select public.therassistant_create_index_if_ready('idx_webhook_events_external_id', 'webhook_events', array['external_event_id'], null);

-- Notifications
-- Unread/read Notifications.
select public.therassistant_create_index_if_ready('idx_Notifications_user_status', 'Notifications', array['user_id', 'Notifications_status'], null);
-- Notifications feed.
select public.therassistant_create_index_if_ready('idx_Notifications_user_created', 'Notifications', array['user_id', 'created_at DESC'], null);
-- System alert reporting.
select public.therassistant_create_index_if_ready('idx_Notifications_Tenants_type', 'Notifications', array['Tenants_id', 'Notifications_type'], null);
-- Delivery records.
select public.therassistant_create_index_if_ready('idx_Notifications_deliveries_Notifications', 'Notifications_deliveries', array['Notifications_id'], null);
-- Failed deliveries.
select public.therassistant_create_index_if_ready('idx_Notifications_deliveries_status', 'Notifications_deliveries', array['delivery_status', 'created_at DESC'], null);
-- User Notifications settings.
select public.therassistant_create_index_if_ready('idx_Notifications_preferences_user', 'Notifications_preferences', array['user_id'], null);

-- Files
-- Document category filters.
select public.therassistant_create_index_if_ready('idx_Clients_Files_type', 'Clients_Files', array['Tenants_id', 'document_type'], null);
-- Claims attachments.
select public.therassistant_create_index_if_ready('idx_Claims_related_Files_Claims', 'Claims_related_Files', array['Claims_id'], null);
-- Auth letters/docs.
select public.therassistant_create_index_if_ready('idx_authorization_Files_auth', 'authorization_Files', array['authorization_id'], null);
-- EOB Files by Claims.
select public.therassistant_create_index_if_ready('idx_eob_Files_Claims', 'eob_Files', array['Claims_id'], null);
-- Message attachments.
select public.therassistant_create_index_if_ready('idx_message_attachments_message', 'message_attachments', array['message_id'], null);

-- Reporting
-- DOS-based reporting.
select public.therassistant_create_index_if_ready('idx_Claims_reporting_dos', 'professional_Claims', array['Tenants_id', 'service_date_from', 'service_date_to'], null);
-- Providers/payer reporting.
select public.therassistant_create_index_if_ready('idx_Claims_reporting_Providers_payer', 'professional_Claims', array['Tenants_id', 'rendering_Providers_id', 'payer_id'], null);

-- Pre-Session Dashboard
-- Fast appointment-level Pre-Session Dashboard lookup.
select public.therassistant_create_index_if_ready('idx_pre_session_goal_updates_tenant_appointment', 'pre_session_goal_updates', array['tenant_id', 'appointment_id'], null);
-- Fast lookup of client-submitted goal updates by treatment goal and review status.
select public.therassistant_create_index_if_ready('idx_pre_session_goal_updates_goal_status', 'pre_session_goal_updates', array['treatment_plan_goal_id', 'status'], null);
-- Fast pending provider review list for client goal updates.
select public.therassistant_create_index_if_ready('idx_pre_session_goal_updates_pending_provider_review', 'pre_session_goal_updates', array['tenant_id', 'status', 'created_at DESC'], null);
-- Find all pre-session/client-imported content used in a clinical note.
select public.therassistant_create_index_if_ready('idx_clinical_note_imports_note', 'clinical_note_imports', array['clinical_note_id'], null);
-- Trace imported note content back to the source response, check-in, or goal update.
select public.therassistant_create_index_if_ready('idx_clinical_note_imports_source', 'clinical_note_imports', array['source_type', 'source_id'], null);
-- Fast pending/elevated safety review queue.
select public.therassistant_create_index_if_ready('idx_pre_session_safety_reviews_pending', 'pre_session_safety_reviews', array['tenant_id', 'status', 'safety_flag_level', 'created_at DESC'], null);
-- Find safety review linked to a specific appointment.
select public.therassistant_create_index_if_ready('idx_pre_session_safety_reviews_appointment', 'pre_session_safety_reviews', array['appointment_id'], null);

-- Reporting
-- Payment reporting.
select public.therassistant_create_index_if_ready('idx_payments_reporting_date', 'payments', array['Tenants_id', 'payment_date'], null);
-- Write-off reporting.
select public.therassistant_create_index_if_ready('idx_Adjustmentss_reporting_date_type', 'Adjustmentss', array['Tenants_id', 'Adjustments_date', 'Adjustments_type'], null);
-- Financial reports.
select public.therassistant_create_index_if_ready('idx_Accounting_reporting_period', 'Accounting_entries', array['Tenants_id', 'posting_date', 'Accounting_entry_type'], null);
-- Denials analysis.
select public.therassistant_create_index_if_ready('idx_Denials_reporting', 'Denials', array['Tenants_id', 'Denials_date', 'Denials_category', 'payer_id'], null);
-- Productivity/visit reporting.
select public.therassistant_create_index_if_ready('idx_Appointmentss_reporting', 'Appointmentss', array['Tenants_id', 'start_time', 'Providers_id', 'Appointments_status'], null);
-- Charge lag reporting.
select public.therassistant_create_index_if_ready('idx_charge_reporting', 'charge_capture_items', array['Tenants_id', 'service_date', 'Providers_id', 'charge_status'], null);

drop function if exists public.therassistant_create_index_if_ready(text, text, text[], text);
drop function if exists public.therassistant_resolve_column(regclass, text);
drop function if exists public.therassistant_resolve_relation(text);

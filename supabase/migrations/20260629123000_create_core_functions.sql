-- THERASSISTANT EHR core RPC/function signatures
-- Generated from uploaded function workbook on 2026-06-29.
--
-- Registers the database function API from the workbook. Most workflow
-- functions are placeholders that raise a not-implemented exception until
-- table-specific logic is added. Access/RBAC helpers fail closed.

set check_function_bodies = off;

create or replace function public._function_not_implemented(p_function_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'THERASSISTANT function % is registered but not implemented yet.', p_function_name
    using hint = 'Replace this placeholder with table-specific workflow logic before using it in production.';
end;
$$;

comment on function public._function_not_implemented(text)
is 'Internal placeholder helper for registered THERASSISTANT EHR workflow functions.';

do $migration$
declare
  source_signature text;
  function_name text;
  raw_args text;
  raw_arg text;
  raw_arg_clean text;
  arg_name text;
  arg_type text;
  arg_default text;
  arg_defs text;
  sig_types text;
  return_type text;
  function_body text;
  typed_match text[];
begin
  foreach source_signature in array (
    select array_agg(value::text)
    from jsonb_array_elements_text($functions$["get_current_user_id()","get_current_Tenants_id()","user_has_Tenants_access(user_id, Tenants_id)","user_has_role(user_id, Tenants_id, role_name)","user_can_access_Practice(user_id, Practice_id)","user_can_manage_billing(user_id, Practice_id)","user_can_view_clinical_record(user_id, Clients_id)","user_can_view_financials(user_id, Clients_id)","link_billing_company_to_Practice(billing_company_id, Practice_id)","unlink_billing_company_from_Practice(billing_company_id, Practice_id)","write_Audits_log(target_type, target_id, action, old_values, new_values, metadata)","Audits_insert_trigger()","Audits_update_trigger()","Audits_delete_trigger()","get_Audits_trail(target_type, target_id)","create_Clients_with_proFiles(Tenants_id, Clients_data, Payers_data)","update_Clients_demographics(Clients_id, demographic_data)","deactivate_Clients(Clients_id, reason)","merge_duplicate_Clients(primary_Clients_id, duplicate_Clients_id)","get_Clients_summary(Clients_id)","get_Clients_financial_snapshot(Clients_id)","get_Clients_active_Payers(Clients_id, date_of_service)","add_Clients_Payers(Clients_id, payer_id, policy_data)","terminate_Clients_Payers(policy_id, termination_date, reason)","set_primary_Payers(Clients_id, policy_id)","verify_eligibility(Clients_id, policy_id, service_date, benefit_data)","get_latest_eligibility(Clients_id, service_date)","get_copay_or_coPayers(Clients_id, service_date, cpt_code)","flag_eligibility_issue(Clients_id, issue_type, note)","clear_eligibility_issue(Clients_id, resolution_note)","create_Appointments(Clients_id, Providers_id, start_time, end_time, service_type)","cancel_Appointments(Appointments_id, reason)","mark_no_show(Appointments_id, reason)","mark_Appointments_completed(Appointments_id)","Clients_check_in(Appointments_id, checkin_data)","mark_Clients_on_my_way(Appointments_id)","mark_Clients_arrived(Appointments_id)","complete_pre_session_questions(Appointments_id, answers)","update_calendar_status_from_checkin(Appointments_id)","create_charge_from_Appointments(Appointments_id)","validate_charge(charge_id)","mark_charge_ready_for_Claims(charge_id)","block_charge(charge_id, reason)","unblock_charge(charge_id, resolution_note)","void_charge(charge_id, reason)","set_charge_client_responsibility(charge_id, reason)","get_unClaimsed_charges(Tenants_id, filters)","get_charge_validation_errors(charge_id)","create_Claims_from_charge(charge_id)","create_Claims_from_charges(charge_ids[])","validate_Claims(Claims_id)","mark_Claims_validation_failed(Claims_id, errors)","mark_Claims_ready_for_batch(Claims_id)","release_Claims(Claims_id)","void_Claims(Claims_id, reason)","reverse_Claims(Claims_id, reason)","get_Claims_balance(Claims_id)","recalculate_Claims_status(Claims_id)","get_Claims_timeline(Claims_id)","create_Claims_batch(Tenants_id, Claims_ids[])","add_Claims_to_batch(batch_id, Claims_id)","remove_Claims_from_batch(batch_id, Claims_id)","validate_Claims_batch(batch_id)","mark_batch_ready(batch_id)","mark_batch_downloaded(batch_id)","mark_batch_submitted(batch_id, submission_data)","mark_batch_accepted(batch_id, response_data)","mark_batch_rejected(batch_id, rejection_data)","get_batch_summary(batch_id)","generate_837p_Claims_data(Claims_id)","generate_837p_batch(batch_id)","store_submission_Files(batch_id, Files_url, checksum)","record_clearinghouse_response(batch_id, response_data)","record_payer_acknowledgement(Claims_id, ack_data)","record_277_status(Claims_id, status_data)","mark_Claims_rejected(Claims_id, rejection_reason)","resubmit_Claims(Claims_id, correction_data)","post_Payers_payment(Claims_id, payment_data)","post_client_payment(Clients_id, payment_data)","post_Claims_Adjustments(Claims_id, Adjustments_data)","post_zero_payment(Claims_id, Denials_data)","post_partial_payment(Claims_id, payment_data)","post_Overpayments(Claims_id, amount, reason)","reverse_payment(payment_id, reason)","reverse_Adjustments(Adjustments_id, reason)","apply_unapplied_payment(payment_id, target_id, amount)","transfer_payment(payment_id, from_target, to_target, amount)","recalculate_payment_allocation(payment_id)","recalculate_Claims_financials(Claims_id)","post_historical_payment(Clients_id, payment_data)","post_historical_Adjustments(Clients_id, Adjustments_data)","post_historical_balance(Clients_id, balance_data)","post_historical_credit(Clients_id, credit_data)","link_historical_transaction_to_Claims(transaction_id, Claims_id)","unlink_historical_transaction(transaction_id, reason)","reverse_historical_transaction(transaction_id, reason)","create_Accounting_entry(entry_data)","create_double_entry_transaction(transaction_data)","get_Clients_Accounting(Clients_id)","get_Claims_Accounting(Claims_id)","get_open_balance(Clients_id)","get_payer_balance(Claims_id)","get_client_balance(Clients_id)","get_credit_balance(Clients_id)","recalculate_Clients_balance(Clients_id)","recalculate_Tenants_financials(Tenants_id)","lock_posted_period(period_id)","unlock_posted_period(period_id, reason)","Imports_835_Files(Files_id, Tenants_id)","parse_835_Claims(Files_id)","match_era_to_Claims(era_Claims_data)","match_era_payment_to_Clients(era_data)","post_era_payment(era_Claims_id)","post_era_Adjustmentss(era_Claims_id)","flag_unmatched_era(era_Claims_id)","flag_era_Overpayments(era_Claims_id)","flag_era_Denials(era_Claims_id)","map_carc_to_category(carc_code)","classify_Denials(Claims_id, carc_codes[])","create_Denials_record(Claims_id, Denials_data)","create_Denials_Workqueues_item(Claims_id)","mark_Denials_workable(Denials_id)","mark_Denials_non_workable(Denials_id, reason)","write_off_non_workable_Denials(Claims_id, reason)","prepare_corrected_Claims(Claims_id, correction_data)","prepare_reconsideration(Claims_id, reason)","prepare_appeal(Claims_id, appeal_data)","record_appeal_submission(Claims_id, appeal_data)","record_appeal_outcome(Claims_id, outcome_data)","transfer_to_client_responsibility(Claims_id, amount, reason)","calculate_client_responsibility(Claims_id)","create_client_Collections(Clients_id, Collections_period)","get_Collections_balance(Collections_id)","mark_Collections_sent(Collections_id, sent_method)","record_client_payment_plan(Clients_id, plan_data)","apply_payment_plan_installment(plan_id, payment_id)","flag_client_balance_for_review(Clients_id)","write_off_client_balance(Clients_id, amount, reason)","identify_credit_balance(Clients_id)","create_refund_request(Clients_id, amount, reason)","approve_refund(refund_id)","deny_refund(refund_id, reason)","post_refund(refund_id, payment_data)","transfer_credit_to_balance(Clients_id, amount, target_id)","flag_potential_Overpayments(Claims_id)","create_Workqueues_item(type, source_type, source_id, priority, assigned_to)","assign_Workqueues_item(item_id, user_id)","complete_Workqueues_item(item_id, resolution_note)","snooze_Workqueues_item(item_id, snooze_until)","escalate_Workqueues_item(item_id, reason)","reopen_Workqueues_item(item_id, reason)","get_Workqueues_for_user(user_id, filters)","get_Workqueues_for_Practice(Tenants_id, filters)","sync_Claims_status_to_Workqueues(Claims_id)","sync_charge_status_to_Workqueues(charge_id)","sync_auth_status_to_Workqueues(auth_id)","create_account_note(Clients_id, note_data)","create_Claims_note(Claims_id, note_data)","create_payment_note(payment_id, note_data)","create_admin_note(Clients_id, note_data)","create_clinical_note(Appointments_id, note_data)","lock_clinical_note(note_id)","amend_clinical_note(note_id, amendment_data)","get_notes_for_Clients(Clients_id)","create_session_note(Appointments_id, note_data)","sign_session_note(note_id, signer_id)","validate_note_for_billing(note_id)","extract_billable_service_from_note(note_id)","validate_time_based_service(note_id)","validate_goal_addressed(note_id)","validate_assessment_service(note_id)","create_treatment_plan(Clients_id, plan_data)","review_treatment_plan(plan_id, review_data)","expire_treatment_plan(plan_id)","get_active_treatment_plan(Clients_id, service_date)","create_Providers(Providers_data)","link_Providers_to_Practice(Providers_id, Tenants_id)","set_Providers_payer_enrollment(Providers_id, payer_id, enrollment_data)","get_Providers_active_Payers(Providers_id, payer_id, service_date)","Providers_can_bill_payer(Providers_id, payer_id, service_date)","flag_Providers_credentialing_issue(Providers_id, payer_id, issue)","get_rendering_Providers_for_Claims(Claims_id)","get_billing_Providers_for_Claims(Claims_id)","get_supervising_Providers_for_Claims(Claims_id)","create_payer_Payers(Payers_data)","update_fee_schedule(Payers_id, fee_schedule_data)","get_expected_allowed_amount(payer_id, cpt_code, modifier, service_date)","get_expected_reimbursement(Claims_id)","compare_expected_vs_actual_payment(Claims_id)","flag_underpayment(Claims_id, expected, actual)","flag_Payers_variance(Claims_id, variance_data)","report_daily_flash(Tenants_id, report_date)","report_ar_summary(Tenants_id, as_of_date)","report_ar_by_payer(Tenants_id, as_of_date)","report_ar_by_Providers(Tenants_id, as_of_date)","report_Denials_analysis(Tenants_id, date_range)","report_payment_posting_summary(Tenants_id, date_range)","report_Claims_submission_summary(Tenants_id, date_range)","report_clean_Claims_rate(Tenants_id, date_range)","report_first_pass_yield(Tenants_id, date_range)","report_net_collection_rate(Tenants_id, date_range)","report_gross_collection_rate(Tenants_id, date_range)","report_client_collection_rate(Tenants_id, date_range)","report_average_reimbursement_by_cpt(Tenants_id, date_range)","report_payer_mix(Tenants_id, date_range)","report_Providers_productivity(Tenants_id, date_range)","Imports_Clients_from_csv(Imports_id)","Imports_Payers_from_csv(Imports_id)","Imports_Claims_from_csv(Imports_id)","Imports_payments_from_csv(Imports_id)","validate_Imports_batch(Imports_id)","commit_Imports_batch(Imports_id)","rollback_Imports_batch(Imports_id)","dedupe_Importsed_Clients(Imports_id)","map_Importsed_payers(Imports_id)","create_Notifications(user_id, Notifications_data)","notify_assigned_user(Workqueues_item_id)","notify_Claims_rejected(Claims_id)","notify_authorization_expiring(auth_id)","notify_Clients_checked_in(Appointments_id)","notify_missing_documentation(Appointments_id)","mark_Notifications_read(Notifications_id)","log_phi_access(user_id, target_type, target_id, access_reason)","get_phi_access_log(target_type, target_id)","mask_sensitive_Clients_data(Clients_id)","soft_delete_record(target_type, target_id, reason)","restore_soft_deleted_record(target_type, target_id, reason)","redact_exported_data(export_id, rules)","generate_Clients_record_export(Clients_id)","generate_financial_record_export(Clients_id)","create_pre_session_response_for_appointment(p_appointment_id uuid)","submit_pre_session_response(p_response_id uuid, p_response_data jsonb)","review_pre_session_response(p_response_id uuid, p_review_note text default null)","approve_pre_session_goal_update(p_goal_update_id uuid, p_provider_note text default null)","reject_pre_session_goal_update(p_goal_update_id uuid, p_reason text default null)","generate_pre_session_dashboard(p_appointment_id uuid)","import_pre_session_to_clinical_note(p_clinical_note_id uuid, p_pre_session_response_id uuid)"]$functions$::jsonb) as t(value)
  )
  loop
    function_name := lower(regexp_replace(split_part(source_signature, '(', 1), '[^a-zA-Z0-9_]+', '_', 'g'));
    raw_args := regexp_replace(source_signature, '^[^(]*\((.*)\)$', '\1');

    arg_defs := '';
    sig_types := '';

    if raw_args <> '' then
      foreach raw_arg in array string_to_array(raw_args, ',')
      loop
        raw_arg_clean := btrim(raw_arg);
        arg_default := '';

        typed_match := regexp_match(
          raw_arg_clean,
          '^([a-zA-Z_][a-zA-Z0-9_]*)\s+(uuid|jsonb|text|date|timestamptz|numeric|integer|boolean)(.*)$',
          'i'
        );

        if typed_match is not null then
          arg_name := lower(regexp_replace(typed_match[1], '[^a-zA-Z0-9_]+', '_', 'g'));
          arg_type := lower(typed_match[2]);
          arg_default := lower(btrim(coalesce(typed_match[3], '')));
        else
          arg_name := lower(regexp_replace(replace(raw_arg_clean, '[]', ''), '[^a-zA-Z0-9_]+', '_', 'g'));

          if left(arg_name, 2) <> 'p_' then
            arg_name := 'p_' || arg_name;
          end if;

          if raw_arg_clean like '%[]' then
            if arg_name like '%carc%' then
              arg_type := 'text[]';
            else
              arg_type := 'uuid[]';
            end if;
          elsif arg_name in ('p_amount', 'p_expected', 'p_actual') or arg_name like '%_amount' then
            arg_type := 'numeric';
          elsif arg_name in ('p_start_time', 'p_end_time', 'p_snooze_until') then
            arg_type := 'timestamptz';
          elsif arg_name in ('p_service_date', 'p_date_of_service', 'p_termination_date', 'p_report_date', 'p_as_of_date') then
            arg_type := 'date';
          elsif arg_name like '%_id' or arg_name in ('p_source_id', 'p_target_id') then
            arg_type := 'uuid';
          elsif arg_name like '%_ids' then
            arg_type := 'uuid[]';
          elsif arg_name like '%data'
             or arg_name like '%_data'
             or arg_name like '%values'
             or arg_name like '%_values'
             or arg_name like '%errors'
             or arg_name like '%_errors'
             or arg_name in ('p_filters', 'p_metadata', 'p_answers', 'p_rules', 'p_date_range', 'p_collections_period') then
            arg_type := 'jsonb';
          else
            arg_type := 'text';
          end if;
        end if;

        if arg_defs <> '' then
          arg_defs := arg_defs || ', ';
          sig_types := sig_types || ', ';
        end if;

        arg_defs := arg_defs || quote_ident(arg_name) || ' ' || arg_type || case when arg_default <> '' then ' ' || arg_default else '' end;
        sig_types := sig_types || arg_type;
      end loop;
    end if;

    if function_name in ('get_current_user_id', 'get_current_tenants_id') then
      return_type := 'uuid';
    elsif function_name like 'user\_has\_%' escape '\'
       or function_name like 'user\_can\_%' escape '\'
       or function_name = 'providers_can_bill_payer' then
      return_type := 'boolean';
    elsif right(function_name, 8) = '_trigger' then
      return_type := 'trigger';
    elsif function_name = 'write_audits_log' then
      return_type := 'uuid';
    else
      return_type := 'jsonb';
    end if;

    if function_name = 'get_current_user_id' then
      function_body := $body$
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select auth.uid();
$fn$;$body$;

    elsif function_name = 'get_current_tenants_id' then
      function_body := $body$
language sql
stable
security definer
set search_path = public
as $fn$
  select nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb #>> '{app_metadata,current_tenants_id}',
    ''
  )::uuid;
$fn$;$body$;

    elsif return_type = 'boolean' then
      function_body := $body$
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  -- Fail closed until table-specific RBAC logic is implemented.
  return false;
end;
$fn$;$body$;

    elsif return_type = 'trigger' then
      function_body := $body$
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- Placeholder audit trigger. Replace with write_audits_log(...) once target tables exist.
  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$fn$;$body$;

    elsif return_type = 'uuid' then
      function_body := format($body$
language plpgsql
security definer
set search_path = public
as $fn$
begin
  raise exception 'THERASSISTANT function %s is registered but not implemented yet.'
    using hint = 'Replace this placeholder with table-specific workflow logic before using it in production.';
end;
$fn$;$body$, function_name);

    else
      function_body := format($body$
language plpgsql
security definer
set search_path = public
as $fn$
begin
  return public._function_not_implemented(%L);
end;
$fn$;$body$, function_name);
    end if;

    execute
      'create or replace function public.'
      || quote_ident(function_name)
      || '(' || arg_defs || ') returns '
      || return_type
      || E'\n'
      || function_body;

    execute
      'comment on function public.'
      || quote_ident(function_name)
      || '(' || sig_types || ') is '
      || quote_literal('THERASSISTANT EHR function placeholder registered from uploaded function workbook: ' || source_signature);
  end loop;
end;
$migration$;

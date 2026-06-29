-- THERASSISTANT EHR table-aware core function wiring
-- Generated on 2026-06-29 after the core table scaffold was added.
--
-- The prior function migration registered the RPC/function signatures.
-- This migration replaces those placeholder bodies with generic, table-backed
-- behavior that works against the current scaffold schema:
--   id, tenant_id, name, status, description, external_id, data, timestamps, deleted_at.
--
-- These are intentionally generic implementations. They capture arguments into
-- JSONB, write to the correct module table when possible, and audit function calls.
-- Module-specific business rules should be layered in later migrations as final
-- table columns and constraints are added.

set check_function_bodies = off;

create or replace function public._therassistant_table_exists(p_table_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select to_regclass(format('public.%I', p_table_name)) is not null;
$$;

create or replace function public._therassistant_extract_uuid(p_args jsonb, p_keys text[])
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  key text;
  value_text text;
begin
  foreach key in array p_keys loop
    value_text := nullif(p_args ->> key, '');

    if value_text is not null then
      begin
        return value_text::uuid;
      exception
        when invalid_text_representation then
          null;
      end;
    end if;
  end loop;

  return null;
end;
$$;

create or replace function public._therassistant_current_tenant_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  claims jsonb;
  tenant_value text;
begin
  claims := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  tenant_value := coalesce(
    claims #>> '{app_metadata,current_tenants_id}',
    claims #>> '{app_metadata,current_tenant_id}',
    claims #>> '{user_metadata,current_tenants_id}',
    claims #>> '{user_metadata,current_tenant_id}'
  );

  if tenant_value is null or tenant_value = '' then
    return null;
  end if;

  begin
    return tenant_value::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
end;
$$;

create or replace function public._therassistant_function_status(p_function_name text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  fn text := lower(p_function_name);
begin
  return case
    when fn like 'cancel_%' then 'cancelled'
    when fn like 'mark_%_completed' or fn like 'complete_%' then 'completed'
    when fn like 'mark_%_ready%' then 'ready'
    when fn like 'mark_%_submitted%' or fn like 'record_%submission%' then 'submitted'
    when fn like 'mark_%_accepted%' then 'accepted'
    when fn like 'mark_%_rejected%' then 'rejected'
    when fn like 'approve_%' then 'approved'
    when fn like 'deny_%' or fn like 'reject_%' then 'denied'
    when fn like 'deactivate_%' then 'inactive'
    when fn like 'terminate_%' then 'terminated'
    when fn like 'void_%' then 'voided'
    when fn like 'reverse_%' then 'reversed'
    when fn like 'flag_%' then 'open'
    when fn like 'snooze_%' then 'snoozed'
    when fn like 'escalate_%' then 'escalated'
    when fn like 'reopen_%' then 'open'
    when fn like 'lock_%' then 'locked'
    when fn like 'unlock_%' then 'unlocked'
    when fn like 'sign_%' then 'signed'
    when fn like 'submit_%' then 'submitted'
    when fn like 'clear_%' then 'cleared'
    when fn like 'validate_%' then 'validated'
    when fn like 'create_%' or fn like 'post_%' or fn like 'record_%' or fn like 'add_%' or fn like 'link_%' or fn like 'import_%' then 'created'
    else 'recorded'
  end;
end;
$$;

create or replace function public._therassistant_target_table_for_function(p_function_name text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  fn text := lower(p_function_name);
  target_table text;
begin
  target_table := case
    when fn like '%pre_session_goal_update%' then 'pre_session_goal_updates'
    when fn like '%clinical_note_import%' then 'clinical_note_imports'
    when fn like '%pre_session_safety%' or fn like '%safety_review%' then 'pre_session_safety_reviews'
    when fn like '%pre_session_response%' or fn like '%pre_session_dashboard%' then 'pre_session_responses'
    when fn like '%billing_company%' then 'billing_company_practice_links'
    when fn like '%tenant_user_role%' or fn = 'user_has_role' then 'tenant_user_roles'
    when fn like '%tenant_role%' then 'tenant_roles'
    when fn like '%tenant_user%' then 'tenant_users'
    when fn like '%tenant%' or fn like '%practice%' then 'tenants'
    when fn like '%permission%' then 'permissions'
    when fn like '%phi_access%' then 'phi_access_logs'
    when fn like '%audit%' then 'audits_logs'
    when fn like '%status_history%' then 'status_history'
    when fn like '%client_case_polic%' or fn like '%clients_payers%' or fn like '%client_payers%' then 'client_case_policies'
    when fn like '%eligibility_benefit%' then 'eligibility_benefits'
    when fn like '%eligibility%' or fn like '%copay%' then 'eligibility_checks'
    when fn like '%client_check%' or fn like '%check_in%' or fn like '%on_my_way%' or fn like '%arrived%' then 'client_checkins'
    when fn like '%appointment%' then 'appointments'
    when fn like '%clinical_note%' or fn like '%session_note%' then 'clinical_notes'
    when fn like '%treatment_plan%' then 'treatment_plans'
    when fn like '%goal%' then 'treatment_plan_goals'
    when fn like '%diagnos%' then 'client_diagnoses'
    when fn like '%assessment%' then 'assessment_records'
    when fn like '%screening%' then 'screening_responses'
    when fn like '%charge_validation_error%' then 'charge_validation_errors'
    when fn like '%charge_note%' then 'charge_notes'
    when fn like '%charge%' then 'charges'
    when fn like '%claim_batch%' or fn like '%batch%' then 'claim_batches'
    when fn like '%837%' or fn like '%submission%' or fn like '%clearinghouse%' or fn like '%acknowledgement%' or fn like '%277%' then 'claim_submissions'
    when fn like '%claim_note%' then 'claim_notes'
    when fn like '%claim_correction%' or fn like '%corrected_claim%' then 'claim_corrections'
    when fn like '%claim_reversal%' then 'claim_reversals'
    when fn like '%claim%' then 'claims'
    when fn like '%era%' or fn like '%835%' then 'era_claims'
    when fn like '%eob%' then 'manual_eobs'
    when fn like '%carc%' then 'carc_mappings'
    when fn like '%denial%' then 'claim_denials'
    when fn like '%appeal_document%' then 'claim_appeal_documents'
    when fn like '%appeal_outcome%' then 'appeal_outcomes'
    when fn like '%appeal%' then 'claim_appeals'
    when fn like '%reconsideration%' then 'claim_reconsiderations'
    when fn like '%payment_plan%' then 'payment_plans'
    when fn like '%client_collection%' or fn like '%collection%' or fn like '%invoice%' then 'client_invoice'
    when fn like '%refund%' then 'refund_requests'
    when fn like '%overpayment%' or fn like '%credit_balance%' or fn like '%credit%' then 'credit_balances'
    when fn like '%historical%' then 'historical_transactions'
    when fn like '%adjustment%' then 'payment_adjustments'
    when fn like '%unapplied_payment%' then 'unapplied_payments'
    when fn like '%payment%' then 'payments'
    when fn like '%accounting%' or fn like '%ledger%' or fn like '%balance%' then 'accounting_entries'
    when fn like '%workqueue%' then 'workqueue_items'
    when fn like '%note%' then 'clinical_notes'
    when fn like '%provider_payer%' or fn like '%payer_enrollment%' or fn like '%credentialing%' then 'provider_payer_enrollments'
    when fn like '%provider%' then 'providers'
    when fn like '%fee_schedule%' then 'payer_fee_schedules'
    when fn like '%payer_variance%' or fn like '%underpayment%' then 'report_payer_variance'
    when fn like '%payer%' then 'payers'
    when fn like '%daily_flash%' then 'report_daily_flash'
    when fn like '%ar_summary%' then 'report_ar_summary'
    when fn like '%ar_by_payer%' then 'report_ar_by_payer'
    when fn like '%ar_by_provider%' then 'report_ar_by_provider'
    when fn like '%denials_analysis%' then 'report_denials_analysis'
    when fn like '%clean_claim_rate%' then 'report_clean_claim_rate'
    when fn like '%first_pass_yield%' then 'report_first_pass_yield'
    when fn like '%payment_posting_summary%' then 'report_payment_posting_summary'
    when fn like '%payer_mix%' then 'report_payer_mix'
    when fn like '%provider_productivity%' then 'report_provider_productivity'
    when fn like '%report%' then 'system_events'
    when fn like '%import_file%' then 'import_files'
    when fn like '%import_row%' then 'import_rows'
    when fn like '%import_validation%' then 'import_validation_errors'
    when fn like '%import_mapping%' then 'import_mappings'
    when fn like '%import_commit%' then 'import_commits'
    when fn like '%import_rollback%' then 'import_rollbacks'
    when fn like '%import%' then 'import_batches'
    when fn like '%notification_template%' then 'notification_templates'
    when fn like '%notification_preference%' then 'notification_preferences'
    when fn like '%notification_delivery%' then 'notification_deliveries'
    when fn like '%notification%' or fn like 'notify_%' then 'notifications'
    when fn like '%soft_delete%' or fn like '%restore_soft_deleted%' or fn like '%redact%' or fn like '%export%' then 'system_events'
    else 'system_events'
  end;

  if not public._therassistant_table_exists(target_table) then
    return 'system_events';
  end if;

  return target_table;
end;
$$;

create or replace function public._therassistant_record_audit_event(
  p_tenant_id uuid,
  p_target_table text,
  p_target_id uuid,
  p_action text,
  p_args jsonb,
  p_result jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_id uuid;
begin
  if not public._therassistant_table_exists('audits_logs') then
    return null;
  end if;

  execute format($sql$
    insert into public.%I as t (tenant_id, name, status, description, data)
    values ($1, $2, $3, $4, $5)
    returning t.id
  $sql$, 'audits_logs')
  into audit_id
  using
    p_tenant_id,
    p_action,
    'recorded',
    'Function call audit event',
    jsonb_build_object(
      'target_table', p_target_table,
      'target_id', p_target_id,
      'action', p_action,
      'arguments', coalesce(p_args, '{}'::jsonb),
      'result', coalesce(p_result, '{}'::jsonb),
      'actor_user_id', auth.uid(),
      'created_by_function', true
    );

  return audit_id;
end;
$$;

create or replace function public._therassistant_insert_record(
  p_table_name text,
  p_tenant_id uuid,
  p_name text,
  p_status text,
  p_description text,
  p_external_id text,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row jsonb;
begin
  execute format($sql$
    insert into public.%I as t (tenant_id, name, status, description, external_id, data)
    values ($1, $2, $3, $4, $5, coalesce($6, '{}'::jsonb))
    returning to_jsonb(t)
  $sql$, p_table_name)
  into result_row
  using p_tenant_id, p_name, p_status, p_description, p_external_id, p_data;

  return result_row;
end;
$$;

create or replace function public._therassistant_update_record(
  p_table_name text,
  p_record_id uuid,
  p_tenant_id uuid,
  p_name text,
  p_status text,
  p_description text,
  p_data jsonb,
  p_soft_delete boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row jsonb;
begin
  if p_record_id is null then
    return public._therassistant_insert_record(
      p_table_name,
      p_tenant_id,
      p_name,
      p_status,
      p_description,
      null,
      p_data
    );
  end if;

  execute format($sql$
    update public.%I as t
       set status = coalesce($3, t.status),
           description = coalesce($4, t.description),
           data = coalesce(t.data, '{}'::jsonb) || coalesce($5, '{}'::jsonb),
           deleted_at = case when $6 then now() else t.deleted_at end,
           updated_at = now()
     where t.id = $1
     returning to_jsonb(t)
  $sql$, p_table_name)
  into result_row
  using p_record_id, p_name, p_status, p_description, p_data, p_soft_delete;

  if result_row is null then
    result_row := public._therassistant_insert_record(
      p_table_name,
      p_tenant_id,
      p_name,
      p_status,
      p_description,
      p_record_id::text,
      p_data || jsonb_build_object('referenced_record_id', p_record_id)
    );
  end if;

  return result_row;
end;
$$;

create or replace function public._therassistant_read_records(
  p_table_name text,
  p_tenant_id uuid,
  p_record_id uuid,
  p_args jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result_data jsonb;
begin
  if p_record_id is not null then
    execute format($sql$
      select coalesce(to_jsonb(t), '{}'::jsonb)
      from public.%I as t
      where t.id = $1
      limit 1
    $sql$, p_table_name)
    into result_data
    using p_record_id;

    return coalesce(result_data, jsonb_build_object(
      'found', false,
      'table', p_table_name,
      'record_id', p_record_id,
      'arguments', p_args
    ));
  end if;

  execute format($sql$
    select jsonb_build_object(
      'table', %L,
      'tenant_id', $1,
      'count', count(*),
      'records', coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc) filter (where t.id is not null), '[]'::jsonb)
    )
    from (
      select *
      from public.%I
      where ($1 is null or tenant_id = $1)
        and deleted_at is null
      order by created_at desc
      limit 50
    ) as t
  $sql$, p_table_name, p_table_name)
  into result_data
  using p_tenant_id;

  return coalesce(result_data, jsonb_build_object('table', p_table_name, 'records', '[]'::jsonb));
end;
$$;

create or replace function public._therassistant_core_function_operation(p_function_name text)
returns text
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  fn text := lower(p_function_name);
begin
  if fn like 'get_%'
     or fn like 'report_%'
     or fn like 'generate_%'
     or fn like 'calculate_%'
     or fn like 'compare_%'
     or fn like 'classify_%'
     or fn like 'map_%'
     or fn like 'identify_%'
     or fn like 'validate_%'
     or fn like 'recalculate_%'
  then
    return 'read';
  end if;

  if fn like 'void_%'
     or fn like 'reverse_%'
     or fn like 'unlink_%'
     or fn like 'soft_delete_%'
     or fn like 'deactivate_%'
  then
    return 'soft_delete';
  end if;

  if fn like 'update_%'
     or fn like 'mark_%'
     or fn like 'set_%'
     or fn like 'complete_%'
     or fn like 'cancel_%'
     or fn like 'terminate_%'
     or fn like 'approve_%'
     or fn like 'deny_%'
     or fn like 'reject_%'
     or fn like 'clear_%'
     or fn like 'lock_%'
     or fn like 'unlock_%'
     or fn like 'review_%'
     or fn like 'sign_%'
     or fn like 'submit_%'
     or fn like 'assign_%'
     or fn like 'snooze_%'
     or fn like 'escalate_%'
     or fn like 'reopen_%'
     or fn like 'expire_%'
     or fn like 'restore_%'
  then
    return 'update';
  end if;

  return 'insert';
end;
$$;

create or replace function public._therassistant_dispatch_core_function(p_function_name text, p_args jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_table text;
  operation text;
  status_value text;
  tenant_id uuid;
  target_id uuid;
  result_data jsonb;
  audit_id uuid;
  enriched_data jsonb;
begin
  target_table := public._therassistant_target_table_for_function(p_function_name);
  operation := public._therassistant_core_function_operation(p_function_name);
  status_value := public._therassistant_function_status(p_function_name);

  tenant_id := coalesce(
    public._therassistant_extract_uuid(p_args, array['p_tenants_id', 'p_tenant_id', 'p_practice_id']),
    public._therassistant_current_tenant_id()
  );

  target_id := public._therassistant_extract_uuid(
    p_args,
    array[
      'p_target_id', 'p_source_id', 'p_id',
      'p_clients_id', 'p_client_id',
      'p_claims_id', 'p_claim_id',
      'p_charge_id', 'p_appointments_id', 'p_appointment_id',
      'p_payment_id', 'p_adjustments_id', 'p_adjustment_id',
      'p_denials_id', 'p_denial_id',
      'p_refund_id', 'p_transaction_id', 'p_item_id',
      'p_note_id', 'p_plan_id', 'p_goal_update_id',
      'p_response_id', 'p_clinical_note_id', 'p_auth_id',
      'p_providers_id', 'p_provider_id', 'p_payers_id', 'p_payer_id',
      'p_batch_id', 'p_files_id', 'p_file_id', 'p_imports_id', 'p_import_id',
      'p_notifications_id', 'p_notification_id', 'p_export_id'
    ]
  );

  enriched_data := jsonb_build_object(
    'function_name', p_function_name,
    'operation', operation,
    'target_table', target_table,
    'arguments', coalesce(p_args, '{}'::jsonb),
    'actor_user_id', auth.uid(),
    'created_from_core_function', true
  );

  if operation = 'read' then
    result_data := public._therassistant_read_records(target_table, tenant_id, target_id, p_args)
      || jsonb_build_object('function_name', p_function_name, 'operation', operation);
  elsif operation = 'update' then
    result_data := public._therassistant_update_record(
      target_table,
      target_id,
      tenant_id,
      p_function_name,
      status_value,
      'Updated by THERASSISTANT core function',
      enriched_data,
      false
    );
  elsif operation = 'soft_delete' then
    result_data := public._therassistant_update_record(
      target_table,
      target_id,
      tenant_id,
      p_function_name,
      status_value,
      'Soft-deleted/reversed by THERASSISTANT core function',
      enriched_data,
      true
    );
  else
    result_data := public._therassistant_insert_record(
      target_table,
      tenant_id,
      p_function_name,
      status_value,
      'Created by THERASSISTANT core function',
      target_id::text,
      enriched_data
    );
  end if;

  audit_id := public._therassistant_record_audit_event(
    tenant_id,
    target_table,
    nullif(result_data ->> 'id', '')::uuid,
    p_function_name,
    p_args,
    result_data
  );

  return result_data || jsonb_build_object('audit_id', audit_id);
end;
$$;

-- Keep the original placeholder helper name, but route it to the table-backed dispatcher.
create or replace function public._function_not_implemented(p_function_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public._therassistant_dispatch_core_function(p_function_name, '{}'::jsonb);
end;
$$;

create or replace function public.write_audits_log(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_old_values jsonb,
  p_new_values jsonb,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  audit_id uuid;
  tenant_id uuid;
begin
  tenant_id := public._therassistant_current_tenant_id();

  execute format($sql$
    insert into public.%I as t (tenant_id, name, status, description, external_id, data)
    values ($1, $2, 'recorded', $3, $4, $5)
    returning t.id
  $sql$, 'audits_logs')
  into audit_id
  using
    tenant_id,
    p_action,
    p_target_type,
    p_target_id::text,
    jsonb_build_object(
      'target_type', p_target_type,
      'target_id', p_target_id,
      'action', p_action,
      'old_values', coalesce(p_old_values, '{}'::jsonb),
      'new_values', coalesce(p_new_values, '{}'::jsonb),
      'metadata', coalesce(p_metadata, '{}'::jsonb),
      'actor_user_id', auth.uid()
    );

  return audit_id;
end;
$$;

create or replace function public.audits_insert_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.write_audits_log(tg_table_name, new.id, 'insert', null, to_jsonb(new), jsonb_build_object('trigger', tg_name));
  return new;
end;
$$;

create or replace function public.audits_update_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.write_audits_log(tg_table_name, new.id, 'update', to_jsonb(old), to_jsonb(new), jsonb_build_object('trigger', tg_name));
  return new;
end;
$$;

create or replace function public.audits_delete_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.write_audits_log(tg_table_name, old.id, 'delete', to_jsonb(old), null, jsonb_build_object('trigger', tg_name));
  return old;
end;
$$;

create or replace function public.get_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid();
$$;

create or replace function public.get_current_tenants_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select public._therassistant_current_tenant_id();
$$;

create or replace function public.user_has_tenants_access(p_user_id uuid, p_tenants_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_users tu
    where tu.tenant_id = p_tenants_id
      and tu.deleted_at is null
      and (
        tu.data ->> 'user_id' = p_user_id::text
        or tu.external_id = p_user_id::text
        or tu.id = p_user_id
      )
  );
$$;

create or replace function public.user_has_role(p_user_id uuid, p_tenants_id uuid, p_role_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_user_roles tur
    where tur.tenant_id = p_tenants_id
      and tur.deleted_at is null
      and (
        tur.data ->> 'user_id' = p_user_id::text
        or tur.external_id = p_user_id::text
      )
      and lower(coalesce(tur.data ->> 'role_name', tur.data ->> 'role', tur.name, '')) = lower(p_role_name)
  );
$$;

create or replace function public.user_can_access_practice(p_user_id uuid, p_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_tenants_access(p_user_id, p_practice_id)
  or exists (
    select 1
    from public.billing_company_practice_links link
    join public.tenant_users tu
      on tu.tenant_id = link.tenant_id
     and tu.deleted_at is null
    where link.deleted_at is null
      and (
        link.data ->> 'practice_id' = p_practice_id::text
        or link.external_id = p_practice_id::text
        or link.id = p_practice_id
      )
      and (
        tu.data ->> 'user_id' = p_user_id::text
        or tu.external_id = p_user_id::text
        or tu.id = p_user_id
      )
  );
$$;

create or replace function public.user_can_manage_billing(p_user_id uuid, p_practice_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_can_access_practice(p_user_id, p_practice_id)
     and (
       public.user_has_role(p_user_id, p_practice_id, 'platform_admin')
       or public.user_has_role(p_user_id, p_practice_id, 'practice_admin')
       or public.user_has_role(p_user_id, p_practice_id, 'billing_company_admin')
       or public.user_has_role(p_user_id, p_practice_id, 'billing_manager')
       or public.user_has_role(p_user_id, p_practice_id, 'biller')
     );
$$;

create or replace function public.user_can_view_clinical_record(p_user_id uuid, p_clients_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_clients_id
      and c.deleted_at is null
      and public.user_can_access_practice(p_user_id, c.tenant_id)
      and (
        public.user_has_role(p_user_id, c.tenant_id, 'platform_admin')
        or public.user_has_role(p_user_id, c.tenant_id, 'practice_admin')
        or public.user_has_role(p_user_id, c.tenant_id, 'clinician')
        or public.user_has_role(p_user_id, c.tenant_id, 'supervisor')
      )
  );
$$;

create or replace function public.user_can_view_financials(p_user_id uuid, p_clients_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.clients c
    where c.id = p_clients_id
      and c.deleted_at is null
      and public.user_can_access_practice(p_user_id, c.tenant_id)
      and (
        public.user_has_role(p_user_id, c.tenant_id, 'platform_admin')
        or public.user_has_role(p_user_id, c.tenant_id, 'practice_admin')
        or public.user_has_role(p_user_id, c.tenant_id, 'billing_company_admin')
        or public.user_has_role(p_user_id, c.tenant_id, 'billing_manager')
        or public.user_has_role(p_user_id, c.tenant_id, 'biller')
        or public.user_has_role(p_user_id, c.tenant_id, 'credentialing_specialist')
      )
  );
$$;

create or replace function public.providers_can_bill_payer(p_providers_id uuid, p_payer_id uuid, p_service_date date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.provider_payer_enrollments e
    where e.deleted_at is null
      and (
        e.data ->> 'provider_id' = p_providers_id::text
        or e.external_id = p_providers_id::text
        or e.id = p_providers_id
      )
      and (
        e.data ->> 'payer_id' = p_payer_id::text
        or e.data ->> 'payers_id' = p_payer_id::text
      )
      and coalesce(e.status, e.data ->> 'status', '') in ('active', 'approved', 'enrolled')
      and (
        nullif(e.data ->> 'effective_date', '') is null
        or (e.data ->> 'effective_date')::date <= p_service_date
      )
      and (
        nullif(e.data ->> 'termination_date', '') is null
        or (e.data ->> 'termination_date')::date >= p_service_date
      )
  );
$$;

-- Redefine all jsonb-returning registered workbook functions so they capture
-- their actual arguments and route through the scaffold-table dispatcher.
do $migration$
declare
  proc_record record;
  arg_json_expr text;
  create_sql text;
begin
  for proc_record in
    select
      p.oid,
      p.proname,
      pg_get_function_arguments(p.oid) as args_sql,
      pg_get_function_result(p.oid) as result_sql,
      pg_get_function_identity_arguments(p.oid) as identity_args_sql,
      p.proargnames
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and obj_description(p.oid, 'pg_proc') like 'THERASSISTANT EHR function placeholder registered from uploaded function workbook:%'
      and pg_get_function_result(p.oid) = 'jsonb'
  loop
    select coalesce(
      'jsonb_build_object(' || string_agg(quote_literal(arg_name) || ', to_jsonb(' || quote_ident(arg_name) || ')', ', ') || ')',
      '''{}''::jsonb'
    )
    into arg_json_expr
    from unnest(coalesce(proc_record.proargnames, array[]::text[])) as arg_name
    where arg_name is not null and arg_name <> '';

    create_sql := format($sql$
      create or replace function public.%I(%s)
      returns jsonb
      language plpgsql
      security definer
      set search_path = public, auth
      as $fn$
      begin
        return public._therassistant_dispatch_core_function(%L, %s);
      end;
      $fn$;
    $sql$, proc_record.proname, proc_record.args_sql, proc_record.proname, arg_json_expr);

    execute create_sql;

    execute
      'comment on function public.'
      || quote_ident(proc_record.proname)
      || '(' || proc_record.identity_args_sql || ') is '
      || quote_literal('THERASSISTANT EHR table-aware scaffold implementation for ' || proc_record.proname || '. Arguments are captured into data JSONB until final module-specific columns are added.');
  end loop;
end;
$migration$;

-- THERASSISTANT EHR eligibility, charge capture, and claims implementation layer.
-- Extends the scaffold tables with operational columns and replaces the key
-- placeholder RPCs for pre-submission RCM workflows.

create extension if not exists pgcrypto;

create or replace function public.therassistant_add_column_if_missing(
  p_table_name text,
  p_column_name text,
  p_column_definition text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass(format('public.%I', p_table_name)) is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = p_column_name
  ) then
    execute format('alter table public.%I add column %I %s', p_table_name, p_column_name, p_column_definition);
  end if;
end;
$$;

-- Eligibility / coverage
select public.therassistant_add_column_if_missing('client_case_policies', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('client_case_policies', 'payer_id', 'uuid null');
select public.therassistant_add_column_if_missing('client_case_policies', 'priority', 'text not null default ''primary''');
select public.therassistant_add_column_if_missing('client_case_policies', 'member_id', 'text null');
select public.therassistant_add_column_if_missing('client_case_policies', 'group_number', 'text null');
select public.therassistant_add_column_if_missing('client_case_policies', 'plan_name', 'text null');
select public.therassistant_add_column_if_missing('client_case_policies', 'subscriber_name', 'text null');
select public.therassistant_add_column_if_missing('client_case_policies', 'subscriber_relationship', 'text null');
select public.therassistant_add_column_if_missing('client_case_policies', 'effective_date', 'date null');
select public.therassistant_add_column_if_missing('client_case_policies', 'termination_date', 'date null');
select public.therassistant_add_column_if_missing('client_case_policies', 'copay_amount', 'numeric null');
select public.therassistant_add_column_if_missing('client_case_policies', 'coinsurance_percent', 'numeric null');
select public.therassistant_add_column_if_missing('client_case_policies', 'deductible_remaining', 'numeric null');
select public.therassistant_add_column_if_missing('client_case_policies', 'out_of_pocket_remaining', 'numeric null');
select public.therassistant_add_column_if_missing('client_case_policies', 'authorization_required', 'boolean not null default false');

select public.therassistant_add_column_if_missing('eligibility_checks', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'policy_id', 'uuid null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'payer_id', 'uuid null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'service_date', 'date null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'checked_at', 'timestamptz not null default now()');
select public.therassistant_add_column_if_missing('eligibility_checks', 'eligibility_status', 'text null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'raw_status_text', 'text null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'copay_amount', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'coinsurance_percent', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'deductible_remaining', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'out_of_pocket_remaining', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'authorization_required', 'boolean not null default false');
select public.therassistant_add_column_if_missing('eligibility_checks', 'visit_limit', 'integer null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'visits_used', 'integer null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'reference_number', 'text null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'source', 'text null');
select public.therassistant_add_column_if_missing('eligibility_checks', 'cpt_code', 'text null');

select public.therassistant_add_column_if_missing('eligibility_benefits', 'eligibility_check_id', 'uuid null');
select public.therassistant_add_column_if_missing('eligibility_benefits', 'benefit_type', 'text null');
select public.therassistant_add_column_if_missing('eligibility_benefits', 'amount', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_benefits', 'percent', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_benefits', 'remaining_amount', 'numeric null');

select public.therassistant_add_column_if_missing('eligibility_service_details', 'eligibility_check_id', 'uuid null');
select public.therassistant_add_column_if_missing('eligibility_service_details', 'cpt_code', 'text null');
select public.therassistant_add_column_if_missing('eligibility_service_details', 'authorization_required', 'boolean null');
select public.therassistant_add_column_if_missing('eligibility_service_details', 'copay_amount', 'numeric null');
select public.therassistant_add_column_if_missing('eligibility_service_details', 'coinsurance_percent', 'numeric null');

-- Charge capture
select public.therassistant_add_column_if_missing('charges', 'clinical_note_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'insurance_policy_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'place_of_service', 'text null');
select public.therassistant_add_column_if_missing('charges', 'service_lines', 'jsonb not null default ''[]''::jsonb');
select public.therassistant_add_column_if_missing('charges', 'note_signed', 'boolean not null default false');
select public.therassistant_add_column_if_missing('charges', 'billing_fields_complete', 'boolean not null default false');
select public.therassistant_add_column_if_missing('charges', 'blocker_reasons', 'jsonb not null default ''[]''::jsonb');

-- Claims
select public.therassistant_add_column_if_missing('claims', 'rendering_provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'billing_provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'place_of_service', 'text null');
select public.therassistant_add_column_if_missing('claims', 'frequency_code', 'text not null default ''1''');
select public.therassistant_add_column_if_missing('claims', 'prior_claim_number', 'text null');
select public.therassistant_add_column_if_missing('claims', 'diagnosis_codes', 'text[] not null default array[]::text[]');

select public.therassistant_add_column_if_missing('claim_lines', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('claim_lines', 'line_number', 'integer null');
select public.therassistant_add_column_if_missing('claim_lines', 'procedure_code', 'text null');
select public.therassistant_add_column_if_missing('claim_lines', 'modifiers', 'text[] not null default array[]::text[]');
select public.therassistant_add_column_if_missing('claim_lines', 'diagnosis_pointers', 'text[] not null default array[]::text[]');
select public.therassistant_add_column_if_missing('claim_lines', 'service_date_from', 'date null');
select public.therassistant_add_column_if_missing('claim_lines', 'service_date_to', 'date null');
select public.therassistant_add_column_if_missing('claim_lines', 'units', 'numeric not null default 1');
select public.therassistant_add_column_if_missing('claim_lines', 'unit_of_measure', 'text not null default ''UN''');
select public.therassistant_add_column_if_missing('claim_lines', 'charge_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claim_lines', 'place_of_service', 'text null');
select public.therassistant_add_column_if_missing('claim_lines', 'rendering_provider_npi', 'text null');
select public.therassistant_add_column_if_missing('claim_lines', 'authorization_number', 'text null');

select public.therassistant_add_column_if_missing('claim_diagnoses', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('claim_diagnoses', 'diagnosis_code', 'text null');
select public.therassistant_add_column_if_missing('claim_diagnoses', 'pointer', 'integer null');

select public.therassistant_add_column_if_missing('claim_validation_errors', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('claim_validation_errors', 'field_name', 'text null');
select public.therassistant_add_column_if_missing('claim_validation_errors', 'error_message', 'text null');
select public.therassistant_add_column_if_missing('claim_validation_errors', 'severity', 'text not null default ''error''');
select public.therassistant_add_column_if_missing('claim_validation_errors', 'resolved_at', 'timestamptz null');

select public.therassistant_add_column_if_missing('claim_batches', 'clearinghouse_account_id', 'uuid null');
select public.therassistant_add_column_if_missing('claim_batches', 'payer_id', 'uuid null');
select public.therassistant_add_column_if_missing('claim_batches', 'claim_count', 'integer not null default 0');
select public.therassistant_add_column_if_missing('claim_batches', 'total_charge_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claim_batches', 'submitted_at', 'timestamptz null');

select public.therassistant_add_column_if_missing('batched_claims', 'batch_id', 'uuid null');
select public.therassistant_add_column_if_missing('batched_claims', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('batched_claims', 'line_number', 'integer null');

-- Indexes
create index if not exists idx_client_case_policies_client_dates on public.client_case_policies(client_id, effective_date, termination_date) where deleted_at is null;
create index if not exists idx_eligibility_checks_client_service on public.eligibility_checks(client_id, service_date desc, checked_at desc) where deleted_at is null;
create index if not exists idx_charges_capture_queue on public.charges(tenant_id, status, service_date) where deleted_at is null;
create index if not exists idx_claim_lines_claim on public.claim_lines(claim_id, line_number) where deleted_at is null;
create index if not exists idx_claim_validation_errors_open on public.claim_validation_errors(claim_id) where deleted_at is null and resolved_at is null;
create index if not exists idx_batched_claims_batch on public.batched_claims(batch_id, line_number) where deleted_at is null;

create or replace function public.add_clients_payers(
  p_clients_id uuid,
  p_payer_id uuid,
  p_policy_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_policy public.client_case_policies%rowtype;
begin
  select * into v_client from public.clients where id = p_clients_id and deleted_at is null;
  if v_client.id is null then raise exception 'Client % not found.', p_clients_id; end if;

  insert into public.client_case_policies (
    tenant_id, name, status, client_id, payer_id, priority, member_id, group_number,
    plan_name, subscriber_name, subscriber_relationship, effective_date, termination_date,
    copay_amount, coinsurance_percent, deductible_remaining, out_of_pocket_remaining,
    authorization_required, data
  ) values (
    v_client.tenant_id,
    coalesce(p_policy_data->>'planName', p_policy_data->>'memberId', 'Client coverage'),
    case when nullif(p_policy_data->>'terminationDate', '') is null then 'active' else 'terminated' end,
    p_clients_id,
    p_payer_id,
    coalesce(p_policy_data->>'priority', 'primary'),
    p_policy_data->>'memberId',
    p_policy_data->>'groupNumber',
    p_policy_data->>'planName',
    p_policy_data->>'subscriberName',
    coalesce(p_policy_data->>'subscriberRelationship', 'self'),
    nullif(p_policy_data->>'effectiveDate', '')::date,
    nullif(p_policy_data->>'terminationDate', '')::date,
    nullif(p_policy_data->>'copayAmount', '')::numeric,
    nullif(p_policy_data->>'coinsurancePercent', '')::numeric,
    nullif(p_policy_data->>'deductibleRemaining', '')::numeric,
    nullif(p_policy_data->>'outOfPocketRemaining', '')::numeric,
    coalesce((p_policy_data->>'authorizationRequired')::boolean, false),
    p_policy_data
  ) returning * into v_policy;

  perform public.write_audits_log('client_case_policies', v_policy.id, 'create', null, to_jsonb(v_policy), jsonb_build_object('tenant_id', v_client.tenant_id));
  return to_jsonb(v_policy);
end;
$$;

create or replace function public.get_clients_active_payers(
  p_clients_id uuid,
  p_date_of_service date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.priority), '[]'::jsonb)
  from public.client_case_policies p
  where p.client_id = p_clients_id
    and p.deleted_at is null
    and coalesce(p.status, 'active') not in ('inactive', 'terminated', 'deleted')
    and (p.effective_date is null or p.effective_date <= p_date_of_service)
    and (p.termination_date is null or p.termination_date >= p_date_of_service);
$$;

create or replace function public.verify_eligibility(
  p_clients_id uuid,
  p_policy_id uuid,
  p_service_date date,
  p_benefit_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_policy public.client_case_policies%rowtype;
  v_check public.eligibility_checks%rowtype;
  v_status text;
begin
  select * into v_policy from public.client_case_policies where id = p_policy_id and client_id = p_clients_id and deleted_at is null;
  if v_policy.id is null then raise exception 'Policy % not found for client %.', p_policy_id, p_clients_id; end if;

  v_status := coalesce(p_benefit_data->>'status', p_benefit_data->>'eligibilityStatus', 'needs_review');

  insert into public.eligibility_checks (
    tenant_id, name, status, client_id, policy_id, payer_id, service_date, checked_at,
    eligibility_status, raw_status_text, copay_amount, coinsurance_percent,
    deductible_remaining, out_of_pocket_remaining, authorization_required,
    visit_limit, visits_used, reference_number, source, cpt_code, data
  ) values (
    v_policy.tenant_id,
    concat('Eligibility ', p_service_date::text),
    v_status,
    p_clients_id,
    p_policy_id,
    v_policy.payer_id,
    p_service_date,
    coalesce(nullif(p_benefit_data->>'checkedAt', '')::timestamptz, now()),
    v_status,
    p_benefit_data->>'rawStatusText',
    nullif(p_benefit_data->>'copayAmount', '')::numeric,
    nullif(p_benefit_data->>'coinsurancePercent', '')::numeric,
    nullif(p_benefit_data->>'deductibleRemaining', '')::numeric,
    nullif(p_benefit_data->>'outOfPocketRemaining', '')::numeric,
    coalesce((p_benefit_data->>'authorizationRequired')::boolean, v_policy.authorization_required, false),
    nullif(p_benefit_data->>'visitLimit', '')::integer,
    nullif(p_benefit_data->>'visitsUsed', '')::integer,
    p_benefit_data->>'referenceNumber',
    coalesce(p_benefit_data->>'source', 'manual'),
    p_benefit_data->>'cptCode',
    p_benefit_data
  ) returning * into v_check;

  update public.client_case_policies
  set status = case when v_status in ('active', 'covered') then 'active' else 'needs_review' end,
      copay_amount = coalesce(v_check.copay_amount, copay_amount),
      coinsurance_percent = coalesce(v_check.coinsurance_percent, coinsurance_percent),
      deductible_remaining = coalesce(v_check.deductible_remaining, deductible_remaining),
      out_of_pocket_remaining = coalesce(v_check.out_of_pocket_remaining, out_of_pocket_remaining),
      authorization_required = coalesce(v_check.authorization_required, authorization_required),
      data = coalesce(data, '{}'::jsonb) || jsonb_build_object('latestEligibilityCheckId', v_check.id, 'latestEligibilityStatus', v_status)
  where id = p_policy_id;

  if v_status not in ('active', 'covered') or coalesce(v_check.authorization_required, false) then
    perform public.create_workqueues_item(
      case when coalesce(v_check.authorization_required, false) then 'authorization_required' else 'eligibility_issue' end,
      'eligibility_checks',
      v_check.id,
      case when v_status in ('inactive', 'terminated') then 'high' else 'normal' end,
      null
    );
  end if;

  perform public.write_audits_log('eligibility_checks', v_check.id, 'create', null, to_jsonb(v_check), jsonb_build_object('tenant_id', v_policy.tenant_id));
  return to_jsonb(v_check);
end;
$$;

create or replace function public.get_latest_eligibility(
  p_clients_id uuid,
  p_service_date date
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(e)
  from public.eligibility_checks e
  where e.client_id = p_clients_id
    and e.service_date <= p_service_date
    and e.deleted_at is null
  order by e.service_date desc, e.checked_at desc
  limit 1;
$$;

create or replace function public.get_copay_or_copayers(
  p_clients_id uuid,
  p_service_date date,
  p_cpt_code text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select e.*
    from public.eligibility_checks e
    where e.client_id = p_clients_id
      and e.service_date <= p_service_date
      and (p_cpt_code is null or e.cpt_code is null or e.cpt_code = p_cpt_code)
      and e.deleted_at is null
    order by e.service_date desc, e.checked_at desc
    limit 1
  ), active_policy as (
    select p.*
    from public.client_case_policies p
    where p.client_id = p_clients_id
      and p.deleted_at is null
      and coalesce(p.status, 'active') not in ('inactive', 'terminated', 'deleted')
      and (p.effective_date is null or p.effective_date <= p_service_date)
      and (p.termination_date is null or p.termination_date >= p_service_date)
    order by p.priority
    limit 1
  )
  select jsonb_build_object(
    'clientId', p_clients_id,
    'serviceDate', p_service_date,
    'cptCode', p_cpt_code,
    'policyId', coalesce((select id from latest), (select id from active_policy)),
    'eligibilityCheckId', (select id from latest),
    'eligibilityStatus', coalesce((select eligibility_status from latest), (select status from active_policy)),
    'copayAmount', coalesce((select copay_amount from latest), (select copay_amount from active_policy), 0),
    'coinsurancePercent', coalesce((select coinsurance_percent from latest), (select coinsurance_percent from active_policy), 0),
    'deductibleRemaining', coalesce((select deductible_remaining from latest), (select deductible_remaining from active_policy), 0),
    'authorizationRequired', coalesce((select authorization_required from latest), (select authorization_required from active_policy), false)
  );
$$;

create or replace function public.validate_charge(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge public.charges%rowtype;
  v_errors jsonb := '[]'::jsonb;
  v_line jsonb;
  v_elig jsonb;
begin
  select * into v_charge from public.charges where id = p_charge_id and deleted_at is null;
  if v_charge.id is null then raise exception 'Charge % not found.', p_charge_id; end if;

  delete from public.charge_validation_errors where charge_id = p_charge_id and resolved_at is null;

  if v_charge.client_id is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'client_id', 'message', 'Client is required.')); end if;
  if v_charge.provider_id is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'provider_id', 'message', 'Rendering provider is required.')); end if;
  if v_charge.service_date is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_date', 'message', 'Date of service is required.')); end if;
  if not coalesce(v_charge.note_signed, false) then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'documentation', 'message', 'Signed note is required.')); end if;
  if not coalesce(v_charge.billing_fields_complete, false) then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'required_billing_fields', 'message', 'Required billing fields are incomplete.')); end if;
  if coalesce(jsonb_array_length(v_charge.service_lines), 0) = 0 then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_lines', 'message', 'At least one service line is required.')); end if;
  if coalesce(array_length(v_charge.diagnosis_codes, 1), 0) = 0 then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'diagnosis_codes', 'message', 'At least one diagnosis code is required.')); end if;

  for v_line in select * from jsonb_array_elements(coalesce(v_charge.service_lines, '[]'::jsonb)) loop
    if nullif(v_line->>'procedureCode', '') is null then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_lines.procedure_code', 'message', 'CPT/HCPCS code is required.'));
    end if;
    if coalesce((v_line->>'units')::numeric, 0) <= 0 then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_lines.units', 'message', 'Units must be greater than zero.'));
    end if;
    if coalesce((v_line->>'chargeAmount')::numeric, 0) < 0 then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_lines.charge_amount', 'message', 'Charge amount cannot be negative.'));
    end if;
  end loop;

  if v_charge.client_id is not null and v_charge.service_date is not null then
    v_elig := public.get_copay_or_copayers(v_charge.client_id, v_charge.service_date, v_charge.cpt_code);
    if coalesce(v_elig->>'eligibilityStatus', '') not in ('active', 'covered') then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'eligibility', 'message', 'Eligibility is not active or covered.'));
    end if;
    if coalesce((v_elig->>'authorizationRequired')::boolean, false) then
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'authorization', 'message', 'Authorization is required.'));
    end if;
  end if;

  if jsonb_array_length(v_errors) = 0 then
    update public.charges set status = 'ready_for_claim', blocker_reasons = '[]'::jsonb where id = p_charge_id returning * into v_charge;
    return jsonb_build_object('valid', true, 'errors', '[]'::jsonb, 'charge', to_jsonb(v_charge));
  end if;

  insert into public.charge_validation_errors (tenant_id, name, status, charge_id, field_name, error_message, severity, data)
  select v_charge.tenant_id, issue->>'field', 'open', v_charge.id, issue->>'field', issue->>'message', 'error', issue
  from jsonb_array_elements(v_errors) issue;

  update public.charges set status = 'blocked', blocker_reasons = v_errors where id = p_charge_id returning * into v_charge;
  perform public.create_workqueues_item('charge_capture', 'charges', v_charge.id, 'high', null);

  return jsonb_build_object('valid', false, 'errors', v_errors, 'charge', to_jsonb(v_charge));
end;
$$;

create or replace function public.create_claims_from_charge(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge public.charges%rowtype;
  v_validation jsonb;
  v_claim public.claims%rowtype;
  v_line jsonb;
  v_index integer := 0;
  v_total numeric := 0;
begin
  select * into v_charge from public.charges where id = p_charge_id and deleted_at is null;
  if v_charge.id is null then raise exception 'Charge % not found.', p_charge_id; end if;

  v_validation := public.validate_charge(p_charge_id);
  if not coalesce((v_validation->>'valid')::boolean, false) then
    raise exception 'Charge % is not valid.', p_charge_id using detail = v_validation::text;
  end if;

  for v_line in select * from jsonb_array_elements(coalesce(v_charge.service_lines, '[]'::jsonb)) loop
    v_total := v_total + coalesce((v_line->>'chargeAmount')::numeric, 0) * coalesce((v_line->>'units')::numeric, 1);
  end loop;

  if v_total = 0 then v_total := coalesce(v_charge.charge_amount, 0); end if;

  insert into public.claims (
    tenant_id, name, status, charge_id, client_id, provider_id, rendering_provider_id,
    payer_id, service_date, place_of_service, frequency_code, total_charge_amount,
    open_balance, payer_paid_amount, client_paid_amount, adjustment_amount, diagnosis_codes, data
  ) values (
    v_charge.tenant_id,
    concat('Claim ', v_charge.service_date::text),
    'draft',
    v_charge.id,
    v_charge.client_id,
    v_charge.provider_id,
    v_charge.provider_id,
    v_charge.payer_id,
    v_charge.service_date,
    v_charge.place_of_service,
    '1',
    v_total,
    v_total,
    0,
    0,
    0,
    v_charge.diagnosis_codes,
    jsonb_build_object('sourceChargeId', v_charge.id, 'serviceLines', v_charge.service_lines)
  ) returning * into v_claim;

  for v_line in select * from jsonb_array_elements(coalesce(v_charge.service_lines, '[]'::jsonb)) loop
    v_index := v_index + 1;
    insert into public.claim_lines (
      tenant_id, name, status, claim_id, line_number, procedure_code, modifiers,
      diagnosis_pointers, service_date_from, service_date_to, units, unit_of_measure,
      charge_amount, place_of_service, rendering_provider_npi, authorization_number, data
    ) values (
      v_charge.tenant_id,
      v_line->>'procedureCode',
      'active',
      v_claim.id,
      v_index,
      v_line->>'procedureCode',
      coalesce(array(select jsonb_array_elements_text(coalesce(v_line->'modifiers', '[]'::jsonb))), array[]::text[]),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_line->'diagnosisPointers', '[]'::jsonb))), array['1']::text[]),
      nullif(v_line->>'serviceDateFrom', '')::date,
      nullif(coalesce(v_line->>'serviceDateTo', v_line->>'serviceDateFrom'), '')::date,
      coalesce((v_line->>'units')::numeric, 1),
      'UN',
      coalesce((v_line->>'chargeAmount')::numeric, 0),
      coalesce(v_line->>'placeOfService', v_charge.place_of_service),
      v_line->>'renderingProviderNpi',
      v_line->>'authorizationNumber',
      v_line
    );
  end loop;

  insert into public.claim_diagnoses (tenant_id, name, status, claim_id, diagnosis_code, pointer, data)
  select v_charge.tenant_id, dx, 'active', v_claim.id, dx, ordinality::integer, '{}'::jsonb
  from unnest(v_charge.diagnosis_codes) with ordinality as t(dx, ordinality);

  update public.charges set status = 'claimed', claim_id = v_claim.id where id = v_charge.id;
  perform public.validate_claims(v_claim.id);
  perform public.write_audits_log('claims', v_claim.id, 'create', null, to_jsonb(v_claim), jsonb_build_object('tenant_id', v_claim.tenant_id, 'sourceChargeId', v_charge.id));
  return to_jsonb(v_claim);
end;
$$;

create or replace function public.validate_claims(p_claims_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.claims%rowtype;
  v_errors jsonb := '[]'::jsonb;
  v_line_count integer;
begin
  select * into v_claim from public.claims where id = p_claims_id and deleted_at is null;
  if v_claim.id is null then raise exception 'Claim % not found.', p_claims_id; end if;

  update public.claim_validation_errors set status = 'resolved', resolved_at = now()
  where claim_id = p_claims_id and resolved_at is null;

  select count(*) into v_line_count from public.claim_lines where claim_id = p_claims_id and deleted_at is null;

  if v_claim.client_id is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'client_id', 'message', 'Client is required.')); end if;
  if coalesce(v_claim.rendering_provider_id, v_claim.provider_id) is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'rendering_provider_id', 'message', 'Rendering provider is required.')); end if;
  if v_claim.service_date is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'service_date', 'message', 'Date of service is required.')); end if;
  if v_claim.place_of_service is null then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'place_of_service', 'message', 'Place of service is required.')); end if;
  if coalesce(v_claim.total_charge_amount, 0) <= 0 then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'total_charge_amount', 'message', 'Claim total must be greater than zero.')); end if;
  if coalesce(array_length(v_claim.diagnosis_codes, 1), 0) = 0 then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'diagnosis_codes', 'message', 'At least one diagnosis code is required.')); end if;
  if v_line_count = 0 then v_errors := v_errors || jsonb_build_array(jsonb_build_object('field', 'claim_lines', 'message', 'At least one claim line is required.')); end if;

  if jsonb_array_length(v_errors) = 0 then
    update public.claims set status = 'ready_for_batch' where id = p_claims_id returning * into v_claim;
    return jsonb_build_object('valid', true, 'errors', '[]'::jsonb, 'claim', to_jsonb(v_claim));
  end if;

  insert into public.claim_validation_errors (tenant_id, name, status, claim_id, field_name, error_message, severity, data)
  select v_claim.tenant_id, issue->>'field', 'open', v_claim.id, issue->>'field', issue->>'message', 'error', issue
  from jsonb_array_elements(v_errors) issue;

  update public.claims set status = 'validation_failed' where id = p_claims_id returning * into v_claim;
  perform public.create_workqueues_item('claim_build_errors', 'claims', v_claim.id, 'high', null);
  return jsonb_build_object('valid', false, 'errors', v_errors, 'claim', to_jsonb(v_claim));
end;
$$;

create or replace function public.mark_claims_ready_for_batch(p_claims_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.validate_claims(p_claims_id);
  if not coalesce((v_result->>'valid')::boolean, false) then
    raise exception 'Claim % has validation errors.', p_claims_id using detail = v_result::text;
  end if;
  return v_result;
end;
$$;

create or replace function public.create_claims_batch(p_tenants_id uuid, p_claims_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.claim_batches%rowtype;
  v_claim_id uuid;
  v_index integer := 0;
  v_total numeric;
begin
  if coalesce(array_length(p_claims_ids, 1), 0) = 0 then raise exception 'At least one claim is required.'; end if;

  select coalesce(sum(total_charge_amount), 0) into v_total
  from public.claims
  where tenant_id = p_tenants_id and id = any(p_claims_ids) and deleted_at is null;

  insert into public.claim_batches (tenant_id, name, status, claim_count, total_charge_amount, data)
  values (p_tenants_id, concat('Claim batch ', current_date::text), 'draft', array_length(p_claims_ids, 1), v_total, '{}'::jsonb)
  returning * into v_batch;

  foreach v_claim_id in array p_claims_ids loop
    v_index := v_index + 1;
    insert into public.batched_claims (tenant_id, name, status, batch_id, claim_id, line_number, data)
    values (p_tenants_id, concat('Batch item ', v_index), 'active', v_batch.id, v_claim_id, v_index, '{}'::jsonb);
    update public.claims set status = 'batched' where id = v_claim_id and tenant_id = p_tenants_id;
  end loop;

  perform public.write_audits_log('claim_batches', v_batch.id, 'create', null, to_jsonb(v_batch), jsonb_build_object('tenant_id', p_tenants_id, 'claimIds', p_claims_ids));
  return to_jsonb(v_batch);
end;
$$;

create or replace function public.get_claims_balance(p_claims_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'claimId', c.id,
    'totalChargeAmount', c.total_charge_amount,
    'payerPaidAmount', c.payer_paid_amount,
    'clientPaidAmount', c.client_paid_amount,
    'adjustmentAmount', c.adjustment_amount,
    'openBalance', c.open_balance
  )
  from public.claims c
  where c.id = p_claims_id;
$$;

create or replace function public.recalculate_claims_status(p_claims_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claim public.claims%rowtype;
begin
  select * into v_claim from public.claims where id = p_claims_id and deleted_at is null;
  if v_claim.id is null then raise exception 'Claim % not found.', p_claims_id; end if;

  update public.claims
  set open_balance = greatest(coalesce(total_charge_amount, 0) - coalesce(payer_paid_amount, 0) - coalesce(client_paid_amount, 0) - coalesce(adjustment_amount, 0), 0),
      status = case
        when coalesce(total_charge_amount, 0) - coalesce(payer_paid_amount, 0) - coalesce(client_paid_amount, 0) - coalesce(adjustment_amount, 0) <= 0 then 'paid'
        else status
      end
  where id = p_claims_id
  returning * into v_claim;

  return to_jsonb(v_claim);
end;
$$;

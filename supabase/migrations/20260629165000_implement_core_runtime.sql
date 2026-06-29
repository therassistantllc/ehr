-- THERASSISTANT EHR core runtime implementation
-- Adds real columns and working RPCs on top of the earlier scaffold tables.
-- This is intentionally focused on the minimum viable operational spine:
-- tenants/access, audit logs, workqueues, clients, appointments/check-in,
-- charge creation, claim creation, and historical payment posting.

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

comment on function public.therassistant_add_column_if_missing(text, text, text)
is 'Safely adds implementation columns to scaffold tables when they exist.';

-- Tenants / users / RBAC
select public.therassistant_add_column_if_missing('tenants', 'tenant_type', 'text null');
select public.therassistant_add_column_if_missing('tenants', 'display_name', 'text null');
select public.therassistant_add_column_if_missing('tenants', 'timezone', 'text not null default ''America/Denver''');
select public.therassistant_add_column_if_missing('tenants', 'legal_name', 'text null');

select public.therassistant_add_column_if_missing('tenant_users', 'user_id', 'uuid null');
select public.therassistant_add_column_if_missing('tenant_users', 'role_name', 'text null');
select public.therassistant_add_column_if_missing('tenant_users', 'is_default', 'boolean not null default false');
select public.therassistant_add_column_if_missing('tenant_users', 'invited_email', 'text null');
select public.therassistant_add_column_if_missing('tenant_users', 'last_accessed_at', 'timestamptz null');

select public.therassistant_add_column_if_missing('tenant_roles', 'role_name', 'text null');
select public.therassistant_add_column_if_missing('tenant_roles', 'is_system_role', 'boolean not null default false');

select public.therassistant_add_column_if_missing('tenant_user_roles', 'tenant_user_id', 'uuid null');
select public.therassistant_add_column_if_missing('tenant_user_roles', 'role_id', 'uuid null');
select public.therassistant_add_column_if_missing('tenant_user_roles', 'role_name', 'text null');

select public.therassistant_add_column_if_missing('billing_company_practice_links', 'billing_company_tenant_id', 'uuid null');
select public.therassistant_add_column_if_missing('billing_company_practice_links', 'practice_tenant_id', 'uuid null');
select public.therassistant_add_column_if_missing('billing_company_practice_links', 'linked_at', 'timestamptz not null default now()');
select public.therassistant_add_column_if_missing('billing_company_practice_links', 'unlinked_at', 'timestamptz null');

select public.therassistant_add_column_if_missing('user_profiles', 'user_id', 'uuid null');
select public.therassistant_add_column_if_missing('user_profiles', 'email', 'text null');
select public.therassistant_add_column_if_missing('user_profiles', 'first_name', 'text null');
select public.therassistant_add_column_if_missing('user_profiles', 'last_name', 'text null');

-- Audit / status / workqueue
select public.therassistant_add_column_if_missing('audits_logs', 'actor_user_id', 'uuid null');
select public.therassistant_add_column_if_missing('audits_logs', 'target_type', 'text null');
select public.therassistant_add_column_if_missing('audits_logs', 'target_id', 'uuid null');
select public.therassistant_add_column_if_missing('audits_logs', 'action', 'text null');
select public.therassistant_add_column_if_missing('audits_logs', 'old_values', 'jsonb null');
select public.therassistant_add_column_if_missing('audits_logs', 'new_values', 'jsonb null');
select public.therassistant_add_column_if_missing('audits_logs', 'metadata', 'jsonb not null default ''{}''::jsonb');

select public.therassistant_add_column_if_missing('status_history', 'actor_user_id', 'uuid null');
select public.therassistant_add_column_if_missing('status_history', 'target_type', 'text null');
select public.therassistant_add_column_if_missing('status_history', 'target_id', 'uuid null');
select public.therassistant_add_column_if_missing('status_history', 'from_status', 'text null');
select public.therassistant_add_column_if_missing('status_history', 'to_status', 'text null');
select public.therassistant_add_column_if_missing('status_history', 'reason', 'text null');
select public.therassistant_add_column_if_missing('status_history', 'metadata', 'jsonb not null default ''{}''::jsonb');

select public.therassistant_add_column_if_missing('workqueue_items', 'workqueue_type', 'text null');
select public.therassistant_add_column_if_missing('workqueue_items', 'source_type', 'text null');
select public.therassistant_add_column_if_missing('workqueue_items', 'source_id', 'uuid null');
select public.therassistant_add_column_if_missing('workqueue_items', 'priority', 'text not null default ''normal''');
select public.therassistant_add_column_if_missing('workqueue_items', 'assigned_to', 'uuid null');
select public.therassistant_add_column_if_missing('workqueue_items', 'due_at', 'timestamptz null');

-- Clients / providers / appointments / check-in
select public.therassistant_add_column_if_missing('clients', 'first_name', 'text null');
select public.therassistant_add_column_if_missing('clients', 'last_name', 'text null');
select public.therassistant_add_column_if_missing('clients', 'preferred_name', 'text null');
select public.therassistant_add_column_if_missing('clients', 'date_of_birth', 'date null');
select public.therassistant_add_column_if_missing('clients', 'email', 'text null');
select public.therassistant_add_column_if_missing('clients', 'phone', 'text null');

select public.therassistant_add_column_if_missing('providers', 'first_name', 'text null');
select public.therassistant_add_column_if_missing('providers', 'last_name', 'text null');
select public.therassistant_add_column_if_missing('providers', 'npi', 'text null');
select public.therassistant_add_column_if_missing('providers', 'taxonomy', 'text null');

select public.therassistant_add_column_if_missing('appointments', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('appointments', 'provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('appointments', 'start_time', 'timestamptz null');
select public.therassistant_add_column_if_missing('appointments', 'end_time', 'timestamptz null');
select public.therassistant_add_column_if_missing('appointments', 'service_type', 'text null');
select public.therassistant_add_column_if_missing('appointments', 'location_id', 'uuid null');
select public.therassistant_add_column_if_missing('appointments', 'telehealth', 'boolean not null default false');
select public.therassistant_add_column_if_missing('appointments', 'checkin_status', 'text null');

select public.therassistant_add_column_if_missing('client_checkins', 'appointment_id', 'uuid null');
select public.therassistant_add_column_if_missing('client_checkins', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('client_checkins', 'provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('client_checkins', 'checkin_status', 'text null');
select public.therassistant_add_column_if_missing('client_checkins', 'safety_concern', 'boolean not null default false');
select public.therassistant_add_column_if_missing('client_checkins', 'client_note', 'text null');

select public.therassistant_add_column_if_missing('pre_session_responses', 'appointment_id', 'uuid null');
select public.therassistant_add_column_if_missing('pre_session_responses', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('pre_session_responses', 'provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('pre_session_responses', 'response_data', 'jsonb not null default ''{}''::jsonb');
select public.therassistant_add_column_if_missing('pre_session_responses', 'reviewed_at', 'timestamptz null');
select public.therassistant_add_column_if_missing('pre_session_responses', 'reviewed_by', 'uuid null');
select public.therassistant_add_column_if_missing('pre_session_responses', 'safety_concern', 'boolean not null default false');

-- Billing spine
select public.therassistant_add_column_if_missing('charges', 'appointment_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('charges', 'service_date', 'date null');
select public.therassistant_add_column_if_missing('charges', 'cpt_code', 'text null');
select public.therassistant_add_column_if_missing('charges', 'units', 'numeric not null default 1');
select public.therassistant_add_column_if_missing('charges', 'charge_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('charges', 'diagnosis_codes', 'text[] not null default array[]::text[]');
select public.therassistant_add_column_if_missing('charges', 'modifiers', 'text[] not null default array[]::text[]');

select public.therassistant_add_column_if_missing('charge_validation_errors', 'charge_id', 'uuid null');
select public.therassistant_add_column_if_missing('charge_validation_errors', 'field_name', 'text null');
select public.therassistant_add_column_if_missing('charge_validation_errors', 'error_message', 'text null');
select public.therassistant_add_column_if_missing('charge_validation_errors', 'severity', 'text not null default ''error''');
select public.therassistant_add_column_if_missing('charge_validation_errors', 'resolved_at', 'timestamptz null');

select public.therassistant_add_column_if_missing('claims', 'charge_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'provider_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'payer_id', 'uuid null');
select public.therassistant_add_column_if_missing('claims', 'service_date', 'date null');
select public.therassistant_add_column_if_missing('claims', 'total_charge_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claims', 'payer_paid_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claims', 'client_paid_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claims', 'adjustment_amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('claims', 'open_balance', 'numeric not null default 0');

select public.therassistant_add_column_if_missing('payments', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('payments', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('payments', 'amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('payments', 'payment_date', 'date null');
select public.therassistant_add_column_if_missing('payments', 'source', 'text null');
select public.therassistant_add_column_if_missing('payments', 'method', 'text null');
select public.therassistant_add_column_if_missing('payments', 'reference_number', 'text null');
select public.therassistant_add_column_if_missing('payments', 'is_historical', 'boolean not null default false');
select public.therassistant_add_column_if_missing('payments', 'reversed_at', 'timestamptz null');
select public.therassistant_add_column_if_missing('payments', 'reversal_reason', 'text null');

select public.therassistant_add_column_if_missing('payment_allocations', 'payment_id', 'uuid null');
select public.therassistant_add_column_if_missing('payment_allocations', 'client_id', 'uuid null');
select public.therassistant_add_column_if_missing('payment_allocations', 'claim_id', 'uuid null');
select public.therassistant_add_column_if_missing('payment_allocations', 'amount', 'numeric not null default 0');
select public.therassistant_add_column_if_missing('payment_allocations', 'allocation_type', 'text null');

-- Practical indexes. They are guarded by table existence.
do $$
begin
  if to_regclass('public.tenant_users') is not null then
    create index if not exists idx_tenant_users_user_tenant on public.tenant_users(user_id, tenant_id) where deleted_at is null;
  end if;

  if to_regclass('public.billing_company_practice_links') is not null then
    create index if not exists idx_billing_company_practice_links_active on public.billing_company_practice_links(billing_company_tenant_id, practice_tenant_id) where deleted_at is null and status = 'active';
  end if;

  if to_regclass('public.appointments') is not null then
    create index if not exists idx_appointments_tenant_start on public.appointments(tenant_id, start_time) where deleted_at is null;
    create index if not exists idx_appointments_client on public.appointments(client_id) where deleted_at is null;
    create index if not exists idx_appointments_provider on public.appointments(provider_id) where deleted_at is null;
  end if;

  if to_regclass('public.charges') is not null then
    create index if not exists idx_charges_client_service_date on public.charges(client_id, service_date) where deleted_at is null;
    create index if not exists idx_charges_claim_status on public.charges(claim_id, status) where deleted_at is null;
  end if;

  if to_regclass('public.claims') is not null then
    create index if not exists idx_claims_client_status on public.claims(client_id, status) where deleted_at is null;
    create index if not exists idx_claims_open_balance on public.claims(tenant_id, open_balance) where deleted_at is null and open_balance <> 0;
  end if;

  if to_regclass('public.payments') is not null then
    create index if not exists idx_payments_client_date on public.payments(client_id, payment_date) where deleted_at is null;
  end if;
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
set search_path = public
as $$
  select nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb #>> '{app_metadata,current_tenants_id}',
    ''
  )::uuid;
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
    where tu.user_id = p_user_id
      and tu.tenant_id = p_tenants_id
      and coalesce(tu.status, 'active') = 'active'
      and tu.deleted_at is null
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
    from public.tenant_users tu
    where tu.user_id = p_user_id
      and tu.tenant_id = p_tenants_id
      and coalesce(tu.status, 'active') = 'active'
      and tu.deleted_at is null
      and (
        lower(coalesce(tu.role_name, '')) = lower(p_role_name)
        or lower(coalesce(tu.data->>'role', '')) = lower(p_role_name)
        or exists (
          select 1
          from public.tenant_user_roles tur
          left join public.tenant_roles tr on tr.id = tur.role_id
          where tur.tenant_user_id = tu.id
            and tur.deleted_at is null
            and lower(coalesce(tur.role_name, tr.role_name, tr.name, '')) = lower(p_role_name)
        )
      )
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
    from public.tenant_users tu
    join public.billing_company_practice_links bcpl
      on bcpl.billing_company_tenant_id = tu.tenant_id
    where tu.user_id = p_user_id
      and bcpl.practice_tenant_id = p_practice_id
      and coalesce(tu.status, 'active') = 'active'
      and coalesce(bcpl.status, 'active') = 'active'
      and tu.deleted_at is null
      and bcpl.deleted_at is null
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
    public.user_has_role(p_user_id, p_practice_id, 'practice_admin')
    or public.user_has_role(p_user_id, p_practice_id, 'biller')
    or exists (
      select 1
      from public.tenant_users tu
      join public.billing_company_practice_links bcpl
        on bcpl.billing_company_tenant_id = tu.tenant_id
      where tu.user_id = p_user_id
        and bcpl.practice_tenant_id = p_practice_id
        and coalesce(tu.status, 'active') = 'active'
        and coalesce(bcpl.status, 'active') = 'active'
        and lower(coalesce(tu.role_name, tu.data->>'role', '')) in ('billing_company_admin', 'billing_staff', 'biller')
        and tu.deleted_at is null
        and bcpl.deleted_at is null
    )
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
      and (
        public.user_has_role(p_user_id, c.tenant_id, 'practice_admin')
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
      and public.user_can_manage_billing(p_user_id, c.tenant_id)
  );
$$;

create or replace function public.write_audits_log(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_audit_id uuid;
  v_tenant_id uuid;
begin
  v_tenant_id := coalesce(public.get_current_tenants_id(), nullif(p_metadata->>'tenant_id', '')::uuid);

  insert into public.audits_logs (
    tenant_id,
    actor_user_id,
    target_type,
    target_id,
    action,
    old_values,
    new_values,
    metadata
  ) values (
    v_tenant_id,
    public.get_current_user_id(),
    p_target_type,
    p_target_id,
    p_action,
    p_old_values,
    p_new_values,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_audit_id;

  return v_audit_id;
end;
$$;

create or replace function public.create_workqueues_item(
  p_type text,
  p_source_type text,
  p_source_id uuid,
  p_priority text default 'normal',
  p_assigned_to uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.workqueue_items%rowtype;
  v_tenant_id uuid;
begin
  v_tenant_id := public.get_current_tenants_id();

  insert into public.workqueue_items (
    tenant_id,
    name,
    status,
    workqueue_type,
    source_type,
    source_id,
    priority,
    assigned_to,
    data
  ) values (
    v_tenant_id,
    p_type,
    'open',
    p_type,
    p_source_type,
    p_source_id,
    coalesce(p_priority, 'normal'),
    p_assigned_to,
    '{}'::jsonb
  )
  returning * into v_item;

  perform public.write_audits_log('workqueue_items', v_item.id, 'create', null, to_jsonb(v_item), jsonb_build_object('tenant_id', v_tenant_id));

  return to_jsonb(v_item);
end;
$$;

create or replace function public.create_clients_with_profiles(
  p_tenants_id uuid,
  p_clients_data jsonb,
  p_payers_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
begin
  insert into public.clients (
    tenant_id,
    name,
    status,
    first_name,
    last_name,
    preferred_name,
    date_of_birth,
    email,
    phone,
    external_id,
    data
  ) values (
    p_tenants_id,
    btrim(concat_ws(' ', coalesce(p_clients_data->>'preferredName', p_clients_data->>'firstName'), p_clients_data->>'lastName')),
    coalesce(p_clients_data->>'status', 'active'),
    p_clients_data->>'firstName',
    p_clients_data->>'lastName',
    p_clients_data->>'preferredName',
    nullif(p_clients_data->>'dateOfBirth', '')::date,
    p_clients_data->>'email',
    p_clients_data->>'phone',
    p_clients_data->>'externalId',
    jsonb_build_object('client', p_clients_data, 'payers', coalesce(p_payers_data, '{}'::jsonb))
  )
  returning * into v_client;

  perform public.write_audits_log('clients', v_client.id, 'create', null, to_jsonb(v_client), jsonb_build_object('tenant_id', p_tenants_id));

  return to_jsonb(v_client);
end;
$$;

create or replace function public.create_appointments(
  p_clients_id uuid,
  p_providers_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_service_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_appointment public.appointments%rowtype;
begin
  select * into v_client from public.clients where id = p_clients_id and deleted_at is null;

  if v_client.id is null then
    raise exception 'Client % not found.', p_clients_id;
  end if;

  insert into public.appointments (
    tenant_id,
    name,
    status,
    client_id,
    provider_id,
    start_time,
    end_time,
    service_type,
    data
  ) values (
    v_client.tenant_id,
    p_service_type,
    'scheduled',
    p_clients_id,
    p_providers_id,
    p_start_time,
    p_end_time,
    p_service_type,
    '{}'::jsonb
  )
  returning * into v_appointment;

  perform public.write_audits_log('appointments', v_appointment.id, 'create', null, to_jsonb(v_appointment), jsonb_build_object('tenant_id', v_client.tenant_id));

  return to_jsonb(v_appointment);
end;
$$;

create or replace function public.clients_check_in(
  p_appointments_id uuid,
  p_checkin_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_checkin public.client_checkins%rowtype;
  v_response public.pre_session_responses%rowtype;
  v_status text;
  v_safety boolean;
begin
  select * into v_appointment from public.appointments where id = p_appointments_id and deleted_at is null;

  if v_appointment.id is null then
    raise exception 'Appointment % not found.', p_appointments_id;
  end if;

  v_status := coalesce(p_checkin_data->>'status', 'checked_in');
  v_safety := coalesce((p_checkin_data->>'safetyConcern')::boolean, false);

  insert into public.client_checkins (
    tenant_id,
    name,
    status,
    appointment_id,
    client_id,
    provider_id,
    checkin_status,
    safety_concern,
    client_note,
    data
  ) values (
    v_appointment.tenant_id,
    v_status,
    'submitted',
    v_appointment.id,
    v_appointment.client_id,
    v_appointment.provider_id,
    v_status,
    v_safety,
    p_checkin_data->>'clientNote',
    p_checkin_data
  ) returning * into v_checkin;

  update public.appointments
  set status = v_status,
      checkin_status = v_status,
      data = coalesce(data, '{}'::jsonb) || jsonb_build_object('lastCheckInId', v_checkin.id, 'safetyConcern', v_safety)
  where id = v_appointment.id;

  if p_checkin_data ? 'responses' then
    insert into public.pre_session_responses (
      tenant_id,
      name,
      status,
      appointment_id,
      client_id,
      provider_id,
      response_data,
      safety_concern,
      data
    ) values (
      v_appointment.tenant_id,
      'Pre-session response',
      case when v_safety then 'needs_safety_review' else 'submitted' end,
      v_appointment.id,
      v_appointment.client_id,
      v_appointment.provider_id,
      coalesce(p_checkin_data->'responses', '{}'::jsonb),
      v_safety,
      jsonb_build_object('checkInId', v_checkin.id)
    ) returning * into v_response;
  end if;

  if v_safety then
    perform public.create_workqueues_item('safety_review', 'appointments', v_appointment.id, 'urgent', null);
  end if;

  perform public.write_audits_log('client_checkins', v_checkin.id, 'create', null, to_jsonb(v_checkin), jsonb_build_object('tenant_id', v_appointment.tenant_id));

  return jsonb_build_object('checkIn', to_jsonb(v_checkin), 'preSessionResponse', to_jsonb(v_response));
end;
$$;

create or replace function public.mark_clients_on_my_way(p_appointments_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.clients_check_in(p_appointments_id, jsonb_build_object('status', 'on_my_way'));
$$;

create or replace function public.mark_clients_arrived(p_appointments_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.clients_check_in(p_appointments_id, jsonb_build_object('status', 'arrived'));
$$;

create or replace function public.create_charge_from_appointments(p_appointments_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_charge public.charges%rowtype;
begin
  select * into v_appointment from public.appointments where id = p_appointments_id and deleted_at is null;

  if v_appointment.id is null then
    raise exception 'Appointment % not found.', p_appointments_id;
  end if;

  insert into public.charges (
    tenant_id,
    name,
    status,
    appointment_id,
    client_id,
    provider_id,
    service_date,
    cpt_code,
    units,
    charge_amount,
    data
  ) values (
    v_appointment.tenant_id,
    coalesce(v_appointment.service_type, 'billable service'),
    'draft',
    v_appointment.id,
    v_appointment.client_id,
    v_appointment.provider_id,
    v_appointment.start_time::date,
    coalesce(v_appointment.service_type, '90837'),
    1,
    coalesce((v_appointment.data->>'chargeAmount')::numeric, 0),
    jsonb_build_object('sourceAppointmentId', v_appointment.id)
  ) returning * into v_charge;

  perform public.write_audits_log('charges', v_charge.id, 'create', null, to_jsonb(v_charge), jsonb_build_object('tenant_id', v_appointment.tenant_id));

  return to_jsonb(v_charge);
end;
$$;

create or replace function public.validate_charge(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_charge public.charges%rowtype;
  v_errors text[] := array[]::text[];
  v_error text;
begin
  select * into v_charge from public.charges where id = p_charge_id and deleted_at is null;

  if v_charge.id is null then
    raise exception 'Charge % not found.', p_charge_id;
  end if;

  delete from public.charge_validation_errors where charge_id = p_charge_id and resolved_at is null;

  if v_charge.client_id is null then v_errors := array_append(v_errors, 'Missing client.'); end if;
  if v_charge.provider_id is null then v_errors := array_append(v_errors, 'Missing rendering provider.'); end if;
  if v_charge.service_date is null then v_errors := array_append(v_errors, 'Missing service date.'); end if;
  if nullif(v_charge.cpt_code, '') is null then v_errors := array_append(v_errors, 'Missing CPT/HCPCS code.'); end if;
  if coalesce(v_charge.charge_amount, 0) < 0 then v_errors := array_append(v_errors, 'Charge amount cannot be negative.'); end if;

  if array_length(v_errors, 1) is null then
    update public.charges set status = 'ready_for_claim' where id = p_charge_id returning * into v_charge;
    return jsonb_build_object('valid', true, 'errors', '[]'::jsonb, 'charge', to_jsonb(v_charge));
  end if;

  foreach v_error in array v_errors loop
    insert into public.charge_validation_errors (
      tenant_id,
      name,
      status,
      charge_id,
      error_message,
      severity,
      data
    ) values (
      v_charge.tenant_id,
      'Charge validation error',
      'open',
      v_charge.id,
      v_error,
      'error',
      '{}'::jsonb
    );
  end loop;

  update public.charges set status = 'blocked' where id = p_charge_id returning * into v_charge;
  perform public.create_workqueues_item('charge_validation', 'charges', v_charge.id, 'high', null);

  return jsonb_build_object('valid', false, 'errors', to_jsonb(v_errors), 'charge', to_jsonb(v_charge));
end;
$$;

create or replace function public.mark_charge_ready_for_claims(p_charge_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  v_result := public.validate_charge(p_charge_id);

  if not coalesce((v_result->>'valid')::boolean, false) then
    raise exception 'Charge % is not ready for claim creation.', p_charge_id using detail = v_result::text;
  end if;

  return v_result;
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
begin
  select * into v_charge from public.charges where id = p_charge_id and deleted_at is null;

  if v_charge.id is null then
    raise exception 'Charge % not found.', p_charge_id;
  end if;

  v_validation := public.validate_charge(p_charge_id);

  if not coalesce((v_validation->>'valid')::boolean, false) then
    raise exception 'Charge % is not valid.', p_charge_id using detail = v_validation::text;
  end if;

  insert into public.claims (
    tenant_id,
    name,
    status,
    charge_id,
    client_id,
    provider_id,
    service_date,
    total_charge_amount,
    open_balance,
    data
  ) values (
    v_charge.tenant_id,
    concat('Claim ', v_charge.service_date::text),
    'draft',
    v_charge.id,
    v_charge.client_id,
    v_charge.provider_id,
    v_charge.service_date,
    coalesce(v_charge.charge_amount, 0),
    coalesce(v_charge.charge_amount, 0),
    jsonb_build_object('sourceChargeId', v_charge.id, 'cptCode', v_charge.cpt_code)
  ) returning * into v_claim;

  update public.charges set status = 'claimed', claim_id = v_claim.id where id = v_charge.id;
  perform public.write_audits_log('claims', v_claim.id, 'create', null, to_jsonb(v_claim), jsonb_build_object('tenant_id', v_claim.tenant_id, 'sourceChargeId', v_charge.id));

  return to_jsonb(v_claim);
end;
$$;

create or replace function public.post_historical_payment(
  p_clients_id uuid,
  p_payment_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client public.clients%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_client from public.clients where id = p_clients_id and deleted_at is null;

  if v_client.id is null then
    raise exception 'Client % not found.', p_clients_id;
  end if;

  if coalesce((p_payment_data->>'amount')::numeric, 0) = 0 then
    raise exception 'Historical payment amount cannot be zero.';
  end if;

  insert into public.payments (
    tenant_id,
    name,
    status,
    client_id,
    amount,
    payment_date,
    source,
    method,
    reference_number,
    is_historical,
    data
  ) values (
    v_client.tenant_id,
    'Historical payment',
    'posted',
    v_client.id,
    (p_payment_data->>'amount')::numeric,
    nullif(p_payment_data->>'paymentDate', '')::date,
    coalesce(p_payment_data->>'source', 'historical'),
    p_payment_data->>'method',
    p_payment_data->>'referenceNumber',
    true,
    p_payment_data
  ) returning * into v_payment;

  insert into public.payment_allocations (
    tenant_id,
    name,
    status,
    payment_id,
    client_id,
    claim_id,
    amount,
    allocation_type,
    data
  ) values (
    v_client.tenant_id,
    'Historical payment allocation',
    'posted',
    v_payment.id,
    v_client.id,
    null,
    v_payment.amount,
    'historical_client_ledger',
    '{}'::jsonb
  );

  perform public.write_audits_log('payments', v_payment.id, 'create', null, to_jsonb(v_payment), jsonb_build_object('tenant_id', v_client.tenant_id, 'historical', true));

  return to_jsonb(v_payment);
end;
$$;

create or replace function public.get_client_balance(p_clients_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with claim_balances as (
    select coalesce(sum(open_balance), 0)::numeric as amount
    from public.claims
    where client_id = p_clients_id
      and deleted_at is null
      and coalesce(status, '') not in ('void', 'reversed')
  ),
  historical_payments as (
    select coalesce(sum(amount), 0)::numeric as amount
    from public.payment_allocations
    where client_id = p_clients_id
      and deleted_at is null
      and claim_id is null
  )
  select jsonb_build_object(
    'clientId', p_clients_id,
    'claimOpenBalance', claim_balances.amount,
    'historicalUnappliedCredits', historical_payments.amount,
    'clientBalance', claim_balances.amount - historical_payments.amount
  )
  from claim_balances, historical_payments;
$$;

create or replace function public.get_open_balance(p_clients_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.get_client_balance(p_clients_id);
$$;

alter table public.insurance_policies
  add column if not exists authorization_required boolean not null default false;

alter table public.eligibility_checks
  add column if not exists service_date date,
  add column if not exists cpt_code text,
  add column if not exists coinsurance_percent numeric,
  add column if not exists out_of_pocket_remaining numeric,
  add column if not exists reference_number text,
  add column if not exists source text not null default 'manual';

update public.eligibility_checks
set service_date = coalesce(service_date, checked_at::date, coverage_start_date, created_at::date)
where service_date is null;

alter table public.charges
  add column if not exists note_signed boolean not null default false,
  add column if not exists billing_fields_complete boolean not null default false;

alter table public.claims
  add column if not exists service_date date;

update public.claims c
set service_date = coalesce(
  c.service_date,
  (select min(csl.service_date_from) from public.claim_service_lines csl where csl.claim_id = c.id),
  c.first_billed_date,
  c.created_at::date
)
where c.service_date is null;

create index if not exists idx_insurance_policies_client_active
  on public.insurance_policies(tenant_id, client_id, priority)
  where archived_at is null and active_flag = true;

create index if not exists idx_eligibility_checks_client_service
  on public.eligibility_checks(tenant_id, client_id, service_date desc, checked_at desc)
  where archived_at is null;

create index if not exists idx_charges_capture_queue_live
  on public.charges(tenant_id, charge_status, service_date)
  where archived_at is null;

create index if not exists idx_claim_service_lines_claim_live
  on public.claim_service_lines(tenant_id, claim_id, line_number)
  where archived_at is null;

create index if not exists idx_claim_validation_errors_open_live
  on public.claim_validation_errors(tenant_id, claim_id)
  where resolved_at is null;

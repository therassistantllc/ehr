alter table public.era_files
  add column if not exists file_name text,
  add column if not exists file_content text,
  add column if not exists file_status text not null default 'uploaded',
  add column if not exists parsed_at timestamptz,
  add column if not exists posted_at timestamptz,
  add column if not exists payment_id uuid,
  add column if not exists trace_number text,
  add column if not exists check_number text,
  add column if not exists payment_amount numeric not null default 0,
  add column if not exists payment_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.era_claims
  add column if not exists era_file_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists payer_claim_control_number text,
  add column if not exists patient_account_number text,
  add column if not exists claim_status_code text,
  add column if not exists total_charge_amount numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists patient_responsibility_amount numeric not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.era_service_lines
  add column if not exists era_claim_id uuid,
  add column if not exists claim_service_line_id uuid,
  add column if not exists service_date date,
  add column if not exists procedure_code text,
  add column if not exists charge_amount numeric not null default 0,
  add column if not exists paid_amount numeric not null default 0,
  add column if not exists units numeric,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.era_adjustments
  add column if not exists era_claim_id uuid,
  add column if not exists era_service_line_id uuid,
  add column if not exists adjustment_group_code text,
  add column if not exists carc_code text,
  add column if not exists adjustment_amount numeric not null default 0,
  add column if not exists quantity numeric,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.era_payments
  add column if not exists era_file_id uuid,
  add column if not exists payment_id uuid,
  add column if not exists trace_number text,
  add column if not exists check_number text,
  add column if not exists payment_method text,
  add column if not exists payment_amount numeric not null default 0,
  add column if not exists payment_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_era_files_status_live
  on public.era_files(tenant_id, file_status, created_at desc)
  where archived_at is null;

create index if not exists idx_era_claims_file_live
  on public.era_claims(tenant_id, era_file_id, claim_id)
  where archived_at is null;

create index if not exists idx_era_service_lines_claim_live
  on public.era_service_lines(tenant_id, era_claim_id)
  where archived_at is null;

create index if not exists idx_era_adjustments_claim_live
  on public.era_adjustments(tenant_id, era_claim_id, carc_code)
  where archived_at is null;

create index if not exists idx_era_payments_file_live
  on public.era_payments(tenant_id, era_file_id, payment_id)
  where archived_at is null;

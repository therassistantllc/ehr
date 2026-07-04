alter table public.payments
  add column if not exists payment_source text,
  add column if not exists payment_method text,
  add column if not exists payer_id uuid,
  add column if not exists client_id uuid,
  add column if not exists payment_date date,
  add column if not exists deposit_date date,
  add column if not exists check_number text,
  add column if not exists trace_number text,
  add column if not exists total_amount numeric not null default 0,
  add column if not exists unapplied_amount numeric not null default 0,
  add column if not exists payment_status text not null default 'posted',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.payment_allocations
  add column if not exists payment_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists claim_service_line_id uuid,
  add column if not exists client_id uuid,
  add column if not exists provider_id uuid,
  add column if not exists service_date date,
  add column if not exists applied_amount numeric not null default 0,
  add column if not exists contractual_adjustment_amount numeric not null default 0,
  add column if not exists patient_responsibility_amount numeric not null default 0,
  add column if not exists payer_responsibility_amount numeric not null default 0,
  add column if not exists allocation_status text not null default 'posted',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.payment_adjustments
  add column if not exists payment_allocation_id uuid,
  add column if not exists payment_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists adjustment_group_code text,
  add column if not exists carc_code text,
  add column if not exists rarc_code text,
  add column if not exists adjustment_amount numeric not null default 0,
  add column if not exists adjustment_category text,
  add column if not exists is_writeoff boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.manual_eobs
  add column if not exists payment_id uuid,
  add column if not exists payer_id uuid,
  add column if not exists client_id uuid,
  add column if not exists check_number text,
  add column if not exists eob_date date,
  add column if not exists total_paid numeric not null default 0,
  add column if not exists status text not null default 'posted',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.historical_payments
  add column if not exists payment_id uuid,
  add column if not exists client_id uuid,
  add column if not exists provider_id uuid,
  add column if not exists payer_id uuid,
  add column if not exists service_date date,
  add column if not exists transaction_date date,
  add column if not exists amount numeric not null default 0,
  add column if not exists transaction_type text not null default 'payment',
  add column if not exists ledger_status text not null default 'posted',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_payments_posting_live
  on public.payments(tenant_id, payment_status, payment_date desc)
  where archived_at is null;

create index if not exists idx_payment_allocations_claim_live
  on public.payment_allocations(tenant_id, claim_id, payment_id)
  where archived_at is null;

create index if not exists idx_payment_adjustments_allocation_live
  on public.payment_adjustments(tenant_id, payment_allocation_id, carc_code)
  where archived_at is null;

create index if not exists idx_manual_eobs_payment_live
  on public.manual_eobs(tenant_id, payment_id, eob_date desc)
  where archived_at is null;

create index if not exists idx_historical_payments_client_live
  on public.historical_payments(tenant_id, client_id, transaction_date desc)
  where archived_at is null;

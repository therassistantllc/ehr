alter table public.denials
  add column if not exists claim_id uuid,
  add column if not exists payment_adjustment_id uuid,
  add column if not exists denial_date date,
  add column if not exists denial_category text,
  add column if not exists carc_code text,
  add column if not exists rarc_code text,
  add column if not exists denial_amount numeric not null default 0,
  add column if not exists follow_up_status text not null default 'open',
  add column if not exists next_action text,
  add column if not exists due_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.ar_follow_up
  add column if not exists claim_id uuid,
  add column if not exists client_id uuid,
  add column if not exists payer_id uuid,
  add column if not exists balance_amount numeric not null default 0,
  add column if not exists aging_bucket text,
  add column if not exists follow_up_status text not null default 'open',
  add column if not exists next_action text,
  add column if not exists due_date date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.appeals
  add column if not exists claim_id uuid,
  add column if not exists denial_id uuid,
  add column if not exists appeal_type text not null default 'appeal',
  add column if not exists appeal_status text not null default 'draft',
  add column if not exists submitted_at timestamptz,
  add column if not exists due_date date,
  add column if not exists reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.patient_statements
  add column if not exists client_id uuid,
  add column if not exists statement_date date,
  add column if not exists due_date date,
  add column if not exists statement_status text not null default 'draft',
  add column if not exists total_balance numeric not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.statement_lines
  add column if not exists statement_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists service_date date,
  add column if not exists description text,
  add column if not exists amount numeric not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.refunds
  add column if not exists client_id uuid,
  add column if not exists payer_id uuid,
  add column if not exists payment_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists refund_type text not null default 'credit',
  add column if not exists refund_status text not null default 'open',
  add column if not exists amount numeric not null default 0,
  add column if not exists reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_denials_claim_status_live on public.denials(tenant_id, claim_id, follow_up_status) where archived_at is null;
create index if not exists idx_ar_follow_up_status_live on public.ar_follow_up(tenant_id, follow_up_status, aging_bucket) where archived_at is null;
create index if not exists idx_appeals_status_live on public.appeals(tenant_id, appeal_status, due_date) where archived_at is null;
create index if not exists idx_patient_statements_client_live on public.patient_statements(tenant_id, client_id, statement_status) where archived_at is null;
create index if not exists idx_refunds_status_live on public.refunds(tenant_id, refund_status, refund_type) where archived_at is null;

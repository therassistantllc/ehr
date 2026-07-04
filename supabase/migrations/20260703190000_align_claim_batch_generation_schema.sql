alter table public.claim_batches
  add column if not exists batch_number text,
  add column if not exists batch_status text not null default 'draft',
  add column if not exists clearinghouse_connection_id uuid,
  add column if not exists payer_profile_id uuid,
  add column if not exists claim_count integer not null default 0,
  add column if not exists total_charge_amount numeric not null default 0,
  add column if not exists generated_at timestamptz,
  add column if not exists submitted_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.batched_claims
  add column if not exists batch_id uuid,
  add column if not exists claim_id uuid,
  add column if not exists line_number integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.claim_submission_files
  add column if not exists claim_batch_id uuid,
  add column if not exists batch_id uuid,
  add column if not exists file_type text not null default '837P',
  add column if not exists file_name text,
  add column if not exists file_content text,
  add column if not exists file_status text not null default 'generated',
  add column if not exists validation_summary jsonb not null default '{}'::jsonb,
  add column if not exists generated_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.claim_submissions
  add column if not exists claim_batch_id uuid,
  add column if not exists batch_id uuid,
  add column if not exists claim_submission_file_id uuid,
  add column if not exists submission_status text not null default 'pending',
  add column if not exists submitted_at timestamptz,
  add column if not exists response_payload jsonb not null default '{}'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_claim_batches_status_live
  on public.claim_batches(tenant_id, batch_status, created_at desc)
  where archived_at is null;

create index if not exists idx_batched_claims_batch_live
  on public.batched_claims(tenant_id, batch_id, claim_id)
  where archived_at is null;

create index if not exists idx_claim_submission_files_batch_live
  on public.claim_submission_files(tenant_id, claim_batch_id, generated_at desc)
  where archived_at is null;

create index if not exists idx_claim_submission_files_batch_alias_live
  on public.claim_submission_files(tenant_id, batch_id, generated_at desc)
  where archived_at is null;

create index if not exists idx_claim_submissions_batch_live
  on public.claim_submissions(tenant_id, claim_batch_id, submitted_at desc)
  where archived_at is null;

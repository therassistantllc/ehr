alter table public.import_batches
  add column if not exists source_system text,
  add column if not exists import_type text,
  add column if not exists status text not null default 'draft',
  add column if not exists file_name text,
  add column if not exists import_file_id uuid,
  add column if not exists row_count integer not null default 0,
  add column if not exists committed_at timestamptz,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists rollback_reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.import_rows
  add column if not exists import_batch_id uuid,
  add column if not exists batch_id uuid,
  add column if not exists row_number integer,
  add column if not exists raw_data jsonb not null default '{}'::jsonb,
  add column if not exists normalized_data jsonb not null default '{}'::jsonb,
  add column if not exists row_status text not null default 'staged',
  add column if not exists status text not null default 'staged',
  add column if not exists committed_object_type text,
  add column if not exists committed_object_id uuid,
  add column if not exists rolled_back_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.import_rows
set import_batch_id = coalesce(import_batch_id, batch_id)
where import_batch_id is null and batch_id is not null;

update public.import_rows
set batch_id = coalesce(batch_id, import_batch_id)
where batch_id is null and import_batch_id is not null;

alter table public.import_validation_errors
  add column if not exists import_batch_id uuid,
  add column if not exists import_row_id uuid,
  add column if not exists row_number integer,
  add column if not exists field_name text,
  add column if not exists severity text not null default 'error',
  add column if not exists message text,
  add column if not exists is_blocking boolean not null default true,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.import_commits
  add column if not exists import_batch_id uuid,
  add column if not exists committed_object_type text,
  add column if not exists committed_count integer not null default 0,
  add column if not exists committed_object_ids uuid[] not null default '{}'::uuid[],
  add column if not exists rolled_back_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.import_rollbacks
  add column if not exists import_batch_id uuid,
  add column if not exists rollback_reason text,
  add column if not exists rolled_back_object_type text,
  add column if not exists rolled_back_object_ids uuid[] not null default '{}'::uuid[],
  add column if not exists rolled_back_count integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_import_batches_status_live
  on public.import_batches(tenant_id, status, created_at desc)
  where archived_at is null;

create index if not exists idx_import_rows_batch_status_live
  on public.import_rows(tenant_id, import_batch_id, row_status, row_number)
  where archived_at is null;

create index if not exists idx_import_rows_batch_alias_status_live
  on public.import_rows(tenant_id, batch_id, row_status, row_number)
  where archived_at is null;

create index if not exists idx_import_validation_errors_batch_live
  on public.import_validation_errors(tenant_id, import_batch_id, is_blocking)
  where archived_at is null;

create index if not exists idx_import_commits_batch_live
  on public.import_commits(tenant_id, import_batch_id, created_at desc)
  where archived_at is null;

create index if not exists idx_import_rollbacks_batch_live
  on public.import_rollbacks(tenant_id, import_batch_id, created_at desc)
  where archived_at is null;

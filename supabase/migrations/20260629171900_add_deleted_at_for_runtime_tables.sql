-- Preflight migration for runtime services.
-- The initial scaffold in some Supabase projects did not include deleted_at.
-- Service code and partial indexes use soft-delete filtering, so add deleted_at
-- to every table touched by the eligibility, charge-capture, and claims layer.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'clients',
    'providers',
    'appointments',
    'clinical_notes',
    'client_case_policies',
    'eligibility_checks',
    'eligibility_benefits',
    'eligibility_service_details',
    'charges',
    'charge_validation_errors',
    'claims',
    'claim_lines',
    'claim_diagnoses',
    'claim_validation_errors',
    'claim_batches',
    'batched_claims',
    'claim_adjustments',
    'payments',
    'payment_allocations',
    'workqueue_items',
    'status_history',
    'audits_logs'
  ] loop
    if to_regclass(format('public.%I', table_name)) is not null
       and not exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = table_name
           and column_name = 'deleted_at'
       ) then
      execute format('alter table public.%I add column deleted_at timestamptz null', table_name);
    end if;
  end loop;
end $$;

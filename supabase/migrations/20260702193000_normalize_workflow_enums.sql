-- THERASSISTANT EHR workflow enum cleanup
-- Captures the Supabase cleanup performed on 2026-07-02 so the repo can reproduce
-- the canonical workflow enum state without manual database edits.

set check_function_bodies = off;

create or replace function pg_temp.enum_add_value(p_type regtype, p_value text)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = p_type::oid
      and enumlabel = p_value
  ) then
    execute format('alter type %s add value %L', p_type, p_value);
  end if;
end $$;

create or replace function pg_temp.enum_rename_value(p_type regtype, p_old text, p_new text)
returns void
language plpgsql
as $$
begin
  if exists (
    select 1
    from pg_enum
    where enumtypid = p_type::oid
      and enumlabel = p_old
  ) and not exists (
    select 1
    from pg_enum
    where enumtypid = p_type::oid
      and enumlabel = p_new
  ) then
    execute format('alter type %s rename value %L to %L', p_type, p_old, p_new);
  end if;
end $$;

-- Missing workflow enum values.
do $$
begin
  if to_regtype('public.claims_status_enum') is not null then
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'draft');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'ready_to_submit');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'accepted_oa');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'rejected_oa');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'accepted_payer');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'rejected_payer');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'on_hold');
    perform pg_temp.enum_add_value('public.claims_status_enum'::regtype, 'cancelled');
  end if;

  if to_regtype('public.claims_batch_status_enum') is not null then
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'draft');
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'failed');
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'ready_to_generate');
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'generation_failed');
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'generated');
    perform pg_temp.enum_add_value('public.claims_batch_status_enum'::regtype, 'cancelled');
  end if;

  if to_regtype('public.eligibility_status_enum') is not null then
    perform pg_temp.enum_add_value('public.eligibility_status_enum'::regtype, 'not_checked');
  end if;

  if to_regtype('public.workqueues_status_enum') is not null then
    perform pg_temp.enum_add_value('public.workqueues_status_enum'::regtype, 'blocked');
    perform pg_temp.enum_add_value('public.workqueues_status_enum'::regtype, 'resolved');
    perform pg_temp.enum_add_value('public.workqueues_status_enum'::regtype, 'closed');
  end if;

  if to_regtype('public.payment_posting_status') is not null then
    perform pg_temp.enum_add_value('public.payment_posting_status'::regtype, 'unposted');
    perform pg_temp.enum_add_value('public.payment_posting_status'::regtype, 'needs_review');
    perform pg_temp.enum_add_value('public.payment_posting_status'::regtype, 'voided');
  end if;

  if to_regtype('public.refund_status_enum') is not null then
    perform pg_temp.enum_add_value('public.refund_status_enum'::regtype, 'pending');
  end if;

  if to_regtype('public.credit_transfer_status_enum') is not null then
    perform pg_temp.enum_add_value('public.credit_transfer_status_enum'::regtype, 'draft');
  end if;

  if to_regtype('public.note_type_enum') is not null then
    perform pg_temp.enum_add_value('public.note_type_enum'::regtype, 'billing');
    perform pg_temp.enum_add_value('public.note_type_enum'::regtype, 'financial');
    perform pg_temp.enum_add_value('public.note_type_enum'::regtype, 'task');
    perform pg_temp.enum_add_value('public.note_type_enum'::regtype, 'charge');
    perform pg_temp.enum_add_value('public.note_type_enum'::regtype, 'client');
  end if;

  if to_regtype('public.source_object_type') is not null then
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'charge');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'claim_line');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'client_invoice');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'payment');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'refund');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'credit_balance');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'historical_transaction');
    perform pg_temp.enum_add_value('public.source_object_type'::regtype, 'accounting_transaction');
  end if;
end $$;

-- Canonical workflow enums created during cleanup.
do $$
begin
  if to_regtype('public.accounting_transaction_status_enum') is null then
    create type public.accounting_transaction_status_enum as enum ('draft', 'posted', 'reversed', 'voided');
  end if;

  if to_regtype('public.claim_correction_status_enum') is null then
    create type public.claim_correction_status_enum as enum (
      'draft', 'requested', 'in_review', 'approved', 'submitted', 'accepted',
      'rejected', 'completed', 'cancelled', 'voided'
    );
  end if;

  if to_regtype('public.client_responsibility_status_enum') is null then
    create type public.client_responsibility_status_enum as enum (
      'open', 'billed', 'partially_paid', 'paid', 'transferred', 'adjusted',
      'written_off', 'reversed', 'voided'
    );
  end if;

  if to_regtype('public.invoice_status_enum') is null then
    create type public.invoice_status_enum as enum (
      'draft', 'open', 'sent', 'viewed', 'partially_paid', 'paid', 'voided',
      'cancelled', 'written_off'
    );
  end if;

  if to_regtype('public.payment_match_status_enum') is null then
    create type public.payment_match_status_enum as enum (
      'unmatched', 'matched', 'partially_matched', 'ambiguous', 'ignored'
    );
  end if;
end $$;

-- Normalize corrupted workbook/imported enum labels.
do $$
begin
  if to_regtype('public.accounting_account_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.accounting_account_type_enum'::regtype, 'Adjustments', 'adjustment');
  end if;

  if to_regtype('public.accounting_entry_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.accounting_entry_type_enum'::regtype, 'Payers_payment', 'payer_payment');
    perform pg_temp.enum_rename_value('public.accounting_entry_type_enum'::regtype, 'Adjustments', 'adjustment');
  end if;

  if to_regtype('public.adjustments_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.adjustments_type_enum'::regtype, 'Payersual', 'contractual');
  end if;

  if to_regtype('public.appointments_status_enum') is not null then
    perform pg_temp.enum_rename_value('public.appointments_status_enum'::regtype, 'Clients_on_my_way', 'client_on_my_way');
    perform pg_temp.enum_rename_value('public.appointments_status_enum'::regtype, 'Clients_arrived', 'client_arrived');
  end if;

  if to_regtype('public.appointments_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.appointments_type_enum'::regtype, 'MH assessment', 'mental_health_assessment');
    perform pg_temp.enum_rename_value('public.appointments_type_enum'::regtype, 'SUD assessment', 'sud_assessment');
  end if;

  if to_regtype('public.benefit_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.benefit_type_enum'::regtype, 'coPayers', 'coinsurance');
  end if;

  if to_regtype('public.charge_block_reason_enum') is not null then
    perform pg_temp.enum_rename_value('public.charge_block_reason_enum'::regtype, 'missing_Providers', 'missing_provider');
    perform pg_temp.enum_rename_value('public.charge_block_reason_enum'::regtype, 'Providers_not_enrolled', 'provider_not_enrolled');
    perform pg_temp.enum_rename_value('public.charge_block_reason_enum'::regtype, 'Clients_not_active', 'client_not_active');
  end if;

  if to_regtype('public.charge_source_enum') is not null then
    perform pg_temp.enum_rename_value('public.charge_source_enum'::regtype, 'Appointments', 'appointment');
    perform pg_temp.enum_rename_value('public.charge_source_enum'::regtype, 'Imports', 'import');
  end if;

  if to_regtype('public.charge_status_enum') is not null then
    perform pg_temp.enum_rename_value('public.charge_status_enum'::regtype, 'ready_for_Claims', 'ready_for_claim');
    perform pg_temp.enum_rename_value('public.charge_status_enum'::regtype, 'Claims_created', 'claim_created');
  end if;

  if to_regtype('public.claims_submission_method_enum') is not null then
    perform pg_temp.enum_rename_value('public.claims_submission_method_enum'::regtype, 'Imports', 'import');
  end if;

  if to_regtype('public.client_responsibility_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.client_responsibility_type_enum'::regtype, 'coPayers', 'coinsurance');
  end if;

  if to_regtype('public.denials_category_enum') is not null then
    perform pg_temp.enum_rename_value('public.denials_category_enum'::regtype, 'Payersing', 'contracting');
  end if;

  if to_regtype('public.document_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.document_type_enum'::regtype, 'Payers_card', 'insurance_card');
    perform pg_temp.enum_rename_value('public.document_type_enum'::regtype, 'Claims_attachment', 'claim_attachment');
    perform pg_temp.enum_rename_value('public.document_type_enum'::regtype, 'Clients_correspondence', 'client_correspondence');
    perform pg_temp.enum_rename_value('public.document_type_enum'::regtype, 'Collections', 'collection_notice');
  end if;

  if to_regtype('public.files_source_enum') is not null then
    perform pg_temp.enum_rename_value('public.files_source_enum'::regtype, 'Imports', 'import');
    perform pg_temp.enum_rename_value('public.files_source_enum'::regtype, 'Integrations', 'integration');
  end if;

  if to_regtype('public.historical_posting_enum') is not null then
    perform pg_temp.enum_rename_value('public.historical_posting_enum'::regtype, 'Adjustments', 'adjustment');
  end if;

  if to_regtype('public.imports_entity_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Clients', 'clients');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Payers', 'payers');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Providers', 'providers');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Appointments', 'appointments');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Claims', 'claims');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Adjustments', 'adjustments');
    perform pg_temp.enum_rename_value('public.imports_entity_type_enum'::regtype, 'Accounting', 'accounting');
  end if;

  if to_regtype('public.imports_row_status_enum') is not null then
    perform pg_temp.enum_rename_value('public.imports_row_status_enum'::regtype, 'Importsed', 'imported');
  end if;

  if to_regtype('public.legacy_source_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.legacy_source_type_enum'::regtype, 'simplePractice', 'simple_practice');
  end if;

  if to_regtype('public.note_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.note_type_enum'::regtype, 'Claims', 'claim');
    perform pg_temp.enum_rename_value('public.note_type_enum'::regtype, 'Workqueues', 'workqueue');
  end if;

  if to_regtype('public.notifications_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.notifications_type_enum'::regtype, 'Workqueues_assignment', 'workqueue_assignment');
    perform pg_temp.enum_rename_value('public.notifications_type_enum'::regtype, 'Claims_rejected', 'claim_rejected');
    perform pg_temp.enum_rename_value('public.notifications_type_enum'::regtype, 'Claims_denied', 'claim_denied');
    perform pg_temp.enum_rename_value('public.notifications_type_enum'::regtype, 'Clients_checked_in', 'client_checked_in');
  end if;

  if to_regtype('public.payers_variance_status_enum') is not null then
    perform pg_temp.enum_rename_value('public.payers_variance_status_enum'::regtype, 'confirmed_Overpayments', 'confirmed_overpayment');
  end if;

  if to_regtype('public.payers_variance_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.payers_variance_type_enum'::regtype, 'Overpayments', 'overpayment');
    perform pg_temp.enum_rename_value('public.payers_variance_type_enum'::regtype, 'wrong_Providers_Payers', 'wrong_provider_payer');
  end if;

  if to_regtype('public.payment_allocation_target_enum') is not null then
    perform pg_temp.enum_rename_value('public.payment_allocation_target_enum'::regtype, 'Claims', 'claim');
    perform pg_temp.enum_rename_value('public.payment_allocation_target_enum'::regtype, 'Claims_line', 'claim_line');
    perform pg_temp.enum_rename_value('public.payment_allocation_target_enum'::regtype, 'Clients_balance', 'client_balance');
    perform pg_temp.enum_rename_value('public.payment_allocation_target_enum'::regtype, 'Accounting_account', 'accounting_account');
  end if;

  if to_regtype('public.payment_source_enum') is not null then
    perform pg_temp.enum_rename_value('public.payment_source_enum'::regtype, 'Payers', 'payer');
    perform pg_temp.enum_rename_value('public.payment_source_enum'::regtype, 'Adjustments', 'adjustment');
  end if;

  if to_regtype('public.refund_reason_enum') is not null then
    perform pg_temp.enum_rename_value('public.refund_reason_enum'::regtype, 'Overpayments', 'overpayment');
    perform pg_temp.enum_rename_value('public.refund_reason_enum'::regtype, 'wrong_Clients', 'wrong_client');
    perform pg_temp.enum_rename_value('public.refund_reason_enum'::regtype, 'wrong_Claims', 'wrong_claim');
  end if;

  if to_regtype('public.role_scope_enum') is not null then
    perform pg_temp.enum_rename_value('public.role_scope_enum'::regtype, 'Tenants', 'tenant');
    perform pg_temp.enum_rename_value('public.role_scope_enum'::regtype, 'Practice', 'practice');
    perform pg_temp.enum_rename_value('public.role_scope_enum'::regtype, 'Clients', 'client');
  end if;

  if to_regtype('public.system_role_enum') is not null then
    perform pg_temp.enum_rename_value('public.system_role_enum'::regtype, 'Practice_admin', 'practice_admin');
    perform pg_temp.enum_rename_value('public.system_role_enum'::regtype, 'Clients', 'client');
  end if;

  if to_regtype('public.tenants_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.tenants_type_enum'::regtype, 'Practice', 'practice');
  end if;

  if to_regtype('public.workqueues_source_object_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Clients', 'client');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Appointments', 'appointment');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Claims', 'claim');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Claims_batch', 'claim_batch');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Adjustments', 'adjustment');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Denials', 'denial');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Accounting_entry', 'accounting_entry');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'Providers', 'provider');
    perform pg_temp.enum_rename_value('public.workqueues_source_object_type_enum'::regtype, 'payer_Payers', 'payer_policy');
  end if;

  if to_regtype('public.workqueues_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Claims_validation', 'claim_validation');
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Claims_rejection', 'claim_rejection');
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Denials_followup', 'denial_followup');
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Overpayments_review', 'overpayment_review');
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Payers_variance', 'payer_variance');
    perform pg_temp.enum_rename_value('public.workqueues_type_enum'::regtype, 'Imports_error', 'import_error');
  end if;

  if to_regtype('public.writeoff_reason_enum') is not null then
    perform pg_temp.enum_rename_value('public.writeoff_reason_enum'::regtype, 'Payersual_obligation', 'contractual_obligation');
    perform pg_temp.enum_rename_value('public.writeoff_reason_enum'::regtype, 'Payers_issue', 'payer_issue');
    perform pg_temp.enum_rename_value('public.writeoff_reason_enum'::regtype, 'Providers_decision', 'provider_decision');
  end if;

  -- Final remaining labels found after the first cleanup pass.
  if to_regtype('public.denials_status_enum') is not null then
    perform pg_temp.enum_rename_value('public.denials_status_enum'::regtype, 'corrected_Claims_needed', 'corrected_claim_needed');
  end if;

  if to_regtype('public.eob_source_enum') is not null then
    perform pg_temp.enum_rename_value('public.eob_source_enum'::regtype, 'Imports', 'import');
  end if;

  if to_regtype('public.followup_action_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.followup_action_type_enum'::regtype, 'corrected_Claims', 'corrected_claim');
  end if;

  if to_regtype('public.integrations_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.integrations_type_enum'::regtype, 'ehr_Imports', 'ehr_import');
  end if;

  if to_regtype('public.note_visibility_enum') is not null then
    perform pg_temp.enum_rename_value('public.note_visibility_enum'::regtype, 'Clients_visible', 'client_visible');
    perform pg_temp.enum_rename_value('public.note_visibility_enum'::regtype, 'Providers_visible', 'provider_visible');
  end if;

  if to_regtype('public.payment_posting_source_enum') is not null then
    perform pg_temp.enum_rename_value('public.payment_posting_source_enum'::regtype, 'historical_Imports', 'historical_import');
  end if;

  if to_regtype('public.payment_reversal_reason_enum') is not null then
    perform pg_temp.enum_rename_value('public.payment_reversal_reason_enum'::regtype, 'wrong_Claims', 'wrong_claim');
    perform pg_temp.enum_rename_value('public.payment_reversal_reason_enum'::regtype, 'wrong_Clients', 'wrong_client');
  end if;

  if to_regtype('public.providers_type_enum') is not null then
    perform pg_temp.enum_rename_value('public.providers_type_enum'::regtype, 'billing_Providers', 'billing_provider');
    perform pg_temp.enum_rename_value('public.providers_type_enum'::regtype, 'rendering_Providers', 'rendering_provider');
  end if;
end $$;

-- Restore uniqueness guard for open auto-generated claim batches.
do $$
begin
  if to_regclass('public.claim_batches') is not null then
    execute 'create unique index if not exists idx_claim_batches_auto_group_unique_live on public.claim_batches (tenant_id, payer_profile_id, billing_provider_tax_id) where archived_at is null and batch_source = ''charge_auto''::text and batch_status in (''draft''::public.claims_batch_status_enum, ''ready_to_generate''::public.claims_batch_status_enum)';
  end if;
end $$;

-- Remove superseded duplicate enums only after no table columns still depend on them.
do $$
declare
  enum_name text;
begin
  foreach enum_name in array array[
    'appointment_status',
    'claim_status',
    'eligibility_status',
    'workqueue_priority',
    'workqueue_status'
  ] loop
    if to_regtype('public.' || enum_name) is not null
       and not exists (
         select 1
         from pg_attribute a
         where a.atttypid = to_regtype('public.' || enum_name)::oid
           and not a.attisdropped
       ) then
      execute format('drop type public.%I', enum_name);
    end if;
  end loop;
end $$;

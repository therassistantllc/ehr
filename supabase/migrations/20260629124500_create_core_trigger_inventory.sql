-- THERASSISTANT EHR core trigger inventory
-- Generated from uploaded trigger workbook on 2026-06-29.
--
-- This migration captures the trigger catalog in the database so the app/schema
-- has a durable implementation plan. It intentionally does not attach executable
-- triggers yet because many workbook rows are templates such as "Most tables",
-- "Selected tables", or domain groups, and trigger bodies must be implemented
-- against finalized table/column names before production use.

set search_path = public;

create table if not exists public.therassistant_trigger_inventory (
  trigger_name text not null,
  trigger_tables text not null,
  trigger_type text not null,
  trigger_timing text not null,
  trigger_event text not null,
  trigger_purpose text not null,
  implementation_status text not null default 'planned',
  implementation_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trigger_name, trigger_tables)
);

comment on table public.therassistant_trigger_inventory
is 'THERASSISTANT EHR trigger catalog imported from the trigger workbook. Rows define planned trigger behavior and implementation scope.';

comment on column public.therassistant_trigger_inventory.trigger_name
is 'Planned PostgreSQL trigger name from the workbook. Not unique by itself because the same trigger name may be reused for different tables.';

comment on column public.therassistant_trigger_inventory.trigger_tables
is 'Target table, table group, or template scope from the workbook.';

comment on column public.therassistant_trigger_inventory.implementation_status
is 'Implementation state for this planned trigger, such as planned, implemented, deferred, or replaced.';

create or replace function public.therassistant_trigger_not_implemented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'THERASSISTANT trigger % is registered but not implemented yet.', tg_name
    using hint = 'Replace this placeholder with table-specific trigger logic before attaching it to production tables.';
end;
$$;

comment on function public.therassistant_trigger_not_implemented()
is 'Safety placeholder for future trigger bodies. Do not attach to production tables without replacing with table-specific logic.';

with source_rows as (
  select *
  from jsonb_to_recordset($trigger_inventory$
[
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_set_timestamps",
    "trigger_tables": "Most tables",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Sets created_at and updated_at."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_set_created_by",
    "trigger_tables": "Most tables",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Sets created_by from authenticated user."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_set_updated_by",
    "trigger_tables": "Most tables",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Sets updated_by from authenticated user."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_prevent_created_at_change",
    "trigger_tables": "Most tables",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Prevents editing original creation timestamp."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_prevent_created_by_change",
    "trigger_tables": "Most tables",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Prevents changing original creator."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_soft_delete_record",
    "trigger_tables": "Selected tables",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Converts delete into soft delete."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_validate_Tenants_required",
    "trigger_tables": "Tenants-scoped tables",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Blocks records without Tenants_id."
  },
  {
    "trigger_type": "Universal Record Management",
    "trigger_name": "trg_prevent_cross_Tenants_linking",
    "trigger_tables": "Tenants-scoped relationship tables",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents linking records across unrelated Tenants."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_validate_Tenants_user_access",
    "trigger_tables": "Tenants_users",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates user/Tenants relationship."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_validate_role_assignment",
    "trigger_tables": "Tenants_user_roles",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents assigning invalid roles."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_Audits_role_change",
    "trigger_tables": "Tenants_user_roles",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Logs role changes."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_validate_billing_company_link",
    "trigger_tables": "billing_company_Practice_links",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates billing company/Practice relationship."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_Audits_billing_company_link",
    "trigger_tables": "billing_company_Practice_links",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Logs billing company access changes."
  },
  {
    "trigger_type": "Tenants",
    "trigger_name": "trg_deactivate_access_on_user_removal",
    "trigger_tables": "Tenants_users",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Removes or disables role access when user is deactivated."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_insert",
    "trigger_tables": "Important business tables",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs record creation."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_update",
    "trigger_tables": "Important business tables",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs changed fields."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_delete",
    "trigger_tables": "Important business tables",
    "trigger_timing": "After",
    "trigger_event": "Delete",
    "trigger_purpose": "Logs deletion or soft deletion."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_status_change",
    "trigger_tables": "Status-based tables",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs status changes."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_financial_change",
    "trigger_tables": "Financial tables",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Logs financial activity."
  },
  {
    "trigger_type": "Audits",
    "trigger_name": "trg_Audits_phi_access",
    "trigger_tables": "phi_access_logs",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs PHI access event."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_Clients_normalize_name",
    "trigger_tables": "Clients",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates searchable normalized Clients name."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_Clients_prevent_delete_with_activity",
    "trigger_tables": "Clients",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Blocks deleting Clients with Claims, payments, notes, or Accounting entries."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_Clients_Audits_demographic_change",
    "trigger_tables": "Clients",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs demographic changes."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_update_Clients_balance_summary",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Refreshes Clients balance summary."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_update_Clients_status_history",
    "trigger_tables": "Clients",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Adds status history when Clients status changes."
  },
  {
    "trigger_type": "Clients",
    "trigger_name": "trg_validate_Clients_responsible_party",
    "trigger_tables": "Clients_contacts",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates guardian/responsible party setup."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_validate_Payers_dates",
    "trigger_tables": "Clients_Payers_policies",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents termination date before effective date."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_prevent_overlapping_primary_Payers",
    "trigger_tables": "Clients_Payers_policies",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents multiple active primary policies for same period."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_clear_prior_primary_policy",
    "trigger_tables": "Clients_Payers_policies",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Removes primary flag from prior policy."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_Audits_Payers_change",
    "trigger_tables": "Clients_Payers_policies",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Logs payer/member ID/coverage changes."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_create_eligibility_issue",
    "trigger_tables": "eligibility_checks",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates Workqueues item if eligibility fails."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_resolve_eligibility_issue",
    "trigger_tables": "eligibility_checks",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Resolves eligibility task when eligibility passes."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_update_Clients_benefit_snapshot",
    "trigger_tables": "eligibility_benefits",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates latest benefit summary."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_validate_Appointments_times",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents end time before start time."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_prevent_Providers_double_booking",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents overlapping Appointments for same Providers."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_update_Appointments_status_history",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Records Appointments status changes."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_update_Appointments_from_checkin",
    "trigger_tables": "Clients_checkins",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Appointments check-in status/color."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_notify_Providers_Clients_checked_in",
    "trigger_tables": "Clients_checkins",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates clinician Notifications."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_create_charge_after_completed_Appointments",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates charge when Appointments is completed."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_void_charge_after_cancelled_Appointments",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Voids/block charge if Appointments is cancelled."
  },
  {
    "trigger_type": "Appointments",
    "trigger_name": "trg_no_show_billing_review",
    "trigger_tables": "Appointmentss",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates admin/billing task for no-show."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_prevent_edit_locked_clinical_note",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "Before",
    "trigger_event": "Update/Delete",
    "trigger_purpose": "Blocks edits after note is signed."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_require_note_amendment",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Forces amendment instead of changing locked note."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_validate_note_signature",
    "trigger_tables": "clinical_note_signatures",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Confirms signer is authorized Providers."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_lock_note_after_signature",
    "trigger_tables": "clinical_note_signatures",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Locks clinical note after signing."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_validate_psychotherapy_time",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates start/end/duration for time-based CPTs."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_validate_goal_addressed",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Ensures psychotherapy note addresses a treatment goal."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_flag_missing_documentation",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates Workqueues item for incomplete note."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_close_missing_documentation_task",
    "trigger_tables": "clinical_notes",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Closes task once documentation is complete."
  },
  {
    "trigger_type": "Documentation",
    "trigger_name": "trg_create_charge_review_after_note_signed",
    "trigger_tables": "clinical_note_signatures",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates or updates charge capture item."
  },
  {
    "trigger_type": "Treatment Plans",
    "trigger_name": "trg_validate_treatment_plan_dates",
    "trigger_tables": "treatment_plans",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates effective/review/expiration dates."
  },
  {
    "trigger_type": "Treatment Plans",
    "trigger_name": "trg_expire_prior_active_treatment_plan",
    "trigger_tables": "treatment_plans",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Expires old active plan when new plan is activated."
  },
  {
    "trigger_type": "Treatment Plans",
    "trigger_name": "trg_flag_treatment_plan_due",
    "trigger_tables": "treatment_plans",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates review-due Workqueues item."
  },
  {
    "trigger_type": "Treatment Plans",
    "trigger_name": "trg_flag_expired_treatment_plan",
    "trigger_tables": "treatment_plans",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates task when Treatment Plans expires."
  },
  {
    "trigger_type": "Treatment Plans",
    "trigger_name": "trg_close_treatment_plan_review_task",
    "trigger_tables": "treatment_plans",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Closes task after plan review is completed."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_validate_charge_required_fields",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates Clients, Providers, CPT, ICD, payer, DOS, Tenants."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_validate_charge_status_transition",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Blocks invalid charge status movement."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_prevent_duplicate_charge_for_Appointments",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents duplicate charges."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_prevent_charge_edit_after_Claims_created",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "Before",
    "trigger_event": "Update/Delete",
    "trigger_purpose": "Blocks edits after Claims is created."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_create_charge_status_history",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs charge status changes."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_create_charge_validation_task",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates Workqueues item for blocked/invalid charges."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_close_charge_validation_task",
    "trigger_tables": "charge_capture_items",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Closes task when charge becomes ready."
  },
  {
    "trigger_type": "Charges",
    "trigger_name": "trg_sync_charge_after_Claims_created",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Sets source charge to Claims_created."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_validate_Claims_required_fields",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates Claims header requirements."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_validate_Claims_line_required_fields",
    "trigger_tables": "professional_Claims_lines",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates Claims line requirements."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_validate_Claims_status_transition",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Blocks invalid Claims status movement."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_prevent_Claims_edit_after_submission",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "Before",
    "trigger_event": "Update/Delete",
    "trigger_purpose": "Prevents improper editing after submission."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_create_Claims_status_history",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs Claims status changes."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_create_Claims_validation_task",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates task when Claims validation fails."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_close_Claims_validation_task",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Closes validation task once resolved."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_create_rejected_Claims_task",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates task when Claims becomes rejected."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_create_denied_Claims_task",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates Denials follow-up task."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_recalculate_Claims_balance",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Claims balance after financial posting."
  },
  {
    "trigger_type": "Claims",
    "trigger_name": "trg_recalculate_Claims_status",
    "trigger_tables": "Claims_balance_summaries",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Sets paid, partially paid, denied, etc."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_validate_Claims_ready_before_batching",
    "trigger_tables": "Claims_batch_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Only allows ready_for_batch Claims into batch."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_set_Claims_status_batched",
    "trigger_tables": "Claims_batch_items",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Sets Claims status to batched."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_reset_Claims_status_when_removed_from_batch",
    "trigger_tables": "Claims_batch_items",
    "trigger_timing": "After",
    "trigger_event": "Delete",
    "trigger_purpose": "Returns Claims to ready_for_batch if not submitted."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_recalculate_batch_totals",
    "trigger_tables": "Claims_batch_items",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Updates batch Claims count and total charges."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_prevent_batch_edit_after_submission",
    "trigger_tables": "Claims_batches",
    "trigger_timing": "Before",
    "trigger_event": "Update/Delete",
    "trigger_purpose": "Blocks editing submitted batches."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_set_Claims_submitted_after_batch_submission",
    "trigger_tables": "Claims_batches",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Sets batch Claims to submitted."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_create_batch_status_history",
    "trigger_tables": "Claims_batches",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Logs batch status changes."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_prevent_duplicate_submission_Files",
    "trigger_tables": "Claims_submission_Files",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents duplicate 837 Files by checksum."
  },
  {
    "trigger_type": "Batches",
    "trigger_name": "trg_increment_Claims_submission_count",
    "trigger_tables": "Claims_submissions",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Tracks number of submissions."
  },
  {
    "trigger_type": "Clearinghouse",
    "trigger_name": "trg_update_Claims_from_submission_response",
    "trigger_tables": "submission_responses",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Claims based on clearinghouse response."
  },
  {
    "trigger_type": "Clearinghouse",
    "trigger_name": "trg_update_Claims_from_277_response",
    "trigger_tables": "Claims_status_responses",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Claims from payer status response."
  },
  {
    "trigger_type": "Clearinghouse",
    "trigger_name": "trg_create_submission_rejection_task",
    "trigger_tables": "submission_responses",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates task for rejected submissions."
  },
  {
    "trigger_type": "Clearinghouse",
    "trigger_name": "trg_close_submission_rejection_task",
    "trigger_tables": "submission_responses",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Closes task when accepted/resolved."
  },
  {
    "trigger_type": "Clearinghouse",
    "trigger_name": "trg_store_payer_Claims_number",
    "trigger_tables": "submission_responses",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Saves payer Claims/control number if returned."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_prevent_payment_delete",
    "trigger_tables": "payments",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Blocks hard deletion of payments."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_prevent_payment_edit_after_posting",
    "trigger_tables": "payments",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Requires reversal instead of direct edit."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_create_Accounting_from_payment",
    "trigger_tables": "payments",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates Accounting transaction/entry."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_create_Accounting_from_payment_allocation",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Applies payment to Claims/Clients/line."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_recalculate_Claims_after_payment",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Claims balance."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_recalculate_Clients_after_payment",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Clients balance."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_detect_payment_overage",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Flags Overpayments."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_create_Overpayments_task",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates Overpayments review Workqueues item."
  },
  {
    "trigger_type": "Payment Posting",
    "trigger_name": "trg_create_payment_reversal_Accounting",
    "trigger_tables": "payment_reversals",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts reversing Accounting entry."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_prevent_Adjustments_delete",
    "trigger_tables": "Adjustmentss",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Blocks hard deletion."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_prevent_Adjustments_edit_after_posting",
    "trigger_tables": "Adjustmentss",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Requires reversal instead of direct edit."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_create_Accounting_from_Adjustments",
    "trigger_tables": "Adjustmentss",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates Accounting entry."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_create_Accounting_from_Adjustments_allocation",
    "trigger_tables": "Adjustments_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Applies Adjustments to Claims/Clients/line."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_recalculate_Claims_after_Adjustments",
    "trigger_tables": "Adjustments_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Claims balance."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_recalculate_Clients_after_Adjustments",
    "trigger_tables": "Adjustments_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Clients balance."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_create_Adjustments_reversal_Accounting",
    "trigger_tables": "Adjustments_reversals",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts reversing Accounting entry."
  },
  {
    "trigger_type": "Adjustments",
    "trigger_name": "trg_Audits_writeoff_reason",
    "trigger_tables": "Adjustmentss",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs write-off reason/category."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_validate_historical_transaction",
    "trigger_tables": "historical_transactions",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates Clients, amount, type, and posting date."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_create_Accounting_from_historical_transaction",
    "trigger_tables": "historical_transactions",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts historical transaction to Accounting."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_recalculate_Clients_after_historical_transaction",
    "trigger_tables": "historical_transactions",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates Clients balance summary."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_prevent_historical_transaction_delete",
    "trigger_tables": "historical_transactions",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Blocks hard deletion."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_prevent_historical_transaction_edit_after_posting",
    "trigger_tables": "historical_transactions",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Requires reversal after posting."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_create_historical_transaction_reversal",
    "trigger_tables": "historical_transaction_reversals",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts reversing Accounting entry."
  },
  {
    "trigger_type": "Historical Posting",
    "trigger_name": "trg_link_historical_transaction_to_Claims",
    "trigger_tables": "historical_transaction_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Links historical activity to later-created Claims if needed."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_prevent_Accounting_entry_delete",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "Before",
    "trigger_event": "Delete",
    "trigger_purpose": "Blocks deletion of Accounting entries."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_prevent_Accounting_entry_edit",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Prevents direct editing after posting."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_validate_Accounting_balanced_transaction",
    "trigger_tables": "Accounting_transactions",
    "trigger_timing": "Before/After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Ensures transaction balances if using double-entry."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_prevent_posting_to_closed_period",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Blocks posting into closed Accounting period."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_update_Clients_balance_summary_from_Accounting",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Clients balance."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_update_Claims_balance_summary_from_Accounting",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Claims balance."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_update_payer_balance_summary_from_Accounting",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates payer AR summary."
  },
  {
    "trigger_type": "Accounting",
    "trigger_name": "trg_create_reconciliation_item",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Adds entry to reconciliation workflow if applicable."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_validate_era_Files",
    "trigger_tables": "era_Files",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents duplicate ERA Imports."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_create_era_Claims_from_Files",
    "trigger_tables": "era_Files",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates ERA Claims records from parsed Files."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_match_era_to_Claims",
    "trigger_tables": "era_Claims",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Attempts Claims matching."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_match_era_service_lines",
    "trigger_tables": "era_service_lines",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Attempts service-line matching."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_create_unmatched_era_task",
    "trigger_tables": "era_Claims",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates task if ERA cannot be matched."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_post_era_payment_to_Accounting",
    "trigger_tables": "era_matches",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts matched ERA payment."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_create_Denials_from_era",
    "trigger_tables": "era_Adjustmentss",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates Denials records from CARCs."
  },
  {
    "trigger_type": "ERA / EOB",
    "trigger_name": "trg_create_Overpayments_from_era",
    "trigger_tables": "era_payments",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Flags possible Overpayments."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_classify_Denials_from_carc",
    "trigger_tables": "Denials",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Maps CARC to Denials category."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_create_Denials_Workqueues_item",
    "trigger_tables": "Denials",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates Denials follow-up task."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_writeoff_nonworkable_Denials",
    "trigger_tables": "Denials",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Writes off credentialing/Payers Denials if configured."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_create_appeal_deadline",
    "trigger_tables": "appeals",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates appeal deadline."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_flag_appeal_deadline_approaching",
    "trigger_tables": "appeal_deadlines",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates deadline reminder task."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_update_Claims_after_appeal_outcome",
    "trigger_tables": "appeal_outcomes",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Claims based on appeal result."
  },
  {
    "trigger_type": "Denials",
    "trigger_name": "trg_close_Denials_task_after_resolution",
    "trigger_tables": "Denials",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Closes Denials task when resolved."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_create_client_responsibility_item",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates PR item from deductible/copay/coPayers balance."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_update_client_Collections_balance",
    "trigger_tables": "client_Collections_lines",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Updates Collections total."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_mark_Collections_sent",
    "trigger_tables": "Collections_delivery_logs",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates Collections sent status."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_create_payment_plan_schedule",
    "trigger_tables": "payment_plans",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates payment plan installments."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_update_payment_plan_status",
    "trigger_tables": "payment_plan_installments",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Updates plan status."
  },
  {
    "trigger_type": "Collections",
    "trigger_name": "trg_flag_past_due_client_balance",
    "trigger_tables": "client_responsibility_items",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Creates collections review task."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_identify_credit_balance",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Detects client or payer credit."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_create_credit_balance_record",
    "trigger_tables": "Accounting_entries",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates credit balance entry."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_create_refund_approval_task",
    "trigger_tables": "refund_requests",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates refund approval Workqueues item."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_post_refund_to_Accounting",
    "trigger_tables": "refund_payments",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Posts refund Accounting entry."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_update_credit_balance_after_refund",
    "trigger_tables": "refund_payments",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Reduces credit balance."
  },
  {
    "trigger_type": "Overpayments",
    "trigger_name": "trg_update_credit_balance_after_transfer",
    "trigger_tables": "credit_transfers",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Moves credit to another balance."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_validate_Workqueues_source",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates source object type and ID."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_create_Workqueues_history",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Tracks status, priority, and assignment changes."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_set_Workqueues_due_date",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Sets due date based on task type."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_assign_default_Workqueues_owner",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Assigns item based on rules."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_notify_Workqueues_assignee",
    "trigger_tables": "Workqueues_assignments",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Sends Notifications to assignee."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_reopen_Workqueues_on_new_activity",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Reopens task if new issue appears."
  },
  {
    "trigger_type": "Workqueues",
    "trigger_name": "trg_close_duplicate_Workqueues_items",
    "trigger_tables": "Workqueues_items",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents duplicate open tasks for same issue."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_Audits_account_note",
    "trigger_tables": "account_notes",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Logs account note changes."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_Audits_Claims_note",
    "trigger_tables": "Claims_notes",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update/Delete",
    "trigger_purpose": "Logs Claims note changes."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_prevent_edit_signed_communication",
    "trigger_tables": "communication_logs",
    "trigger_timing": "Before",
    "trigger_event": "Update/Delete",
    "trigger_purpose": "Prevents improper edits to finalized communication records."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_create_followup_from_communication",
    "trigger_tables": "communication_logs",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates follow-up task if needed."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_notify_new_Clients_message",
    "trigger_tables": "Clients_messages",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Notifies assigned Providers/admin."
  },
  {
    "trigger_type": "Communication",
    "trigger_name": "trg_mark_thread_updated",
    "trigger_tables": "Clients_messages",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Updates message thread timestamp"
  },
  {
    "trigger_type": "Providers",
    "trigger_name": "trg_validate_Providers_identifier",
    "trigger_tables": "Providers_identifiers",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates NPI/taxonomy/payer ID format."
  },
  {
    "trigger_type": "Providers",
    "trigger_name": "trg_flag_expiring_Providers_license",
    "trigger_tables": "Providers_licenses",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates license renewal task."
  },
  {
    "trigger_type": "Providers",
    "trigger_name": "trg_flag_expiring_Providers_Payers",
    "trigger_tables": "Providers_Payers",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates Payers renewal task."
  },
  {
    "trigger_type": "Providers",
    "trigger_name": "trg_create_credentialing_task",
    "trigger_tables": "Providers_payer_enrollments",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates task for pending/expired enrollment."
  },
  {
    "trigger_type": "Providers",
    "trigger_name": "trg_prevent_Claims_if_Providers_not_enrolled",
    "trigger_tables": "professional_Claims",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Blocks Claims if Providers cannot bill payer."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_validate_Payers_dates",
    "trigger_tables": "payer_Payers",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Validates effective/termination dates."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_prevent_overlapping_Payers_rates",
    "trigger_tables": "Payers_rates",
    "trigger_timing": "Before",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Prevents conflicting active rates."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_recalculate_expected_reimbursement",
    "trigger_tables": "Payers_rates",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Refreshes expected reimbursement calculations."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_flag_Payers_variance",
    "trigger_tables": "payment_allocations",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Flags underpayment/Overpayments against Payers."
  },
  {
    "trigger_type": "Payers",
    "trigger_name": "trg_create_Payers_variance_task",
    "trigger_tables": "Payers_variance_reviews",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates review task."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_validate_Imports_row",
    "trigger_tables": "Imports_rows",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Adds validation errors for bad Imports rows."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_create_Imports_validation_error",
    "trigger_tables": "Imports_rows",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Stores Imports errors."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_prevent_commit_with_errors",
    "trigger_tables": "Imports_batches",
    "trigger_timing": "Before",
    "trigger_event": "Update",
    "trigger_purpose": "Blocks commit if unresolved errors exist."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_create_legacy_record_link",
    "trigger_tables": "Importsed records",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Stores external source ID mapping."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_Audits_Imports_commit",
    "trigger_tables": "Imports_commits",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs Imports commit."
  },
  {
    "trigger_type": "Imports",
    "trigger_name": "trg_Audits_Imports_rollback",
    "trigger_tables": "Imports_rollbacks",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs rollback."
  },
  {
    "trigger_type": "Integrations",
    "trigger_name": "trg_store_external_mapping",
    "trigger_tables": "Integrations-created records",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Stores external system IDs."
  },
  {
    "trigger_type": "Integrations",
    "trigger_name": "trg_log_webhook_event",
    "trigger_tables": "webhook_events",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Logs incoming webhook."
  },
  {
    "trigger_type": "Pre-Session Dashboard",
    "trigger_name": "trg_log_pre_session_goal_update_change",
    "trigger_tables": "pre_session_goal_updates",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Audits client goal update creation, review, approval, rejection, and merge/discuss status changes."
  },
  {
    "trigger_type": "Pre-Session Dashboard",
    "trigger_name": "trg_create_safety_review_workqueue_item",
    "trigger_tables": "pre_session_safety_reviews",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Creates a workqueue item or provider notification when a safety review is elevated or urgent."
  },
  {
    "trigger_type": "Integrations",
    "trigger_name": "trg_create_sync_error_task",
    "trigger_tables": "Integrations_sync_errors",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates Workqueues item for sync failure."
  },
  {
    "trigger_type": "Integrations",
    "trigger_name": "trg_update_sync_job_status",
    "trigger_tables": "Integrations_sync_jobs",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Tracks sync lifecycle."
  },
  {
    "trigger_type": "Integrations",
    "trigger_name": "trg_prevent_duplicate_webhook_processing",
    "trigger_tables": "webhook_events",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents duplicate processing."
  },
  {
    "trigger_type": "Notifications",
    "trigger_name": "trg_create_Notifications_delivery",
    "trigger_tables": "Notifications",
    "trigger_timing": "After",
    "trigger_event": "Insert",
    "trigger_purpose": "Creates delivery records."
  },
  {
    "trigger_type": "Notifications",
    "trigger_name": "trg_mark_Notifications_read",
    "trigger_tables": "Notifications_deliveries",
    "trigger_timing": "After",
    "trigger_event": "Update",
    "trigger_purpose": "Updates read status."
  },
  {
    "trigger_type": "Notifications",
    "trigger_name": "trg_prevent_duplicate_Notifications",
    "trigger_tables": "Notifications",
    "trigger_timing": "Before",
    "trigger_event": "Insert",
    "trigger_purpose": "Prevents repeated duplicate alerts."
  },
  {
    "trigger_type": "Pre-Session Dashboard",
    "trigger_name": "trg_create_pre_session_response_for_appointment",
    "trigger_tables": "appointments",
    "trigger_timing": "After",
    "trigger_event": "Insert/Update",
    "trigger_purpose": "Ensures each appointment has a pre-session response shell."
  },
  {
    "trigger_type": "Pre-Session Dashboard",
    "trigger_name": "trg_pre_session_response_after_submit",
    "trigger_tables": "pre_session_responses",
    "trigger_timing": "After",
    "trigger_event": "Update of status",
    "trigger_purpose": "When a response is submitted, creates goal update rows, safety review rows, provider notifications/workqueue items as needed, flags appointment review, and writes audit log."
  }
]
$trigger_inventory$::jsonb) as t(
    trigger_type text,
    trigger_name text,
    trigger_tables text,
    trigger_timing text,
    trigger_event text,
    trigger_purpose text
  )
)
insert into public.therassistant_trigger_inventory (
  trigger_name,
  trigger_tables,
  trigger_type,
  trigger_timing,
  trigger_event,
  trigger_purpose,
  implementation_status,
  implementation_notes,
  updated_at
)
select
  trigger_name,
  trigger_tables,
  trigger_type,
  trigger_timing,
  trigger_event,
  trigger_purpose,
  'planned',
  case
    when lower(trigger_tables) in ('most tables', 'selected tables')
      or lower(trigger_tables) like '% tables'
      or lower(trigger_tables) like '%-scoped tables'
      or lower(trigger_tables) like '%relationship tables'
      or lower(trigger_tables) like '%business tables'
      or lower(trigger_tables) like '%document tables'
      or lower(trigger_tables) like '%status tables'
      or lower(trigger_tables) like '%records'
      or lower(trigger_tables) like '%-created records'
      then 'Template/group target from workbook; resolve concrete tables before creating executable trigger.'
    else 'Concrete target from workbook; implement trigger function and attach after table/column names are finalized.'
  end,
  now()
from source_rows
on conflict (trigger_name, trigger_tables) do update
set
  trigger_type = excluded.trigger_type,
  trigger_timing = excluded.trigger_timing,
  trigger_event = excluded.trigger_event,
  trigger_purpose = excluded.trigger_purpose,
  implementation_status = case
    when public.therassistant_trigger_inventory.implementation_status = 'implemented'
      then public.therassistant_trigger_inventory.implementation_status
    else excluded.implementation_status
  end,
  implementation_notes = excluded.implementation_notes,
  updated_at = now();

create or replace view public.therassistant_trigger_inventory_summary as
select
  trigger_type,
  count(*) as trigger_count,
  count(*) filter (where implementation_status = 'implemented') as implemented_count,
  count(*) filter (where implementation_status <> 'implemented') as remaining_count
from public.therassistant_trigger_inventory
group by trigger_type
order by trigger_type;

comment on view public.therassistant_trigger_inventory_summary
is 'Summary of planned THERASSISTANT EHR triggers by trigger type and implementation status.';

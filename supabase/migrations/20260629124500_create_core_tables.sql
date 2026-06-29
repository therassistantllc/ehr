-- THERASSISTANT EHR table scaffold
-- Generated from uploaded table blueprint on 2026-06-29.
--
-- This migration creates the requested tables as tenant-aware Supabase/Postgres
-- scaffolds. Tables are intentionally fail-closed with RLS enabled and no broad
-- public policies. Add table-specific columns, foreign keys, and RLS policies in
-- follow-up migrations as each module is implemented.

create extension if not exists pgcrypto;

create or replace function public.therassistant_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.therassistant_set_updated_at()
is 'Maintains updated_at timestamps for THERASSISTANT EHR tables.';

do $migration$
declare
  table_record record;
  tenant_index_name text;
  created_index_name text;
  trigger_name text;
begin
  for table_record in
    select
      table_name,
      table_type,
      table_purpose
    from jsonb_to_recordset($tables$[
  {
    "table_name": "tenants",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Stores each Practice, billing company, or platform-level organization."
  },
  {
    "table_name": "tenant_types",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Defines Tenants type: Practice, billing company, platform/admin, etc."
  },
  {
    "table_name": "tenant_settings",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Practice-level settings, billing settings, Claims defaults, timezone, branding, etc."
  },
  {
    "table_name": "tenant_users",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Links users to Tenants/Practices."
  },
  {
    "table_name": "tenant_roles",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Defines available roles per Tenants."
  },
  {
    "table_name": "tenant_user_roles",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Assigns roles to users inside each Tenants."
  },
  {
    "table_name": "billing_company_practice_links",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Links a billing company Tenants to Clients Practice Tenants."
  },
  {
    "table_name": "user_profiles",
    "table_type": "Tenants",
    "table_purpose": "Tenants: Stores app user profiles data tied to Supabase auth.users."
  },
  {
    "table_name": "permissions",
    "table_type": "Security",
    "table_purpose": "Security: Defines granular permissions such as view Claims, post payments, manage users."
  },
  {
    "table_name": "role_permissions",
    "table_type": "Security",
    "table_purpose": "Security: Maps permissions to roles."
  },
  {
    "table_name": "user_permission_overrides",
    "table_type": "Security",
    "table_purpose": "Security: Optional table for special user-level exceptions."
  },
  {
    "table_name": "phi_access_logs",
    "table_type": "Security",
    "table_purpose": "Security: Tracks when users access PHI."
  },
  {
    "table_name": "login_audit_logs",
    "table_type": "Security",
    "table_purpose": "Security: Tracks login/Security activity if needed."
  },
  {
    "table_name": "audits_logs",
    "table_type": "Audits",
    "table_purpose": "Audits: Central Audits table for inserts, updates, status changes, and sensitive actions."
  },
  {
    "table_name": "status_history",
    "table_type": "Audits",
    "table_purpose": "Audits: Tracks status transitions for Claims, charges, authorizations, Workqueues items, etc."
  },
  {
    "table_name": "system_events",
    "table_type": "Audits",
    "table_purpose": "Audits: Stores internal events such as Imports, batch creation, background jobs, and syncs."
  },
  {
    "table_name": "error_logs",
    "table_type": "Audits",
    "table_purpose": "Audits: Stores failed function calls, validation failures, and Integrations errors."
  },
  {
    "table_name": "clients",
    "table_type": "Clients",
    "table_purpose": "Clients: Main Clients/client record."
  },
  {
    "table_name": "client_demographics",
    "table_type": "Clients",
    "table_purpose": "Clients: Optional separated demographic detail table."
  },
  {
    "table_name": "client_contacts",
    "table_type": "Clients",
    "table_purpose": "Clients: Emergency contacts, guardians, responsible parties."
  },
  {
    "table_name": "client_addresses",
    "table_type": "Clients",
    "table_purpose": "Clients: Mailing, billing, and residential addresses."
  },
  {
    "table_name": "client_phones",
    "table_type": "Clients",
    "table_purpose": "Clients: Phone numbers if normalized separately."
  },
  {
    "table_name": "client_emails",
    "table_type": "Clients",
    "table_purpose": "Clients: Email addresses if normalized separately."
  },
  {
    "table_name": "client_relationships",
    "table_type": "Clients",
    "table_purpose": "Clients: Links Clients to parents, guardians, guarantors, or family members."
  },
  {
    "table_name": "client_files",
    "table_type": "Clients",
    "table_purpose": "Clients: Uploaded Files tied to the Clients."
  },
  {
    "table_name": "client_status_history",
    "table_type": "Clients",
    "table_purpose": "Clients: Tracks active, inactive, discharged, deceased, etc."
  },
  {
    "table_name": "client_external_ids",
    "table_type": "Clients",
    "table_purpose": "Clients: Stores IDs from SimplePractice, Availity, clearinghouses, Imported systems, etc."
  },
  {
    "table_name": "payers",
    "table_type": "Payers",
    "table_purpose": "Payers: Master payer list."
  },
  {
    "table_name": "payer_aliases",
    "table_type": "Payers",
    "table_purpose": "Payers: Handles payer name variations from Imports or ERAs."
  },
  {
    "table_name": "payer_plans",
    "table_type": "Payers",
    "table_purpose": "Payers: Stores plan-level details."
  },
  {
    "table_name": "client_case_policies",
    "table_type": "Case",
    "table_purpose": "Case: Clients payer coverage records."
  },
  {
    "table_name": "case_policy_order_history",
    "table_type": "Case",
    "table_purpose": "Case: Tracks primary, secondary, tertiary changes over time."
  },
  {
    "table_name": "eligibility_checks",
    "table_type": "Eligibility",
    "table_purpose": "Eligibility: Stores eligibility verification results."
  },
  {
    "table_name": "eligibility_benefits",
    "table_type": "Eligibility",
    "table_purpose": "Eligibility: Stores copay, deductible, coPayers, auth requirement, visit limits, etc."
  },
  {
    "table_name": "eligibility_service_details",
    "table_type": "Eligibility",
    "table_purpose": "Eligibility: CPT/service-specific benefit details."
  },
  {
    "table_name": "payer_cards",
    "table_type": "Payers",
    "table_purpose": "Payers: Stores Payers card Files/images or references."
  },
  {
    "table_name": "providers",
    "table_type": "Providers",
    "table_purpose": "Providers: Rendering Providers/clinicians."
  },
  {
    "table_name": "provider_profiles",
    "table_type": "Providers",
    "table_purpose": "Providers: Clinical and professional details."
  },
  {
    "table_name": "provider_identifiers",
    "table_type": "Providers",
    "table_purpose": "Providers: NPI, taxonomy, Medicaid ID, Medicare PTAN, payer IDs, etc."
  },
  {
    "table_name": "provider_licenses",
    "table_type": "Providers",
    "table_purpose": "Providers: State licenses and expiration dates."
  },
  {
    "table_name": "provider_credentials",
    "table_type": "Providers",
    "table_purpose": "Providers: LPC, LCSW, LAC, PMHNP, PsyD, etc."
  },
  {
    "table_name": "provider_locations",
    "table_type": "Providers",
    "table_purpose": "Providers: Provider service locations."
  },
  {
    "table_name": "provider_payer_enrollments",
    "table_type": "Providers",
    "table_purpose": "Providers: Credentialing/enrollment status by payer."
  },
  {
    "table_name": "provider_payers",
    "table_type": "Providers",
    "table_purpose": "Providers: Provider-specific Payers participation."
  },
  {
    "table_name": "supervision_relationships",
    "table_type": "Providers",
    "table_purpose": "Providers: Supervising Providers relationships if needed."
  },
  {
    "table_name": "practices",
    "table_type": "Practice",
    "table_purpose": "Practice: Practice entity details if separate from Tenants."
  },
  {
    "table_name": "practice_locations",
    "table_type": "Practice",
    "table_purpose": "Practice: Office/service locations."
  },
  {
    "table_name": "billing_entities",
    "table_type": "Practice",
    "table_purpose": "Practice: Billing Providers entities, tax IDs, group NPIs."
  },
  {
    "table_name": "service_facilities",
    "table_type": "Practice",
    "table_purpose": "Practice: Claims service facility locations."
  },
  {
    "table_name": "place_of_service_codes",
    "table_type": "Practice/Coding",
    "table_purpose": "Practice: POS code reference table. | Coding: POS reference table if not stored under Practice/facility area."
  },
  {
    "table_name": "appointments",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Main Appointments table."
  },
  {
    "table_name": "appointment_services",
    "table_type": "Appointments",
    "table_purpose": "Appointments: CPT/service attached to Appointments."
  },
  {
    "table_name": "appointment_attendees",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Clients/Providers/other participants."
  },
  {
    "table_name": "appointments_status_history",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Scheduled, checked in, completed, cancelled, no-show, etc."
  },
  {
    "table_name": "client_checkins",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Clients app/portal check-in activity."
  },
  {
    "table_name": "pre_session_questionnaires",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Defines pre-session questions."
  },
  {
    "table_name": "pre_session_responses",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Clients responses before session."
  },
  {
    "table_name": "calendar_events",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Optional normalized calendar display table."
  },
  {
    "table_name": "recurring_appointments_rules",
    "table_type": "Appointments",
    "table_purpose": "Appointments: Recurrence patterns if supporting recurring appointments"
  },
  {
    "table_name": "clinical_notes",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Main clinical note record."
  },
  {
    "table_name": "clinical_note_versions",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Stores note versions or drafts before locking."
  },
  {
    "table_name": "clinical_note_amendments",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Adds amendments after note is signed."
  },
  {
    "table_name": "clinical_note_signatures",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Providers signatures and signed timestamps."
  },
  {
    "table_name": "treatment_plans",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Clients Treatment Plans."
  },
  {
    "table_name": "treatment_plan_goals",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Goals tied to Treatment Plans."
  },
  {
    "table_name": "treatment_plan_objectives",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Objectives/interventions tied to goals."
  },
  {
    "table_name": "diagnoses_codes",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Master diagnosis reference or client-specific diagnoses."
  },
  {
    "table_name": "client_diagnoses",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Diagnoses assigned to the Clients."
  },
  {
    "table_name": "assessment_records",
    "table_type": "Documentation",
    "table_purpose": "Documentation: H0031, H0001, H0002, 90791, biopsychosocial assessments."
  },
  {
    "table_name": "screening_tools",
    "table_type": "Documentation",
    "table_purpose": "Documentation: PHQ-9, GAD-7, CAGE-AID, etc."
  },
  {
    "table_name": "screening_responses",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Clients answers/results for screening tools."
  },
  {
    "table_name": "clinical_templates",
    "table_type": "Documentation",
    "table_purpose": "Documentation: Templates for notes, assessments, Treatment Plans."
  },
  {
    "table_name": "charges",
    "table_type": "Charges",
    "table_purpose": "Charges: Pre-Claims billable service records."
  },
  {
    "table_name": "charge_lines",
    "table_type": "Charges",
    "table_purpose": "Charges: CPT/HCPCS line-level detail if separated from charge item."
  },
  {
    "table_name": "charge_validation_errors",
    "table_type": "Charges",
    "table_purpose": "Charges: Missing diagnosis, payer, auth, Providers enrollment, etc."
  },
  {
    "table_name": "charge_status_history",
    "table_type": "Charges",
    "table_purpose": "Charges: Tracks charge status transitions."
  },
  {
    "table_name": "charge_notes",
    "table_type": "Charges",
    "table_purpose": "Charges: Admin/billing notes tied to charge items."
  },
  {
    "table_name": "claims",
    "table_type": "Claims",
    "table_purpose": "Claims: Main CMS-1500 / 837P Claims header."
  },
  {
    "table_name": "claim_lines",
    "table_type": "Claims",
    "table_purpose": "Claims: Claims service lines."
  },
  {
    "table_name": "claim_diagnoses",
    "table_type": "Claims",
    "table_purpose": "Claims: Diagnoses attached to Claims."
  },
  {
    "table_name": "claim_pointers",
    "table_type": "Claims",
    "table_purpose": "Claims: Diagnosis pointers by Claims line."
  },
  {
    "table_name": "claim_status_history",
    "table_type": "Claims",
    "table_purpose": "Claims: Claims status transitions."
  },
  {
    "table_name": "claim_validation_errors",
    "table_type": "Claims",
    "table_purpose": "Claims: Claims-level validation errors."
  },
  {
    "table_name": "claim_notes",
    "table_type": "Claims/Communication",
    "table_purpose": "Claims: Claims-specific billing notes. | Communication: Claims-specific notes."
  },
  {
    "table_name": "claim_external_ids",
    "table_type": "Claims",
    "table_purpose": "Claims: Payer Claims number, clearinghouse Claims ID, control numbers, etc."
  },
  {
    "table_name": "claim_attatchments",
    "table_type": "Claims",
    "table_purpose": "Claims: EOBs, appeal letters, payer letters, attachments."
  },
  {
    "table_name": "claim_corrections",
    "table_type": "Claims",
    "table_purpose": "Claims: Corrected Claims history."
  },
  {
    "table_name": "claim_reversals",
    "table_type": "Claims",
    "table_purpose": "Claims: Reversal history."
  },
  {
    "table_name": "claim_batches",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Batch header for grouped Claims."
  },
  {
    "table_name": "batched_claims",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Claims included in each batch."
  },
  {
    "table_name": "claim_submission_files",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Generated 837 Files or Files references."
  },
  {
    "table_name": "claim_submissions",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Submission attempts."
  },
  {
    "table_name": "submission_responses",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Clearinghouse or payer responses."
  },
  {
    "table_name": "claim_status_responses",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: 276/277 status response data."
  },
  {
    "table_name": "clearinghouse_accounts",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Clearinghouse credentials/settings per Tenants."
  },
  {
    "table_name": "payer_submission_rules",
    "table_type": "Claims Submission",
    "table_purpose": "Claims Submission: Payer-specific submission requirements."
  },
  {
    "table_name": "era_files",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Uploaded/Importsed 835 Files."
  },
  {
    "table_name": "era_claims",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Claims-level ERA data."
  },
  {
    "table_name": "era_service_lines",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Service-line ERA data."
  },
  {
    "table_name": "era_adjustments",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: CARC/RARC Adjustments data from ERA."
  },
  {
    "table_name": "era_payments",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Payment/check/EFT level information."
  },
  {
    "table_name": "era_matches",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Maps ERA items to internal Claims, Clients, or historical transactions."
  },
  {
    "table_name": "manual_eobs",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Manually entered EOB data when no ERA exists."
  },
  {
    "table_name": "eob_files",
    "table_type": "ERA / EOB",
    "table_purpose": "ERA / EOB: Uploaded EOB PDFs/images."
  },
  {
    "table_name": "payments",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Main payment record."
  },
  {
    "table_name": "payment_allocations",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Applies payment amounts to Claims, Claims lines, or Clients balances."
  },
  {
    "table_name": "payment_sources",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Payers, client, third party, historical, refund, transfer, etc."
  },
  {
    "table_name": "payment_methods",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: EFT, check, credit card, cash, ACH, etc."
  },
  {
    "table_name": "payment_reversals",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Reversal records."
  },
  {
    "table_name": "unapplied_payments",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Payments not yet applied to a Claims or balance."
  },
  {
    "table_name": "payment_batches",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Optional batch posting by check/EFT/ERA."
  },
  {
    "table_name": "client_payments",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Optional separate table for client-specific payment records."
  },
  {
    "table_name": "payer_payments",
    "table_type": "Payment Posting",
    "table_purpose": "Payment Posting: Optional separate table for payer-specific payment records."
  },
  {
    "table_name": "payment_adjustments",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: Main Adjustments record."
  },
  {
    "table_name": "adjustment_allocations",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: Applies Adjustments to Claims, lines, or Clients balances."
  },
  {
    "table_name": "adjustment_types",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: write-off, refund correction, bad debt, credentialing write-off, etc."
  },
  {
    "table_name": "adjustment_reversals",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: Reversal records."
  },
  {
    "table_name": "carc_codes",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: CARC reference table."
  },
  {
    "table_name": "rarc_codes",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: RARC reference table."
  },
  {
    "table_name": "carc_mappings",
    "table_type": "Adjustments",
    "table_purpose": "Adjustments: Maps CARCs to workable, non-workable, PR, CO, OA, PI categories."
  },
  {
    "table_name": "historical_transactions",
    "table_type": "Historical Posting",
    "table_purpose": "Historical Posting: Legacy payments, credits, balances, and Adjustmentss without Claims."
  },
  {
    "table_name": "historical_transaction_allocations",
    "table_type": "Historical Posting",
    "table_purpose": "Historical Posting: Optional allocation of historical transactions to Clients, payers, Providerss, or later-created Claims."
  },
  {
    "table_name": "opening_balances",
    "table_type": "Historical Posting",
    "table_purpose": "Historical Posting: Starting client or payer balances from prior systems."
  },
  {
    "table_name": "legacy_import_sources",
    "table_type": "Historical Posting",
    "table_purpose": "Historical Posting: Tracks where historical data came from."
  },
  {
    "table_name": "legacy_record_links",
    "table_type": "Historical Posting",
    "table_purpose": "Historical Posting: Links Importsed historical records to original external IDs."
  },
  {
    "table_name": "accounting_entries",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Core financial Accounting entries."
  },
  {
    "table_name": "accounting_transactions",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Groups related Accounting entries into one transaction."
  },
  {
    "table_name": "accounting_accounts",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Payers AR, client AR, revenue, Adjustmentss, refunds, credits, etc."
  },
  {
    "table_name": "accounting_account_types",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Receivable, revenue, Adjustments, liability, cash, etc."
  },
  {
    "table_name": "client_balance_summaries",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Cached balance summary by Clients."
  },
  {
    "table_name": "claim_balance_summaries",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Cached balance summary by Claims."
  },
  {
    "table_name": "payer_balance_summaries",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Optional payer AR summary."
  },
  {
    "table_name": "accounting_periods",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Monthly/period close tracking."
  },
  {
    "table_name": "reconciliation_batches",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Bank/EFT/ERA/payment reconciliation."
  },
  {
    "table_name": "reconciliation_items",
    "table_type": "Accounting",
    "table_purpose": "Accounting: Individual reconciliation lines."
  },
  {
    "table_name": "client_responsibility_items",
    "table_type": "Collections",
    "table_purpose": "Collections: Copay, deductible, coPayers, non-covered balances."
  },
  {
    "table_name": "client_invoice",
    "table_type": "Collections",
    "table_purpose": "Collections: invoice header."
  },
  {
    "table_name": "client_invoice_lines",
    "table_type": "Collections",
    "table_purpose": "Collections: Line-level invoice detail."
  },
  {
    "table_name": "invoice_delivery_logs",
    "table_type": "Collections",
    "table_purpose": "Collections: Tracks mailed, emailed, portal-delivered invoices."
  },
  {
    "table_name": "payment_plans",
    "table_type": "Collections",
    "table_purpose": "Collections: client payment plan setup."
  },
  {
    "table_name": "payment_plan_installments",
    "table_type": "Collections",
    "table_purpose": "Collections: Scheduled installment amounts/dates."
  },
  {
    "table_name": "collections_status_history",
    "table_type": "Collections",
    "table_purpose": "Collections: Tracks client collection workflow."
  },
  {
    "table_name": "hardship_applications",
    "table_type": "Collections",
    "table_purpose": "Collections: Optional financial hardship documentation."
  },
  {
    "table_name": "credit_balances",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: client or payer credits."
  },
  {
    "table_name": "refund_requests",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: Refund request workflow."
  },
  {
    "table_name": "refund_approvals",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: Approval/Denials records."
  },
  {
    "table_name": "refund_payments",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: Posted refund transactions."
  },
  {
    "table_name": "credit_transfers",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: Transfer of credit to another balance or Clients account."
  },
  {
    "table_name": "overpayment_reviews",
    "table_type": "Overpayments",
    "table_purpose": "Overpayments: Payer or client Overpayments review workflow."
  },
  {
    "table_name": "claim_denials",
    "table_type": "Denials",
    "table_purpose": "Denials: Main Denials record."
  },
  {
    "table_name": "denial_reasons",
    "table_type": "Denials",
    "table_purpose": "Denials: Categorized Denials reasons."
  },
  {
    "table_name": "denial_actions",
    "table_type": "Denials",
    "table_purpose": "Denials: Follow-up actions taken."
  },
  {
    "table_name": "claim_reconsiderations",
    "table_type": "Denials",
    "table_purpose": "Denials: Reconsideration workflow records."
  },
  {
    "table_name": "claim_appeals",
    "table_type": "Denials",
    "table_purpose": "Denials: Appeal workflow records."
  },
  {
    "table_name": "claim_appeal_documents",
    "table_type": "Denials",
    "table_purpose": "Denials: Appeal letters, forms, medical records, proof of timely filing."
  },
  {
    "table_name": "appeal_deadlines",
    "table_type": "Denials",
    "table_purpose": "Denials: Tracks filing deadlines."
  },
  {
    "table_name": "appeal_outcomes",
    "table_type": "Denials",
    "table_purpose": "Denials: Tracks upheld, overturned, partially paid, etc."
  },
  {
    "table_name": "corrected_claim_requests",
    "table_type": "Denials",
    "table_purpose": "Denials: Corrected Claims workflow tracking."
  },
  {
    "table_name": "workqueue_items",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Main operational task table."
  },
  {
    "table_name": "workqueue_types",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Eligibility issue, auth issue, Claims rejection, Denials, AR follow-up, etc."
  },
  {
    "table_name": "workqueue_statuses",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Open, in progress, pending, snoozed, completed, cancelled."
  },
  {
    "table_name": "workqueue_assignments",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Assigned users/teams."
  },
  {
    "table_name": "workqueue_item_comments",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Comments on Workqueues items."
  },
  {
    "table_name": "workqueue_history",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Tracks status, assignment, priority changes."
  },
  {
    "table_name": "workqueue_deferred",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Snooze history and next follow-up date."
  },
  {
    "table_name": "workqueue_rules",
    "table_type": "Workqueues",
    "table_purpose": "Workqueues: Optional automation rules for creating tasks."
  },
  {
    "table_name": "account_notes",
    "table_type": "Communication",
    "table_purpose": "Communication: Non-clinical account notes."
  },
  {
    "table_name": "payment_notes",
    "table_type": "Communication",
    "table_purpose": "Communication: Payment-specific notes."
  },
  {
    "table_name": "admin_notes",
    "table_type": "Communication",
    "table_purpose": "Communication: Internal admin notes."
  },
  {
    "table_name": "client_messages",
    "table_type": "Communication",
    "table_purpose": "Communication: Portal/app messages."
  },
  {
    "table_name": "message_threads",
    "table_type": "Communication",
    "table_purpose": "Communication: Conversation grouping."
  },
  {
    "table_name": "message_attachments",
    "table_type": "Communication",
    "table_purpose": "Communication: Attachments to messages."
  },
  {
    "table_name": "communication_logs",
    "table_type": "Communication",
    "table_purpose": "Communication: Phone calls, emails, payer calls, client contact logs."
  },
  {
    "table_name": "task_notes",
    "table_type": "Communication",
    "table_purpose": "Communication: Notes attached to Workqueues items."
  },
  {
    "table_name": "payer_profiles",
    "table_type": "Payers",
    "table_purpose": "Payers: Payers records by payer/Practice/Providers."
  },
  {
    "table_name": "payer_rates",
    "table_type": "Payers",
    "table_purpose": "Payers: CPT-level expected rates."
  },
  {
    "table_name": "cpt_fee_schedule",
    "table_type": "Payers",
    "table_purpose": "Payers: Fee schedule headers."
  },
  {
    "table_name": "cpt_fee_schedule_lines",
    "table_type": "Payers",
    "table_purpose": "Payers: CPT/modifier/unit/rate detail."
  },
  {
    "table_name": "payer_effective_periods",
    "table_type": "Payers",
    "table_purpose": "Payers: Effective and termination dates."
  },
  {
    "table_name": "payer_variance_reviews",
    "table_type": "Payers",
    "table_purpose": "Payers: Underpayment/Overpayments comparison workflow."
  },
  {
    "table_name": "expected_reimbursement_rules",
    "table_type": "Payers",
    "table_purpose": "Payers: Rules for expected allowed amount calculations."
  },
  {
    "table_name": "cpt_codes",
    "table_type": "Coding",
    "table_purpose": "Coding: CPT/HCPCS master list."
  },
  {
    "table_name": "cpt_code_rules",
    "table_type": "Coding",
    "table_purpose": "Coding: Time/unit/documentation rules."
  },
  {
    "table_name": "modifier_codes",
    "table_type": "Coding",
    "table_purpose": "Coding: Modifier reference table."
  },
  {
    "table_name": "diagnosis_codes",
    "table_type": "Coding",
    "table_purpose": "Coding: ICD-10 reference table."
  },
  {
    "table_name": "taxonomy_codes",
    "table_type": "Coding",
    "table_purpose": "Coding: Providers taxonomy reference."
  },
  {
    "table_name": "code_compatibility_rules",
    "table_type": "Coding",
    "table_purpose": "Coding: Rules for CPT + modifier + POS + credential combinations."
  },
  {
    "table_name": "ncci_edit_rules",
    "table_type": "Coding",
    "table_purpose": "Coding: Optional NCCI edit reference."
  },
  {
    "table_name": "payer_coding_rules",
    "table_type": "Coding",
    "table_purpose": "Coding: Payer-specific coding limits."
  },
  {
    "table_name": "import_batches",
    "table_type": "Imports",
    "table_purpose": "Imports: Imports job header."
  },
  {
    "table_name": "import_files",
    "table_type": "Imports",
    "table_purpose": "Imports: Uploaded Files used for Imports."
  },
  {
    "table_name": "import_rows",
    "table_type": "Imports",
    "table_purpose": "Imports: Raw Imported row data."
  },
  {
    "table_name": "import_validation_errors",
    "table_type": "Imports",
    "table_purpose": "Imports: Validation issues before commit."
  },
  {
    "table_name": "import_mappings",
    "table_type": "Imports",
    "table_purpose": "Imports: Column mapping from source Files to system tables."
  },
  {
    "table_name": "import_commits",
    "table_type": "Imports",
    "table_purpose": "Imports: Tracks committed Imports batches."
  },
  {
    "table_name": "import_rollbacks",
    "table_type": "Imports",
    "table_purpose": "Imports: Tracks rolled-back Imports batches."
  },
  {
    "table_name": "integration_connections",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Connected external systems."
  },
  {
    "table_name": "integration_credentials",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Encrypted credentials/tokens where appropriate."
  },
  {
    "table_name": "integration_sync_jobs",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Sync job history."
  },
  {
    "table_name": "integration_sync_errors",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Integrations error tracking."
  },
  {
    "table_name": "external_system_mappings",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Maps external IDs to internal records."
  },
  {
    "table_name": "webhook_events",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Incoming webhook event log."
  },
  {
    "table_name": "outbound_webhook_deliveries",
    "table_type": "Integrations",
    "table_purpose": "Integrations: Outbound webhook delivery log."
  },
  {
    "table_name": "notifications",
    "table_type": "Notifications",
    "table_purpose": "Notifications: In-app Notifications."
  },
  {
    "table_name": "notification_preferences",
    "table_type": "Notifications",
    "table_purpose": "Notifications: User Notifications settings."
  },
  {
    "table_name": "notification_deliveries",
    "table_type": "Notifications",
    "table_purpose": "Notifications: Email/SMS/push delivery records."
  },
  {
    "table_name": "notification_templates",
    "table_type": "Notifications",
    "table_purpose": "Notifications: Reusable Notifications templates."
  },
  {
    "table_name": "report_daily_flash",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Daily operational snapshot."
  },
  {
    "table_name": "report_ar_summary",
    "table_type": "Reporting",
    "table_purpose": "Reporting: AR summary by aging bucket."
  },
  {
    "table_name": "report_ar_by_payer",
    "table_type": "Reporting",
    "table_purpose": "Reporting: AR by payer."
  },
  {
    "table_name": "report_ar_by_provider",
    "table_type": "Reporting",
    "table_purpose": "Reporting: AR by Providers."
  },
  {
    "table_name": "report_denials_analysis",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Denials by payer, Providers, CARC, and category."
  },
  {
    "table_name": "report_clean_claim_rate",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Clean Claims metrics."
  },
  {
    "table_name": "report_first_pass_yield",
    "table_type": "Reporting",
    "table_purpose": "Reporting: First-pass payment success."
  },
  {
    "table_name": "report_payment_posting_summary",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Payment and Adjustments totals."
  },
  {
    "table_name": "report_payer_mix",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Payer mix by visits, charges, or payments."
  },
  {
    "table_name": "report_provider_productivity",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Providers Appointments/charge/productivity report."
  },
  {
    "table_name": "report_payer_variance",
    "table_type": "Reporting",
    "table_purpose": "Reporting: Expected vs actual reimbursement."
  },
  {
    "table_name": "states",
    "table_type": "Configuration",
    "table_purpose": "Configuration: State reference table."
  },
  {
    "table_name": "countries",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Country reference table."
  },
  {
    "table_name": "timezones",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Timezone reference table."
  },
  {
    "table_name": "service_types",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Therapy, assessment, crisis, group, case management, etc."
  },
  {
    "table_name": "document_types",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Intake form, Payers card, EOB, auth letter, appeal, etc."
  },
  {
    "table_name": "status_definitions",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Optional central status catalog."
  },
  {
    "table_name": "system_settings",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Platform-level settings."
  },
  {
    "table_name": "feature_flags",
    "table_type": "Configuration",
    "table_purpose": "Configuration: Enables/disables app features by Tenants."
  },
  {
    "table_name": "pre_session_goal_updates",
    "table_type": "Pre-Session Dashboard",
    "table_purpose": "Pre-Session Dashboard: Stores client-submitted goal updates separately from the official treatment plan; supports provider review, approval, rejection, merge/discuss workflow, and auditability."
  },
  {
    "table_name": "clinical_note_imports",
    "table_type": "Pre-Session Dashboard",
    "table_purpose": "Pre-Session Dashboard: Tracks portal/check-in content imported into a progress note; keeps raw client input separate from provider-authored documentation and supports note provenance."
  },
  {
    "table_name": "pre_session_safety_reviews",
    "table_type": "Pre-Session Dashboard",
    "table_purpose": "Pre-Session Dashboard: Tracks safety concern review separately from ordinary check-in review; requires provider acknowledgement and supports clinical accountability."
  }
]$tables$::jsonb)
      as t(table_name text, table_type text, table_purpose text)
  loop
    execute format($sql$
      create table if not exists public.%I (
        id uuid primary key default gen_random_uuid(),
        tenant_id uuid null,
        name text null,
        status text null,
        description text null,
        external_id text null,
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        deleted_at timestamptz null
      )
    $sql$, table_record.table_name);

    execute format(
      'comment on table public.%I is %L',
      table_record.table_name,
      table_record.table_purpose
    );

    execute format('alter table public.%I enable row level security', table_record.table_name);
    execute format('alter table public.%I force row level security', table_record.table_name);

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = table_record.table_name
        and column_name = 'tenant_id'
    ) then
      tenant_index_name := left('idx_' || table_record.table_name || '_tenant_id', 63);
      execute format(
        'create index if not exists %I on public.%I (tenant_id)',
        tenant_index_name,
        table_record.table_name
      );
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = table_record.table_name
        and column_name = 'created_at'
    ) then
      created_index_name := left('idx_' || table_record.table_name || '_created_at', 63);
      execute format(
        'create index if not exists %I on public.%I (created_at)',
        created_index_name,
        table_record.table_name
      );
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = table_record.table_name
        and column_name = 'updated_at'
    ) then
      trigger_name := left('trg_' || table_record.table_name || '_set_updated_at', 63);

      if not exists (
        select 1
        from pg_trigger
        where tgname = trigger_name
          and tgrelid = to_regclass(format('public.%I', table_record.table_name))
      ) then
        execute format(
          'create trigger %I before update on public.%I for each row execute function public.therassistant_set_updated_at()',
          trigger_name,
          table_record.table_name
        );
      end if;
    end if;
  end loop;
end;
$migration$;

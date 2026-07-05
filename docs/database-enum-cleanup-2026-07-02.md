# Workflow enum cleanup sync — 2026-07-02

This branch syncs the `ehr` repository with the workflow enum cleanup performed directly against the active THERASSISTANT EHR Supabase project.

## Purpose

The prior working build lived under `THERASSISTANTEHR`, with the application under `artifacts/therassistant-ehr`. The cleaned `ehr` repository is now the target source of truth, so the database cleanup needs to exist here as a repeatable migration instead of remaining as manual database state.

## Migration added

- `supabase/migrations/20260702193000_normalize_workflow_enums.sql`

## What the migration covers

- Adds missing workflow enum values needed by claims, claim batches, eligibility, workqueues, payment posting, refunds, notes, and source object references.
- Creates canonical workflow enums introduced during cleanup:
  - `accounting_transaction_status_enum`
  - `claim_correction_status_enum`
  - `client_responsibility_status_enum`
  - `invoice_status_enum`
  - `payment_match_status_enum`
- Renames corrupted workbook/import labels to lowercase snake_case.
- Normalizes the final bad enum labels found after verification:
  - `corrected_Claims_needed` → `corrected_claim_needed`
  - `Imports` → `import`
  - `corrected_Claims` → `corrected_claim`
  - `ehr_Imports` → `ehr_import`
  - `Clients_visible` → `client_visible`
  - `Providers_visible` → `provider_visible`
  - `historical_Imports` → `historical_import`
  - `wrong_Claims` → `wrong_claim`
  - `wrong_Clients` → `wrong_client`
  - `billing_Providers` → `billing_provider`
  - `rendering_Providers` → `rendering_provider`
- Restores the unique live auto-batch guard:
  - `idx_claim_batches_auto_group_unique_live`
- Drops superseded duplicate enum types only if nothing still depends on them:
  - `appointment_status`
  - `claim_status`
  - `eligibility_status`
  - `workqueue_priority`
  - `workqueue_status`

## Verification notes

After the database cleanup, the only remaining non-lowercase enum values were:

- `adjustments_group_code_enum.CO`
- `adjustments_group_code_enum.OA`
- `adjustments_group_code_enum.PI`
- `adjustments_group_code_enum.PR`

These are valid CARC/CAS group codes and should remain uppercase.

## Not included yet

The manual database cleanup also converted many columns to canonical enum types. Some of those changes were performed with table-specific dependency handling because views, triggers, indexes, and empty scaffold tables blocked direct casts.

Those column conversions should be committed as a separate follow-up migration after a fresh local Supabase reset/test, so the repo does not contain a migration that silently drops populated columns.

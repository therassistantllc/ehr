# Schema Drift / Duplication Check — 2026-07-04

## Scope checked

Operational RCM modules currently wired in `src/index.ts`:

- Eligibility/readiness
- Import → charge capture
- Charge → claim workflow
- Claim batching / structured submission file preparation
- Payment posting
- Manual EOB posting
- Historical payment posting without claim
- ERA parsing and auto-posting
- Denials / AR follow-up
- Appeals / reconsiderations / corrected claim workflow
- Balance statements
- Refunds / credits / overpayments
- RCM operational reporting

## Compatibility migrations added

These migrations add operational columns using `add column if not exists` to avoid destructive changes:

- `20260703183000_align_import_workflow_schema.sql`
- `20260703190000_align_claim_batch_generation_schema.sql`
- `20260703193000_align_payment_posting_schema.sql`
- `20260703194500_align_era_import_schema.sql`
- `20260704133000_align_denial_ar_statement_refund_schema.sql`

## Duplication notes

No intentional duplicate replacement tables were added. The current pattern is compatibility alignment on existing scaffold tables. Known overlap areas that should remain normalized rather than duplicated:

- `payments`, `payment_allocations`, `payment_adjustments`, `manual_eobs`, `historical_payments`
- `era_files`, `era_payments`, `era_claims`, `era_service_lines`, `era_adjustments`
- `denials`, `ar_follow_up`, `appeals`
- `patient_statements`, `statement_lines`
- `refunds`

## Schema drift risks to verify in Supabase

1. Some scaffold tables may have pre-existing columns with different names from the service layer. The compatibility migrations add aliases where needed, but actual Supabase migration execution should be checked.
2. RLS policies may not yet cover the newly used operational columns or workflows.
3. Some service methods assume common shared columns exist across operational tables: `tenant_id`, `archived_at`, `created_at`, `metadata`.
4. Claim matching in ERA posting currently uses claim id, claim number, patient account number, and payer claim control number. If those columns do not all exist in live Supabase, add compatibility columns or adjust the matcher.
5. Final clearinghouse-ready 837P emission is not complete. The current module creates a validated structured batch artifact for downstream emitter wiring.

## Required validation before production use

Run:

```bash
npm run typecheck
npm run build
```

Then apply migrations against a non-production Supabase branch and run a smoke test:

1. Import rows to charges.
2. Create claim from charge.
3. Batch claim.
4. Generate structured claim batch file.
5. Post manual EOB.
6. Upload/post ERA.
7. Recalculate claim balance.
8. Create denial/AR follow-up.
9. Create appeal or corrected claim.
10. Create balance statement.
11. Detect overpayment/refund/credit.
12. Generate RCM summary.

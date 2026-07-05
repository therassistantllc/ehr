# RCM Fast Track — 2026-07-03

## Build rule

Use `therassistantllc/THERASSISTANTEHR` as the reference repo and `therassistantllc/ehr` as the active build repo.

Do not copy old Next.js routes wholesale. Port service logic, validation logic, schema ideas, and workflow behavior into the current `ehr` service structure.

## MVP path

Build the RCM pilot before the full clinical EHR.

End-to-end pilot workflow:

1. Client, payer, provider, and policy data exist.
2. Eligibility can be checked or manually recorded.
3. Eligibility/auth issues create workqueue rows.
4. Charges can be captured and validated.
5. Claims can be created and batched.
6. Payments, denials, adjustments, credits, refunds, and historical transactions post to the ledger.
7. Dashboard shows unresolved work and balances.

## Port order

### 1. Eligibility

Old reference files:

- `artifacts/therassistant-ehr/lib/eligibility/latestEligibilityService.ts`
- `artifacts/therassistant-ehr/lib/eligibility/eligibilityIssuesService.ts`
- `artifacts/therassistant-ehr/lib/eligibility/eligibilityPreparationService.ts`
- `artifacts/therassistant-ehr/lib/eligibility/build270BatchFile.ts`

Active target:

- Extend `src/services/eligibilityService.ts`.
- Add latest eligibility display status.
- Add stale eligibility warning logic.
- Add inactive coverage and authorization workqueue generation.
- Add eligibility dashboard rows.

### 2. Claims / 837P

Old reference files:

- `artifacts/therassistant-ehr/lib/claims/submit837PBatch.ts`
- `artifacts/therassistant-ehr/lib/claims/edi837pSubmissionService.ts`
- `artifacts/therassistant-ehr/lib/claims/edi837pBatchService.ts`
- `artifacts/therassistant-ehr/lib/claims/rebuild837PBatchFile.ts`
- `artifacts/therassistant-ehr/lib/validation/claimSubmissionGate.tsx`

Active target:

- Extend `src/services/claimsService.ts`.
- Add claim readiness validation.
- Add 837P batch build tracking.
- Add rejected-claim rebuild path.
- Add simple 837P batch dashboard table.

### 3. Payment posting / ledger

Active target:

- Add `src/services/paymentPostingService.ts`.
- Add or extend ledger posting logic.
- Support insurance payments, client payments, denials, adjustments, reversals, refunds, credits, and historical transactions without requiring a claim.
- Audit every posting action.

### 4. Mailroom

Old reference files:

- `artifacts/therassistant-ehr/lib/mailroom/filing.ts`
- `artifacts/therassistant-ehr/lib/mailroom/search.ts`
- `artifacts/therassistant-ehr/app/mailroom/*`
- `artifacts/therassistant-ehr/app/api/mailroom/*`

Active target:

- Add `src/services/mailroomService.ts`.
- Add upload, index, route, file, link, and search behavior.
- Keep document linking generic across client, provider, payer, claim, payment, ledger, authorization, and workqueue records.

## Two-week sprint

### Week 1

- Finish eligibility snapshot and issue logic.
- Add eligibility issue rows to dashboard/workqueues.
- Confirm active migration column names.
- Typecheck/build after every small batch.

### Week 2

- Port 837P batch validation/build core.
- Add claims batch dashboard screen.
- Add payment posting and ledger service skeletons.
- Wire payment and ledger routes into visible UI.

## Defer until after RCM pilot

- Full scheduling UX.
- Full note editor.
- Treatment plan builder.
- Patient journal.
- Pre-session clinical dashboard.
- Advanced reporting.
- Patient portal polish.
- Complex role management UI.

## Port gate

Every port must:

1. Support RCM MVP.
2. Use current `ehr` table names or include a migration.
3. Use `TherassistantService` and the active Supabase client pattern.
4. Remove old Next.js route dependency.
5. Typecheck.
6. Build.

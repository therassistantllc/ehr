# RCM MVP Fast-Track Plan

Date: 2026-07-03

## Decision

The active build target is `therassistantllc/ehr`.

`therassistantllc/THERASSISTANTEHR` is a reference and source-material repository only. Do not continue building new product code in the old repo. Do not copy old Next.js routes wholesale.

## Goal

Move faster by shipping the RCM core first, then expanding into the broader clinical EHR.

The immediate MVP is not a full EHR. The immediate MVP is a working revenue-cycle operating system for behavioral health billing.

## MVP Scope

### In scope now

1. Imports and validation
2. Eligibility and benefits
3. Charge capture
4. Claim creation and 837P readiness
5. Workqueues
6. Payment posting
7. Ledger and balances
8. Mailroom document intake/routing
9. Basic reporting/dashboard

### Deferred

1. Full scheduling
2. Full treatment-plan builder
3. Full clinical note authoring system
4. Patient journal
5. Pre-Session clinical dashboard
6. Patient portal polish
7. Advanced reporting
8. Complex role-management UI

## Porting Rules

For each module ported from `THERASSISTANTEHR`:

1. Extract business logic, types, validation rules, and schema assumptions.
2. Do not copy old app routes wholesale.
3. Rebuild as clean services, adapters, hooks, and UI screens inside `ehr`.
4. Confirm the module runs against the current Supabase schema.
5. Typecheck.
6. Build.
7. Remove dead code.
8. Document any schema gaps.

## Phase 1: Eligibility

### Current status

`ehr` already has an `EligibilityService` with:

- client policy creation
- policy termination
- active policy lookup by service date
- eligibility verification storage
- latest eligibility lookup
- expected client responsibility calculation
- eligibility issue workqueue creation

### Pull from old repo

Use `THERASSISTANTEHR` only for reference from:

- `lib/eligibility/latestEligibilityService.ts`
- `lib/eligibility/eligibilityPreparationService.ts`
- `lib/eligibility/eligibilityIssuesService.ts`
- `lib/eligibility/build270BatchFile.ts`
- eligibility API route behavior
- eligibility issue UI behavior

### Build next in `ehr`

1. Add `EligibilityReadinessService`.
2. Add dashboard rows for stale, missing, inactive, auth-required, and needs-review eligibility.
3. Add eligibility workqueue filters.
4. Add UI action screen for eligibility review.
5. Add tenant-safe Supabase queries.
6. Add tests for status mapping and stale eligibility logic.

## Phase 2: Claims / 837P

### Pull from old repo

Use old files as reference only:

- `lib/claims/submit837PBatch.ts`
- `lib/claims/edi837pSubmissionService.ts`
- `lib/claims/edi837pBatchService.ts`
- `lib/claims/rebuild837PBatchFile.ts`
- `lib/claims/rebuild837pForRejection.ts`
- `lib/claims/buildSecondary837PBatch.tsx`
- `lib/validation/claimSubmissionGate.tsx`

### Build next in `ehr`

1. Normalize claim facts from current tables.
2. Build claim validation gate.
3. Create 837P batch readiness service.
4. Generate 837P payload/file from clean claim data.
5. Track batch status.
6. Track claim build errors.
7. Surface claim blockers in workqueues.

## Phase 3: Payment Posting / Ledger

### Build next in `ehr`

1. Manual insurance payment posting.
2. Manual patient payment posting.
3. Zero-pay and denial posting.
4. Contractual adjustment posting.
5. Historical payment posting without a claim.
6. Ledger source-of-truth updates.
7. Client balance recalculation.
8. Overpayment/credit/refund handling.

## Phase 4: Mailroom

### Pull from old repo

Use old Mailroom module as reference only:

- upload route behavior
- item route behavior
- search behavior
- filing behavior
- assignment behavior
- digital mailroom migration assumptions
- Mailroom UI behavior

### Build next in `ehr`

1. Document intake service.
2. Document metadata/indexing service.
3. Link document to client, payer, provider, claim, payment, ledger transaction, or workqueue item.
4. Route Mailroom item to workqueue.
5. Add searchable list view.

## Aggressive Delivery Order

1. Eligibility readiness workqueues
2. Claim readiness and 837P build gate
3. Charge-to-claim path
4. Payment posting and ledger
5. Mailroom routing
6. Reporting/dashboard cleanup

## Done Criteria For RCM MVP

The RCM MVP is complete when a user can:

1. Load a client and insurance record.
2. Verify eligibility or document manual benefits.
3. See eligibility issues in a workqueue.
4. Create/review a charge.
5. Validate claim readiness.
6. Build or stage a claim batch.
7. Post insurance or patient payment.
8. Post historical payment without a claim.
9. See ledger/balance updates.
10. Upload payer mail/EOB/denial notice and link it to the right record.

## Current Working Estimate

- Internal RCM demo: 2 to 3 weeks
- RCM MVP: 6 to 10 weeks
- Broader EHR MVP: 3 to 5 months
- Production SaaS: 6 to 9+ months

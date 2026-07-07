# THERASSISTANT EHR repo structure

Keep the active Vite app stable. Do not dump files into the repo root.

Recommended layout:

- `docs/` - architecture and migration notes
- `scripts/` - local maintenance scripts
- `src/app/` - main browser app shell
- `src/product-demo/` - product demo UI
- `src/features/claims/` - claim status, 837P, 277CA, 999, payer received
- `src/features/eligibility/` - eligibility, 270/271, Availity routing
- `src/features/mailroom/` - mailroom, fax, document routing
- `src/features/payments/` - ERA/835, patient payments, balances, reversals
- `src/features/workqueues/` - workqueue rules, live queues, dispatchers
- `src/features/rcm-dashboard/` - RCM dashboard adapters, UI, and loaders
- `src/shared/` - Supabase client, auth guards, shared utilities, types, validation

Porting rule:

Move imported modules into a domain folder first. Do not add them to `tsconfig.json` until imports, runtime dependencies, and browser/server boundaries are reviewed.

After each port:

1. Run `npm run typecheck`.
2. Run `npm run build`.
3. Confirm Supabase table compatibility.
4. Remove dead code.
5. Commit one domain at a time.

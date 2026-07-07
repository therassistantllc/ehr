# Supabase Advisor Remediation — 2026-07-06

## Project

- Supabase project: `THERASSISTANT EHR`
- Project ref: `btsbmozbggjllpcsuyyy`
- GitHub repo: `therassistantllc/ehr`

## Applied in this pass

### Provider license RLS

`public.provider_licenses` now has targeted tenant-aware RBAC policies:

- `provider_licenses_select_rbac`
- `provider_licenses_insert_rbac`
- `provider_licenses_update_rbac`
- `provider_licenses_delete_rbac`

Access is tied to the existing credentialing permissions:

- `credentialing.read`
- `credentialing.write`

### Internal function exposure

Direct `anon` and `authenticated` execute access was removed from high-confidence internal trigger functions that should not be exposed as REST/RPC endpoints. `service_role` execute access was preserved.

## Validation

After applying the live Supabase migration:

- `provider_licenses` showed separate SELECT, INSERT, UPDATE, and DELETE policies.
- Hardened internal functions returned `authenticated_can_execute = false` and `anon_can_execute = false`.
- The same functions retained `service_role` execute access.

## Not changed

- Scaffold tables that are intentionally fail-closed with RLS enabled and no policies.
- App-callable workflow functions that need function-by-function review before execute privileges are changed.
- Auth dashboard settings, including the compromised-password protection advisor item.

## Follow-up

The live database has RBAC helper and policy migrations that were not found in the GitHub repo search results during this pass. This migration is guarded so it will not fail if those helpers are absent, but the repo should still be reconciled with live migration history.

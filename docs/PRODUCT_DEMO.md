# THERASSISTANT EHR Product Demo

This demo is a standalone frontend entry point for presenting THERASSISTANT EHR as a behavioral-health-first EHR and revenue cycle workspace.

## Local URL

Run the app and open:

```text
/product-demo.html
```

The normal app remains available at:

```text
/
```

## What the demo shows

The demo walks through six connected product moments:

1. **Patient Portal** — client pre-session check-in and In-Between Session Journal.
2. **Clinical Prep** — provider Pre-Session Dashboard.
3. **Documentation + Coding** — documentation-to-charge validation.
4. **RCM Workqueues** — biller resolution of claim blockers.
5. **Mailroom** — payer mail routing, indexing, linking, and denial workqueue creation.
6. **Payments + Reporting** — payment posting, historical ledger activity, AR, denials, and month-end reporting.

## Demo positioning

Use this framing:

> THERASSISTANT EHR is not a generic charting tool. It connects behavioral health documentation, client engagement, payer compliance, claim readiness, document control, payment posting, historical ledger activity, and reporting in one workflow.

## Personas included

The demo includes buyer lenses for:

- Practice Owner
- Clinician
- Biller / RCM Specialist
- Patient / Client
- Billing Company

Each persona shows the product moments most relevant to that buyer.

## Supabase impact

This demo uses static presentation data only. It does **not** write to Supabase, seed production tables, or require demo tenants.

That is intentional. The demo can be shown safely before live demo data, demo auth, or Supabase seed records are finalized.

## Future enhancement

When demo data is ready, the standalone demo can be expanded to load from a dedicated Supabase demo tenant rather than static arrays. Keep that data isolated from production tenants.

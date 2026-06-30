# Legacy workqueue references

This branch was checked against the older THERASSISTANTEHR repository before wiring the current Vite app behavior.

Legacy repo references reviewed:

- therassistantllc/THERASSISTANTEHR
- artifacts/therassistant-ehr/components/billing/WorkqueueShell.tsx
- artifacts/therassistant-ehr/lib/workqueue/workqueueActionService.tsx

Relevant legacy patterns preserved in the current app direction:

- Row-level actions should use click handlers, not static buttons.
- Detail panels should be driven by selected row state.
- Resolve actions should write status, resolved_at, resolved_by_user_id, and a resolution/comment note.
- Empty queues should be treated as a valid state, not as an app failure.

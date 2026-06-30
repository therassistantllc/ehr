# Resolve flow test notes

Before merging, run npm run typecheck and npm run build.

Manual browser check:

- Open Workqueues.
- Open a row.
- Confirm the detail panel shows priority, status, work type, source type, source ID, and due date.
- Enter a resolution note.
- Resolve the item.
- Confirm the item leaves the open list.

Live Supabase check:

- Confirm the workqueue row status changes to resolved.
- Confirm resolved_at is populated.

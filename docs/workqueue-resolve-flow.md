# Workqueue resolve flow

The Workqueues screen now supports a first operational workflow:

1. Open a workqueue item.
2. Review priority, work type, source type, source ID, due date, and description.
3. Enter a resolution note.
4. Resolve the item.

When the dashboard is using live Supabase data, the resolve action calls the existing WorkqueueQueryService resolve method and reloads the dashboard snapshot.

When the dashboard is in mock mode, the row is removed locally so the interaction can still be tested without a live connection.

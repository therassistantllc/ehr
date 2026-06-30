# Frontend dashboard configuration

The Vite app loads live dashboard data when these local environment variables are present:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_THERASSISTANT_TENANT_ID
- VITE_THERASSISTANT_ACTOR_USER_ID, optional

Create a local .env file in the repo root. Do not commit real project values.

If any required value is missing, the app stays usable and displays mock dashboard data with a status banner.

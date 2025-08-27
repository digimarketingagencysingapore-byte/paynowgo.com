/*
  # Expose paynowgo schema for API access

  1. Schema Permissions
    - Grant usage on paynowgo schema to anon and authenticated roles
    - Grant CRUD permissions on all tables in paynowgo schema
    - Set default privileges for future tables

  2. Cache Reload
    - Notify PostgREST to reload schema cache
    - This enables the paynowgo schema to be accessible via REST API

  Note: After running this migration, add 'paynowgo' to Exposed Schemas in 
  Supabase Dashboard → Settings → API → Exposed Schemas
*/

-- Grant schema usage to API roles
grant usage on schema paynowgo to anon, authenticated;

-- Grant CRUD permissions on all existing tables in paynowgo schema
grant select, insert, update, delete on all tables in schema paynowgo to anon, authenticated;

-- Set default privileges for future tables in paynowgo schema
alter default privileges in schema paynowgo
  grant select, insert, update, delete on tables to anon, authenticated;

-- Reload PostgREST schema cache to recognize the new permissions
notify pgrst, 'reload schema';
-- Expose paynowgo schema and set proper permissions
-- Run this in Supabase SQL Editor after adding 'paynowgo' to Exposed Schemas in Dashboard

-- Grant schema usage to API roles
grant usage on schema paynowgo to anon, authenticated;

-- Grant table permissions for all current tables
grant select, insert, update, delete on all tables in schema paynowgo to anon, authenticated;

-- Grant permissions for future tables automatically
alter default privileges in schema paynowgo
  grant select, insert, update, delete on tables to anon, authenticated;

-- Grant sequence permissions (for auto-incrementing columns)
grant usage, select on all sequences in schema paynowgo to anon, authenticated;
alter default privileges in schema paynowgo
  grant usage, select on sequences to anon, authenticated;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
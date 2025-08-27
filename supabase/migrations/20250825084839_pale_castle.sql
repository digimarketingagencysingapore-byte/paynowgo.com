-- Schema permissions and cache reload for paynowgo schema
-- This fixes PGRST205 errors by properly exposing the paynowgo schema

-- Grant schema usage to anon and authenticated roles
grant usage on schema paynowgo to anon, authenticated;

-- Grant table permissions (RLS will still apply for row-level security)
grant select, insert, update, delete on all tables in schema paynowgo to anon, authenticated;

-- Auto-grant permissions for future tables
alter default privileges in schema paynowgo
  grant select, insert, update, delete on tables to anon, authenticated;

-- Grant sequence permissions for auto-generated IDs
grant usage, select on all sequences in schema paynowgo to anon, authenticated;
alter default privileges in schema paynowgo
  grant usage, select on sequences to anon, authenticated;

-- Grant function execution permissions
grant execute on all functions in schema paynowgo to anon, authenticated;
alter default privileges in schema paynowgo
  grant execute on functions to anon, authenticated;

-- Refresh PostgREST schema cache
notify pgrst, 'reload schema';
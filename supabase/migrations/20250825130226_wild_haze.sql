/*
  # Direct paynowgo Schema Setup

  1. Schema Grants
    - Grant usage on paynowgo schema to anon and authenticated roles
    - Grant CRUD permissions on all tables in paynowgo schema
    - Set default privileges for future tables

  2. PostgREST Cache
    - Reload schema cache to recognize new exposed schema
    - Enable direct access to paynowgo.* tables via REST API

  3. No Views
    - Clean direct schema access without public views
    - Eliminates naming conflicts and complexity
*/

-- Grant schema usage to API roles
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;

-- Grant table permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
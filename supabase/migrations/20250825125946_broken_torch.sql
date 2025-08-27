/*
  # Direct paynowgo Schema Setup

  1. Schema Permissions
    - Grant usage on paynowgo schema to anon and authenticated users
    - Grant full CRUD permissions on all tables in paynowgo schema
    - Set default privileges for future tables

  2. PostgREST Cache
    - Reload schema cache to recognize new exposed schema
    - Enable direct access to paynowgo.* tables

  3. Security
    - Maintains existing RLS policies on all tables
    - No changes to existing security model
*/

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;

-- Grant table permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
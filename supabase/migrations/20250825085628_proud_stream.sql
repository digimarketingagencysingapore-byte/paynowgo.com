/*
  # Expose paynowgo schema with proper permissions

  1. Schema Permissions
    - Grant usage on paynowgo schema to anon and authenticated roles
    - Grant CRUD permissions on all tables in paynowgo schema
    - Set default privileges for future tables

  2. Cache Management
    - Reload PostgREST schema cache to recognize new schema
    - Ensure all tables are properly accessible via REST API

  3. Security
    - RLS policies remain active and enforce tenant isolation
    - These grants only allow access - RLS controls what data is visible
*/

-- Grant schema usage to API roles
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;

-- Grant table permissions for all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;

-- Grant sequence permissions (for auto-incrementing IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA paynowgo TO anon, authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
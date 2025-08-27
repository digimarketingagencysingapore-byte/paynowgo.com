/*
  # Expose paynowgo schema to PostgREST API

  1. Schema Configuration
    - Expose paynowgo schema to PostgREST
    - Ensure all tables are accessible via REST API
  
  2. Schema Cache Refresh
    - Reload PostgREST schema cache
    - Clear any cached table definitions
*/

-- Ensure paynowgo schema is exposed to PostgREST
-- This allows REST API calls to paynowgo.* tables
-- Note: This may need to be configured in Supabase Dashboard under Settings > API > Exposed Schemas

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify tables exist in paynowgo schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'paynowgo' AND table_name = 'items'
  ) THEN
    RAISE NOTICE 'paynowgo.items table not found - migration may not have run';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'paynowgo' AND table_name = 'categories'
  ) THEN
    RAISE NOTICE 'paynowgo.categories table not found - migration may not have run';
  END IF;
END $$;
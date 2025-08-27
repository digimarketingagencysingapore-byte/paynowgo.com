/*
  # Resolve public schema naming conflicts

  1. Backup existing public tables
    - Rename `public.order_items` to `public.order_items_backup_20250825`
    - Rename `public.items` to `public.items_backup_20250825` 
    - Rename `public.categories` to `public.categories_backup_20250825`

  2. Create views in public schema
    - `public.order_items` → `paynowgo.order_items`
    - `public.items` → `paynowgo.items`
    - `public.categories` → `paynowgo.categories`

  3. Grant permissions
    - Views in public schema for anon/authenticated
    - Base tables in paynowgo schema for anon/authenticated
    - Reload PostgREST schema cache
*/

-- 1) Backup existing tables in public schema if they exist
DO $$
BEGIN
  -- Backup order_items table if it exists
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'order_items' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.order_items RENAME TO order_items_backup_20250825;
    RAISE NOTICE 'Backed up public.order_items to public.order_items_backup_20250825';
  END IF;

  -- Backup items table if it exists
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'items' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.items RENAME TO items_backup_20250825;
    RAISE NOTICE 'Backed up public.items to public.items_backup_20250825';
  END IF;

  -- Backup categories table if it exists
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'categories' AND c.relkind = 'r'
  ) THEN
    ALTER TABLE public.categories RENAME TO categories_backup_20250825;
    RAISE NOTICE 'Backed up public.categories to public.categories_backup_20250825';
  END IF;
END $$;

-- 2) Create views in public schema that point to paynowgo tables
CREATE OR REPLACE VIEW public.order_items AS
SELECT * FROM paynowgo.order_items;

CREATE OR REPLACE VIEW public.items AS
SELECT * FROM paynowgo.items;

CREATE OR REPLACE VIEW public.categories AS
SELECT * FROM paynowgo.categories;

-- 3) Grant permissions on the views in public schema
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items, public.items, public.categories
  TO anon, authenticated;

-- 4) Ensure permissions on base tables in paynowgo schema
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;

-- 5) Set default privileges for future tables in paynowgo
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- 6) Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
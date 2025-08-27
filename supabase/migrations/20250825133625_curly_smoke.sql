/*
  # Fix public schema views for paynowgo integration

  This migration ensures that public.items, public.categories, and public.order_items
  are views pointing to paynowgo.* tables, handling all PostgreSQL object types.

  1. Prerequisites Check
    - Verifies paynowgo.items, paynowgo.categories, paynowgo.order_items exist
  
  2. Data Migration
    - Migrates data from public tables to paynowgo if they exist
  
  3. Object Cleanup
    - Handles all object types: tables (r), partitioned tables (p), foreign tables (f), 
      views (v), materialized views (m), sequences (S), indexes (i)
    - Renames non-view objects to timestamped backups
    - Drops existing views for clean recreation
  
  4. View Creation
    - Creates updatable views in public pointing to paynowgo
  
  5. Permissions
    - Grants full CRUD access on views
    - Ensures paynowgo schema access
*/

-- 🔒 Prerequisites: Base tables must exist in paynowgo schema
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='paynowgo' AND table_name='items'
  ) THEN
    RAISE EXCEPTION 'paynowgo.items not found. Please create paynowgo schema tables first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='paynowgo' AND table_name='categories'
  ) THEN
    RAISE EXCEPTION 'paynowgo.categories not found. Please create paynowgo schema tables first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='paynowgo' AND table_name='order_items'
  ) THEN
    RAISE EXCEPTION 'paynowgo.order_items not found. Please create paynowgo schema tables first.';
  END IF;
END $$;

-- 📦 Data Migration: Copy data from public tables to paynowgo (if they exist as tables)
DO $$
DECLARE kind char;
BEGIN
  -- Migrate order_items data
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';
  
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.order_items (order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id)
    SELECT order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id
    FROM public.order_items
    ON CONFLICT (order_id, line_no) DO NOTHING;
  END IF;

  -- Migrate items data
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';
  
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.items (id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at)
    SELECT id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at
    FROM public.items
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrate categories data
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';
  
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.categories (id, tenant_id, name, parent_id, sort_order, created_at, updated_at)
    SELECT id, tenant_id, name, parent_id, sort_order, created_at, updated_at
    FROM public.categories
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 🧹 Object Cleanup: Handle ALL PostgreSQL object types robustly
DO $$
DECLARE
  kind char;
  backup_name text;
BEGIN
  -- Clean up order_items (all object types)
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';

  IF kind IS NOT NULL THEN
    backup_name := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    
    IF kind = 'r' OR kind = 'p' THEN
      EXECUTE format('ALTER TABLE public.order_items RENAME TO %I', backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.order_items RENAME TO %I', backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.order_items RENAME TO %I', backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.order_items RENAME TO %I', backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.order_items RENAME TO %I', backup_name);
    ELSIF kind = 'v' THEN
      EXECUTE 'DROP VIEW public.order_items';
    END IF;
  END IF;

  -- Clean up items (all object types)
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';

  IF kind IS NOT NULL THEN
    backup_name := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    
    IF kind = 'r' OR kind = 'p' THEN
      EXECUTE format('ALTER TABLE public.items RENAME TO %I', backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.items RENAME TO %I', backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.items RENAME TO %I', backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.items RENAME TO %I', backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.items RENAME TO %I', backup_name);
    ELSIF kind = 'v' THEN
      EXECUTE 'DROP VIEW public.items';
    END IF;
  END IF;

  -- Clean up categories (all object types)
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';

  IF kind IS NOT NULL THEN
    backup_name := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    
    IF kind = 'r' OR kind = 'p' THEN
      EXECUTE format('ALTER TABLE public.categories RENAME TO %I', backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.categories RENAME TO %I', backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.categories RENAME TO %I', backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.categories RENAME TO %I', backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.categories RENAME TO %I', backup_name);
    ELSIF kind = 'v' THEN
      EXECUTE 'DROP VIEW public.categories';
    END IF;
  END IF;
END $$;

-- 🎯 Create Views: public.* → paynowgo.*
CREATE OR REPLACE VIEW public.order_items AS SELECT * FROM paynowgo.order_items;
CREATE OR REPLACE VIEW public.items AS SELECT * FROM paynowgo.items;
CREATE OR REPLACE VIEW public.categories AS SELECT * FROM paynowgo.categories;

-- 🔐 Permissions: Full CRUD access through views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items, public.items, public.categories TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- ♻️ Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
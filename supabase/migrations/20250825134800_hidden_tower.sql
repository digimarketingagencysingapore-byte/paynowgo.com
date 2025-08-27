/*
  # Public Views Fix - Robust handling of all PostgreSQL object types

  This migration ensures public.items, public.categories, and public.order_items 
  are always updatable views pointing to paynowgo schema tables.

  1. Prerequisites Check
     - Verifies paynowgo.items, paynowgo.categories, paynowgo.order_items exist
  
  2. Data Migration
     - Migrates existing data from public tables to paynowgo (if applicable)
  
  3. Object Cleanup (handles ALL PostgreSQL object types)
     - r = ordinary table → renamed to backup
     - p = partitioned table → renamed to backup  
     - f = foreign table → renamed to backup
     - v = view → dropped and recreated
     - m = materialized view → renamed to backup
     - S = sequence → renamed to backup
     - i = index → renamed to backup
  
  4. View Creation
     - Creates clean updatable views: public.* → paynowgo.*
  
  5. Permissions & Cache
     - Sets proper grants
     - Reloads PostgREST schema cache
*/

-- 🔒 Prerequisites: Base tables in paynowgo schema must exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='items')
  THEN RAISE EXCEPTION 'paynowgo.items not found - create base tables first'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='categories')
  THEN RAISE EXCEPTION 'paynowgo.categories not found - create base tables first'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='order_items')
  THEN RAISE EXCEPTION 'paynowgo.order_items not found - create base tables first'; END IF;
END $$;

-- 📦 Data Migration: Preserve existing data from public tables (if they are tables)
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

-- 📋 Create Clean Views: public.* → paynowgo.*
CREATE OR REPLACE VIEW public.items AS
SELECT * FROM paynowgo.items;

CREATE OR REPLACE VIEW public.categories AS
SELECT * FROM paynowgo.categories;

CREATE OR REPLACE VIEW public.order_items AS
SELECT * FROM paynowgo.order_items;

-- 🔐 Permissions & Cache Reload
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items, public.categories, public.order_items TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- ♻️ PostgREST Cache Reload
NOTIFY pgrst, 'reload schema';
/*
  # Complete Public Views Fix - All tables to paynowgo views
  
  Handles items, categories, and order_items comprehensively.
  Run this if you want to fix all three tables at once.
*/

-- 0) Basistabellen müssen existieren
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='items')
  THEN RAISE EXCEPTION 'paynowgo.items not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='categories')
  THEN RAISE EXCEPTION 'paynowgo.categories not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='order_items')
  THEN RAISE EXCEPTION 'paynowgo.order_items not found'; END IF;
END $$;

-- 1) Daten migrieren (falls public Tabellen existieren)
DO $$
DECLARE kind char;
BEGIN
  -- items
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='items';
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.items (id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at)
    SELECT id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at
    FROM public.items ON CONFLICT (id) DO NOTHING;
  END IF;

  -- categories  
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='categories';
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.categories (id, tenant_id, name, parent_id, sort_order, created_at, updated_at)
    SELECT id, tenant_id, name, parent_id, sort_order, created_at, updated_at
    FROM public.categories ON CONFLICT (id) DO NOTHING;
  END IF;

  -- order_items
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='order_items';
  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.order_items (order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id)
    SELECT order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id
    FROM public.order_items ON CONFLICT (order_id, line_no) DO NOTHING;
  END IF;
END $$;

-- 2) Alle drei Objekte robust wegräumen und durch Views ersetzen
DO $$
DECLARE
  kind char;
  backup_name text;
  obj_name text;
BEGIN
  -- items
  obj_name := 'items';
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=obj_name;
  
  IF kind IS NOT NULL AND kind != 'v' THEN
    backup_name := obj_name || '_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    IF kind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', obj_name, backup_name);
    END IF;
  ELSIF kind = 'v' THEN
    EXECUTE format('DROP VIEW public.%I', obj_name);
  END IF;

  -- categories
  obj_name := 'categories';
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=obj_name;
  
  IF kind IS NOT NULL AND kind != 'v' THEN
    backup_name := obj_name || '_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    IF kind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', obj_name, backup_name);
    END IF;
  ELSIF kind = 'v' THEN
    EXECUTE format('DROP VIEW public.%I', obj_name);
  END IF;

  -- order_items
  obj_name := 'order_items';
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname=obj_name;
  
  IF kind IS NOT NULL AND kind != 'v' THEN
    backup_name := obj_name || '_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    IF kind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'f' THEN
      EXECUTE format('ALTER FOREIGN TABLE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE public.%I RENAME TO %I', obj_name, backup_name);
    ELSIF kind = 'i' THEN
      EXECUTE format('ALTER INDEX public.%I RENAME TO %I', obj_name, backup_name);
    END IF;
  ELSIF kind = 'v' THEN
    EXECUTE format('DROP VIEW public.%I', obj_name);
  END IF;
END $$;

-- 3) Views anlegen
CREATE OR REPLACE VIEW public.items AS SELECT * FROM paynowgo.items;
CREATE OR REPLACE VIEW public.categories AS SELECT * FROM paynowgo.categories;
CREATE OR REPLACE VIEW public.order_items AS SELECT * FROM paynowgo.order_items;

-- 4) Rechte + Cache
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items, public.categories, public.order_items TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
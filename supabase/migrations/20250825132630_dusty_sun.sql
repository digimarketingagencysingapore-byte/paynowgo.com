-- 🔒 Voraussetzung: Basistabellen im paynowgo-Schema existieren
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='items')
  THEN RAISE EXCEPTION 'paynowgo.items not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='categories')
  THEN RAISE EXCEPTION 'paynowgo.categories not found'; END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='order_items')
  THEN RAISE EXCEPTION 'paynowgo.order_items not found'; END IF;
END $$;

-- (Optional) Falls noch echte Tabellen in public existieren und du deren Daten behalten willst:
-- Die folgenden INSERTS sind no-ops, wenn public.* keine Tabelle ist oder leer ist.
DO $$
DECLARE kind char;
BEGIN
  -- order_items migrieren (wenn public.order_items eine *Tabelle* ist)
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';
  IF kind = 'r' THEN
    INSERT INTO paynowgo.order_items (order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id)
    SELECT order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id
    FROM public.order_items
    ON CONFLICT (order_id, line_no) DO NOTHING;
  END IF;

  -- items migrieren
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';
  IF kind = 'r' THEN
    INSERT INTO paynowgo.items (id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at)
    SELECT id, tenant_id, sku, name, price_cents, currency, is_active, created_at, updated_at
    FROM public.items
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- categories migrieren
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';
  IF kind = 'r' THEN
    INSERT INTO paynowgo.categories (id, tenant_id, name, parent_id, sort_order, created_at, updated_at)
    SELECT id, tenant_id, name, parent_id, sort_order, created_at, updated_at
    FROM public.categories
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 🧹 In public vorhandene Objekte freiräumen und Views anlegen
DO $$
DECLARE
  kind char;
  backup_name text;
BEGIN
  -- order_items: Alle Objekttypen behandeln
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';

  IF kind = 'r' OR kind = 'p' THEN
    backup_name := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER TABLE public.order_items RENAME TO %I', backup_name);
  ELSIF kind = 'f' THEN
    backup_name := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER FOREIGN TABLE public.order_items RENAME TO %I', backup_name);
  ELSIF kind = 'v' THEN
    EXECUTE 'DROP VIEW public.order_items';
  ELSIF kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.order_items';
  END IF;

  -- items: Alle Objekttypen behandeln
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';

  IF kind = 'r' OR kind = 'p' THEN
    backup_name := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER TABLE public.items RENAME TO %I', backup_name);
  ELSIF kind = 'f' THEN
    backup_name := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER FOREIGN TABLE public.items RENAME TO %I', backup_name);
  ELSIF kind = 'v' THEN
    EXECUTE 'DROP VIEW public.items';
  ELSIF kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.items';
  END IF;

  -- categories: Alle Objekttypen behandeln
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';

  IF kind = 'r' OR kind = 'p' THEN
    backup_name := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER TABLE public.categories RENAME TO %I', backup_name);
  ELSIF kind = 'f' THEN
    backup_name := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
    EXECUTE format('ALTER FOREIGN TABLE public.categories RENAME TO %I', backup_name);
  ELSIF kind = 'v' THEN
    EXECUTE 'DROP VIEW public.categories';
  ELSIF kind = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.categories';
  END IF;
END $$;

-- 📋 Views in public anlegen, die auf paynowgo zeigen
CREATE OR REPLACE VIEW public.order_items AS SELECT * FROM paynowgo.order_items;
CREATE OR REPLACE VIEW public.items AS SELECT * FROM paynowgo.items;
CREATE OR REPLACE VIEW public.categories AS SELECT * FROM paynowgo.categories;

-- 🔐 Rechte (RLS der paynowgo-Basistabellen bleibt aktiv)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items, public.categories, public.order_items TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- ♻️ PostgREST-Cache aktualisieren
NOTIFY pgrst, 'reload schema';
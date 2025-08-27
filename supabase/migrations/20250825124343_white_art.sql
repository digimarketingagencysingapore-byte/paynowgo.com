-- 0) Basistabelle im paynowgo-Schema muss existieren
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='paynowgo' AND table_name='order_items'
  ) THEN
    RAISE EXCEPTION 'paynowgo.order_items not found';
  END IF;
END $$;

-- 1) In public: vorhandenes Objekt "order_items" erkennen und wegräumen
DO $$
DECLARE
  kind char;
  backup_name text := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';

  IF kind = 'r' THEN               -- table
    EXECUTE format('ALTER TABLE public.order_items RENAME TO %I', backup_name);
  ELSIF kind = 'v' THEN            -- view
    EXECUTE 'DROP VIEW public.order_items';
  ELSIF kind = 'm' THEN            -- matview
    EXECUTE 'DROP MATERIALIZED VIEW public.order_items';
  END IF;
END $$;

-- 2) Jetzt die View in public anlegen, die auf paynowgo zeigt (auto-updatable)
CREATE OR REPLACE VIEW public.order_items AS
SELECT * FROM paynowgo.order_items;

-- (Optional gleiches Muster für items / categories)
DO $$
DECLARE
  kind char; nm text;
BEGIN
  -- items
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';
  IF kind = 'r' THEN nm := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS'); EXECUTE format('ALTER TABLE public.items RENAME TO %I', nm);
  ELSIF kind = 'v' THEN EXECUTE 'DROP VIEW public.items';
  ELSIF kind = 'm' THEN EXECUTE 'DROP MATERIALIZED VIEW public.items';
  END IF;
  CREATE OR REPLACE VIEW public.items AS SELECT * FROM paynowgo.items;

  -- categories
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';
  IF kind = 'r' THEN nm := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS'); EXECUTE format('ALTER TABLE public.categories RENAME TO %I', nm);
  ELSIF kind = 'v' THEN EXECUTE 'DROP VIEW public.categories';
  ELSIF kind = 'm' THEN EXECUTE 'DROP MATERIALIZED VIEW public.categories';
  END IF;
  CREATE OR REPLACE VIEW public.categories AS SELECT * FROM paynowgo.categories;
END $$;

-- 3) Rechte + PostgREST Cache
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items, public.items, public.categories TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
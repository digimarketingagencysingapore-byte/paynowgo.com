-- Ensure base tables exist in paynowgo
DO $$
BEGIN
  PERFORM 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='items';
  IF NOT FOUND THEN RAISE EXCEPTION 'paynowgo.items not found'; END IF;

  PERFORM 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='categories';
  IF NOT FOUND THEN RAISE EXCEPTION 'paynowgo.categories not found'; END IF;

  PERFORM 1 FROM information_schema.tables WHERE table_schema='paynowgo' AND table_name='order_items';
  IF NOT FOUND THEN RAISE EXCEPTION 'paynowgo.order_items not found'; END IF;
END $$;

-- Replace any public objects with views pointing to paynowgo.*
DO $$
DECLARE kind char; backup text;
BEGIN
  -- items
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='items';
  IF kind = 'r' THEN backup := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS'); EXECUTE format('ALTER TABLE public.items RENAME TO %I', backup);
  ELSIF kind = 'v' THEN EXECUTE 'DROP VIEW public.items';
  ELSIF kind = 'm' THEN EXECUTE 'DROP MATERIALIZED VIEW public.items';
  END IF;
  EXECUTE 'CREATE OR REPLACE VIEW public.items AS SELECT * FROM paynowgo.items';

  -- categories
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='categories';
  IF kind = 'r' THEN backup := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS'); EXECUTE format('ALTER TABLE public.categories RENAME TO %I', backup);
  ELSIF kind = 'v' THEN EXECUTE 'DROP VIEW public.categories';
  ELSIF kind = 'm' THEN EXECUTE 'DROP MATERIALIZED VIEW public.categories';
  END IF;
  EXECUTE 'CREATE OR REPLACE VIEW public.categories AS SELECT * FROM paynowgo.categories';

  -- order_items
  SELECT c.relkind INTO kind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='public' AND c.relname='order_items';
  IF kind = 'r' THEN backup := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS'); EXECUTE format('ALTER TABLE public.order_items RENAME TO %I', backup);
  ELSIF kind = 'v' THEN EXECUTE 'DROP VIEW public.order_items';
  ELSIF kind = 'm' THEN EXECUTE 'DROP MATERIALIZED VIEW public.order_items';
  END IF;
  EXECUTE 'CREATE OR REPLACE VIEW public.order_items AS SELECT * FROM paynowgo.order_items';
END $$;

-- Grants for views
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items, public.categories, public.order_items TO anon, authenticated;

-- Ensure base schema/table access (RLS still applies)
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
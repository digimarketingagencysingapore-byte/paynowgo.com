/*
  # Create public views for paynowgo tables

  This migration creates views in the public schema that point to paynowgo tables.
  This approach requires no Supabase dashboard configuration changes.

  1. Backup and remove any existing public tables
  2. Create views pointing to paynowgo schema
  3. Grant permissions on views
  4. Reload schema cache

  Benefits:
  - No need to expose paynowgo schema in dashboard
  - Works with standard public schema access
  - Clean separation between schemas
*/

-- Items
DO $$
DECLARE 
  kind char; 
  backup text := 'items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='items';
  
  IF kind = 'r' THEN 
    EXECUTE format('ALTER TABLE public.items RENAME TO %I', backup);
    RAISE NOTICE 'Backed up public.items table to %', backup;
  ELSIF kind = 'v' THEN 
    DROP VIEW public.items;
    RAISE NOTICE 'Dropped existing public.items view';
  ELSIF kind = 'm' THEN 
    DROP MATERIALIZED VIEW public.items;
    RAISE NOTICE 'Dropped existing public.items materialized view';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.items AS 
SELECT * FROM paynowgo.items;

-- Categories
DO $$
DECLARE 
  kind char; 
  backup text := 'categories_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='categories';
  
  IF kind = 'r' THEN 
    EXECUTE format('ALTER TABLE public.categories RENAME TO %I', backup);
    RAISE NOTICE 'Backed up public.categories table to %', backup;
  ELSIF kind = 'v' THEN 
    DROP VIEW public.categories;
    RAISE NOTICE 'Dropped existing public.categories view';
  ELSIF kind = 'm' THEN 
    DROP MATERIALIZED VIEW public.categories;
    RAISE NOTICE 'Dropped existing public.categories materialized view';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.categories AS 
SELECT * FROM paynowgo.categories;

-- Order Items
DO $$
DECLARE 
  kind char; 
  backup text := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';
  
  IF kind = 'r' THEN 
    EXECUTE format('ALTER TABLE public.order_items RENAME TO %I', backup);
    RAISE NOTICE 'Backed up public.order_items table to %', backup;
  ELSIF kind = 'v' THEN 
    DROP VIEW public.order_items;
    RAISE NOTICE 'Dropped existing public.order_items view';
  ELSIF kind = 'm' THEN 
    DROP MATERIALIZED VIEW public.order_items;
    RAISE NOTICE 'Dropped existing public.order_items materialized view';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.order_items AS 
SELECT * FROM paynowgo.order_items;

-- Orders (if needed)
DO $$
DECLARE 
  kind char; 
  backup text := 'orders_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='orders';
  
  IF kind = 'r' THEN 
    EXECUTE format('ALTER TABLE public.orders RENAME TO %I', backup);
    RAISE NOTICE 'Backed up public.orders table to %', backup;
  ELSIF kind = 'v' THEN 
    DROP VIEW public.orders;
    RAISE NOTICE 'Dropped existing public.orders view';
  ELSIF kind = 'm' THEN 
    DROP MATERIALIZED VIEW public.orders;
    RAISE NOTICE 'Dropped existing public.orders materialized view';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.orders AS 
SELECT * FROM paynowgo.orders;

-- Payments (if needed)
DO $$
DECLARE 
  kind char; 
  backup text := 'payments_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='payments';
  
  IF kind = 'r' THEN 
    EXECUTE format('ALTER TABLE public.payments RENAME TO %I', backup);
    RAISE NOTICE 'Backed up public.payments table to %', backup;
  ELSIF kind = 'v' THEN 
    DROP VIEW public.payments;
    RAISE NOTICE 'Dropped existing public.payments view';
  ELSIF kind = 'm' THEN 
    DROP MATERIALIZED VIEW public.payments;
    RAISE NOTICE 'Dropped existing public.payments materialized view';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.payments AS 
SELECT * FROM paynowgo.payments;

-- Grant permissions on views
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  public.items, 
  public.categories, 
  public.order_items,
  public.orders,
  public.payments
TO anon, authenticated;

-- Ensure paynowgo schema permissions
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
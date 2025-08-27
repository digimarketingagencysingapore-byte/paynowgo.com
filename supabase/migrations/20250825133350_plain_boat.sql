/*
  # Public Views Fix - Robust handling of all PostgreSQL object types
  
  This migration ensures public.order_items (and other tables) become views pointing to paynowgo.*
  regardless of their current type (table, partitioned table, foreign table, view, matview, etc.)
  
  1. Prerequisites Check
    - Verifies paynowgo.order_items exists
  
  2. Data Migration (if applicable)
    - Migrates data from public tables to paynowgo before renaming
  
  3. Object Cleanup
    - Handles all PostgreSQL object types:
      - r = ordinary table
      - p = partitioned table  
      - f = foreign table
      - v = view
      - m = materialized view
      - S = sequence
      - i = index
  
  4. View Creation
    - Creates clean views in public pointing to paynowgo
  
  5. Permissions & Cache
    - Sets proper grants and reloads PostgREST schema cache
*/

-- 0) Basistabelle muss existieren
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='paynowgo' AND table_name='order_items'
  ) THEN
    RAISE EXCEPTION 'paynowgo.order_items not found';
  END IF;
END $$;

-- 1) (Optional) Daten aus public.order_items (falls es eine *Tabelle/Partition* ist) nach paynowgo übernehmen
DO $$
DECLARE kind char;
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';

  IF kind IN ('r','p') THEN
    INSERT INTO paynowgo.order_items (order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id)
    SELECT order_id, line_no, item_id, name, qty, unit_price_cents, currency, tenant_id
    FROM public.order_items
    ON CONFLICT (order_id, line_no) DO NOTHING;
  END IF;
END $$;

-- 2) Kollidierendes Objekt unter public.order_items identifizieren und wegräumen:
--    r=table, p=partitioned table, f=foreign table, v=view, m=matview, S=sequence, i=index
DO $$
DECLARE
  kind char;
  backup_name text := 'order_items_backup_' || to_char(now(),'YYYYMMDDHH24MISS');
BEGIN
  SELECT c.relkind INTO kind
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname='order_items';

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
    -- existiert bereits als View → vorher löschen, wir erstellen sauber neu
    EXECUTE 'DROP VIEW public.order_items';
  END IF;
END $$;

-- 3) Jetzt die *View* in public anlegen
CREATE OR REPLACE VIEW public.order_items AS
SELECT * FROM paynowgo.order_items;

-- 4) Rechte + Cache
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO anon, authenticated;
GRANT USAGE ON SCHEMA paynowgo TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA paynowgo TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA paynowgo
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
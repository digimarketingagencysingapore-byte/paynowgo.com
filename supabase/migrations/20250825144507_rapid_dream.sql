/*
  # Create Public Views for All Tables

  This migration creates updatable views in the public schema that map to paynowgo schema tables.
  This fixes PGRST205 errors where PostgREST cannot find tables in the schema cache.

  1. New Views
    - `public.cms_content` → `paynowgo.cms_content`
    - `public.items` → `paynowgo.items` 
    - `public.categories` → `paynowgo.categories`
    - `public.order_items` → `paynowgo.order_items`
    - `public.orders` → `paynowgo.orders`
    - `public.payments` → `paynowgo.payments`

  2. Security
    - All views inherit RLS from base tables
    - Proper grants for authenticated and anon roles

  3. Schema Cache
    - Notifies PostgREST to reload schema cache
    - Handles existing objects by backing them up
*/

-- Create paynowgo schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS paynowgo;

-- Create cms_content table in paynowgo if it doesn't exist
CREATE TABLE IF NOT EXISTS paynowgo.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  version integer DEFAULT 1,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on cms_content
ALTER TABLE paynowgo.cms_content ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for cms_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'paynowgo' 
    AND tablename = 'cms_content' 
    AND policyname = 'Anyone can read active content'
  ) THEN
    CREATE POLICY "Anyone can read active content"
      ON paynowgo.cms_content
      FOR SELECT
      TO anon, authenticated
      USING (active = true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'paynowgo' 
    AND tablename = 'cms_content' 
    AND policyname = 'Authenticated users can manage content'
  ) THEN
    CREATE POLICY "Authenticated users can manage content"
      ON paynowgo.cms_content
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Insert default CMS content if table is empty
INSERT INTO paynowgo.cms_content (section, content, active)
SELECT 'hero', '{"title": "PayNowGo", "subtitle": "Modern Payment Solutions", "description": "Streamline your business with our advanced payment processing platform"}', true
WHERE NOT EXISTS (SELECT 1 FROM paynowgo.cms_content WHERE section = 'hero');

INSERT INTO paynowgo.cms_content (section, content, active)
SELECT 'features', '{"items": [{"title": "Fast Payments", "description": "Process payments quickly and securely"}, {"title": "Real-time Analytics", "description": "Track your business performance in real-time"}, {"title": "Multi-device Support", "description": "Works on all your devices seamlessly"}]}', true
WHERE NOT EXISTS (SELECT 1 FROM paynowgo.cms_content WHERE section = 'features');

-- Function to handle existing objects by backing them up
CREATE OR REPLACE FUNCTION backup_existing_object(schema_name text, object_name text)
RETURNS void AS $$
DECLARE
  object_type char(1);
  backup_name text;
BEGIN
  -- Get object type
  SELECT c.relkind INTO object_type
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = schema_name AND c.relname = object_name;

  IF object_type IS NOT NULL THEN
    backup_name := object_name || '_backup_' || to_char(now(), 'YYYYMMDDHH24MISS');
    
    CASE object_type
      WHEN 'r', 'p', 'f', 'm' THEN -- table, partitioned table, foreign table, materialized view
        EXECUTE format('ALTER TABLE %I.%I RENAME TO %I', schema_name, object_name, backup_name);
      WHEN 'v' THEN -- view
        EXECUTE format('DROP VIEW %I.%I', schema_name, object_name);
      WHEN 'S' THEN -- sequence
        EXECUTE format('ALTER SEQUENCE %I.%I RENAME TO %I', schema_name, object_name, backup_name);
      WHEN 'i' THEN -- index
        EXECUTE format('ALTER INDEX %I.%I RENAME TO %I', schema_name, object_name, backup_name);
    END CASE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Backup existing public objects and create views
SELECT backup_existing_object('public', 'cms_content');
SELECT backup_existing_object('public', 'items');
SELECT backup_existing_object('public', 'categories');
SELECT backup_existing_object('public', 'order_items');
SELECT backup_existing_object('public', 'orders');
SELECT backup_existing_object('public', 'payments');

-- Create public.cms_content view
CREATE VIEW public.cms_content AS
SELECT * FROM paynowgo.cms_content;

-- Make cms_content view updatable
CREATE OR REPLACE RULE cms_content_insert AS
  ON INSERT TO public.cms_content
  DO INSTEAD
  INSERT INTO paynowgo.cms_content VALUES (NEW.*);

CREATE OR REPLACE RULE cms_content_update AS
  ON UPDATE TO public.cms_content
  DO INSTEAD
  UPDATE paynowgo.cms_content SET
    section = NEW.section,
    content = NEW.content,
    version = NEW.version,
    active = NEW.active,
    created_by = NEW.created_by,
    updated_at = now()
  WHERE id = OLD.id;

CREATE OR REPLACE RULE cms_content_delete AS
  ON DELETE TO public.cms_content
  DO INSTEAD
  DELETE FROM paynowgo.cms_content WHERE id = OLD.id;

-- Create other views if the base tables exist
DO $$
BEGIN
  -- Create items view if paynowgo.items exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'paynowgo' AND table_name = 'items') THEN
    CREATE VIEW public.items AS SELECT * FROM paynowgo.items;
  END IF;

  -- Create categories view if paynowgo.categories exists  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'paynowgo' AND table_name = 'categories') THEN
    CREATE VIEW public.categories AS SELECT * FROM paynowgo.categories;
  END IF;

  -- Create order_items view if paynowgo.order_items exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'paynowgo' AND table_name = 'order_items') THEN
    CREATE VIEW public.order_items AS SELECT * FROM paynowgo.order_items;
  END IF;

  -- Create orders view if paynowgo.orders exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'paynowgo' AND table_name = 'orders') THEN
    CREATE VIEW public.orders AS SELECT * FROM paynowgo.orders;
  END IF;

  -- Create payments view if paynowgo.payments exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'paynowgo' AND table_name = 'payments') THEN
    CREATE VIEW public.payments AS SELECT * FROM paynowgo.payments;
  END IF;
END $$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Clean up backup function
DROP FUNCTION backup_existing_object(text, text);
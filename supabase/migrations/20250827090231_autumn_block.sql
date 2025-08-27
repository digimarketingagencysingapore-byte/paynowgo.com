/*
  # Fix currency constraint and update views

  1. Database Changes
    - Add default value for currency column in paynowgo.items
    - Update views to handle currency properly
    - Fix insert rules to include currency

  2. Security
    - Maintain existing RLS policies
    - Ensure proper tenant isolation
*/

-- Add default value for currency column
ALTER TABLE paynowgo.items 
ALTER COLUMN currency SET DEFAULT 'SGD';

-- Update existing rows that might have null currency
UPDATE paynowgo.items 
SET currency = 'SGD' 
WHERE currency IS NULL;

-- Drop and recreate views with proper currency handling
DROP VIEW IF EXISTS public.items CASCADE;
DROP VIEW IF EXISTS public.categories CASCADE;

-- Recreate items view
CREATE OR REPLACE VIEW public.items AS 
SELECT 
  id,
  tenant_id,
  sku,
  name,
  price_cents,
  currency,
  is_active as active,
  created_at,
  updated_at
FROM paynowgo.items;

-- Recreate categories view
CREATE OR REPLACE VIEW public.categories AS 
SELECT 
  id,
  tenant_id,
  name,
  parent_id,
  sort_order as position,
  created_at,
  updated_at
FROM paynowgo.categories;

-- Grant permissions
GRANT ALL ON public.items TO authenticated, anon;
GRANT ALL ON public.categories TO authenticated, anon;

-- Create updateable view rules with proper currency handling
CREATE OR REPLACE RULE items_insert AS ON INSERT TO public.items
DO INSTEAD INSERT INTO paynowgo.items (
  id, 
  tenant_id, 
  sku, 
  name, 
  price_cents, 
  currency, 
  is_active, 
  created_at, 
  updated_at
)
VALUES (
  COALESCE(NEW.id, gen_random_uuid()), 
  NEW.tenant_id, 
  NEW.sku, 
  NEW.name, 
  NEW.price_cents, 
  COALESCE(NEW.currency, 'SGD'), 
  NEW.active, 
  COALESCE(NEW.created_at, now()), 
  COALESCE(NEW.updated_at, now())
);

CREATE OR REPLACE RULE items_update AS ON UPDATE TO public.items
DO INSTEAD UPDATE paynowgo.items SET
  name = NEW.name,
  price_cents = NEW.price_cents,
  sku = NEW.sku,
  is_active = NEW.active,
  currency = COALESCE(NEW.currency, 'SGD'),
  updated_at = now()
WHERE id = OLD.id AND tenant_id = OLD.tenant_id;

CREATE OR REPLACE RULE items_delete AS ON DELETE TO public.items
DO INSTEAD DELETE FROM paynowgo.items 
WHERE id = OLD.id AND tenant_id = OLD.tenant_id;

-- Categories rules
CREATE OR REPLACE RULE categories_insert AS ON INSERT TO public.categories
DO INSTEAD INSERT INTO paynowgo.categories (
  id, 
  tenant_id, 
  name, 
  parent_id, 
  sort_order, 
  created_at, 
  updated_at
)
VALUES (
  COALESCE(NEW.id, gen_random_uuid()), 
  NEW.tenant_id, 
  NEW.name, 
  NEW.parent_id, 
  NEW.position, 
  COALESCE(NEW.created_at, now()), 
  COALESCE(NEW.updated_at, now())
);

CREATE OR REPLACE RULE categories_update AS ON UPDATE TO public.categories
DO INSTEAD UPDATE paynowgo.categories SET
  name = NEW.name,
  sort_order = NEW.position,
  updated_at = now()
WHERE id = OLD.id AND tenant_id = OLD.tenant_id;

CREATE OR REPLACE RULE categories_delete AS ON DELETE TO public.categories
DO INSTEAD DELETE FROM paynowgo.categories 
WHERE id = OLD.id AND tenant_id = OLD.tenant_id;

-- Reload schema
NOTIFY pgrst, 'reload schema';
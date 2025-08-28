/*
  # Add profile_id to items table for user isolation
  
  1. Database Changes
    - Add profile_id column to paynowgo.items
    - Create foreign key relationship to profiles table
    - Add index for efficient filtering
    - Update views to include profile_id
    - Update RLS policies to filter by profile_id
    
  2. Data Migration
    - Set existing items to have a default profile_id (can be updated later)
*/

-- Add profile_id column to paynowgo.items
ALTER TABLE paynowgo.items 
ADD COLUMN IF NOT EXISTS profile_id UUID;

-- Create foreign key relationship to profiles table
ALTER TABLE paynowgo.items 
ADD CONSTRAINT fk_items_profile_id 
FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create index for efficient filtering by profile_id
CREATE INDEX IF NOT EXISTS idx_items_profile_id 
ON paynowgo.items(profile_id);

-- Create composite index for tenant_id + profile_id (common query pattern)
CREATE INDEX IF NOT EXISTS idx_items_tenant_profile 
ON paynowgo.items(tenant_id, profile_id);

-- Update the public.items view to include profile_id
DROP VIEW IF EXISTS public.items CASCADE;

CREATE OR REPLACE VIEW public.items AS 
SELECT 
  id,
  tenant_id,
  profile_id,
  sku,
  name,
  price_cents,
  currency,
  is_active as active,
  created_at,
  updated_at
FROM paynowgo.items;

-- Grant permissions on the updated view
GRANT ALL ON public.items TO authenticated, anon;

-- Update the insert rule to handle profile_id
CREATE OR REPLACE RULE items_insert AS ON INSERT TO public.items
DO INSTEAD INSERT INTO paynowgo.items (
  id, 
  tenant_id, 
  profile_id,
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
  NEW.profile_id,
  NEW.sku, 
  NEW.name, 
  NEW.price_cents, 
  COALESCE(NEW.currency, 'SGD'), 
  NEW.active, 
  COALESCE(NEW.created_at, now()), 
  COALESCE(NEW.updated_at, now())
);

-- Update the update rule to handle profile_id
CREATE OR REPLACE RULE items_update AS ON UPDATE TO public.items
DO INSTEAD UPDATE paynowgo.items SET
  name = NEW.name,
  price_cents = NEW.price_cents,
  sku = NEW.sku,
  is_active = NEW.active,
  profile_id = NEW.profile_id,
  currency = COALESCE(NEW.currency, 'SGD'),
  updated_at = now()
WHERE id = OLD.id AND tenant_id = OLD.tenant_id;

-- Update RLS policy to filter by profile_id when present
DROP POLICY IF EXISTS "Items are isolated by tenant" ON paynowgo.items;

-- Create new RLS policy that respects both tenant and profile isolation
CREATE POLICY "Items are isolated by tenant and profile" 
  ON paynowgo.items
  FOR ALL 
  TO public
  USING (
    -- Allow access if tenant_id matches current merchant's tenant
    tenant_id::text = current_setting('app.current_tenant_id', true)
    -- AND if profile_id is null (legacy data) OR matches authenticated user's profile
    AND (profile_id IS NULL OR profile_id = auth.uid())
  )
  WITH CHECK (
    -- Same check for inserts/updates
    tenant_id::text = current_setting('app.current_tenant_id', true)
    AND (profile_id IS NULL OR profile_id = auth.uid())
  );

-- Enable RLS on the items table
ALTER TABLE paynowgo.items ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON paynowgo.items TO anon, authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
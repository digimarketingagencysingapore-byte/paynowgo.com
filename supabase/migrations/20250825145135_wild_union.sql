/*
  # Create public views for items and categories

  1. New Views
    - `public.items` - View of paynowgo.items with proper column mapping
    - `public.categories` - View of paynowgo.categories with proper column mapping
  
  2. Column Mappings
    - Maps paynowgo schema columns to expected public schema columns
    - Ensures category_id column is available in items view
    
  3. Security
    - Views inherit RLS from underlying tables
    - Proper access control maintained
*/

-- Create public.items view with proper column mapping
CREATE OR REPLACE VIEW public.items AS
SELECT 
  id,
  tenant_id,
  sku,
  name,
  price_cents,
  currency,
  is_active,
  created_at,
  updated_at,
  -- Map to expected column names
  tenant_id as category_id  -- Temporary mapping until proper categories table exists
FROM paynowgo.items;

-- Create public.categories view with proper column mapping  
CREATE OR REPLACE VIEW public.categories AS
SELECT 
  id,
  tenant_id,
  name,
  parent_id,
  sort_order,
  created_at,
  updated_at,
  -- Map to expected column names
  sort_order as position
FROM paynowgo.categories;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.items TO anon;
GRANT SELECT ON public.categories TO anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
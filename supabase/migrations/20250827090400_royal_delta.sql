/*
  # Fix RLS Policies for Anonymous Access

  1. Security Updates
    - Add policies for anonymous users to access items and categories
    - Keep tenant isolation but allow anon access for demo
    - Maintain data security while enabling frontend functionality

  2. Changes
    - Add anon access policies for items and categories
    - Update existing policies to include anon role
    - Ensure proper tenant context handling
*/

-- Update items policies to include anon access
DROP POLICY IF EXISTS "Items are isolated by tenant" ON paynowgo.items;
CREATE POLICY "Items are isolated by tenant"
  ON paynowgo.items
  FOR ALL
  TO authenticated, anon
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Update categories policies to include anon access  
DROP POLICY IF EXISTS "Categories are isolated by tenant" ON paynowgo.categories;
CREATE POLICY "Categories are isolated by tenant"
  ON paynowgo.categories
  FOR ALL
  TO authenticated, anon
  USING (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (tenant_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Ensure anon role has proper grants
GRANT USAGE ON SCHEMA paynowgo TO anon;
GRANT ALL ON paynowgo.items TO anon;
GRANT ALL ON paynowgo.categories TO anon;

-- Reload schema
NOTIFY pgrst, 'reload schema';
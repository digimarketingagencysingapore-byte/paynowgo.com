/*
  # Create CMS content storage table

  1. New Tables
    - `website_content`
      - `id` (uuid, primary key)
      - `section` (text, content section name)
      - `content` (jsonb, section content data)
      - `version` (integer, content version)
      - `active` (boolean, is this version active)
      - `created_by` (uuid, admin user who created)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `website_content` table
    - Add policy for authenticated users to manage content
    - Add indexes for performance

  3. Notes
    - Uses `website_content` table name to avoid conflict with existing `cms_content` view
    - Supports versioning and multi-admin editing
    - Content stored as JSONB for flexibility
*/

-- Create website_content table (avoiding conflict with existing cms_content view)
CREATE TABLE IF NOT EXISTS public.website_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_website_content_section ON public.website_content(section);
CREATE INDEX IF NOT EXISTS idx_website_content_active ON public.website_content(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_website_content_section_active ON public.website_content(section, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_website_content_created_at ON public.website_content(created_at DESC);

-- Add unique constraint for active content per section
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_content_section_active_unique 
ON public.website_content(section) WHERE active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_website_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_content_updated_at 
    BEFORE UPDATE ON public.website_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_website_content_updated_at();

-- Enable RLS
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can manage website content
CREATE POLICY "Authenticated users can manage website content" ON public.website_content
    FOR ALL USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.website_content TO authenticated;
GRANT USAGE ON SEQUENCE website_content_id_seq TO authenticated;

COMMENT ON TABLE public.website_content IS 'Website content management for CMS functionality';
COMMENT ON COLUMN public.website_content.section IS 'Content section identifier (hero, features, etc.)';
COMMENT ON COLUMN public.website_content.content IS 'Section content as JSON object';
COMMENT ON COLUMN public.website_content.version IS 'Content version number for tracking changes';
COMMENT ON COLUMN public.website_content.active IS 'Whether this version is currently active';
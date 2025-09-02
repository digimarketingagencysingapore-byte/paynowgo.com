/*
  # Create CMS Content Management Table

  1. New Tables
    - `cms_content`
      - `id` (uuid, primary key)
      - `section` (text, content section name)
      - `content` (jsonb, content data)
      - `version` (integer, version number)
      - `active` (boolean, is this version active)
      - `created_by` (uuid, admin user who created)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `cms_content` table
    - Add policy for authenticated users to manage content
    - Add policy for public users to read active content

  3. Indexes
    - Index on section and active for fast lookups
    - Index on version for ordering
*/

-- Create CMS content table
CREATE TABLE IF NOT EXISTS public.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cms_content_section_active ON public.cms_content(section, active);
CREATE INDEX IF NOT EXISTS idx_cms_content_version ON public.cms_content(version DESC);
CREATE INDEX IF NOT EXISTS idx_cms_content_created_at ON public.cms_content(created_at DESC);

-- Add unique constraint for active content per section
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_content_section_active_unique 
ON public.cms_content(section) 
WHERE active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_cms_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cms_content_updated_at 
    BEFORE UPDATE ON public.cms_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_cms_content_updated_at();

-- Enable RLS
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can manage all CMS content
CREATE POLICY "cms_content_authenticated_manage" ON public.cms_content
    FOR ALL USING (true) WITH CHECK (true);

-- Policy: Public users can read active content
CREATE POLICY "cms_content_public_read" ON public.cms_content
    FOR SELECT USING (active = true);

-- Grant permissions
GRANT SELECT ON public.cms_content TO anon;
GRANT ALL ON public.cms_content TO authenticated;

-- Add some default content
INSERT INTO public.cms_content (section, content, active) VALUES
('hero', '{
  "title": "Accept PayNow Payments Effortlessly",
  "subtitle": "PayNow",
  "description": "Complete Point-of-Sale system with Singapore PayNow integration. Generate QR codes, track payments, and manage your business with ease.",
  "primaryButtonText": "Start Free Trial",
  "primaryButtonLink": "/merchant",
  "primaryButtonVisible": true,
  "secondaryButtonText": "View Demo",
  "secondaryButtonLink": "/display",
  "secondaryButtonVisible": true,
  "badgeText": "Singapore''s #1 PayNow POS System",
  "certificationBadge": "Singapore Certified",
  "features": ["No setup fees", "14-day free trial", "Cancel anytime"]
}', true)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.cms_content IS 'Content Management System for website content';
COMMENT ON COLUMN public.cms_content.section IS 'Content section identifier (hero, features, pricing, etc.)';
COMMENT ON COLUMN public.cms_content.content IS 'JSON content data for the section';
COMMENT ON COLUMN public.cms_content.version IS 'Version number for content versioning';
COMMENT ON COLUMN public.cms_content.active IS 'Whether this version is currently active';
/*
  # Create website content management table

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
    - Add policy for public users to read active content

  3. Indexes
    - Index on section and active status for fast queries
    - Index on created_at for version history
*/

-- Create website_content table for CMS
CREATE TABLE IF NOT EXISTS website_content (
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
CREATE INDEX IF NOT EXISTS idx_website_content_section_active 
ON website_content(section, active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_website_content_created_at 
ON website_content(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_content_section_version 
ON website_content(section, version DESC);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_website_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_website_content_updated_at 
    BEFORE UPDATE ON website_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_website_content_updated_at();

-- Enable RLS
ALTER TABLE website_content ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can manage all content
CREATE POLICY "Authenticated users can manage website content"
    ON website_content
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy: Public users can read active content
CREATE POLICY "Public users can read active website content"
    ON website_content
    FOR SELECT
    TO anon
    USING (active = true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON website_content TO authenticated;
GRANT SELECT ON website_content TO anon;

COMMENT ON TABLE website_content IS 'CMS content management for website sections';
COMMENT ON COLUMN website_content.section IS 'Content section identifier (hero, features, etc.)';
COMMENT ON COLUMN website_content.content IS 'JSON content data for the section';
COMMENT ON COLUMN website_content.version IS 'Version number for content history';
COMMENT ON COLUMN website_content.active IS 'Whether this version is currently active';
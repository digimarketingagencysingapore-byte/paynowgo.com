/*
  # Create CMS Content Table

  1. New Tables
    - `cms_content`
      - `id` (uuid, primary key)
      - `section` (text, unique)
      - `content` (jsonb)
      - `version` (integer)
      - `active` (boolean)
      - `created_by` (uuid, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `cms_content` table
    - Add policy for authenticated users to manage content
    - Add policy for anonymous users to read active content

  3. Public Views
    - Create `public.cms_content` view pointing to `paynowgo.cms_content`
    - Enable updatable operations through the view
*/

-- Create the cms_content table in paynowgo schema
CREATE SCHEMA IF NOT EXISTS paynowgo;

CREATE TABLE IF NOT EXISTS paynowgo.cms_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE paynowgo.cms_content ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read active CMS content"
  ON paynowgo.cms_content
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Authenticated users can manage CMS content"
  ON paynowgo.cms_content
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cms_content_section ON paynowgo.cms_content(section);
CREATE INDEX IF NOT EXISTS idx_cms_content_active ON paynowgo.cms_content(active);

-- Create public view
DROP VIEW IF EXISTS public.cms_content;
CREATE VIEW public.cms_content AS 
SELECT * FROM paynowgo.cms_content;

-- Make the view updatable
CREATE OR REPLACE RULE cms_content_insert AS
  ON INSERT TO public.cms_content
  DO INSTEAD
  INSERT INTO paynowgo.cms_content (section, content, version, active, created_by, created_at, updated_at)
  VALUES (NEW.section, NEW.content, NEW.version, NEW.active, NEW.created_by, NEW.created_at, NEW.updated_at);

CREATE OR REPLACE RULE cms_content_update AS
  ON UPDATE TO public.cms_content
  DO INSTEAD
  UPDATE paynowgo.cms_content
  SET section = NEW.section,
      content = NEW.content,
      version = NEW.version,
      active = NEW.active,
      created_by = NEW.created_by,
      updated_at = NEW.updated_at
  WHERE id = OLD.id;

CREATE OR REPLACE RULE cms_content_delete AS
  ON DELETE TO public.cms_content
  DO INSTEAD
  DELETE FROM paynowgo.cms_content WHERE id = OLD.id;

-- Insert default CMS content
INSERT INTO paynowgo.cms_content (section, content, active) VALUES
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
}'::jsonb, true),
('features', '{
  "title": "Everything you need for modern payments",
  "subtitle": "Built specifically for Singapore businesses with PayNow integration, real-time analytics, and customer display systems.",
  "items": [
    {
      "id": "paynow",
      "title": "PayNow Integration",
      "description": "Generate Singapore PayNow QR codes instantly. Support for both UEN and mobile payments.",
      "icon": "QrCode"
    },
    {
      "id": "display",
      "title": "Customer Display",
      "description": "Dual-screen setup with customer-facing QR code display for seamless transactions.",
      "icon": "Smartphone"
    },
    {
      "id": "analytics",
      "title": "Real-time Analytics",
      "description": "Track sales, monitor performance, and export detailed reports with just one click.",
      "icon": "BarChart3"
    }
  ]
}'::jsonb, true)
ON CONFLICT (section) DO NOTHING;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
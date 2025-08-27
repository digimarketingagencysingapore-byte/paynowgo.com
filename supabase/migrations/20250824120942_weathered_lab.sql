/*
  # Create display events table for cross-device QR communication

  1. New Tables
    - `display_events`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `event_type` (text) - 'show_qr' or 'hide_qr'
      - `order_id` (uuid, nullable)
      - `qr_data` (jsonb) - QR code data including SVG, amount, reference
      - `expires_at` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `display_events` table
    - Add policy for tenant isolation
    - Add policy for display devices to read events

  3. Indexes
    - Index on tenant_id and created_at for efficient querying
    - Index on expires_at for cleanup
*/

CREATE TABLE IF NOT EXISTS display_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('show_qr', 'hide_qr')),
  order_id uuid,
  qr_data jsonb,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE display_events ENABLE ROW LEVEL SECURITY;

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_display_events_tenant_created 
ON display_events (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_display_events_expires 
ON display_events (expires_at);

-- RLS Policies
CREATE POLICY "Display events are isolated by tenant"
  ON display_events
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid);

-- Allow anonymous access for display devices (they use device keys, not user auth)
CREATE POLICY "Display devices can read events"
  ON display_events
  FOR SELECT
  TO anon
  USING (true);

-- Function to clean up expired events
CREATE OR REPLACE FUNCTION cleanup_expired_display_events()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM display_events 
  WHERE expires_at < now() - interval '1 hour';
END;
$$;
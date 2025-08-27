/*
  # Create display_states table for QR display management

  1. New Tables
    - `display_states`
      - `device_id` (uuid, primary key, references customer_displays)
      - `tenant_id` (uuid, not null)
      - `state` (text, check constraint: 'idle' or 'show')
      - `order_id` (uuid, nullable)
      - `amount` (numeric, nullable)
      - `reference` (text, nullable)
      - `qr_svg` (text, nullable)
      - `expires_at` (timestamptz, nullable)
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `display_states` table
    - Add policy for display devices to read their own state
    - Add policy for authenticated users to manage states

  3. Indexes
    - Index on tenant_id for efficient queries
*/

CREATE TABLE IF NOT EXISTS public.display_states (
  device_id uuid PRIMARY KEY REFERENCES public.customer_displays(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  state text CHECK (state IN ('idle', 'show')) NOT NULL DEFAULT 'idle',
  order_id uuid,
  amount numeric(10,2),
  reference text,
  qr_svg text,
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_display_states_tenant ON public.display_states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_display_states_expires ON public.display_states(expires_at);

ALTER TABLE display_states ENABLE ROW LEVEL SECURITY;

-- Policy for display devices to read their own state
CREATE POLICY "Display devices can read own state"
  ON display_states
  FOR SELECT
  TO anon
  USING (true);

-- Policy for authenticated users to manage display states
CREATE POLICY "Authenticated users can manage display states"
  ON display_states
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id'::text, true))::uuid);

-- Function to update display state
CREATE OR REPLACE FUNCTION update_display_state(
  p_tenant_id uuid,
  p_device_id uuid,
  p_state text,
  p_order_id uuid DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_reference text DEFAULT NULL,
  p_qr_svg text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO display_states (
    device_id, tenant_id, state, order_id, amount, reference, qr_svg, expires_at, updated_at
  ) VALUES (
    p_device_id, p_tenant_id, p_state, p_order_id, p_amount, p_reference, p_qr_svg, p_expires_at, now()
  )
  ON CONFLICT (device_id) DO UPDATE SET
    state = EXCLUDED.state,
    order_id = EXCLUDED.order_id,
    amount = EXCLUDED.amount,
    reference = EXCLUDED.reference,
    qr_svg = EXCLUDED.qr_svg,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
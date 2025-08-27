/*
  # Customer Display System Tables

  1. New Tables
    - `devices`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `device_name` (text)
      - `device_key` (text, unique)
      - `last_seen_at` (timestamptz)
      - `created_at` (timestamptz)
    - `orders`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `reference` (text)
      - `amount` (numeric)
      - `status` (enum)
      - `payload` (text)
      - `qr_svg` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for tenant-based access
    - Add indexes for performance

  3. Functions
    - Function to publish realtime events
    - Trigger to auto-publish on order status changes
*/

-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'paid', 'canceled', 'expired');

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  device_name text NOT NULL,
  device_key text UNIQUE NOT NULL,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  reference text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status order_status DEFAULT 'pending',
  payload text,
  qr_svg text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices
CREATE POLICY "Devices are isolated by tenant"
  ON devices
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);

-- RLS Policies for orders
CREATE POLICY "Orders are isolated by tenant"
  ON orders
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id'))::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_key ON devices(device_key);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- Function to publish realtime events
CREATE OR REPLACE FUNCTION publish_display_event()
RETURNS trigger AS $$
BEGIN
  -- Publish show event when order is created
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    PERFORM pg_notify(
      'display_events',
      json_build_object(
        'tenant_id', NEW.tenant_id,
        'type', 'show',
        'order_id', NEW.id,
        'qr_svg', NEW.qr_svg,
        'amount', NEW.amount,
        'reference', NEW.reference,
        'expires_at', NEW.expires_at
      )::text
    );
  END IF;

  -- Publish hide event when order is paid/canceled/expired
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('paid', 'canceled', 'expired') THEN
    PERFORM pg_notify(
      'display_events',
      json_build_object(
        'tenant_id', NEW.tenant_id,
        'type', 'hide',
        'order_id', NEW.id
      )::text
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS orders_display_events ON orders;
CREATE TRIGGER orders_display_events
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION publish_display_event();

-- Insert sample devices for testing
INSERT INTO devices (tenant_id, device_name, device_key) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Counter Display 1', 'DISP001'),
  ('00000000-0000-0000-0000-000000000001', 'Counter Display 2', 'DISP002')
ON CONFLICT (device_key) DO NOTHING;
/*
  # PayNowGo POS System - Dual Display Setup

  1. New Tables
    - `tenants` - Merchant/tenant configuration
    - `orders` - Payment orders with QR codes
    - `customer_displays` - Customer display devices

  2. Security
    - Enable RLS on all tables
    - Tenant-based isolation policies
    - Rate limiting considerations

  3. Realtime
    - Functions for publishing display events
    - Triggers for automatic event publishing
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  mode text DEFAULT 'live',
  paynow_uen text,
  paynow_mobile text,
  business_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create orders table (reuse/extend existing)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
    CREATE TABLE orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      reference text NOT NULL,
      amount numeric(10,2) NOT NULL,
      currency text DEFAULT 'SGD',
      status text CHECK (status IN ('pending','paid','canceled','expired')) DEFAULT 'pending',
      payload text NOT NULL,
      qr_svg text,
      expires_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
  ELSE
    -- Add missing columns if table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payload') THEN
      ALTER TABLE orders ADD COLUMN payload text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'currency') THEN
      ALTER TABLE orders ADD COLUMN currency text DEFAULT 'SGD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'expires_at') THEN
      ALTER TABLE orders ADD COLUMN expires_at timestamptz;
    END IF;
  END IF;
END $$;

-- Create customer_displays table
CREATE TABLE IF NOT EXISTS customer_displays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text,
  device_key text UNIQUE NOT NULL,
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_displays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Tenants can view own data"
  ON tenants
  FOR ALL
  TO authenticated
  USING (id = (current_setting('app.current_tenant_id', true))::uuid);

-- RLS Policies for orders
CREATE POLICY "Orders are isolated by tenant"
  ON orders
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- RLS Policies for customer_displays
CREATE POLICY "Customer displays are isolated by tenant"
  ON customer_displays
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_displays_tenant ON customer_displays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_displays_device_key ON customer_displays(device_key);

-- Function to publish display events
CREATE OR REPLACE FUNCTION publish_display_events()
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
        'amount', NEW.amount,
        'reference', NEW.reference,
        'qr_svg', NEW.qr_svg,
        'expires_at', NEW.expires_at
      )::text
    );
  END IF;

  -- Publish hide event when order status changes from pending
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

-- Create trigger for display events
DROP TRIGGER IF EXISTS orders_display_events ON orders;
CREATE TRIGGER orders_display_events
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION publish_display_events();

-- Insert demo tenant
INSERT INTO tenants (slug, paynow_uen, paynow_mobile, business_name) VALUES
  ('demo', 'T05LL1103B', '+6586854221', 'Demo Restaurant Pte Ltd')
ON CONFLICT (slug) DO UPDATE SET
  paynow_uen = EXCLUDED.paynow_uen,
  paynow_mobile = EXCLUDED.paynow_mobile,
  business_name = EXCLUDED.business_name;

-- Insert demo customer display
INSERT INTO customer_displays (tenant_id, name, device_key) 
SELECT id, 'Counter Display 1', 'DISP001' 
FROM tenants WHERE slug = 'demo'
ON CONFLICT (device_key) DO NOTHING;
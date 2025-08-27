/*
  # PayNowGo Confirm System - Payment Confirmation Infrastructure

  1. New Tables
    - `payment_events` - Raw payment signals from Android/Email
    - `device_health` - Health monitoring for Android devices
    - `confirm_config` - Tenant-specific parsing configuration
    - `payments` - Confirmed payment records

  2. Security
    - Enable RLS on all tables
    - Tenant-based isolation
    - Rate limiting considerations

  3. Indexes
    - Performance optimization for matching and monitoring
*/

-- Create enum for payment event sources
CREATE TYPE payment_source AS ENUM ('android', 'email');

-- Payment Events Table (Raw signals)
CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  source payment_source NOT NULL,
  reference text NOT NULL,
  amount numeric(10,2) NOT NULL,
  payer_name text,
  bank_ref text,
  received_at timestamptz NOT NULL,
  raw jsonb,
  correlates_order uuid,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Device Health Table
CREATE TABLE IF NOT EXISTS device_health (
  device_id uuid PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  last_heartbeat_at timestamptz,
  last_event_at timestamptz,
  error_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Confirm Configuration Table
CREATE TABLE IF NOT EXISTS confirm_config (
  tenant_id uuid PRIMARY KEY,
  android_pkg_whitelist text[] DEFAULT array[]::text[],
  ref_regex text DEFAULT '(?i)(?:Ref(?:erence)?|Bill(?:\\s*No)?)[:\\-\\s#]*([A-Za-z0-9\\-_/]{3,25})',
  amt_regex text DEFAULT '(?i)(?:SGD|S\\$)\\s*([0-9]{1,6}(?:\\.[0-9]{1,2})?)',
  payer_regex text DEFAULT '(?i)(?:from|payer)[:\\-\\s]*([A-Za-z0-9 .,'']{2,40})',
  bankref_regex text DEFAULT '(?i)(?:Txn|Trans(?:action)?\\s*ID|Ref\\s*ID)[:\\-\\s#]*([A-Za-z0-9\\-]{5,30})',
  amount_tolerance numeric(10,2) DEFAULT 0.01,
  event_hard_ttl_secs int DEFAULT 86400,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments Table (Confirmed payments)
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  received_amount numeric(10,2) NOT NULL,
  payer_name text,
  bank_ref text,
  received_at timestamptz NOT NULL,
  source payment_source NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirm_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_events
CREATE POLICY "Payment events are isolated by tenant"
  ON payment_events
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- RLS Policies for device_health
CREATE POLICY "Device health is isolated by tenant"
  ON device_health
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices d 
      WHERE d.id = device_health.device_id 
      AND d.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- RLS Policies for confirm_config
CREATE POLICY "Confirm config is isolated by tenant"
  ON confirm_config
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- RLS Policies for payments
CREATE POLICY "Payments are isolated by tenant"
  ON payments
  FOR ALL
  TO authenticated
  USING (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_events_tenant_reference ON payment_events(tenant_id, reference);
CREATE INDEX IF NOT EXISTS idx_payment_events_tenant_created ON payment_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_handled ON payment_events(handled, created_at);
CREATE INDEX IF NOT EXISTS idx_device_health_heartbeat ON device_health(last_heartbeat_at);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_created ON payments(tenant_id, created_at);

-- Insert default confirm config for demo tenant
INSERT INTO confirm_config (tenant_id) VALUES
  ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (tenant_id) DO NOTHING;

-- Function to update device health on heartbeat
CREATE OR REPLACE FUNCTION update_device_health()
RETURNS trigger AS $$
BEGIN
  INSERT INTO device_health (device_id, last_heartbeat_at, updated_at)
  VALUES (NEW.id, now(), now())
  ON CONFLICT (device_id) 
  DO UPDATE SET 
    last_heartbeat_at = now(),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update device health on device updates
CREATE TRIGGER device_heartbeat_trigger
  AFTER UPDATE ON devices
  FOR EACH ROW
  WHEN (NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at)
  EXECUTE FUNCTION update_device_health();
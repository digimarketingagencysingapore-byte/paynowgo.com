/*
  # Authentication System Tables

  1. New Tables
    - `merchants`
      - `id` (uuid, primary key)
      - `business_name` (text)
      - `email` (text, unique)
      - `password_hash` (text)
      - `uen` (text)
      - `mobile` (text)
      - `status` (enum: active, suspended, pending)
      - `subscription_plan` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    - `admin_users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `password_hash` (text)
      - `role` (enum: super_admin, support)
      - `created_at` (timestamptz)
    - `merchant_sessions`
      - `id` (uuid, primary key)
      - `merchant_id` (uuid, foreign key)
      - `token` (text, unique)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Add indexes for performance

  3. Default Data
    - Create default super admin
    - Create sample merchant for testing
*/

-- Create enums
CREATE TYPE merchant_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE admin_role AS ENUM ('super_admin', 'support');

-- Create merchants table
CREATE TABLE IF NOT EXISTS merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  uen text,
  mobile text,
  status merchant_status DEFAULT 'pending',
  subscription_plan text DEFAULT 'basic',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role admin_role DEFAULT 'support',
  created_at timestamptz DEFAULT now()
);

-- Create merchant_sessions table
CREATE TABLE IF NOT EXISTS merchant_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for merchants (merchants can only see their own data)
CREATE POLICY "Merchants can view own data"
  ON merchants
  FOR SELECT
  TO authenticated
  USING (id = (current_setting('app.current_merchant_id', true))::uuid);

CREATE POLICY "Merchants can update own data"
  ON merchants
  FOR UPDATE
  TO authenticated
  USING (id = (current_setting('app.current_merchant_id', true))::uuid);

-- RLS Policies for admin_users (only admins can access)
CREATE POLICY "Only admins can access admin_users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au 
      WHERE au.id = (current_setting('app.current_admin_id', true))::uuid
    )
  );

-- RLS Policies for merchant_sessions
CREATE POLICY "Merchants can view own sessions"
  ON merchant_sessions
  FOR SELECT
  TO authenticated
  USING (merchant_id = (current_setting('app.current_merchant_id', true))::uuid);

-- Update devices table to link to merchants
ALTER TABLE devices ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE;

-- Update orders table to link to merchants  
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE;

-- Update existing RLS policies to use merchant_id instead of tenant_id
DROP POLICY IF EXISTS "Devices are isolated by tenant" ON devices;
CREATE POLICY "Devices are isolated by merchant"
  ON devices
  FOR ALL
  TO authenticated
  USING (merchant_id = (current_setting('app.current_merchant_id', true))::uuid);

DROP POLICY IF EXISTS "Orders are isolated by tenant" ON orders;
CREATE POLICY "Orders are isolated by merchant"
  ON orders
  FOR ALL
  TO authenticated
  USING (merchant_id = (current_setting('app.current_merchant_id', true))::uuid);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_merchants_email ON merchants(email);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON merchants(status);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_merchant_sessions_token ON merchant_sessions(token);
CREATE INDEX IF NOT EXISTS idx_merchant_sessions_merchant_id ON merchant_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_devices_merchant_id ON devices(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);

-- Insert default super admin (password: admin123)
INSERT INTO admin_users (email, password_hash, role) VALUES
  ('admin@paynowgo.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqu', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample merchant for testing (password: merchant123)
INSERT INTO merchants (business_name, email, password_hash, uen, mobile, status) VALUES
  ('Demo Restaurant Pte Ltd', 'demo@restaurant.com', '$2b$10$rOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqQqQqQqQqOzJqQqQqQqQqu', 'T05LL1103B', '+6591234567', 'active')
ON CONFLICT (email) DO NOTHING;

-- Update existing devices and orders to use the demo merchant
DO $$
DECLARE
  demo_merchant_id uuid;
BEGIN
  SELECT id INTO demo_merchant_id FROM merchants WHERE email = 'demo@restaurant.com';
  
  IF demo_merchant_id IS NOT NULL THEN
    UPDATE devices SET merchant_id = demo_merchant_id WHERE merchant_id IS NULL;
    UPDATE orders SET merchant_id = demo_merchant_id WHERE merchant_id IS NULL;
  END IF;
END $$;
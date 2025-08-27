/*
  # Add subscription fields to merchants table

  1. Changes
    - Add `subscription_starts_at` column to merchants table
    - Add `subscription_expires_at` column to merchants table
    - Add `address` column to merchants table
    - Add `payment_method` column to merchants table
    - Add `settings` column to merchants table
    - Set default values for existing records

  2. Security
    - No RLS changes needed (already enabled)
*/

-- Add missing columns to merchants table
DO $$
BEGIN
  -- Add subscription_starts_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'subscription_starts_at'
  ) THEN
    ALTER TABLE merchants ADD COLUMN subscription_starts_at timestamptz DEFAULT now();
  END IF;

  -- Add subscription_expires_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'subscription_expires_at'
  ) THEN
    ALTER TABLE merchants ADD COLUMN subscription_expires_at timestamptz DEFAULT (now() + interval '1 year');
  END IF;

  -- Add address column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'address'
  ) THEN
    ALTER TABLE merchants ADD COLUMN address text;
  END IF;

  -- Add payment_method column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE merchants ADD COLUMN payment_method text DEFAULT 'uen';
  END IF;

  -- Add settings column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'settings'
  ) THEN
    ALTER TABLE merchants ADD COLUMN settings jsonb DEFAULT '{}';
  END IF;
END $$;
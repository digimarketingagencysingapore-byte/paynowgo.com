/*
  # Fix terminal_id column and index creation

  This migration ensures the terminal_id column exists in the orders table
  before attempting to create an index on it.

  1. Tables
    - Ensure terminals table exists
    - Add terminal_id column to orders if missing
    - Create proper foreign key constraint
    - Create index only if column exists

  2. Safety
    - All operations are idempotent
    - Handles existing constraints gracefully
    - Conditional index creation
*/

-- Terminals table (ensure it exists)
CREATE TABLE IF NOT EXISTS public.terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  device_key text UNIQUE NOT NULL,
  last_seen_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Add terminal_id column to orders if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'terminal_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN terminal_id uuid NULL;
  END IF;

  -- Add FK constraint (handle duplicate gracefully)
  BEGIN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_terminal_id_fkey
      FOREIGN KEY (terminal_id) REFERENCES public.terminals(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    -- FK already exists, ignore
    NULL;
  END;
END$$;

-- Create index only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'terminal_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_orders_terminal
      ON public.orders(terminal_id)
      WHERE terminal_id IS NOT NULL;
  END IF;
END$$;
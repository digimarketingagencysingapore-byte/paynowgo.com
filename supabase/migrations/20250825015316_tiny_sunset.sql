/*
  # Add updated_at column to devices table

  1. Schema Changes
    - Add `updated_at` column to `devices` table with default value
    - Create trigger function for automatic timestamp updates
    - Add trigger to update `updated_at` on row modifications

  2. Trigger Function
    - `set_updated_at()` function to automatically set timestamp
    - Applied before UPDATE operations

  3. Benefits
    - Enables reliable sorting and filtering by update time
    - Supports conditional requests and caching
    - Maintains data consistency across API operations
*/

-- Add updated_at column to devices table
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create or replace trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trg_devices_updated_at ON public.devices;
CREATE TRIGGER trg_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW 
  EXECUTE FUNCTION public.set_updated_at();

-- Update existing rows to have current timestamp
UPDATE public.devices 
SET updated_at = now() 
WHERE updated_at IS NULL;
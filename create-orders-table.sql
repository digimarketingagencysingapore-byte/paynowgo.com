-- Create orders table migration
-- Run this SQL in your Supabase SQL editor

-- Create orders table with proper structure
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id uuid NOT NULL,
    reference text NOT NULL UNIQUE,
    amount numeric NOT NULL CHECK (amount > 0),
    amount_cents integer GENERATED ALWAYS AS (ROUND(amount * 100)::integer) STORED,
    status public.order_status DEFAULT 'pending'::public.order_status,
    qr_svg text,
    qr_text text,
    payload text,
    meta jsonb,
    merchant_id uuid,
    terminal_id uuid,
    currency text DEFAULT 'SGD',
    expires_at timestamptz,
    paid_at timestamptz,
    canceled_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    idempotency_key text
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON public.orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_reference ON public.orders(reference);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders(merchant_id) WHERE merchant_id IS NOT NULL;

-- Add foreign key constraints
ALTER TABLE public.orders 
ADD CONSTRAINT orders_merchant_id_fkey 
FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_terminal_id_fkey 
FOREIGN KEY (terminal_id) REFERENCES public.terminals(id) ON DELETE SET NULL;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see orders from their tenant
CREATE POLICY orders_tenant_isolation ON public.orders
    FOR ALL USING (
        tenant_id IN (
            SELECT m.id 
            FROM public.merchants m 
            WHERE m.profile_id = auth.uid()
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

COMMENT ON TABLE public.orders IS 'Main orders table for PayNow transactions';
COMMENT ON COLUMN public.orders.tenant_id IS 'References merchants.id for tenant isolation';
COMMENT ON COLUMN public.orders.reference IS 'Unique payment reference for PayNow';
COMMENT ON COLUMN public.orders.amount IS 'Order amount in SGD';
COMMENT ON COLUMN public.orders.amount_cents IS 'Auto-calculated amount in cents';
COMMENT ON COLUMN public.orders.qr_svg IS 'PayNow QR code as SVG string';
COMMENT ON COLUMN public.orders.payload IS 'Additional order data as JSON string';
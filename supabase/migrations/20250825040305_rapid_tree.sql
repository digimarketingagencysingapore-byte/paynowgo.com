/*
  # Create persistent order system with terminals

  1. New Tables
    - `terminals` - Customer display devices
    - Enhanced `orders` table with terminal_id reference
  
  2. Security
    - Enable RLS on terminals table
    - Add policies for tenant isolation
    
  3. Indexes
    - Terminal lookup indexes
    - Order-terminal relationship indexes
*/

-- Ensure pgcrypto extension for UUID generation
create extension if not exists "pgcrypto";

-- Create terminals table for customer displays
create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  device_key text unique not null,
  location text,
  last_seen_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add terminal_id column to orders table (safe)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    alter table public.orders add column terminal_id uuid null;
  end if;
end$$;

-- Add foreign key constraint (safe)
do $$
begin
  begin
    alter table public.orders
      add constraint orders_terminal_id_fkey
      foreign key (terminal_id) references public.terminals(id) on delete set null;
  exception when duplicate_object then
    -- FK already exists, ignore
    null;
  end;
end$$;

-- Create indexes for terminals
create index if not exists idx_terminals_tenant_id on public.terminals(tenant_id);
create index if not exists idx_terminals_device_key on public.terminals(device_key);
create index if not exists idx_terminals_last_seen on public.terminals(last_seen_at);

-- Create terminal index on orders (only if column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    create index if not exists idx_orders_terminal
      on public.orders(terminal_id)
      where terminal_id is not null;
  end if;
end$$;

-- Enable RLS on terminals
alter table public.terminals enable row level security;

-- Drop existing policies if they exist
drop policy if exists "terminals_select_by_tenant" on public.terminals;
drop policy if exists "terminals_write_by_tenant" on public.terminals;

-- Create RLS policies for terminals
create policy "terminals_select_by_tenant"
  on public.terminals
  for select
  to authenticated
  using ( tenant_id = (current_setting('app.current_tenant_id', true))::uuid );

create policy "terminals_write_by_tenant"
  on public.terminals
  for all
  to authenticated
  using ( tenant_id = (current_setting('app.current_tenant_id', true))::uuid )
  with check ( tenant_id = (current_setting('app.current_tenant_id', true))::uuid );

-- Create order_items table for detailed line items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid null, -- Reference to items table if exists
  name text not null,
  unit_price_cents integer not null,
  qty integer not null default 1,
  line_total_cents integer not null,
  created_at timestamptz default now()
);

-- Enable RLS on order_items
alter table public.order_items enable row level security;

-- Create RLS policy for order_items (inherit from orders)
create policy "order_items_access_via_orders"
  on public.order_items
  for all
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  )
  with check (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    )
  );

-- Create indexes for order_items
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_item_id on public.order_items(item_id) where item_id is not null;

-- Add additional columns to orders if missing
do $$
begin
  -- Add paid_at column
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='paid_at'
  ) then
    alter table public.orders add column paid_at timestamptz null;
  end if;

  -- Add canceled_at column
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='canceled_at'
  ) then
    alter table public.orders add column canceled_at timestamptz null;
  end if;

  -- Add amount_cents column (for precision)
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='amount_cents'
  ) then
    alter table public.orders add column amount_cents integer null;
    -- Migrate existing amount data
    update public.orders set amount_cents = (amount::numeric * 100)::integer where amount_cents is null and amount is not null;
  end if;

  -- Add qr_text column
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='qr_text'
  ) then
    alter table public.orders add column qr_text text null;
  end if;

  -- Add idempotency_key column
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='idempotency_key'
  ) then
    alter table public.orders add column idempotency_key text null;
  end if;

  -- Add meta column for additional data
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='meta'
  ) then
    alter table public.orders add column meta jsonb null default '{}'::jsonb;
  end if;
end$$;

-- Create additional indexes for new columns
create index if not exists idx_orders_paid_at on public.orders(paid_at) where paid_at is not null;
create index if not exists idx_orders_canceled_at on public.orders(canceled_at) where canceled_at is not null;
create index if not exists idx_orders_amount_cents on public.orders(amount_cents) where amount_cents is not null;
create unique index if not exists idx_orders_idempotency_key on public.orders(tenant_id, idempotency_key) where idempotency_key is not null;
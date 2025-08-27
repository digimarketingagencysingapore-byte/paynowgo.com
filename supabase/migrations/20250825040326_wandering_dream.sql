/*
  # Ensure terminals system is properly set up

  1. Tables
    - `terminals` - Customer display devices with tenant isolation
    - `orders.terminal_id` - Link orders to specific terminals
  
  2. Security
    - RLS policies for tenant isolation
    - Proper foreign key constraints
    
  3. Indexes
    - Performance indexes for lookups
    - Conditional indexes for non-null values
*/

-- Ensure pgcrypto extension
create extension if not exists "pgcrypto";

-- Step 1: Ensure terminals table exists
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

-- Step 2: Add terminal_id column to orders (only if missing)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    alter table public.orders add column terminal_id uuid null;
  end if;
end$$;

-- Step 3: Add FK constraint (handle duplicates gracefully)
do $$
begin
  begin
    alter table public.orders
      add constraint orders_terminal_id_fkey
      foreign key (terminal_id) references public.terminals(id) on delete set null;
  exception when duplicate_object then
    -- FK constraint already exists, ignore
    null;
  end;
end$$;

-- Step 4: Create index only if column exists
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

-- Step 5: Create other terminal indexes
create index if not exists idx_terminals_tenant_id on public.terminals(tenant_id);
create index if not exists idx_terminals_device_key on public.terminals(device_key);
create index if not exists idx_terminals_last_seen on public.terminals(last_seen_at);

-- Step 6: Enable RLS on terminals
alter table public.terminals enable row level security;

-- Step 7: Create RLS policies for terminals
drop policy if exists "terminals_access_by_tenant" on public.terminals;

create policy "terminals_access_by_tenant"
  on public.terminals
  for all
  to authenticated
  using ( tenant_id = (current_setting('app.current_tenant_id', true))::uuid )
  with check ( tenant_id = (current_setting('app.current_tenant_id', true))::uuid );
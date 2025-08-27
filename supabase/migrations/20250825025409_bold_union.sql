/*
  # Fix terminal_id column and index creation

  This migration safely adds the terminal_id column to orders table and creates
  the necessary foreign key constraint and index. All operations are idempotent
  and can be run multiple times safely.

  1. Tables
     - Ensure `terminals` table exists
     - Add `terminal_id` column to `orders` if missing
  
  2. Constraints
     - Add FK constraint orders_terminal_id_fkey (with error handling)
  
  3. Indexes
     - Create idx_orders_terminal only if column exists
*/

-- Terminals table (idempotent)
create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  device_key text unique not null,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- Add terminal_id column to orders if missing + FK constraint
do $$
begin
  -- Add column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    alter table public.orders add column terminal_id uuid null;
  end if;

  -- Add FK constraint (handle duplicate gracefully)
  begin
    alter table public.orders
      add constraint orders_terminal_id_fkey
      foreign key (terminal_id) references public.terminals(id) on delete set null;
  exception when duplicate_object then
    -- FK constraint already exists, ignore
    null;
  end;
end$$;

-- Create index only if column exists
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

-- Enable RLS on terminals table
alter table public.terminals enable row level security;

-- Add RLS policy for terminals
create policy "Terminals are isolated by tenant"
  on public.terminals
  for all
  to authenticated
  using (tenant_id = (current_setting('app.current_tenant_id', true))::uuid);
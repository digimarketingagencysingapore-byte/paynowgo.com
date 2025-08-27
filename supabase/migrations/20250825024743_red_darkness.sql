/*
  # Fix terminal_id column and index creation

  This migration safely adds the terminal_id column to orders table and creates
  the necessary foreign key constraint and index. It's idempotent and can be
  run multiple times safely.

  1. Tables
    - Ensures terminals table exists
    - Adds terminal_id column to orders if missing
    - Creates foreign key constraint with error handling
    - Creates index only after column exists

  2. Safety
    - All operations are conditional and idempotent
    - Handles duplicate constraint errors gracefully
    - No data loss or destructive operations
*/

-- Ensure terminals table exists first
create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  device_key text unique not null,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- Safely add terminal_id column to orders table
do $$
begin
  -- Add terminal_id column if it doesn't exist
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    alter table public.orders add column terminal_id uuid null;
    raise notice 'Added terminal_id column to orders table';
  else
    raise notice 'terminal_id column already exists in orders table';
  end if;

  -- Add foreign key constraint (with error handling for duplicates)
  begin
    alter table public.orders
      add constraint orders_terminal_id_fkey
      foreign key (terminal_id) references public.terminals(id) on delete set null;
    raise notice 'Added foreign key constraint orders_terminal_id_fkey';
  exception when duplicate_object then
    raise notice 'Foreign key constraint orders_terminal_id_fkey already exists';
  end;

  -- Create index only if column exists
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    create index if not exists idx_orders_terminal
      on public.orders(terminal_id)
      where terminal_id is not null;
    raise notice 'Created index idx_orders_terminal';
  end if;
end$$;
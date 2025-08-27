-- Step 2A: Add terminal_id column + FK + Index (idempotent)

-- Terminals table (ensure it exists)
create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  device_key text unique not null,
  last_seen_at timestamptz,
  created_at timestamptz default now()
);

-- Add terminal_id column to orders + FK
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='orders' and column_name='terminal_id'
  ) then
    alter table public.orders add column terminal_id uuid null;
  end if;

  begin
    alter table public.orders
      add constraint orders_terminal_id_fkey
      foreign key (terminal_id) references public.terminals(id) on delete set null;
  exception when duplicate_object then
    null;
  end;
end$$;

-- Index only if column exists
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
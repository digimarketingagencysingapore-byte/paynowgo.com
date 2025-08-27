create schema if not exists paynowgo;
create extension if not exists "uuid-ossp";

-- Tenants & Devices
create table if not exists paynowgo.tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists paynowgo.devices (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  device_key text unique not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Categories
create table if not exists paynowgo.categories (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  name text not null,
  parent_id uuid references paynowgo.categories(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_categories_tenant_name_parent
  on paynowgo.categories(tenant_id, name, parent_id);

-- Items
create table if not exists paynowgo.items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  sku text,
  name text not null,
  price_cents int not null check (price_cents >= 0),
  currency char(3) not null default 'SGD',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists idx_items_tenant_sku
  on paynowgo.items(tenant_id, sku) where sku is not null;

-- Item-Categories (junction)
create table if not exists paynowgo.item_categories (
  item_id uuid not null references paynowgo.items(id) on delete cascade,
  category_id uuid not null references paynowgo.categories(id) on delete cascade,
  tenant_id uuid not null,
  primary key (item_id, category_id)
);

-- Customers
create table if not exists paynowgo.customers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  external_ref text,
  name text,
  email text,
  created_at timestamptz not null default now()
);

-- Orders
create table if not exists paynowgo.orders (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  device_id uuid references paynowgo.devices(id),
  customer_id uuid references paynowgo.customers(id),
  status text not null default 'pending',
  total_cents int not null default 0,
  currency char(3) not null default 'SGD',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order Items
create table if not exists paynowgo.order_items (
  order_id uuid not null references paynowgo.orders(id) on delete cascade,
  line_no int not null,
  item_id uuid not null references paynowgo.items(id),
  name text not null,
  qty int not null check (qty > 0),
  unit_price_cents int not null check (unit_price_cents >= 0),
  currency char(3) not null default 'SGD',
  total_cents int generated always as (qty * unit_price_cents) stored,
  tenant_id uuid not null,
  primary key (order_id, line_no)
);

-- Payments
create table if not exists paynowgo.payments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references paynowgo.tenants(id) on delete cascade,
  order_id uuid not null references paynowgo.orders(id) on delete cascade,
  method text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'SGD',
  status text not null default 'succeeded',
  reference text,
  created_at timestamptz not null default now()
);

-- updated_at helper
create or replace function paynowgo.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_items_touch before update on paynowgo.items
  for each row execute function paynowgo.touch_updated_at();

create trigger trg_orders_touch before update on paynowgo.orders
  for each row execute function paynowgo.touch_updated_at();

-- Set tenant_id redundancy in junctions
create or replace function paynowgo.set_item_categories_tenant()
returns trigger language plpgsql as $$
begin
  select tenant_id into new.tenant_id from paynowgo.items where id = new.item_id;
  return new;
end $$;
create trigger trg_item_categories_tenant before insert on paynowgo.item_categories
  for each row execute function paynowgo.set_item_categories_tenant();

create or replace function paynowgo.set_order_items_tenant()
returns trigger language plpgsql as $$
begin
  select tenant_id into new.tenant_id from paynowgo.orders where id = new.order_id;
  return new;
end $$;
create trigger trg_order_items_tenant before insert on paynowgo.order_items
  for each row execute function paynowgo.set_order_items_tenant();

-- IMPORTANT: refresh PostgREST schema cache
notify pgrst, 'reload schema';
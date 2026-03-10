create extension if not exists "pgcrypto";

create table if not exists app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id text null,
  action text not null,
  entity_type text null,
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text null,
  email text null,
  address text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  barcode text null,
  spec text null,
  image_url text null,
  cost_cents integer not null default 0,
  price_cents integer not null default 0,
  stock integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  status text not null default 'todo',
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_order_items (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  product_id uuid null references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price_cents integer not null,
  line_total_cents integer not null
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  amount_cents integer not null,
  method text null,
  note text null,
  created_at timestamptz not null default now()
);

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id),
  reason text null,
  method text null,
  total_cents integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  product_id uuid null references products(id),
  product_name text not null,
  quantity integer not null,
  unit_price_cents integer not null,
  line_total_cents integer not null
);


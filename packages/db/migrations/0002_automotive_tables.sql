-- suppliers
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text null,
  phone text null,
  address text null,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- wechat messages (防漏单核心)
create table if not exists wechat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  content text not null,
  source text not null default 'manual',
  status text not null default 'pending',
  sales_order_id uuid null references sales_orders(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- extend products
alter table products add column if not exists category text null;
alter table products add column if not exists oe_code text null;
alter table products add column if not exists unit text null default '个';

-- extend sales_orders
alter table sales_orders add column if not exists order_no text null;
alter table sales_orders add column if not exists source text null default 'manual';
alter table sales_orders add column if not exists paid_amount_cents integer not null default 0;
alter table sales_orders add column if not exists created_by text null;

-- extend sales_order_items
alter table sales_order_items add column if not exists supplier_id uuid null references suppliers(id);
alter table sales_order_items add column if not exists supplier_price_cents integer not null default 0;

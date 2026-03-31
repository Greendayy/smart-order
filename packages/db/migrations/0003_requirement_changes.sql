-- products: add supplier_name, purchase_price, note; migrate oe_code -> note
alter table products add column if not exists supplier_name text null;
alter table products add column if not exists purchase_price_cents integer not null default 0;
alter table products add column if not exists note text null;
-- migrate existing oe_code data to note
update products set note = oe_code where oe_code is not null and note is null;

-- sales_orders: add order_type, settlement_type
alter table sales_orders add column if not exists order_type text not null default 'sale';
alter table sales_orders add column if not exists settlement_type text not null default 'cash';

-- customers: add balance_cents
alter table customers add column if not exists balance_cents integer not null default 0;

-- sales_order_items: add note
alter table sales_order_items add column if not exists note text null;

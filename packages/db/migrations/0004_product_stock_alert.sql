-- Add per-product stock alert threshold
alter table products
  add column if not exists stock_alert integer not null default 10;

-- Add role and ban fields for RBAC (Better Auth admin plugin)
alter table "user"
  add column if not exists "role" text not null default 'sales',
  add column if not exists "banned" boolean not null default false,
  add column if not exists "banReason" text,
  add column if not exists "banExpires" timestamp;

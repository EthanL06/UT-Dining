create table if not exists public.admin_cache (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_cache enable row level security;

revoke all on table public.admin_cache from anon, authenticated;
grant all on table public.admin_cache to service_role;

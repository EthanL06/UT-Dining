create table if not exists public.dashboard_admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.dashboard_admins enable row level security;

revoke all on table public.dashboard_admins from anon, authenticated;
grant all on table public.dashboard_admins to service_role;

insert into public.dashboard_admins (email)
values ('ethanlanting@gmail.com')
on conflict (email) do nothing;

create or replace function public.is_dashboard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' -> 'providers', '[]'::jsonb) ? 'google'
    and exists (
      select 1
      from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as amr
      where amr ->> 'method' = 'oauth'
    )
    and exists (
      select 1
      from public.dashboard_admins as admin
      where admin.email = lower(auth.jwt() ->> 'email')
    );
$$;

revoke all on function public.is_dashboard_admin() from public;
grant execute on function public.is_dashboard_admin() to anon, authenticated, service_role;

create or replace function public.enforce_dashboard_admin_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.dashboard_admins as admin where admin.email = lower(new.email)
  ) then
    raise exception 'Sign-ups are limited to dashboard admins'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_dashboard_admin_signup() from public, anon, authenticated;

drop trigger if exists enforce_dashboard_admin_signup on auth.users;
create trigger enforce_dashboard_admin_signup
before insert on auth.users
for each row execute function public.enforce_dashboard_admin_signup();

do $$
declare
  policy record;
begin
  for policy in
    select tablename, policyname, cmd
    from pg_policies
    where schemaname = 'public'
      and cmd <> 'SELECT'
      and tablename not in ('user_devices', 'dashboard_admins')
  loop
    if policy.cmd = 'INSERT' then
      execute format(
        'alter policy %I on public.%I to authenticated with check (public.is_dashboard_admin())',
        policy.policyname,
        policy.tablename
      );
    elsif policy.cmd = 'DELETE' then
      execute format(
        'alter policy %I on public.%I to authenticated using (public.is_dashboard_admin())',
        policy.policyname,
        policy.tablename
      );
    else
      execute format(
        'alter policy %I on public.%I to authenticated using (public.is_dashboard_admin()) with check (public.is_dashboard_admin())',
        policy.policyname,
        policy.tablename
      );
    end if;
  end loop;
end;
$$;

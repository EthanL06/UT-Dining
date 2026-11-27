create or replace function public.admin_menu_freshness()
returns table (location_id uuid, location_name text, last_menu_write timestamptz, latest_menu_date date)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_dashboard_admin() then
    raise exception 'Only admins can read menu freshness'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    location.id,
    location.name,
    max(menu.updated_at),
    max(menu.date)
  from public.location as location
  left join public.menu as menu on menu.location_id = location.id
  where location.has_menus
  group by location.id, location.name, location.display_order
  order by location.display_order, location.name;
end;
$$;

revoke all on function public.admin_menu_freshness() from public, anon;
grant execute on function public.admin_menu_freshness() to authenticated, service_role;

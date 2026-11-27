create or replace function public.public_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select (timezone('America/Chicago', now()))::date as today
  ),
  days as (
    select day::date as date
    from bounds, generate_series(bounds.today - 13, bounds.today + 3, interval '1 day') as day
  ),
  menus as (
    select menu.date, array_agg(distinct menu.location_id) as location_ids
    from public.menu as menu, bounds
    where menu.date between bounds.today - 13 and bounds.today + 3
      and menu.location_id is not null
    group by menu.date
  )
  select jsonb_build_object(
    'checked_at', now(),
    'today', (select today from bounds),
    'latest_menu_date', (select max(menu.date) from public.menu as menu),
    'oldest_menu_date', (select min(menu.date) from public.menu as menu),
    'last_menu_write', (select max(menu.updated_at) from public.menu as menu),
    'days', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'date', days.date,
            'location_ids', coalesce(to_jsonb(menus.location_ids), '[]'::jsonb)
          )
          order by days.date
        ),
        '[]'::jsonb
      )
      from days
      left join menus on menus.date = days.date
    )
  );
$$;

revoke all on function public.public_status() from public;
grant execute on function public.public_status() to anon, authenticated, service_role;

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

create or replace function public.dashboard_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  today date := (timezone('America/Chicago', now()))::date;
  coverage_date date;
begin
  if not public.is_dashboard_admin() then
    raise exception 'Only dashboard admins can read the status'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(min(menu.date), today) into coverage_date
  from public.menu as menu
  where menu.date >= today;

  return jsonb_build_object(
    'checked_at', now(),
    'database_size_bytes', pg_catalog.pg_database_size(current_database()),
    'row_counts', jsonb_build_object(
      'location', (select count(*) from public.location),
      'menu', (select count(*) from public.menu),
      'menu_category', (select count(*) from public.menu_category),
      'food_item', (select count(*) from public.food_item),
      'nutrition', (select count(*) from public.nutrition),
      'allergens', (select count(*) from public.allergens),
      'user_devices', (select count(*) from public.user_devices),
      'notifications', (select count(*) from public.notifications)
    ),
    'menu_dates', jsonb_build_object(
      'oldest', (select min(menu.date) from public.menu as menu),
      'newest', (select max(menu.date) from public.menu as menu),
      'newest_updated_at', (select max(menu.updated_at) from public.menu as menu)
    ),
    'coverage', (
      select jsonb_build_object(
        'date', coverage_date,
        'items', count(*),
        'missing_nutrition', count(*) filter (
          where nutrition.id is null or coalesce(btrim(nutrition.calories), '') = ''
        ),
        'missing_ingredients', count(*) filter (
          where nutrition.id is null or coalesce(btrim(nutrition.ingredients), '') = ''
        ),
        'missing_allergens', count(*) filter (where allergens.id is null)
      )
      from public.food_item as item
      join public.menu_category as category on category.id = item.menu_category_id
      join public.menu as menu on menu.id = category.menu_id
      left join public.nutrition as nutrition on nutrition.id = item.nutrition_id
      left join public.allergens as allergens on allergens.id = item.allergens_id
      where menu.date = coverage_date
    ),
    'devices', (
      select jsonb_build_object(
        'total', count(*),
        'with_push_token', count(*) filter (where device.push_token is not null),
        'active_30_days', count(*) filter (where device.updated_at >= now() - interval '30 days')
      )
      from public.user_devices as device
    ),
    'notifications', jsonb_build_object(
      'pending', (
        select count(*) from public.notifications as notification where not notification.sent
      ),
      'next_scheduled_at', (
        select min(notification.scheduled_at)
        from public.notifications as notification
        where not notification.sent and notification.scheduled_at is not null
      ),
      'last_sent', (
        select to_jsonb(latest)
        from (
          select
            notification.title,
            notification.body,
            notification.type,
            coalesce(notification.scheduled_at, notification.created_at) as sent_at
          from public.notifications as notification
          where notification.sent
          order by coalesce(notification.scheduled_at, notification.created_at) desc
          limit 1
        ) as latest
      )
    )
  );
end;
$$;

revoke all on function public.dashboard_status() from public, anon;
grant execute on function public.dashboard_status() to authenticated, service_role;

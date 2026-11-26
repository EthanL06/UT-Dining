create table public.changelog (
  id uuid primary key default gen_random_uuid(),
  version text not null unique check (version ~ '^\d+\.\d+\.\d+$'),
  release_date date,
  summary text,
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  is_published boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.changelog enable row level security;

create policy "Enable read access for published entries"
on public.changelog
as permissive
for select
to public
using (is_published);

create policy "Enable ALL for authenticated users"
on public.changelog
as permissive
for all
to authenticated
using (true)
with check (true);

grant select on table public.changelog to anon;
grant all on table public.changelog to authenticated;
grant all on table public.changelog to service_role;

insert into public.changelog (version, release_date, summary, changes) values
(
  '1.3.0',
  null,
  'A faster, more accurate UT Dining.',
  '[
    {"icon": "zap", "title": "Instant launch", "description": "Menus you have already loaded show right away, even before a sync finishes."},
    {"icon": "arrow-up-down", "title": "Faster menu switching", "description": "Changing meals, dates and locations no longer has a delay."},
    {"icon": "refresh-cw", "title": "Smarter syncing", "description": "Only the menu days that changed are downloaded, and a failed sync keeps your saved menus."},
    {"icon": "shield-check", "title": "More accurate allergens and nutrition", "description": "Every recipe now keeps its full allergen list, and unknown nutrients are left blank instead of showing 0."},
    {"icon": "layout", "title": "Liquid Glass tab bar", "description": "The tab bar uses the new iOS look and follows the in-app dark mode setting."},
    {"icon": "sparkles", "title": "What''s New", "description": "See what changed after every update, or anytime from Settings."},
    {"icon": "wrench", "title": "Fixes", "description": "Food details match the selected date, hours stay current after a sync, food card swipes work again, and the map sheet updates when you tap another pin."}
  ]'::jsonb
),
(
  '1.2.4',
  null,
  null,
  '[
    {"icon": "rocket", "title": "Faster menu loading", "description": "Menus load with fewer database queries."}
  ]'::jsonb
),
(
  '1.2.3',
  '2025-08-21',
  null,
  '[
    {"icon": "wrench", "title": "Fixed a bug that kept food''s nutrition information from loading"}
  ]'::jsonb
),
(
  '1.2.2',
  '2025-08-19',
  null,
  '[
    {"icon": "moon", "title": "Refreshed dark mode", "description": "A cleaner color palette with better contrast and spacing for easier reading."},
    {"icon": "utensils", "title": "Decimal quantities in the Meal Planner", "description": "Enter fractional quantities like 0.5 servings for more accurate planning."},
    {"icon": "wrench", "title": "Performance improvements and bug fixes"}
  ]'::jsonb
),
(
  '1.2.0',
  '2025-08-03',
  'Our biggest update yet.',
  '[
    {"icon": "calendar", "title": "Past and future menus", "description": "Know what is being served before and after you go."},
    {"icon": "map", "title": "Interactive campus map", "description": "Quickly find what is nearby."},
    {"icon": "map-pin", "title": "50+ new locations", "description": "Food trucks, new restaurants, cafés and more."},
    {"icon": "bell", "title": "Push notifications", "description": "Get alerts about closures, hours and new menus."},
    {"icon": "wifi-off", "title": "Offline mode", "description": "Access menus and hours without a connection."},
    {"icon": "palette", "title": "Refreshed design", "description": "Sleeker, smoother and easier to navigate."},
    {"icon": "sparkles", "title": "New onboarding", "description": "Start exploring faster than ever."}
  ]'::jsonb
)
on conflict (version) do nothing;

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { toCentralTime } from '@ut-dining/core';
import {
  buildDay,
  type Dish,
  dayCsv,
  dayJson,
  dayPath,
  dishesCsv,
  exportLocation,
  jsonLines,
  type LocationRow,
  locationsCsv,
  type MenuRow,
  sortedDishes,
} from './export/build.ts';
import { log } from './log.ts';
import { createSupabase } from './supabase.ts';

const PAGE = 1000;
const DEFAULT_LOOKBACK_DAYS = 2;

const MENU_SELECT =
  'id, date, name, location(id, name), menu_category(id, title, food_item(id, name, link, nutrition!food_item_nutrition_id_fkey(*), allergens!food_item_allergens_id_fkey(*)))';

const LOCATION_SELECT =
  'id, name, colloquial_name, description, address, latitude, longitude, google_maps_link, apple_maps_link, image, has_menus, force_close, methods_of_payment, regular_service_hours, meal_times, display_order, location_type(name)';

const shiftDate = (date: string, days: number) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
};

const exportFrom = (value: string | undefined): string | null => {
  if (value === 'all') return null;
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (value) throw new Error(`EXPORT_FROM must be YYYY-MM-DD or "all", got ${value}`);
  return shiftDate(toCentralTime().date, -DEFAULT_LOOKBACK_DAYS);
};

type Supabase = ReturnType<typeof createSupabase>;

const listDates = async (supabase: Supabase, from: string | null): Promise<string[]> => {
  const dates = new Set<string>();
  for (let offset = 0; ; offset += PAGE) {
    let query = supabase.from('menu').select('date').order('date').order('id');
    if (from) query = query.gte('date', from);
    const { data, error } = await query.range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Could not list menu dates: ${error.message}`);
    for (const row of data) dates.add(row.date);
    if (data.length < PAGE) break;
  }
  return [...dates].sort();
};

const loadDay = async (supabase: Supabase, date: string): Promise<MenuRow[]> => {
  const { data, error } = await supabase
    .from('menu')
    .select(MENU_SELECT)
    .eq('date', date)
    .order('id')
    .returns<MenuRow[]>();
  if (error) throw new Error(`Could not read menus for ${date}: ${error.message}`);
  return data;
};

const loadLocations = async (supabase: Supabase): Promise<LocationRow[]> => {
  const { data, error } = await supabase
    .from('location')
    .select(LOCATION_SELECT)
    .order('display_order')
    .order('name')
    .returns<LocationRow[]>();
  if (error) throw new Error(`Could not read locations: ${error.message}`);
  return data;
};

const readDishes = async (dir: string): Promise<Map<string, Dish>> => {
  try {
    const dishes = JSON.parse(await readFile(join(dir, 'dishes.json'), 'utf8')) as Dish[];
    return new Map(dishes.map((dish) => [dish.id, dish]));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw error;
  }
};

const write = async (path: string, contents: string) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
};

const main = async () => {
  const started = performance.now();
  const outDir = process.env.EXPORT_DIR;
  if (!outDir) throw new Error('EXPORT_DIR is required');
  const dir = resolve(outDir);
  const from = exportFrom(process.env.EXPORT_FROM);
  const supabase = createSupabase();

  const dishes = await readDishes(dir);
  const before = dishes.size;
  const dates = await listDates(supabase, from);
  log.info(`Exporting ${dates.length} days${from ? ` from ${from}` : ''} to ${dir}`);

  let items = 0;
  for (const date of dates) {
    const day = buildDay(date, await loadDay(supabase, date), dishes);
    const count = day.menus.reduce(
      (sum, menu) => sum + menu.categories.reduce((n, category) => n + category.items.length, 0),
      0,
    );
    items += count;
    await write(join(dir, `${dayPath(date)}.json`), dayJson(day));
    await write(join(dir, `${dayPath(date)}.csv`), dayCsv(day));
    log.info(`  ${date}: ${day.menus.length} menus, ${count} items`);
  }

  const allDishes = sortedDishes(dishes);
  await write(join(dir, 'dishes.json'), jsonLines(allDishes));
  await write(join(dir, 'dishes.csv'), dishesCsv(allDishes));

  const locations = (await loadLocations(supabase)).map(exportLocation);
  await write(join(dir, 'locations.json'), `${JSON.stringify(locations, null, 2)}\n`);
  await write(join(dir, 'locations.csv'), locationsCsv(locations));

  log.info(
    `Exported ${items} menu items, ${allDishes.length} dishes (${allDishes.length - before} new) and ${locations.length} locations in ${((performance.now() - started) / 1000).toFixed(1)}s`,
  );
};

main().catch((error: unknown) => {
  log.error(error);
  process.exitCode = 1;
});

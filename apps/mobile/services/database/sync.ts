import {
  chunk,
  fetchAllPages,
  flattenMenuTree,
  getMenuDayVersions,
  type MenuDayVersions,
  planMenuDays,
} from '@ut-dining/core';
import type { SQLiteBindValue } from 'expo-sqlite';
import { getTodayInCentralTime } from '~/utils/date';
import { supabase } from '~/utils/supabase';
import * as schema from './schema';
import { allergens, food_item, location, menu, menu_category, nutrition } from './schema';
import type { DrizzleDB } from './types';

const MENU_TREE_SELECT =
  '*,menu_category(*,food_item(*,nutrition!food_item_nutrition_id_fkey(*),allergens!food_item_allergens_id_fkey(*)))';

const fetchSharedTables = async () => {
  const [locationResult, locationTypeResult, appInformationResult, notificationResult, typeResult] =
    await Promise.all([
      supabase.from('location').select('*'),
      supabase.from('location_type').select('*'),
      supabase.from('app_information').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('notification_types').select('*'),
    ]);

  for (const result of [
    locationResult,
    locationTypeResult,
    appInformationResult,
    notificationResult,
    typeResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    location: locationResult.data ?? [],
    location_type: locationTypeResult.data ?? [],
    app_information: appInformationResult.data ?? [],
    notifications: notificationResult.data ?? [],
    notification_types: typeResult.data ?? [],
  };
};

const fetchMenuVersions = async () => {
  const { data, error } = await fetchAllPages((from, to) =>
    supabase.from('menu').select('id,date,updated_at').order('id').range(from, to),
  );
  if (error) throw new Error(error.message);
  return getMenuDayVersions(data ?? []);
};

type TreeRow = Record<string, unknown> & { id: number };
type MenuTree = TreeRow & {
  menu_category:
    | (TreeRow & {
        food_item: (TreeRow & { nutrition: TreeRow | null; allergens: TreeRow | null })[] | null;
      })[]
    | null;
};

const fetchMenuDay = async (date: string) => {
  const { data, error } = await supabase.from('menu').select(MENU_TREE_SELECT).eq('date', date);
  if (error) throw new Error(error.message);
  return flattenMenuTree((data ?? []) as unknown as MenuTree[]);
};

// biome-ignore lint/suspicious/noExplicitAny: Drizzle table types are complex
type InsertGroup = [any, Record<string, unknown>[], number];

function* insertStatements(db: DrizzleDB, groups: InsertGroup[]) {
  for (const [table, rows, chunkSize] of groups) {
    for (const rowChunk of chunk(rows, chunkSize)) {
      yield db.insert(table).values(rowChunk).onConflictDoNothing().toSQL();
    }
  }
}

const runStatements = (db: DrizzleDB, statements: Iterable<{ sql: string; params: unknown[] }>) =>
  db.$client.withExclusiveTransactionAsync(async (tx) => {
    for (const { sql: statement, params } of statements) {
      await tx.runAsync(statement, params as SQLiteBindValue[]);
    }
  });

const DELETE_MENU_DAYS_SQL = (dates: string) => [
  `DELETE FROM nutrition WHERE id IN (SELECT nutrition_id FROM food_item WHERE menu_category_id IN (SELECT id FROM menu_category WHERE menu_id IN (SELECT id FROM menu WHERE date IN (${dates}))))`,
  `DELETE FROM allergens WHERE id IN (SELECT allergens_id FROM food_item WHERE menu_category_id IN (SELECT id FROM menu_category WHERE menu_id IN (SELECT id FROM menu WHERE date IN (${dates}))))`,
  `DELETE FROM food_item WHERE menu_category_id IN (SELECT id FROM menu_category WHERE menu_id IN (SELECT id FROM menu WHERE date IN (${dates})))`,
  `DELETE FROM menu_category WHERE menu_id IN (SELECT id FROM menu WHERE date IN (${dates}))`,
  `DELETE FROM menu WHERE date IN (${dates})`,
];

function* deleteMenuDaysStatements(dates: string[]) {
  const placeholders = dates.map(() => '?').join(',');
  for (const statement of DELETE_MENU_DAYS_SQL(placeholders)) {
    yield { sql: statement, params: dates };
  }
}

function* sharedTableStatements(
  db: DrizzleDB,
  shared: Awaited<ReturnType<typeof fetchSharedTables>>,
) {
  for (const table of [
    schema.notifications,
    schema.notification_types,
    location,
    schema.location_type,
    schema.app_information,
  ]) {
    yield db.delete(table).toSQL();
  }

  yield* insertStatements(db, [
    [schema.location_type, shared.location_type, 150],
    [location, shared.location, 45],
    [schema.app_information, shared.app_information, 150],
    [schema.notification_types, shared.notification_types, 200],
    [
      schema.notifications,
      shared.notifications.map((notification) => ({
        ...notification,
        sent_at: notification.scheduled_at || notification.created_at,
      })),
      150,
    ],
  ]);
}

function* menuDayStatements(db: DrizzleDB, date: string, rows: ReturnType<typeof flattenMenuTree>) {
  yield* deleteMenuDaysStatements([date]);
  yield* insertStatements(db, [
    [menu, rows.menu as Record<string, unknown>[], 150],
    [menu_category, rows.menu_category as Record<string, unknown>[], 200],
    [nutrition, rows.nutrition as Record<string, unknown>[], 60],
    [allergens, rows.allergens as Record<string, unknown>[], 60],
    [food_item, rows.food_item as Record<string, unknown>[], 150],
  ]);
}

interface MenuSyncOptions {
  force: boolean;
  syncedVersions: MenuDayVersions;
  onVersionsChange: (versions: MenuDayVersions) => void;
  onCacheChange: () => void | Promise<void>;
}

export const syncCacheWithSupabase = async (
  db: DrizzleDB,
  { force, syncedVersions, onVersionsChange, onCacheChange }: MenuSyncOptions,
) => {
  const [shared, remote] = await Promise.all([fetchSharedTables(), fetchMenuVersions()]);

  if (shared.location.length === 0) {
    throw new Error('Supabase returned no locations');
  }

  await runStatements(db, sharedTableStatements(db, shared));
  await onCacheChange();

  const cachedDates = (await db.selectDistinct({ date: menu.date }).from(menu)).map(
    (row) => row.date,
  );
  const plan = planMenuDays({
    remote,
    synced: syncedVersions,
    cachedDates,
    today: getTodayInCentralTime(),
    force,
  });

  let versions = syncedVersions;

  if (plan.remove.length > 0) {
    await runStatements(db, deleteMenuDaysStatements(plan.remove));
    versions = Object.fromEntries(
      Object.entries(versions).filter(([date]) => !plan.remove.includes(date)),
    );
    onVersionsChange(versions);
  }

  for (const date of plan.fetch) {
    const rows = await fetchMenuDay(date);
    await runStatements(db, menuDayStatements(db, date, rows));
    versions = { ...versions, [date]: remote[date] };
    onVersionsChange(versions);
    await onCacheChange();
  }
};

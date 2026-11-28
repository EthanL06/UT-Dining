import { and, asc, eq, or, type SQLWrapper, sql } from 'drizzle-orm';
import { useMemo } from 'react';
import type { DrizzleDB } from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { getTodayInCentralTime } from '~/utils/date';
import { containsPattern } from '~/utils/search';
import { useDatabase } from './useDatabase';

export const SEARCH_RESULT_LIMIT = 50;

const contains = (column: SQLWrapper, pattern: string) =>
  sql`${column} LIKE ${pattern} ESCAPE '\\'`;

const searchToday = (db: DrizzleDB, query: string) => {
  const today = getTodayInCentralTime();
  const pattern = containsPattern(query);

  const foods = db
    .select({
      id: schema.food_item.id,
      name: schema.food_item.name,
      calories: schema.nutrition.calories,
      category: schema.menu_category.title,
      menu: schema.menu.name,
      location: schema.location.name,
      locationColloquialName: schema.location.colloquial_name,
    })
    .from(schema.food_item)
    .innerJoin(schema.menu_category, eq(schema.food_item.menu_category_id, schema.menu_category.id))
    .innerJoin(schema.menu, eq(schema.menu_category.menu_id, schema.menu.id))
    .innerJoin(schema.location, eq(schema.menu.location_id, schema.location.id))
    .leftJoin(schema.nutrition, eq(schema.food_item.nutrition_id, schema.nutrition.id))
    .where(and(eq(schema.menu.date, today), contains(schema.food_item.name, pattern)))
    .orderBy(asc(schema.food_item.name))
    .limit(SEARCH_RESULT_LIMIT)
    .all();

  const places = db
    .select()
    .from(schema.location)
    .where(
      or(
        contains(schema.location.name, pattern),
        contains(schema.location.colloquial_name, pattern),
      ),
    )
    .orderBy(asc(schema.location.display_order))
    .all();

  return { foods, places, today };
};

export const useSearchToday = (query: string) => {
  const db = useDatabase();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  // biome-ignore lint/correctness/useExhaustiveDependencies: search again after a sync replaces the cache
  return useMemo(
    () => (query.length > 0 ? searchToday(db, query) : null),
    [db, query, lastSyncedAt],
  );
};

import { and, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import {
  clearFavorites,
  type FoodItem,
  todaysFavoriteMenuRows,
} from '~/services/database/database';
import * as schema from '~/services/database/schema';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import {
  type FoodContext,
  favoriteFoods,
  restoreFavorite,
  setFavoriteForFood,
  toggleFavoriteForFood,
} from '~/utils/foodActions';
import { useDatabase } from './useDatabase';

export const useFavoriteActions = () => {
  const db = useDatabase();
  return useMemo(
    () => ({
      toggle: (food: FoodItem, context: FoodContext) => toggleFavoriteForFood(db, food, context),
      set: (food: FoodItem, context: FoodContext, value: boolean) =>
        setFavoriteForFood(db, food, context, value),
      favoriteMany: (
        entries: Parameters<typeof favoriteFoods>[1],
        context: Parameters<typeof favoriteFoods>[2],
      ) => favoriteFoods(db, entries, context),
      restore: (row: schema.Favorite) => restoreFavorite(db, row),
      clearAll: () => clearFavorites(db),
    }),
    [db],
  );
};

export const useAllFavorites = () => {
  const db = useDatabase();
  return useLiveQuery(db.select().from(schema.favorites)).data;
};

export const useLocationFavorites = (location: string) => {
  const db = useDatabase();
  return useLiveQuery(
    db.select().from(schema.favorites).where(eq(schema.favorites.location_name, location)),
    [location],
  ).data;
};

export const useIsFavoriteSaved = (food: string, location: string) => {
  const db = useDatabase();
  const { data } = useLiveQuery(
    db
      .select({ id: schema.favorites.id })
      .from(schema.favorites)
      .where(and(eq(schema.favorites.name, food), eq(schema.favorites.location_name, location))),
    [food, location],
  );
  return data.length > 0;
};

export const useTodaysFavoriteMenuRows = (names: string[], date: string) => {
  const db = useDatabase();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a sync replaces today's menus
  return useMemo(() => todaysFavoriteMenuRows(db, names, date), [db, names, date, lastSyncedAt]);
};

import type { DrizzleDB, FoodItem } from '~/services/database/database';
import {
  countFavorites,
  isFavoriteItem,
  restoreFavoriteRow,
  setFavorite,
} from '~/services/database/database';
import type { Favorite } from '~/services/database/schema';
import { ratingService } from '~/services/rating/rating';
import { useFavoriteOverridesStore } from '~/store/useFavoriteOverridesStore';
import { mealPlanItemId, todayKey, useMealPlanStore } from '~/store/useMealPlanStore';
import { favoriteKey } from '~/utils/favoriteOverride';
import { haptics } from '~/utils/haptics';
import { log } from '~/utils/log';
import { favoritesTrigger } from '~/utils/ratingPrompt';

export type FoodContext = {
  location: string;
  menu: string;
  category: string;
  date?: string;
};

const toMealPlanItem = (food: FoodItem, context: FoodContext) => ({
  name: food.name as string,
  locationName: context.location,
  categoryName: context.category,
  menuName: context.menu,
  allergens: Object.fromEntries(
    Object.entries(food.allergens || {}).filter(([key]) => key !== 'id'),
  ) as Record<string, boolean>,
  nutrition: {
    calories: food.nutrition?.calories || '',
    protein: food.nutrition?.protein || '',
    total_carbohydrates: food.nutrition?.total_carbohydrates || '',
    total_fat: food.nutrition?.total_fat || '',
  },
});

export const toggleMealPlanForFood = (food: FoodItem, context: FoodContext) =>
  useMealPlanStore
    .getState()
    .toggleMealPlanItem(toMealPlanItem(food, context), context.date || todayKey());

export const addFoodsToMealPlan = (
  entries: { food: FoodItem; category: string }[],
  context: Omit<FoodContext, 'category'>,
) => {
  const store = useMealPlanStore.getState();
  const date = context.date || todayKey();
  const planned = new Set((store.plans[date] ?? []).map((item) => item.id));
  const added = entries
    .map(({ food, category }) => toMealPlanItem(food, { ...context, category }))
    .filter((item) => !planned.has(mealPlanItemId(item)));
  for (const item of added) {
    store.toggleMealPlanItem(item, date);
  }
  return added.length;
};

const SETTLE_MS = 1500;
const writes = new Map<string, Promise<unknown>>();

const queueFavoriteWrite = (
  key: string,
  value: boolean,
  run: () => Promise<unknown>,
  details: Record<string, string>,
) => {
  const overrides = useFavoriteOverridesStore.getState();
  const seq = overrides.begin(key, value);
  const write = (writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(run);
  writes.set(key, write);
  return write
    .then(() => {
      overrides.markWritten(key, seq);
      setTimeout(() => overrides.clear(key, seq), SETTLE_MS);
      return true;
    })
    .catch((error: unknown) => {
      overrides.clear(key, seq);
      haptics.error();
      log.error('favorite write failed', error, details);
      return false;
    })
    .finally(() => {
      if (writes.get(key) === write) writes.delete(key);
    });
};

export const setFavoriteForFood = (
  db: DrizzleDB,
  food: FoodItem,
  context: FoodContext,
  value: boolean,
) =>
  queueFavoriteWrite(
    favoriteKey(food.name as string, context.location),
    value,
    () => setFavorite(db, food, context.location, context.menu, context.category, value),
    { food: food.name as string, location: context.location },
  );

export const restoreFavorite = (db: DrizzleDB, row: Favorite) =>
  queueFavoriteWrite(
    favoriteKey(row.name, row.location_name),
    true,
    () => restoreFavoriteRow(db, row),
    { food: row.name, location: row.location_name },
  );

export const isFavoriteNow = (db: DrizzleDB, foodName: string, locationName: string) => {
  const override =
    useFavoriteOverridesStore.getState().overrides[favoriteKey(foodName, locationName)];
  return override ? override.value : isFavoriteItem(db, foodName, locationName);
};

export const favoriteFoods = async (
  db: DrizzleDB,
  entries: { food: FoodItem; category: string; isFavorite: boolean }[],
  context: Omit<FoodContext, 'category'>,
) => {
  const toAdd = entries.filter(
    (entry) => !entry.isFavorite && !isFavoriteNow(db, entry.food.name as string, context.location),
  );
  const added = await Promise.all(
    toAdd.map(({ food, category }) => setFavoriteForFood(db, food, { ...context, category }, true)),
  );
  if (added.some(Boolean)) askForRatingAfterFavorite(db);
  return toAdd.length;
};

const askForRatingAfterFavorite = (db: DrizzleDB) => {
  const trigger = favoritesTrigger(countFavorites(db));
  if (trigger) ratingService.requestAfterHappyMoment(trigger);
};

export const toggleFavoriteForFood = async (
  db: DrizzleDB,
  food: FoodItem,
  context: FoodContext,
) => {
  const value = !isFavoriteNow(db, food.name as string, context.location);
  const saved = await setFavoriteForFood(db, food, context, value);
  if (value && saved) askForRatingAfterFavorite(db);
  return value;
};

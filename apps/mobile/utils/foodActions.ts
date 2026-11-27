import type { DrizzleDB, FoodItem } from '~/services/database/database';
import { countFavorites, toggleFavorites } from '~/services/database/database';
import { ratingService } from '~/services/rating/rating';
import { mealPlanItemId, todayKey, useMealPlanStore } from '~/store/useMealPlanStore';
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

export const favoriteFoods = async (
  db: DrizzleDB,
  entries: { food: FoodItem; category: string; isFavorite: boolean }[],
  context: Omit<FoodContext, 'category'>,
) => {
  const toAdd = entries.filter((entry) => !entry.isFavorite);
  for (const { food, category } of toAdd) {
    await toggleFavorites(db, food, context.location, context.menu, category);
  }
  if (toAdd.length > 0) askForRatingAfterFavorite(db);
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
  const added = await toggleFavorites(db, food, context.location, context.menu, context.category);
  if (added) askForRatingAfterFavorite(db);
  return added;
};

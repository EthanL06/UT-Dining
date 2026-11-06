import { Notifier } from 'react-native-notifier';

import Alert from '~/components/Alert';
import type { DrizzleDB, FoodItem } from '~/services/database/database';
import { toggleFavorites } from '~/services/database/database';
import { useMealPlanStore } from '~/store/useMealPlanStore';

export type FoodContext = {
  location: string;
  menu: string;
  category: string;
};

const notify = (title: string, description: string) =>
  Notifier.showNotification({
    title,
    description,
    swipeEnabled: true,
    Component: Alert,
    duration: 3000,
    queueMode: 'immediate',
  });

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
  },
});

export const toggleMealPlanForFood = (food: FoodItem, context: FoodContext) => {
  const store = useMealPlanStore.getState();
  const wasInPlan = store.isMealPlanItem(food.name as string);
  store.toggleMealPlanItem(toMealPlanItem(food, context));
  notify(
    wasInPlan ? `${food.name} removed from today.` : `${food.name} saved for today!`,
    wasInPlan ? "You've updated your meal plan." : "Added to today's meal plan.",
  );
  return !wasInPlan;
};

export const addFoodsToMealPlan = (
  entries: { food: FoodItem; category: string }[],
  context: Omit<FoodContext, 'category'>,
) => {
  const store = useMealPlanStore.getState();
  const added = entries.filter(({ food }) => !store.isMealPlanItem(food.name as string));
  for (const { food, category } of added) {
    store.toggleMealPlanItem(toMealPlanItem(food, { ...context, category }));
  }
  if (added.length > 0) {
    notify(
      added.length === 1
        ? `${added[0].food.name} saved for today!`
        : `${added.length} items saved for today!`,
      "Added to today's meal plan.",
    );
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
  if (toAdd.length > 0) {
    notify(
      toAdd.length === 1 ? `${toAdd[0].food.name} added!` : `${toAdd.length} favorites added!`,
      'Added to Favorites.',
    );
  }
  return toAdd.length;
};

export const toggleFavoriteForFood = async (
  db: DrizzleDB,
  food: FoodItem,
  context: FoodContext,
) => {
  const isFavorite = await toggleFavorites(
    db,
    food,
    context.location,
    context.menu,
    context.category,
  );
  notify(
    isFavorite ? `${food.name} added!` : `${food.name} removed.`,
    isFavorite ? 'Added to Favorites.' : 'No longer in Favorites.',
  );
  return isFavorite;
};

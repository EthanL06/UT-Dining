import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ALLERGEN_EXCEPTIONS, NUTRITION_ORDER } from '~/data/AllergenInfo';
import {
  type DrizzleDB,
  type FoodItem,
  findServedFoodItem,
  getFavoriteItem,
  getFoodItem,
} from '~/services/database/database';
import type { Favorite } from '~/services/database/schema';
import { useDatabase } from './useDatabase';

const formatNutritionKey = (key: string) =>
  key
    .split('_')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');

export type FoodLookup = {
  location: string;
  menu: string;
  category: string;
  food: string;
  fromFavorites: boolean;
  date?: string;
};

export type FoodStatus = 'loading' | 'ready' | 'missing' | 'error';

const loadFoodItem = async (db: DrizzleDB, lookup: FoodLookup): Promise<FoodItem | null> => {
  const { location, menu, category, food, fromFavorites, date } = lookup;
  if (!location || !menu || !category || !food) return null;
  if (!fromFavorites) return getFoodItem(db, location, menu, category, food, date);

  const favorite = getFavoriteItem(db, food, location);
  if (!favorite) return null;
  return (
    (await findServedFoodItem(db, location, food, menu, category, date)) ??
    convertFavoriteItemToFoodItem(favorite)
  );
};

export function useFoodData(lookup: FoodLookup) {
  const db = useDatabase();
  const query = useQuery({
    queryKey: ['foodItem', lookup],
    queryFn: () => loadFoodItem(db, lookup),
    retry: false,
  });

  const foodItem = query.data ?? null;
  const status: FoodStatus = query.isPending
    ? 'loading'
    : query.isError
      ? 'error'
      : foodItem
        ? 'ready'
        : 'missing';

  const nutritionData = useMemo(() => {
    if (!foodItem?.nutrition) return [];

    return Object.entries(foodItem.nutrition)
      .map(([key, value]) => ({
        key: formatNutritionKey(key),
        value,
      }))
      .filter(({ key }) => key !== 'Ingredients' && key !== 'Id')
      .sort((a, b) => NUTRITION_ORDER.indexOf(a.key) - NUTRITION_ORDER.indexOf(b.key));
  }, [foodItem]);

  const allergenData = useMemo(() => {
    const allergenEntries = foodItem?.allergens ? Object.entries(foodItem.allergens) : [];
    const hasAllergens = allergenEntries.some(([, value]) => value);

    const allergenList = allergenEntries
      .filter(([key]) => !ALLERGEN_EXCEPTIONS.has(key) && key !== 'id')
      .filter(([, value]) => value)
      .map(([key]) => {
        return key
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      });

    const dietaryList = allergenEntries
      .filter(([key]) => ALLERGEN_EXCEPTIONS.has(key) && key !== 'id')
      .filter(([, value]) => value)
      .map(([key]) => key.charAt(0).toUpperCase() + key.slice(1).toLowerCase());

    return { hasAllergens, allergenList, dietaryList };
  }, [foodItem]);

  return {
    status,
    foodItem,
    nutritionData,
    ...allergenData,
  };
}

const convertFavoriteItemToFoodItem = (favoriteItem: Favorite): FoodItem => {
  return {
    name: favoriteItem.name,
    link: favoriteItem.link,
    allergens: {
      id: 0,
      beef: favoriteItem.beef,
      egg: favoriteItem.egg,
      fish: favoriteItem.fish,
      peanuts: favoriteItem.peanuts,
      pork: favoriteItem.pork,
      shellfish: favoriteItem.shellfish,
      soy: favoriteItem.soy,
      tree_nuts: favoriteItem.tree_nuts,
      wheat: favoriteItem.wheat,
      sesame_seeds: favoriteItem.sesame_seeds,
      halal: favoriteItem.halal,
      vegan: favoriteItem.vegan,
      vegetarian: favoriteItem.vegetarian,
      milk: favoriteItem.milk,
    },
    nutrition: {
      id: 0,
      serving_size: favoriteItem.serving_size,
      calories: favoriteItem.calories,
      protein: favoriteItem.protein,
      total_fat: favoriteItem.total_fat,
      total_carbohydrates: favoriteItem.total_carbohydrates,
      dietary_fiber: favoriteItem.dietary_fiber,
      total_sugars: favoriteItem.total_sugars,
      saturated_fat: favoriteItem.saturated_fat,
      calcium: favoriteItem.calcium,
      iron: favoriteItem.iron,
      potassium: favoriteItem.potassium,
      sodium: favoriteItem.sodium,
      cholesterol: favoriteItem.cholesterol,
      vitamin_d: favoriteItem.vitamin_d,
      ingredients: favoriteItem.ingredients,
      trans_fat: favoriteItem.trans_fat,
    },
  } as FoodItem;
};

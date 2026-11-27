import type { FoodItem } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import type { FiltersState } from '~/store/useFiltersStore';

type Allergens = NonNullable<FoodItem['allergens']>;

const hasFlag = (item: FoodItem, key: string) =>
  !!item.allergens && key in item.allergens && !!item.allergens[key as keyof Allergens];

const matchesDiet = (item: FoodItem, diet: string) =>
  hasFlag(item, diet) || (diet === 'vegetarian' && hasFlag(item, 'vegan'));

export const foodFilter = (
  filters: FiltersState['filters'],
  favorites: schema.Favorite[],
  isInMealPlan: (item: FoodItem, categoryId: string) => boolean = () => false,
): ((item: FoodItem, categoryId?: string) => boolean) => {
  const favoriteNames = filters.favorites
    ? new Set((favorites ?? []).map((favorite) => favorite.name))
    : null;
  const avoid = Object.keys(filters.allergens).filter((key) => filters.allergens[key]);
  const onlyWith = Object.keys(filters.dietary).filter((key) => filters.dietary[key]);
  return (item, categoryId = '') => {
    if (favoriteNames && !favoriteNames.has(item.name ?? '')) return false;
    if (filters.mealPlan && !isInMealPlan(item, categoryId)) return false;
    if (avoid.some((key) => hasFlag(item, key))) return false;
    return onlyWith.every((diet) => matchesDiet(item, diet));
  };
};

export const filterFoodItems = (
  foodItems: FoodItem[],
  filters: FiltersState['filters'],
  favorites: schema.Favorite[],
  isInMealPlan: (item: FoodItem) => boolean = () => false,
) => {
  const passes = foodFilter(filters, favorites, isInMealPlan);
  return foodItems.filter((item) => passes(item));
};

export const hasActiveFilters = (filters: FiltersState['filters']) =>
  filters.favorites ||
  filters.mealPlan ||
  Object.values(filters.allergens).some(Boolean) ||
  Object.values(filters.dietary).some(Boolean);

import type { FoodItem } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import type { FiltersState } from '~/store/useFiltersStore';

const hasFlag = (item: FoodItem, key: string) =>
  !!item.allergens && key in item.allergens && !!item.allergens[key as keyof typeof item.allergens];

const matchesDiet = (item: FoodItem, diet: string) =>
  hasFlag(item, diet) || (diet === 'vegetarian' && hasFlag(item, 'vegan'));

export const filterFoodItems = (
  foodItems: FoodItem[],
  filters: FiltersState['filters'],
  favorites: schema.Favorite[],
  isInMealPlan: (item: FoodItem) => boolean = () => false,
) => {
  return foodItems.filter((item) => {
    if (filters.favorites && !favorites?.some((fav) => fav.name === item.name)) {
      return false;
    }

    if (filters.mealPlan && !isInMealPlan(item)) {
      return false;
    }

    const allergenFilters = Object.entries(filters.allergens).filter(([_, value]) => value);
    if (allergenFilters.length > 0) {
      for (const [allergen] of allergenFilters) {
        if (
          item.allergens &&
          allergen in item.allergens &&
          item.allergens[allergen as keyof typeof item.allergens]
        ) {
          return false;
        }
      }
    }

    const dietaryFilters = Object.entries(filters.dietary).filter(([_, value]) => value);
    if (dietaryFilters.length > 0) {
      for (const [diet] of dietaryFilters) {
        if (!matchesDiet(item, diet)) {
          return false;
        }
      }
    }

    return true;
  });
};

export const hasActiveFilters = (filters: FiltersState['filters']) =>
  filters.favorites ||
  filters.mealPlan ||
  Object.values(filters.allergens).some(Boolean) ||
  Object.values(filters.dietary).some(Boolean);

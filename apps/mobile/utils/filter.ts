import type { FoodItem } from '~/services/database/database';
import type * as schema from '~/services/database/schema';
import type { FiltersState } from '~/store/useFiltersStore';

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
        if (
          !item.allergens ||
          !(diet in item.allergens) ||
          !item.allergens[diet as keyof typeof item.allergens]
        ) {
          return false;
        }
      }
    }

    return true;
  });
};

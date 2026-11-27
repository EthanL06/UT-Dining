import type { RowPosition } from '~/components/FoodComponent';
import type * as schema from '~/services/database/schema';
import type { FoodItem, MenuCategory } from '~/services/database/types';
import type { FiltersState } from '~/store/useFiltersStore';
import { filterFoodItems, hasActiveFilters } from './filter';

export type HeaderRow = { type: 'category_header'; id: string; title: string; isExpanded: boolean };
export type FoodRow = {
  type: 'food_item';
  id: string;
  categoryId: string;
  data: FoodItem;
  position: RowPosition;
};
export type MenuRow = HeaderRow | FoodRow;

export type MenuSource = {
  id: string;
  title: string;
  foods: { id: string; data: FoodItem }[];
}[];

export type RowCache = Map<string, MenuRow>;

export const toMenuSource = (categories: readonly MenuCategory[]): MenuSource =>
  categories.map((category) => {
    const id = `${category.category_title}`;
    return {
      id,
      title: category.category_title ?? '',
      foods: category.food_items.map((data, index) => ({
        id: `${id}-${data.name}-${index}`,
        data,
      })),
    };
  });

const positionAt = (index: number, count: number): RowPosition => {
  if (count === 1) return 'single';
  if (index === 0) return 'first';
  return index === count - 1 ? 'last' : 'middle';
};

const cached = <T extends MenuRow>(cache: RowCache, key: string, make: () => T): T => {
  const existing = cache.get(key);
  if (existing) return existing as T;
  const row = make();
  cache.set(key, row);
  return row;
};

export const buildMenuRows = (
  source: MenuSource,
  {
    collapsed,
    matches,
  }: {
    collapsed: ReadonlySet<string>;
    matches?: (food: FoodItem, categoryId: string) => boolean;
  },
  cache: RowCache,
): MenuRow[] => {
  const rows: MenuRow[] = [];
  for (const category of source) {
    const foods = matches
      ? category.foods.filter((food) => matches(food.data, category.id))
      : category.foods;
    if (matches && foods.length === 0) continue;
    const isExpanded = !collapsed.has(category.id);
    rows.push(
      cached(cache, `h|${category.id}|${isExpanded}`, () => ({
        type: 'category_header',
        id: category.id,
        title: category.title,
        isExpanded,
      })),
    );
    if (!isExpanded) continue;
    foods.forEach((food, index) => {
      const position = positionAt(index, foods.length);
      rows.push(
        cached(cache, `f|${food.id}|${position}`, () => ({
          type: 'food_item',
          id: food.id,
          categoryId: category.id,
          data: food.data,
          position,
        })),
      );
    });
  }
  return rows;
};

export const foodMatcher = ({
  query,
  filters,
  favorites,
  isInMealPlan,
}: {
  query: string;
  filters: FiltersState['filters'];
  favorites: schema.Favorite[];
  isInMealPlan: (food: FoodItem, categoryId: string) => boolean;
}): ((food: FoodItem, categoryId: string) => boolean) | undefined => {
  const needle = query.trim().toLowerCase();
  const filtering = hasActiveFilters(filters);
  if (!needle && !filtering) return undefined;
  return (food, categoryId) => {
    if (needle && !(food.name ?? '').toLowerCase().includes(needle)) return false;
    if (!filtering) return true;
    return (
      filterFoodItems([food], filters, favorites, (item) => isInMealPlan(item, categoryId)).length >
      0
    );
  };
};

export interface MenuVersionRow {
  id: number;
  date: string;
  updated_at: string | null;
}

export type MenuDayVersions = Record<string, string>;

export const getMenuDayVersions = (rows: readonly MenuVersionRow[]): MenuDayVersions => {
  const byDate = new Map<string, string[]>();
  for (const row of rows) {
    byDate.set(row.date, [...(byDate.get(row.date) ?? []), `${row.id}:${row.updated_at}`]);
  }
  return Object.fromEntries([...byDate].map(([date, parts]) => [date, parts.sort().join('|')]));
};

export interface MenuDayPlanInput {
  remote: MenuDayVersions;
  synced: MenuDayVersions;
  cachedDates: readonly string[];
  today: string;
  force: boolean;
}

export interface MenuDayPlan {
  fetch: string[];
  remove: string[];
}

const dayPriority = (date: string, today: string) => (date === today ? 0 : date > today ? 1 : 2);

export const planMenuDays = ({
  remote,
  synced,
  cachedDates,
  today,
  force,
}: MenuDayPlanInput): MenuDayPlan => {
  const cached = new Set(cachedDates);
  const fetch = Object.keys(remote)
    .filter((date) => force || !cached.has(date) || remote[date] !== synced[date])
    .sort((a, b) => {
      const priority = dayPriority(a, today) - dayPriority(b, today);
      if (priority !== 0) return priority;
      return dayPriority(a, today) === 2 ? b.localeCompare(a) : a.localeCompare(b);
    });
  const remove = [...new Set([...cachedDates, ...Object.keys(synced)])].filter(
    (date) => !(date in remote),
  );
  return { fetch, remove };
};

interface NestedFoodItem<Nutrition, Allergens> {
  nutrition: Nutrition | null;
  allergens: Allergens | null;
}

interface NestedCategory<Food> {
  food_item: Food[] | null;
}

interface NestedMenu<Category> {
  menu_category: Category[] | null;
}

export const flattenMenuTree = <
  Nutrition extends { id: number },
  Allergens extends { id: number },
  Food extends NestedFoodItem<Nutrition, Allergens>,
  Category extends NestedCategory<Food>,
  Menu extends NestedMenu<Category>,
>(
  menus: readonly Menu[],
) => {
  const menuRows: Omit<Menu, 'menu_category'>[] = [];
  const categoryRows: Omit<Category, 'food_item'>[] = [];
  const foodRows: Omit<Food, 'nutrition' | 'allergens'>[] = [];
  const nutritionRows = new Map<number, Nutrition>();
  const allergenRows = new Map<number, Allergens>();

  for (const { menu_category, ...menu } of menus) {
    menuRows.push(menu);
    for (const { food_item, ...category } of menu_category ?? []) {
      categoryRows.push(category);
      for (const { nutrition, allergens, ...food } of food_item ?? []) {
        foodRows.push(food);
        if (nutrition) nutritionRows.set(nutrition.id, nutrition);
        if (allergens) allergenRows.set(allergens.id, allergens);
      }
    }
  }

  return {
    menu: menuRows,
    menu_category: categoryRows,
    food_item: foodRows,
    nutrition: [...nutritionRows.values()],
    allergens: [...allergenRows.values()],
  };
};

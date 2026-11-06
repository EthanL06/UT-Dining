import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES = join(import.meta.dirname, '../../apps/mobile/e2e/fixtures');

const FLAG_KEYS = [
  'beef',
  'egg',
  'fish',
  'milk',
  'peanuts',
  'pork',
  'shellfish',
  'soy',
  'tree_nuts',
  'wheat',
  'sesame_seeds',
  'vegan',
  'vegetarian',
  'halal',
] as const;

type FlagKey = (typeof FLAG_KEYS)[number];

type FixtureFood = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  allergens: Partial<Record<FlagKey, boolean>>;
  meals?: string[];
  dayOffsets?: number[];
};

type MenuFixture = {
  locationName: string;
  dayOffsets: number[];
  meals: string[];
  categories: { name: string; foods: FixtureFood[] }[];
};

type Row = Record<string, unknown>;

export type LocationDay = {
  locationName: string;
  date: string;
  menus: {
    type: string;
    menuCategories: {
      categoryName: string;
      foods: {
        name: string;
        link: string;
        nutrition: Record<string, string>;
        allergens: Record<FlagKey, boolean>;
      }[];
    }[];
  }[];
};

const readJson = <T>(file: string): T => JSON.parse(readFileSync(join(FIXTURES, file), 'utf8'));

export const todayInCentral = (now = new Date()): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

const addDays = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const nutritionOf = (food: FixtureFood) => ({
  servingSize: '1 each',
  calories: food.calories,
  totalFat: '9g',
  saturatedFat: '2g',
  transFat: '0g',
  cholesterol: '15mg',
  sodium: '420mg',
  totalCarbohydrates: food.carbs,
  dietaryFiber: '4g',
  totalSugars: '6g',
  protein: food.protein,
  vitaminD: '0mcg',
  calcium: '80mg',
  iron: '2mg',
  potassium: '300mg',
  ingredients: 'Fixture ingredients for Maestro tests',
});

const allergensOf = (food: FixtureFood) =>
  Object.fromEntries(FLAG_KEYS.map((key) => [key, food.allergens[key] ?? false])) as Record<
    FlagKey,
    boolean
  >;

export const buildMenuDays = (today = todayInCentral()): LocationDay[] => {
  const fixture = readJson<MenuFixture>('menus.json');
  return fixture.dayOffsets.map((offset) => ({
    locationName: fixture.locationName,
    date: addDays(today, offset),
    menus: fixture.meals.map((meal) => ({
      type: meal,
      menuCategories: fixture.categories.map((category) => ({
        categoryName: category.name,
        foods: category.foods
          .filter((food) => !food.meals || food.meals.includes(meal))
          .filter((food) => !food.dayOffsets || food.dayOffsets.includes(offset))
          .map((food) => ({
            name: food.name,
            link: '',
            nutrition: nutritionOf(food),
            allergens: allergensOf(food),
          })),
      })),
    })),
  }));
};

const toSnakeCase = (key: string) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

export const buildRestTables = (today = todayInCentral()): Record<string, Row[]> => {
  const base = readJson<Record<string, Row[]>>('base.json');
  const tables: Record<string, Row[]> = {
    ...base,
    menu: [],
    menu_category: [],
    food_item: [],
    nutrition: [],
    allergens: [],
  };
  const updatedAt = new Date().toISOString();
  let menuId = 0;
  let categoryId = 0;
  let foodId = 0;

  for (const day of buildMenuDays(today)) {
    const location = base.location.find((row) => row.name === day.locationName);
    if (!location) throw new Error(`${day.locationName} is not in base.json`);
    for (const menu of day.menus) {
      menuId += 1;
      tables.menu.push({
        id: menuId,
        name: menu.type,
        location_id: location.id,
        date: day.date,
        updated_at: updatedAt,
      });
      for (const category of menu.menuCategories) {
        categoryId += 1;
        tables.menu_category.push({
          id: categoryId,
          menu_id: menuId,
          title: category.categoryName,
        });
        for (const food of category.foods) {
          foodId += 1;
          tables.food_item.push({
            id: foodId,
            menu_category_id: categoryId,
            nutrition_id: foodId,
            allergens_id: foodId,
            name: food.name,
            link: food.link,
          });
          tables.nutrition.push({
            id: foodId,
            food_item_id: foodId,
            ...Object.fromEntries(
              Object.entries(food.nutrition).map(([key, value]) => [toSnakeCase(key), value]),
            ),
          });
          tables.allergens.push({ id: foodId, food_item_id: foodId, ...food.allergens });
        }
      }
    }
  }

  return tables;
};

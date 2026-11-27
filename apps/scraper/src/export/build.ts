import { createHash } from 'node:crypto';
import type { Json } from '@ut-dining/supabase';

export const NUTRIENTS = [
  'serving_size',
  'calories',
  'total_fat',
  'saturated_fat',
  'trans_fat',
  'cholesterol',
  'sodium',
  'total_carbohydrates',
  'dietary_fiber',
  'total_sugars',
  'protein',
  'vitamin_d',
  'calcium',
  'iron',
  'potassium',
  'ingredients',
] as const;

export const ALLERGENS = [
  'beef',
  'egg',
  'fish',
  'milk',
  'peanuts',
  'pork',
  'sesame_seeds',
  'shellfish',
  'soy',
  'tree_nuts',
  'wheat',
  'vegan',
  'vegetarian',
  'halal',
] as const;

type Nutrient = (typeof NUTRIENTS)[number];
type Allergen = (typeof ALLERGENS)[number];

export type NutritionValues = Record<Nutrient, string | null>;
export type AllergenValues = Record<Allergen, boolean | null>;

export interface FoodItemRow {
  id: number;
  name: string | null;
  link: string | null;
  nutrition: Partial<Record<Nutrient, string | null>> | null;
  allergens: Partial<Record<Allergen, boolean | null>> | null;
}

export interface MenuRow {
  id: number;
  date: string;
  name: string | null;
  location: { id: string; name: string | null } | null;
  menu_category: { id: number; title: string | null; food_item: FoodItemRow[] }[];
}

export interface Dish {
  id: string;
  name: string;
  recipe: string | null;
  nutrition: NutritionValues | null;
  allergens: AllergenValues | null;
  first_seen: string;
  last_seen: string;
}

export interface DayMenu {
  location: string;
  location_id: string;
  meal: string;
  categories: { name: string; items: { dish_id: string; name: string }[] }[];
}

export interface DayFile {
  date: string;
  menus: DayMenu[];
}

export interface LocationRow {
  id: string;
  name: string | null;
  colloquial_name: string | null;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string;
  apple_maps_link: string;
  image: string | null;
  has_menus: boolean | null;
  force_close: boolean;
  methods_of_payment: string[];
  regular_service_hours: Json;
  meal_times: Json[];
  display_order: number;
  location_type: { name: string } | null;
}

export interface ExportedLocation {
  id: string;
  name: string;
  colloquial_name: string | null;
  type: string | null;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  apple_maps_link: string | null;
  image: string | null;
  has_menus: boolean;
  temporarily_closed: boolean;
  methods_of_payment: string[];
  regular_service_hours: Json;
  meal_times: Json[];
}

const MEAL_ORDER = ['Breakfast', 'Brunch', 'Lunch', 'Dinner'];

const mealRank = (meal: string) => {
  const index = MEAL_ORDER.indexOf(meal);
  return index === -1 ? MEAL_ORDER.length : index;
};

export const recipeOf = (link: string | null): string | null => {
  if (!link) return null;
  try {
    return new URL(link).searchParams.get('RecNumAndPort');
  } catch {
    return null;
  }
};

const pick = <K extends string, V>(
  keys: readonly K[],
  source: Partial<Record<K, V | null>> | null,
): Record<K, V | null> | null => {
  if (!source) return null;
  return Object.fromEntries(keys.map((key) => [key, source[key] ?? null])) as Record<K, V | null>;
};

export const dishOf = (item: FoodItemRow, date: string): Dish => {
  const name = (item.name ?? '').trim();
  const recipe = recipeOf(item.link);
  const nutrition = pick(NUTRIENTS, item.nutrition);
  const allergens = pick(ALLERGENS, item.allergens);
  const id = createHash('sha256')
    .update(JSON.stringify([name, recipe, nutrition, allergens]))
    .digest('hex')
    .slice(0, 12);
  return { id, name, recipe, nutrition, allergens, first_seen: date, last_seen: date };
};

export const mergeDish = (dishes: Map<string, Dish>, dish: Dish) => {
  const existing = dishes.get(dish.id);
  if (!existing) {
    dishes.set(dish.id, dish);
    return;
  }
  if (dish.first_seen < existing.first_seen) existing.first_seen = dish.first_seen;
  if (dish.last_seen > existing.last_seen) existing.last_seen = dish.last_seen;
};

export const buildDay = (date: string, rows: MenuRow[], dishes: Map<string, Dish>): DayFile => {
  const menus = rows
    .filter((row) => row.location)
    .map((row) => ({
      location: row.location?.name ?? '',
      location_id: row.location?.id ?? '',
      meal: row.name ?? '',
      menuId: row.id,
      categories: [...row.menu_category]
        .sort((a, b) => a.id - b.id)
        .map((category) => ({
          name: category.title ?? '',
          items: [...category.food_item]
            .sort((a, b) => a.id - b.id)
            .map((item) => {
              const dish = dishOf(item, date);
              mergeDish(dishes, dish);
              return { dish_id: dish.id, name: dish.name };
            }),
        })),
    }))
    .sort(
      (a, b) =>
        a.location.localeCompare(b.location) ||
        mealRank(a.meal) - mealRank(b.meal) ||
        a.meal.localeCompare(b.meal) ||
        a.menuId - b.menuId,
    )
    .map(({ menuId: _, ...menu }) => menu);
  return { date, menus };
};

const mapsLink = (link: string) => (link.startsWith('http') ? link : null);

export const exportLocation = (row: LocationRow): ExportedLocation => ({
  id: row.id,
  name: row.name ?? '',
  colloquial_name: row.colloquial_name,
  type: row.location_type?.name ?? null,
  description: row.description,
  address: row.address,
  latitude: row.latitude,
  longitude: row.longitude,
  google_maps_link: mapsLink(row.google_maps_link),
  apple_maps_link: mapsLink(row.apple_maps_link),
  image: row.image,
  has_menus: row.has_menus ?? false,
  temporarily_closed: row.force_close,
  methods_of_payment: row.methods_of_payment,
  regular_service_hours: row.regular_service_hours,
  meal_times: row.meal_times,
});

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'object'
        ? JSON.stringify(value)
        : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (header: string[], rows: unknown[][]): string =>
  `${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;

export const jsonLines = (values: unknown[]): string =>
  values.length === 0
    ? '[]\n'
    : `[\n${values.map((value) => JSON.stringify(value)).join(',\n')}\n]\n`;

export const dayCsv = (day: DayFile): string =>
  toCsv(
    ['date', 'location', 'location_id', 'meal', 'category', 'dish_id', 'dish_name'],
    day.menus.flatMap((menu) =>
      menu.categories.flatMap((category) =>
        category.items.map((item) => [
          day.date,
          menu.location,
          menu.location_id,
          menu.meal,
          category.name,
          item.dish_id,
          item.name,
        ]),
      ),
    ),
  );

export const dayJson = (day: DayFile): string => `${JSON.stringify(day, null, 2)}\n`;

export const sortedDishes = (dishes: Map<string, Dish>): Dish[] =>
  [...dishes.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

export const dishesCsv = (dishes: Dish[]): string =>
  toCsv(
    ['dish_id', 'name', 'recipe', 'first_seen', 'last_seen', ...NUTRIENTS, ...ALLERGENS],
    dishes.map((dish) => [
      dish.id,
      dish.name,
      dish.recipe,
      dish.first_seen,
      dish.last_seen,
      ...NUTRIENTS.map((key) => dish.nutrition?.[key] ?? null),
      ...ALLERGENS.map((key) => dish.allergens?.[key] ?? null),
    ]),
  );

export const locationsCsv = (locations: ExportedLocation[]): string =>
  toCsv(
    [
      'id',
      'name',
      'colloquial_name',
      'type',
      'address',
      'latitude',
      'longitude',
      'has_menus',
      'temporarily_closed',
      'methods_of_payment',
      'regular_service_hours',
      'meal_times',
      'google_maps_link',
      'apple_maps_link',
      'image',
      'description',
    ],
    locations.map((location) => [
      location.id,
      location.name,
      location.colloquial_name,
      location.type,
      location.address,
      location.latitude,
      location.longitude,
      location.has_menus,
      location.temporarily_closed,
      location.methods_of_payment.join(';'),
      location.regular_service_hours,
      location.meal_times,
      location.google_maps_link,
      location.apple_maps_link,
      location.image,
      location.description,
    ]),
  );

export const dayPath = (date: string) => `menus/${date.slice(0, 4)}/${date}`;

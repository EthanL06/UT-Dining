export const ALLERGEN_KEYS = [
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
] as const;

export const DIETARY_KEYS = ['vegan', 'vegetarian', 'halal'] as const;

export type AllergenKey = (typeof ALLERGEN_KEYS)[number];
export type DietaryKey = (typeof DIETARY_KEYS)[number];
export type FlagKey = AllergenKey | DietaryKey;
export type Allergens = Record<FlagKey, boolean>;

export interface Nutrition {
  servingSize: string;
  calories: number | null;
  totalFat: string | null;
  saturatedFat: string | null;
  transFat: string | null;
  cholesterol: string | null;
  sodium: string | null;
  totalCarbohydrates: string | null;
  dietaryFiber: string | null;
  totalSugars: string | null;
  protein: string | null;
  vitaminD: string | null;
  calcium: string | null;
  iron: string | null;
  potassium: string | null;
  ingredients?: string;
}

export interface Label {
  nutrition: Nutrition;
  allergens: Set<AllergenKey>;
  unrecognized: string[];
}

export interface MenuRow {
  name: string;
  link: string;
  recipe: string;
  icons: Set<FlagKey>;
}

export interface MenuPage {
  type: string;
  categories: { categoryName: string; rows: MenuRow[] }[];
}

export interface Food {
  name: string;
  link: string;
  allergens: Allergens;
  nutrition: Nutrition;
}

export interface Menu {
  type: string;
  menuCategories: { categoryName: string; foods: Food[] }[];
}

export interface LocationDay {
  locationName: string;
  date: string;
  menus: Menu[];
}

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
  calories: number;
  totalFat: string;
  saturatedFat: string;
  transFat: string;
  cholesterol: string;
  sodium: string;
  totalCarbohydrates: string;
  dietaryFiber: string;
  totalSugars: string;
  protein: string;
  vitaminD: string;
  calcium: string;
  iron: string;
  potassium: string;
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

import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type * as schema from './schema';

export type DrizzleDB = ExpoSQLiteDatabase<typeof schema> & {
  $client: SQLiteDatabase;
};

export interface Location extends schema.Location {
  location_name: schema.Location['name'];
  type: schema.LocationType['name'];
  menus: Menu[];
}

export interface Menu {
  menu_name: schema.Menu['name'];
  menu_categories: MenuCategory[];
}

export interface MenuCategory {
  category_title: schema.MenuCategory['title'];
  food_items: FoodItem[];
}

export interface FoodItem {
  name: schema.FoodItem['name'];
  link: schema.FoodItem['link'];
  allergens?: schema.Allergens;
  nutrition?: schema.Nutrition;
}

import { and, count, eq, inArray } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import type { FoodItem } from './types';

const favoriteMatch = (foodName: string, locationName: string) =>
  and(eq(schema.favorites.name, foodName), eq(schema.favorites.location_name, locationName));

export const isFavoriteItem = (
  db: ExpoSQLiteDatabase<typeof schema>,
  foodName: string,
  locationName: string,
) => {
  const favorite = db
    .select()
    .from(schema.favorites)
    .where(favoriteMatch(foodName, locationName))
    .get();

  return favorite !== null && favorite !== undefined;
};

export const getFavoriteItem = (
  db: ExpoSQLiteDatabase<typeof schema>,
  foodName: string,
  locationName: string,
) => {
  return db.select().from(schema.favorites).where(favoriteMatch(foodName, locationName)).get();
};

export const setFavorite = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  foodItem: FoodItem,
  locationName: string,
  menuName: string,
  categoryName: string,
  value: boolean,
) => {
  if (!value) {
    await db
      .delete(schema.favorites)
      .where(favoriteMatch(foodItem.name as string, locationName))
      .execute();

    return false;
  }

  if (isFavoriteItem(db, foodItem.name as string, locationName)) return true;

  const nutrition =
    (foodItem.nutrition?.id
      ? db
          .select()
          .from(schema.nutrition)
          .where(eq(schema.nutrition.id, foodItem.nutrition.id))
          .get()
      : undefined) ?? foodItem.nutrition;

  const allergens =
    (foodItem.allergens?.id
      ? db
          .select()
          .from(schema.allergens)
          .where(eq(schema.allergens.id, foodItem.allergens.id))
          .get()
      : undefined) ?? foodItem.allergens;

  await db
    .insert(schema.favorites)
    .values({
      name: foodItem.name as string,
      location_name: locationName,
      menu_name: menuName,
      category_name: categoryName,
      date_added: new Date().toISOString(),
      link: foodItem.link,

      serving_size: nutrition?.serving_size,
      calories: nutrition?.calories,
      total_fat: nutrition?.total_fat,
      saturated_fat: nutrition?.saturated_fat,
      trans_fat: nutrition?.trans_fat,
      cholesterol: nutrition?.cholesterol,
      sodium: nutrition?.sodium,
      total_carbohydrates: nutrition?.total_carbohydrates,
      dietary_fiber: nutrition?.dietary_fiber,
      total_sugars: nutrition?.total_sugars,
      protein: nutrition?.protein,
      vitamin_d: nutrition?.vitamin_d,
      calcium: nutrition?.calcium,
      iron: nutrition?.iron,
      potassium: nutrition?.potassium,
      ingredients: nutrition?.ingredients,

      beef: allergens?.beef,
      egg: allergens?.egg,
      fish: allergens?.fish,
      peanuts: allergens?.peanuts,
      pork: allergens?.pork,
      shellfish: allergens?.shellfish,
      soy: allergens?.soy,
      tree_nuts: allergens?.tree_nuts,
      wheat: allergens?.wheat,
      sesame_seeds: allergens?.sesame_seeds,
      vegan: allergens?.vegan,
      vegetarian: allergens?.vegetarian,
      halal: allergens?.halal,
      milk: allergens?.milk,
    })
    .execute();

  return true;
};

export const restoreFavoriteRow = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  row: schema.Favorite,
) => {
  if (isFavoriteItem(db, row.name, row.location_name)) return true;
  await db.insert(schema.favorites).values(row).execute();
  return true;
};

export const countFavorites = (db: ExpoSQLiteDatabase<typeof schema>) =>
  db.select({ value: count() }).from(schema.favorites).get()?.value ?? 0;

export const clearFavorites = async (db: ExpoSQLiteDatabase<typeof schema>) => {
  await db.delete(schema.favorites).execute();
};

export const todaysFavoriteMenuRows = (
  db: ExpoSQLiteDatabase<typeof schema>,
  names: string[],
  date: string,
) =>
  names.length === 0
    ? []
    : db
        .select({
          name: schema.food_item.name,
          location: schema.location.name,
          menu: schema.menu.name,
        })
        .from(schema.food_item)
        .innerJoin(
          schema.menu_category,
          eq(schema.food_item.menu_category_id, schema.menu_category.id),
        )
        .innerJoin(schema.menu, eq(schema.menu_category.menu_id, schema.menu.id))
        .innerJoin(schema.location, eq(schema.menu.location_id, schema.location.id))
        .where(and(eq(schema.menu.date, date), inArray(schema.food_item.name, names)))
        .all();

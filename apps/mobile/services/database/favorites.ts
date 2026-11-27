import { and, eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import type { FoodItem } from './types';

export const getFavorites = async (db: ExpoSQLiteDatabase<typeof schema>) => {
  const data = await db.select().from(schema.favorites).execute();

  return data;
};

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

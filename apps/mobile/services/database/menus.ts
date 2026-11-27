import { and, eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { getTodayInCentralTime } from '~/utils/date';
import { log } from '~/utils/log';
import * as schema from './schema';
import type { FoodItem, Location, Menu } from './types';

export const getLocationMenuNames = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  date?: string,
) => {
  const targetDate = date || getTodayInCentralTime();

  const data = await db
    .select({ menu: schema.menu })
    .from(schema.location)
    .leftJoin(schema.menu, eq(schema.menu.location_id, schema.location.id))
    .where(sql`${schema.location.name} = ${locationName} AND ${schema.menu.date} = ${targetDate}`)
    .execute();

  return data.map((row) => row.menu?.name).filter((name) => name !== undefined);
};

export const getLocationMenuData = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  menuName: string,
  date?: string,
) => {
  try {
    const targetDate = date || getTodayInCentralTime();

    const data = await db
      .select({
        location_id: schema.location.id,
        location_name: schema.location.name,
        location_colloquial_name: schema.location.colloquial_name,
        location_description: schema.location.description,
        location_address: schema.location.address,
        location_regular_service_hours: schema.location.regular_service_hours,
        location_methods_of_payment: schema.location.methods_of_payment,
        location_meal_times: schema.location.meal_times,
        location_google_maps_link: schema.location.google_maps_link,
        location_apple_maps_link: schema.location.apple_maps_link,
        location_image: schema.location.image,
        location_force_close: schema.location.force_close,
        location_created_at: schema.location.created_at,
        location_updated_at: schema.location.updated_at,
        location_type_id: schema.location.type_id,
        location_has_menus: schema.location.has_menus,
        location_display_order: schema.location.display_order,
        location_latitude: schema.location.latitude,
        location_longitude: schema.location.longitude,
        menu_id: schema.menu.id,
        menu_name: schema.menu.name,
        category_id: schema.menu_category.id,
        category_title: schema.menu_category.title,
        food_id: schema.food_item.id,
        food_name: schema.food_item.name,
        food_link: schema.food_item.link,
        type: schema.location_type.name,
        allergens: {
          id: schema.allergens.id,
          beef: schema.allergens.beef,
          egg: schema.allergens.egg,
          fish: schema.allergens.fish,
          peanuts: schema.allergens.peanuts,
          pork: schema.allergens.pork,
          shellfish: schema.allergens.shellfish,
          soy: schema.allergens.soy,
          tree_nuts: schema.allergens.tree_nuts,
          wheat: schema.allergens.wheat,
          sesame_seeds: schema.allergens.sesame_seeds,
          vegan: schema.allergens.vegan,
          vegetarian: schema.allergens.vegetarian,
          halal: schema.allergens.halal,
          milk: schema.allergens.milk,
        },
        nutrition: {
          id: schema.nutrition.id,
          calories: schema.nutrition.calories,
          total_fat: schema.nutrition.total_fat,
          total_carbohydrates: schema.nutrition.total_carbohydrates,
          protein: schema.nutrition.protein,
        },
      })
      .from(schema.location)
      .leftJoin(schema.menu, eq(schema.menu.location_id, schema.location.id))
      .leftJoin(schema.menu_category, eq(schema.menu_category.menu_id, schema.menu.id))
      .leftJoin(schema.food_item, eq(schema.food_item.menu_category_id, schema.menu_category.id))
      .leftJoin(schema.allergens, eq(schema.allergens.id, schema.food_item.allergens_id))
      .leftJoin(schema.nutrition, eq(schema.nutrition.id, schema.food_item.nutrition_id))
      .leftJoin(schema.location_type, eq(schema.location_type.id, schema.location.type_id))
      .where(
        sql`${schema.location.name} = ${locationName} AND ${schema.menu.name} = ${menuName} AND ${schema.menu.date} = ${targetDate}`,
      )
      .execute();

    const structuredData: Location = {
      location_name: locationName,
      menus: [],
      type: data[0]?.type || '',
      id: data[0]?.location_id || '',
      name: data[0]?.location_name || null,
      colloquial_name: data[0]?.location_colloquial_name || null,
      description: data[0]?.location_description || '',
      address: data[0]?.location_address || '',
      type_id: data[0]?.location_type_id || '',
      created_at: data[0]?.location_created_at || null,
      updated_at: data[0]?.location_updated_at || null,
      regular_service_hours: data[0]?.location_regular_service_hours || undefined,
      methods_of_payment: data[0]?.location_methods_of_payment || undefined,
      meal_times: data[0]?.location_meal_times || undefined,
      google_maps_link: data[0]?.location_google_maps_link || '',
      apple_maps_link: data[0]?.location_apple_maps_link || '',
      image: data[0]?.location_image || null,
      force_close: data[0]?.location_force_close || false,
      has_menus: data[0]?.location_has_menus || false,
      display_order: data[0]?.location_display_order || 1000,
      latitude: data[0]?.location_latitude || null,
      longitude: data[0]?.location_longitude || null,
    };

    const menuEntry: Menu = {
      menu_name: menuName,
      menu_categories: [],
    };
    structuredData.menus.push(menuEntry);

    const categoryMap = new Map<string, FoodItem[]>();

    for (const row of data) {
      if (!row.category_title) continue;

      if (!categoryMap.has(row.category_title)) {
        categoryMap.set(row.category_title, []);
      }

      if (row.food_name) {
        const foodItems = categoryMap.get(row.category_title);

        if (!foodItems) {
          throw new Error(`Food items array not found for category: ${row.category_title}`);
        }

        const existingItem = foodItems.find((item) => item.name === row.food_name);
        if (!existingItem) {
          foodItems.push({
            name: row.food_name,
            link: row.food_link,
            allergens: row.allergens as unknown as schema.Allergens,
            nutrition: row.nutrition as unknown as schema.Nutrition,
          });
        }
      }
    }

    for (const [categoryTitle, foodItems] of categoryMap.entries()) {
      menuEntry.menu_categories.push({
        category_title: categoryTitle,
        food_items: foodItems,
      });
    }

    return structuredData;
  } catch (e) {
    log.warn('Error fetching location menu data', { error: e });
    try {
      const locationOnly = await db
        .select({
          location_id: schema.location.id,
          location_name: schema.location.name,
          location_colloquial_name: schema.location.colloquial_name,
          location_description: schema.location.description,
          location_address: schema.location.address,
          location_regular_service_hours: schema.location.regular_service_hours,
          location_methods_of_payment: schema.location.methods_of_payment,
          location_meal_times: schema.location.meal_times,
          location_google_maps_link: schema.location.google_maps_link,
          location_apple_maps_link: schema.location.apple_maps_link,
          location_image: schema.location.image,
          location_force_close: schema.location.force_close,
          location_created_at: schema.location.created_at,
          location_updated_at: schema.location.updated_at,
          location_type_id: schema.location.type_id,
          location_has_menus: schema.location.has_menus,
          location_display_order: schema.location.display_order,
          location_type: schema.location_type.name,
        })
        .from(schema.location)
        .leftJoin(schema.location_type, eq(schema.location.type_id, schema.location_type.id))
        .where(eq(schema.location.name, locationName))
        .execute();

      if (!locationOnly || locationOnly.length === 0) {
        return null;
      }

      return {
        location_name: locationName,
        menus: [],
        type: locationOnly[0].location_type || '',
        id: locationOnly[0]?.location_id || '',
        name: locationOnly[0]?.location_name || null,
        colloquial_name: locationOnly[0]?.location_colloquial_name || null,
        description: locationOnly[0]?.location_description || '',
        address: locationOnly[0]?.location_address || '',
        type_id: locationOnly[0]?.location_type_id || '',
        created_at: locationOnly[0]?.location_created_at || null,
        updated_at: locationOnly[0]?.location_updated_at || null,
        regular_service_hours: locationOnly[0]?.location_regular_service_hours || undefined,
        methods_of_payment: locationOnly[0]?.location_methods_of_payment || undefined,
        meal_times: locationOnly[0]?.location_meal_times || undefined,
        google_maps_link: locationOnly[0]?.location_google_maps_link || '',
        apple_maps_link: locationOnly[0]?.location_apple_maps_link || '',
        image: locationOnly[0]?.location_image || null,
        force_close: locationOnly[0]?.location_force_close || false,
        has_menus: locationOnly[0]?.location_has_menus || false,
        display_order: locationOnly[0]?.location_display_order || 1000,
      };
    } catch (fallbackError) {
      log.warn('Error fetching fallback location info', { error: fallbackError });
      return null;
    }
  }
};

const FOOD_ITEM_DETAIL_SELECT = {
  food_name: schema.food_item.name,
  food_link: schema.food_item.link,
  allergens: {
    id: schema.allergens.id,
    beef: schema.allergens.beef,
    egg: schema.allergens.egg,
    fish: schema.allergens.fish,
    peanuts: schema.allergens.peanuts,
    pork: schema.allergens.pork,
    shellfish: schema.allergens.shellfish,
    soy: schema.allergens.soy,
    tree_nuts: schema.allergens.tree_nuts,
    wheat: schema.allergens.wheat,
    sesame_seeds: schema.allergens.sesame_seeds,
    vegan: schema.allergens.vegan,
    vegetarian: schema.allergens.vegetarian,
    halal: schema.allergens.halal,
    milk: schema.allergens.milk,
  },
  nutrition: {
    id: schema.nutrition.id,
    serving_size: schema.nutrition.serving_size,
    calories: schema.nutrition.calories,
    total_fat: schema.nutrition.total_fat,
    saturated_fat: schema.nutrition.saturated_fat,
    trans_fat: schema.nutrition.trans_fat,
    cholesterol: schema.nutrition.cholesterol,
    sodium: schema.nutrition.sodium,
    total_carbohydrates: schema.nutrition.total_carbohydrates,
    dietary_fiber: schema.nutrition.dietary_fiber,
    total_sugars: schema.nutrition.total_sugars,
    protein: schema.nutrition.protein,
    vitamin_d: schema.nutrition.vitamin_d,
    calcium: schema.nutrition.calcium,
    iron: schema.nutrition.iron,
    potassium: schema.nutrition.potassium,
    ingredients: schema.nutrition.ingredients,
  },
};

const findFoodItems = (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  itemName: string,
  date: string,
) =>
  db
    .select({
      ...FOOD_ITEM_DETAIL_SELECT,
      menu_name: schema.menu.name,
      category_title: schema.menu_category.title,
    })
    .from(schema.location)
    .innerJoin(schema.menu, eq(schema.menu.location_id, schema.location.id))
    .innerJoin(schema.menu_category, eq(schema.menu_category.menu_id, schema.menu.id))
    .innerJoin(schema.food_item, eq(schema.food_item.menu_category_id, schema.menu_category.id))
    .leftJoin(schema.allergens, eq(schema.allergens.id, schema.food_item.allergens_id))
    .leftJoin(schema.nutrition, eq(schema.nutrition.id, schema.food_item.nutrition_id))
    .where(
      and(
        eq(schema.location.name, locationName),
        eq(schema.menu.date, date),
        eq(schema.food_item.name, itemName),
      ),
    )
    .execute();

const toFoodItem = (row: Awaited<ReturnType<typeof findFoodItems>>[number]): FoodItem => ({
  name: row.food_name,
  link: row.food_link,
  allergens: (row.allergens ?? undefined) as schema.Allergens | undefined,
  nutrition: (row.nutrition ?? undefined) as schema.Nutrition | undefined,
});

export const getFoodItem = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  menuName: string,
  categoryName: string,
  itemName: string,
  date?: string,
): Promise<FoodItem | null> => {
  const rows = await findFoodItems(db, locationName, itemName, date || getTodayInCentralTime());
  const match = rows.find(
    (row) => row.menu_name === menuName && row.category_title === categoryName,
  );
  return match ? toFoodItem(match) : null;
};

export const findServedFoodItem = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
  itemName: string,
  menuName: string,
  categoryName: string,
  date?: string,
): Promise<FoodItem | null> => {
  const rows = await findFoodItems(db, locationName, itemName, date || getTodayInCentralTime());
  const score = (row: (typeof rows)[number]) =>
    (row.menu_name === menuName ? 2 : 0) + (row.category_title === categoryName ? 1 : 0);
  const best = rows.reduce<(typeof rows)[number] | undefined>(
    (current, row) => (!current || score(row) > score(current) ? row : current),
    undefined,
  );
  return best ? toFoodItem(best) : null;
};

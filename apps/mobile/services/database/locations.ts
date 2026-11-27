import { eq, sql } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { log } from '~/utils/log';
import * as schema from './schema';
import type { Location, Menu } from './types';

export const getLocationDetails = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
): Promise<schema.LocationWithType | null> => {
  try {
    const locationData = await db
      .select({
        id: schema.location.id,
        name: schema.location.name,
        created_at: schema.location.created_at,
        updated_at: schema.location.updated_at,
        colloquial_name: schema.location.colloquial_name,
        description: schema.location.description,
        address: schema.location.address,
        type_id: schema.location.type_id,
        regular_service_hours: schema.location.regular_service_hours,
        methods_of_payment: schema.location.methods_of_payment,
        meal_times: schema.location.meal_times,
        google_maps_link: schema.location.google_maps_link,
        apple_maps_link: schema.location.apple_maps_link,
        image: schema.location.image,
        force_close: schema.location.force_close,
        has_menus: schema.location.has_menus,
        type: schema.location_type.name,
        display_order: schema.location.display_order,
        latitude: schema.location.latitude,
        longitude: schema.location.longitude,
      })
      .from(schema.location)
      .leftJoin(schema.location_type, eq(schema.location.type_id, schema.location_type.id))
      .where(eq(schema.location.name, locationName))
      .execute();

    if (locationData.length === 0) {
      return null;
    }

    return {
      ...locationData[0],
      type: locationData[0].type || '',
      display_order: locationData[0].display_order || 1000,
    };
  } catch (error) {
    log.error('Error fetching location details', error);
    return null;
  }
};

export const getCompleteLocationData = async (
  db: ExpoSQLiteDatabase<typeof schema>,
  locationName: string,
): Promise<Location | null> => {
  try {
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
      .where(eq(schema.location.name, locationName))
      .execute();

    if (data.length === 0) {
      return null;
    }

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

    const menuMap = new Map<string, Menu>();

    for (const row of data) {
      if (!row.menu_name) continue;

      if (!menuMap.has(row.menu_name)) {
        menuMap.set(row.menu_name, {
          menu_name: row.menu_name,
          menu_categories: [],
        });
      }

      const menu = menuMap.get(row.menu_name);

      if (!menu) continue;

      if (row.category_title) {
        let category = menu.menu_categories.find(
          (cat) => cat.category_title === row.category_title,
        );

        if (!category) {
          category = {
            category_title: row.category_title,
            food_items: [],
          };
          menu.menu_categories.push(category);
        }

        if (row.food_name) {
          const existingItem = category.food_items.find((item) => item.name === row.food_name);
          if (!existingItem) {
            category.food_items.push({
              name: row.food_name,
              link: row.food_link,
              allergens: row.allergens as unknown as schema.Allergens,
              nutrition: row.nutrition as unknown as schema.Nutrition,
            });
          }
        }
      }
    }

    structuredData.menus = Array.from(menuMap.values());

    return structuredData;
  } catch (e) {
    log.error('Error fetching complete location data', e);
    return null;
  }
};

export const getAppInformation = async (
  db: ExpoSQLiteDatabase<typeof schema>,
): Promise<schema.AppInformation | null> => {
  try {
    const data = await db.select().from(schema.app_information).execute();

    if (data.length === 0) {
      return null;
    }

    return data[0] as schema.AppInformation;
  } catch (error) {
    log.error('Error fetching app information', error);
    return null;
  }
};

export const getAllLocationsWithCoordinates = async (
  db: ExpoSQLiteDatabase<typeof schema>,
): Promise<
  (Pick<
    schema.Location,
    'id' | 'name' | 'description' | 'latitude' | 'longitude' | 'address' | 'has_menus'
  > & {
    type: string;
  })[]
> => {
  const data = await db
    .select({
      id: schema.location.id,
      name: schema.location.name,
      description: schema.location.description,
      latitude: schema.location.latitude,
      longitude: schema.location.longitude,
      address: schema.location.address,
      type: schema.location_type.name,
      has_menus: schema.location.has_menus,
    })
    .from(schema.location)
    .where(
      sql`${schema.location.latitude} IS NOT NULL AND ${schema.location.longitude} IS NOT NULL`,
    )
    .leftJoin(schema.location_type, eq(schema.location.type_id, schema.location_type.id))
    .execute();

  return data.map((item) => ({
    ...item,
    type: item.type || 'Unknown',
  }));
};

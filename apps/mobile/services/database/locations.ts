import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { log } from '~/utils/log';
import * as schema from './schema';

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

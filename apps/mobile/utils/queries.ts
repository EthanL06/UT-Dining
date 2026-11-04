import { eq } from 'drizzle-orm';
import { type DrizzleDB, insertDataIntoSQLiteDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import * as schema from '../services/database/schema';

const SYNC_DEADLINE_MS = 120_000;

let syncInFlight: Promise<boolean> | null = null;

const rejectAfter = (ms: number) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Sync timed out')), ms);
  });

export const readCachedMenuData = async (db: DrizzleDB) => {
  const [data, types] = await Promise.all([
    db
      .select()
      .from(schema.location)
      .innerJoin(schema.location_type, eq(schema.location.type_id, schema.location_type.id))
      .orderBy(schema.location.display_order)
      .then((joinedData) =>
        joinedData.map(({ location, location_type }) => ({
          ...location,
          type: location_type.name,
        })),
      ),
    db.select().from(schema.location_type).orderBy(schema.location_type.display_order),
  ]);

  return { locations: data, locationTypes: types };
};

export const syncMenuData = (db: DrizzleDB, { force = false } = {}): Promise<boolean> => {
  if (syncInFlight) return syncInFlight;

  const syncStore = useDataSyncStore.getState();
  if (!force && !syncStore.shouldSyncWithSupabase()) return Promise.resolve(false);

  syncInFlight = Promise.race([insertDataIntoSQLiteDB(db), rejectAfter(SYNC_DEADLINE_MS)])
    .then(() => {
      syncStore.setLastSupabaseQueryTime(Date.now());
      return true;
    })
    .finally(() => {
      syncInFlight = null;
    });

  return syncInFlight;
};

import { decideSync, singleFlight } from '@ut-dining/core';
import { eq } from 'drizzle-orm';
import { type DrizzleDB, insertDataIntoSQLiteDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import * as schema from '../services/database/schema';

const SYNC_DEADLINE_MS = 120_000;

const rejectAfter = (ms: number) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Sync timed out')), ms);
  });

const syncWithSupabase = singleFlight(async (db: DrizzleDB) => {
  await Promise.race([insertDataIntoSQLiteDB(db), rejectAfter(SYNC_DEADLINE_MS)]);
  useDataSyncStore.getState().setLastSupabaseQueryTime(Date.now());
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

export const syncMenuData = async (db: DrizzleDB, { force = false } = {}): Promise<boolean> => {
  const decision = decideSync({
    isConnected: true,
    force,
    lastSyncedAt: useDataSyncStore.getState().lastSupabaseQueryTime,
    now: Date.now(),
  });
  if (decision.kind !== 'sync') return false;

  await syncWithSupabase(db);
  return true;
};

import { decideSync, SYNC_INTERVAL_MS, singleFlight } from '@ut-dining/core';
import { eq } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import * as Network from 'expo-network';
import { insertDataIntoSQLiteDB } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import * as schema from '../services/database/schema';

const HOUR_IN_MS = 60 * 60 * 1000;

const syncWithSupabase = singleFlight(async (drizzleDb: ExpoSQLiteDatabase<typeof schema>) => {
  await insertDataIntoSQLiteDB(drizzleDb);
  useDataSyncStore.getState().setLastSupabaseQueryTime(Date.now());
});

const readCachedLocations = async (drizzleDb: ExpoSQLiteDatabase<typeof schema>) => {
  const [data, types] = await Promise.all([
    drizzleDb
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
    drizzleDb.select().from(schema.location_type).orderBy(schema.location_type.display_order),
  ]);

  return { locations: data, locationTypes: types };
};

export const fetchMenuData = async (
  drizzleDb: ExpoSQLiteDatabase<typeof schema>,
  forceSync: boolean = false,
) => {
  const networkState = await Network.getNetworkStateAsync();
  const decision = decideSync({
    isConnected: Boolean(networkState.isConnected),
    force: forceSync,
    lastSyncedAt: useDataSyncStore.getState().lastSupabaseQueryTime,
    now: Date.now(),
  });

  switch (decision.kind) {
    case 'offline':
      console.log('📱 Offline mode: using cached SQLite data');
      break;
    case 'fresh': {
      const hoursSinceSync = decision.ageMs / HOUR_IN_MS;
      const hoursUntilNextSync = (SYNC_INTERVAL_MS - decision.ageMs) / HOUR_IN_MS;
      console.log(
        `ℹ️  Using cached data (${hoursSinceSync.toFixed(1)}h since last sync, next sync in ${hoursUntilNextSync.toFixed(1)}h)`,
      );
      break;
    }
    case 'sync':
      try {
        console.log(`🔄 Syncing with Supabase (${decision.reason})...`);
        await syncWithSupabase(drizzleDb);
        console.log('✅ Successfully synced with Supabase and updated sync timestamp');
      } catch (error) {
        if (forceSync) throw error;
        console.warn('Failed to sync with remote database, using cached data:', error);
      }
      break;
  }

  return readCachedLocations(drizzleDb);
};

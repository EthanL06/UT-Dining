import { decideSync, singleFlight } from '@ut-dining/core';
import { eq } from 'drizzle-orm';
import { type DrizzleDB, syncCacheWithSupabase } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import * as schema from '../services/database/schema';

const MENU_CHECK_INTERVAL_MS = 15 * 60 * 1000;
const SYNC_DEADLINE_MS = 120_000;

interface SyncRun {
  force: boolean;
  onCacheChange: () => void | Promise<void>;
}

const rejectAfter = (ms: number) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Sync timed out')), ms);
  });

const syncWithSupabase = singleFlight(async (db: DrizzleDB, { force, onCacheChange }: SyncRun) => {
  const store = useDataSyncStore.getState();
  await Promise.race([
    syncCacheWithSupabase(db, {
      force,
      syncedVersions: store.menuDayVersions,
      onVersionsChange: store.setMenuDayVersions,
      onCacheChange,
    }),
    rejectAfter(SYNC_DEADLINE_MS),
  ]);
  store.setLastSupabaseQueryTime(Date.now());
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

export const syncMenuData = async (
  db: DrizzleDB,
  { force = false, onCacheChange = () => {} }: Partial<SyncRun> = {},
): Promise<boolean> => {
  const decision = decideSync({
    isConnected: true,
    force,
    lastSyncedAt: useDataSyncStore.getState().lastSupabaseQueryTime,
    now: Date.now(),
    intervalMs: MENU_CHECK_INTERVAL_MS,
  });
  if (decision.kind !== 'sync') return false;

  await syncWithSupabase(db, { force, onCacheChange });
  return true;
};

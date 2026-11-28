import { useMemo } from 'react';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { getLocationIdsWithMenus } from '~/utils/locationStatus';
import { useDatabase } from './useDatabase';

export const useLocationIdsWithMenus = (date: string) => {
  const db = useDatabase();
  const lastSyncedAt = useDataSyncStore((state) => state.lastSupabaseQueryTime);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a sync replaces the cached menus
  return useMemo(() => getLocationIdsWithMenus(db, date), [db, date, lastSyncedAt]);
};

import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DrizzleDB } from '~/services/database/database';
import { syncMenuData } from '~/utils/queries';

export const MENU_SYNC_QUERY_KEY = ['menuSync'];

const SYNC_CHECK_INTERVAL_MS = 30 * 60 * 1000;

const refreshLocalQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'menuSync' });

export const forceMenuSync = async (db: DrizzleDB, queryClient: QueryClient) => {
  await syncMenuData(db, { force: true });
  queryClient.setQueryData(MENU_SYNC_QUERY_KEY, true);
  await refreshLocalQueries(queryClient);
};

export function useMenuSync(db: DrizzleDB) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: MENU_SYNC_QUERY_KEY,
    queryFn: async () => {
      const synced = await syncMenuData(db);
      if (synced) await refreshLocalQueries(queryClient);
      return synced;
    },
    networkMode: 'online',
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: SYNC_CHECK_INTERVAL_MS,
  });
}

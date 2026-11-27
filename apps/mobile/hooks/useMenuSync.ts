import { type QueryClient, useQuery, useQueryClient } from '@tanstack/react-query';
import { syncMenuData } from '~/utils/queries';

export const MENU_SYNC_QUERY_KEY = ['menuSync'];

const SYNC_CHECK_INTERVAL_MS = 30 * 60 * 1000;

const refreshLocalQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'menuSync' });

export const forceMenuSync = async (queryClient: QueryClient) => {
  await syncMenuData({ force: true, onCacheChange: () => refreshLocalQueries(queryClient) });
  queryClient.setQueryData(MENU_SYNC_QUERY_KEY, true);
};

export function useMenuSync() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: MENU_SYNC_QUERY_KEY,
    queryFn: () => syncMenuData({ onCacheChange: () => refreshLocalQueries(queryClient) }),
    networkMode: 'online',
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: SYNC_CHECK_INTERVAL_MS,
  });
}

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLocationDetails } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useDatabase } from './useDatabase';

export type LocationDetailsStatus = 'loading' | 'ready' | 'missing' | 'error';

export function useLocationDetails(locationName: string) {
  const db = useDatabase();
  const lastSyncTime = useDataSyncStore((state) => state.lastSupabaseQueryTime);

  const query = useQuery({
    queryKey: ['locationDetails', locationName, lastSyncTime],
    queryFn: () => getLocationDetails(db, locationName),
    enabled: !!locationName,
    placeholderData: keepPreviousData,
  });

  const locationData = query.data ?? null;
  const status: LocationDetailsStatus = !locationName
    ? 'missing'
    : query.isPending
      ? 'loading'
      : query.isError
        ? 'error'
        : locationData
          ? 'ready'
          : 'missing';

  return { status, locationData };
}

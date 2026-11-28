import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLocationDetails } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useForcedSkeletons } from '~/store/useQaSkeletonStore';
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

  const forced = useForcedSkeletons();
  const locationData = forced ? null : (query.data ?? null);
  const status: LocationDetailsStatus = forced
    ? 'loading'
    : !locationName
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

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getLocationDetails } from '~/services/database/database';
import { useDataSyncStore } from '~/store/useDataSyncStore';
import { useDatabase } from './useDatabase';

export function useLocationDetails(locationName: string) {
  const db = useDatabase();
  const lastSyncTime = useDataSyncStore((state) => state.lastSupabaseQueryTime);

  const { data, isLoading, error } = useQuery({
    queryKey: ['locationDetails', locationName, lastSyncTime],
    queryFn: () => getLocationDetails(db, locationName),
    enabled: !!locationName,
    placeholderData: keepPreviousData,
  });

  return {
    locationData: data ?? null,
    loading: !!locationName && isLoading,
    error: error ? 'Failed to fetch location details' : null,
  };
}

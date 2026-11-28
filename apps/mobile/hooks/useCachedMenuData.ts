import { useQuery } from '@tanstack/react-query';
import { readCachedMenuData } from '~/utils/queries';
import { useDatabase } from './useDatabase';

export const useCachedMenuData = () => {
  const db = useDatabase();
  return useQuery({
    queryKey: ['menuData'],
    queryFn: () => readCachedMenuData(db),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
};

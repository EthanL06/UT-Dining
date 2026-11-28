import { useQuery } from '@tanstack/react-query';
import { getAppInformation } from '~/services/database/database';
import { useDatabase } from './useDatabase';

export const useAppInformation = () => {
  const db = useDatabase();
  return useQuery({
    queryKey: ['appInformation'],
    queryFn: () => getAppInformation(db),
  });
};

import { useQuery } from '@tanstack/react-query';
import { parseServiceStatus, STATUS_API_URL } from '~/utils/serviceStatus';

const fetchServiceStatus = async () => {
  const response = await fetch(STATUS_API_URL);
  if (!response.ok) return null;
  return parseServiceStatus(await response.json());
};

export const useServiceStatus = () =>
  useQuery({
    queryKey: ['serviceStatus'],
    queryFn: fetchServiceStatus,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

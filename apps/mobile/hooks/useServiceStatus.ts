import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { parseServiceStatus, STATUS_API_URL, STATUS_PAGE_URL } from '~/utils/serviceStatus';

export const SERVICE_STATUS_QUERY_KEY = ['serviceStatus'];

const fetchServiceStatus = async () => {
  const response = await fetch(STATUS_API_URL);
  if (!response.ok) return null;
  return parseServiceStatus(await response.json());
};

export const useServiceStatus = () =>
  useQuery({
    queryKey: SERVICE_STATUS_QUERY_KEY,
    queryFn: fetchServiceStatus,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

export const openStatusPage = () => {
  WebBrowser.openBrowserAsync(STATUS_PAGE_URL).catch(() => Linking.openURL(STATUS_PAGE_URL));
};

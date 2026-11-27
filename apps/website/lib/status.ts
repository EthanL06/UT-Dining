import { parseServiceHealth, type ServiceHealth } from '@ut-dining/core';
import { STATUS_API_URL } from './site';

export const fetchServiceHealth = async (init: RequestInit = {}): Promise<ServiceHealth | null> => {
  try {
    const response = await fetch(STATUS_API_URL, init);
    if (!response.ok) return null;
    if (!response.headers.get('content-type')?.includes('application/json')) return null;
    return parseServiceHealth(await response.json());
  } catch {
    return null;
  }
};

export const getServiceHealth = async (): Promise<ServiceHealth | null> => {
  if (process.env.WEBSITE_STATIC_EXPORT === '1') return null;
  return fetchServiceHealth({ signal: AbortSignal.timeout(3000), next: { revalidate: 300 } });
};

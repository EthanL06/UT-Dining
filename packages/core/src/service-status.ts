export const STATUS_PAGE_URL = 'https://status.utdining.app';
export const DEFAULT_STATUS_API_URL = `${STATUS_PAGE_URL}/api/status`;

export type ServiceHealth = 'operational' | 'degraded' | 'outage';

export const SERVICE_STATUS_COLORS: Record<ServiceHealth, string> = {
  operational: '#2E9E4F',
  degraded: '#E3A857',
  outage: '#E0463F',
};

export const parseServiceHealth = (body: unknown): ServiceHealth | null => {
  if (typeof body !== 'object' || body === null || !('status' in body)) return null;
  const { status } = body;
  return status === 'operational' || status === 'degraded' || status === 'outage' ? status : null;
};

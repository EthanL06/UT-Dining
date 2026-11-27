export const STATUS_PAGE_URL = 'https://status.utdining.app';
export const STATUS_API_URL =
  process.env.EXPO_PUBLIC_STATUS_API_URL ?? `${STATUS_PAGE_URL}/api/status`;

export type ServiceHealth = 'operational' | 'degraded' | 'outage';

export interface ServiceStatus {
  health: ServiceHealth;
  label: string;
}

const LABELS: Record<ServiceHealth, string> = {
  operational: 'Operational',
  degraded: 'Partly Working',
  outage: 'Down',
};

export const SERVICE_STATUS_COLORS: Record<ServiceHealth, string> = {
  operational: '#2E9E4F',
  degraded: '#E3A857',
  outage: '#E0463F',
};

export const parseServiceStatus = (body: unknown): ServiceStatus | null => {
  if (typeof body !== 'object' || body === null || !('status' in body)) return null;
  const { status } = body;
  if (status !== 'operational' && status !== 'degraded' && status !== 'outage') return null;
  return { health: status, label: LABELS[status] };
};

export interface ServiceStatusBanner {
  title: string;
  detail: string;
}

const BANNERS: Record<Exclude<ServiceHealth, 'operational'>, ServiceStatusBanner> = {
  degraded: {
    title: "Some things aren't working right",
    detail: 'Menus or hours may be out of date.',
  },
  outage: {
    title: 'UT Dining is having problems',
    detail: "Menus and hours may not load until it's fixed.",
  },
};

export const getServiceStatusBanner = (
  status: ServiceStatus | null | undefined,
): ServiceStatusBanner | null =>
  !status || status.health === 'operational' ? null : BANNERS[status.health];

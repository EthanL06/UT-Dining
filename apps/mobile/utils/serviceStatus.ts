import {
  DEFAULT_STATUS_API_URL,
  parseServiceHealth,
  SERVICE_STATUS_COLORS,
  type ServiceHealth,
  STATUS_PAGE_URL,
} from '@ut-dining/core';

export { SERVICE_STATUS_COLORS, type ServiceHealth, STATUS_PAGE_URL };

export const STATUS_API_URL = process.env.EXPO_PUBLIC_STATUS_API_URL ?? DEFAULT_STATUS_API_URL;

export interface ServiceStatus {
  health: ServiceHealth;
  label: string;
}

const LABELS: Record<ServiceHealth, string> = {
  operational: 'Operational',
  degraded: 'Partly Working',
  outage: 'Down',
};

export const parseServiceStatus = (body: unknown): ServiceStatus | null => {
  const health = parseServiceHealth(body);
  return health ? { health, label: LABELS[health] } : null;
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

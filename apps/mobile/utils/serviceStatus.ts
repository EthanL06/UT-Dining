import {
  DEFAULT_STATUS_API_URL,
  parseServiceHealth,
  SERVICE_STATUS_COLORS,
  type ServiceHealth,
  STATUS_PAGE_URL,
} from '@ut-dining/core';
import { formatTimeSinceSync } from './time';

export { SERVICE_STATUS_COLORS, type ServiceHealth, STATUS_PAGE_URL };

export const STATUS_API_URL = process.env.EXPO_PUBLIC_STATUS_API_URL ?? DEFAULT_STATUS_API_URL;

export type ServicePart = 'menus' | 'app' | 'website';

export interface ServiceStatus {
  health: ServiceHealth;
  label: string;
  parts: Partial<Record<ServicePart, ServiceHealth>>;
}

const LABELS: Record<ServiceHealth, string> = {
  operational: 'Operational',
  degraded: 'Partly Working',
  outage: 'Down',
};

const SERVICE_PARTS: readonly ServicePart[] = ['menus', 'app', 'website'];

const isServicePart = (id: unknown): id is ServicePart =>
  typeof id === 'string' && (SERVICE_PARTS as readonly string[]).includes(id);

const parseParts = (body: object): ServiceStatus['parts'] => {
  if (!('components' in body) || !Array.isArray(body.components)) return {};
  const parts: ServiceStatus['parts'] = {};
  for (const component of body.components) {
    if (typeof component !== 'object' || component === null || !('id' in component)) continue;
    const id: unknown = component.id;
    const health = parseServiceHealth(component);
    if (isServicePart(id) && health) parts[id] = health;
  }
  return parts;
};

export const parseServiceStatus = (body: unknown): ServiceStatus | null => {
  const health = parseServiceHealth(body);
  if (!health || typeof body !== 'object' || body === null) return null;
  return { health, label: LABELS[health], parts: parseParts(body) };
};

export type StatusToastKind = 'menus-behind' | 'slow' | 'down';

export interface StatusToast {
  kind: StatusToastKind;
  health: Exclude<ServiceHealth, 'operational'>;
  title: string;
  detail: string;
}

const toastKind = (status: ServiceStatus): StatusToastKind | null => {
  if (status.health === 'operational') return null;
  const { menus, app } = status.parts;
  if (menus === undefined && app === undefined) {
    return status.health === 'outage' ? 'down' : 'menus-behind';
  }
  if (app === 'outage' || menus === 'outage') return 'down';
  if (app === 'degraded') return 'slow';
  if (menus === 'degraded') return 'menus-behind';
  return null;
};

const menusFrom = (lastSyncedAt: number | null, now: number) => {
  if (lastSyncedAt === null || now - lastSyncedAt < 60_000) return null;
  return formatTimeSinceSync(now - lastSyncedAt).toLowerCase();
};

export const getStatusToast = (
  status: ServiceStatus | null | undefined,
  lastSyncedAt: number | null,
  now: number,
): StatusToast | null => {
  if (!status) return null;
  const kind = toastKind(status);
  if (kind === 'menus-behind') {
    return {
      kind,
      health: 'degraded',
      title: 'Menus are running behind',
      detail: "Some menus may be out of date. We're fixing it.",
    };
  }
  if (kind === 'slow') {
    return {
      kind,
      health: 'degraded',
      title: 'UT Dining is running slow',
      detail: 'Menus and hours might take longer to load.',
    };
  }
  if (kind === 'down') {
    const age = menusFrom(lastSyncedAt, now);
    return {
      kind,
      health: 'outage',
      title: "We can't get new menus right now",
      detail: age
        ? `You're seeing menus from ${age}. We're working on it.`
        : "You're seeing the last menus we got. We're working on it.",
    };
  }
  return null;
};

export type StatusToastPreview = 'off' | StatusToastKind;

export const previewServiceStatus = (preview: StatusToastPreview): ServiceStatus | null => {
  if (preview === 'off') return null;
  if (preview === 'down') {
    return { health: 'outage', label: LABELS.outage, parts: { app: 'outage', menus: 'outage' } };
  }
  return {
    health: 'degraded',
    label: LABELS.degraded,
    parts: preview === 'slow' ? { app: 'degraded' } : { menus: 'degraded' },
  };
};

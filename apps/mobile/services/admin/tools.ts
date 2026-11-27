import type { ServiceHours } from '@ut-dining/core';
import type { Json } from '@ut-dining/supabase';
import { adminClient } from './client';

export interface ScraperRun {
  id: number;
  title: string;
  event: string;
  status: string;
  conclusion: string | null;
  startedAt: string;
  updatedAt: string;
  url: string;
}

export type ScraperHealth =
  | { status: 'ready'; runs: ScraperRun[]; lastSuccess: ScraperRun | null; active: boolean }
  | { status: 'unavailable' };

export type CrashHealth =
  | { status: 'ready'; lastDay: number; lastWeek: number }
  | { status: 'unavailable' };

export type DownloadsHealth =
  | { status: 'ready'; total: number; checkedAt: string }
  | { status: 'not_configured'; missing: string[] }
  | { status: 'failed'; detail: string }
  | { status: 'unavailable' };

export interface HallFreshness {
  id: string;
  name: string;
  lastMenuWrite: string | null;
  latestMenuDate: string | null;
}

export interface DatabaseHealth {
  sizeBytes: number | null;
  activeDevices: number | null;
}

export interface AdminHealth {
  scraper: ScraperHealth;
  crashes: CrashHealth;
  downloads: DownloadsHealth;
  halls: HallFreshness[];
  database: DatabaseHealth;
}

const invokeTools = async <T>(body: Record<string, string>): Promise<T> => {
  const { data, error } = await adminClient.functions.invoke<T>('admin-tools', { body });
  if (!error && data) return data;
  const context = (error as { context?: Response } | null)?.context;
  const detail = context ? await context.json().catch(() => null) : null;
  if (detail && typeof detail === 'object') return detail as T;
  throw new Error(error?.message ?? 'Admin tools did not answer');
};

const fetchHalls = async (): Promise<HallFreshness[]> => {
  const { data, error } = await adminClient.rpc('admin_menu_freshness');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.location_id,
    name: row.location_name,
    lastMenuWrite: row.last_menu_write,
    latestMenuDate: row.latest_menu_date,
  }));
};

const numberAt = (value: Json | undefined, ...path: string[]): number | null => {
  let current: Json | undefined = value;
  for (const key of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    current = current[key];
  }
  return typeof current === 'number' ? current : null;
};

const fetchDatabase = async (): Promise<DatabaseHealth> => {
  const { data, error } = await adminClient.rpc('dashboard_status');
  if (error) throw new Error(error.message);
  return {
    sizeBytes: numberAt(data, 'database_size_bytes'),
    activeDevices: numberAt(data, 'devices', 'active_30_days'),
  };
};

export const fetchAdminHealth = async (): Promise<AdminHealth> => {
  const [tools, halls, database] = await Promise.all([
    invokeTools<{ scraper: ScraperHealth; crashes: CrashHealth; downloads?: DownloadsHealth }>({
      action: 'health',
    }),
    fetchHalls(),
    fetchDatabase(),
  ]);
  return {
    scraper: tools.scraper ?? { status: 'unavailable' },
    crashes: tools.crashes ?? { status: 'unavailable' },
    downloads: tools.downloads ?? { status: 'unavailable' },
    halls,
    database,
  };
};

export type RefreshResult =
  | { status: 'started'; location: string; startedAt: string }
  | { status: 'busy' }
  | { status: 'unavailable' }
  | { status: 'unknown_location' }
  | { status: 'failed' };

export const refreshHall = async (location: string): Promise<RefreshResult> => {
  const result = await invokeTools<RefreshResult>({ action: 'refresh', location });
  return result.status ? result : { status: 'failed' };
};

export interface AdminPlace {
  id: string;
  name: string;
  description: string;
  image: string | null;
  hours: Partial<ServiceHours> | null;
  hasMenus: boolean;
  updatedAt: string | null;
}

const PLACE_COLUMNS = 'id, name, description, image, regular_service_hours, has_menus, updated_at';

type PlaceRow = {
  id: string;
  name: string | null;
  description: string;
  image: string | null;
  regular_service_hours: Json;
  has_menus: boolean | null;
  updated_at: string | null;
};

const toPlace = (row: PlaceRow): AdminPlace => ({
  id: row.id,
  name: row.name ?? 'Unnamed',
  description: row.description,
  image: row.image || null,
  hours: (row.regular_service_hours as Partial<ServiceHours> | null) ?? null,
  hasMenus: row.has_menus === true,
  updatedAt: row.updated_at,
});

export const fetchAdminPlaces = async (): Promise<AdminPlace[]> => {
  const { data, error } = await adminClient
    .from('location')
    .select(PLACE_COLUMNS)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPlace);
};

export const fetchAdminPlace = async (id: string): Promise<AdminPlace | null> => {
  const { data, error } = await adminClient
    .from('location')
    .select(PLACE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPlace(data) : null;
};

export interface PlaceChanges {
  description: string;
  image: string | null;
  hours: ServiceHours;
}

export const saveAdminPlace = async (id: string, changes: PlaceChanges): Promise<AdminPlace> => {
  const { data, error } = await adminClient
    .from('location')
    .update({
      description: changes.description,
      image: changes.image ?? '',
      regular_service_hours: changes.hours as unknown as NonNullable<Json>,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(PLACE_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('The place was not saved');
  return toPlace(data);
};

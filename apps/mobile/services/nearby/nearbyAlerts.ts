import type { MealTime, ServiceHours } from '@ut-dining/core';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { createMMKV } from 'react-native-mmkv';
import type { DrizzleDB } from '~/services/database/database';
import { menu } from '~/services/database/schema';
import { log } from '~/utils/log';
import {
  buildZones,
  decideNearbyAlert,
  type NearbyAlert,
  type NearbyHall,
  type NearbyZone,
  recordSent,
  type SentAlerts,
} from '~/utils/nearbyAlerts';

export const NEARBY_TASK = 'nearby-dining-halls';
export const NEARBY_NOTIFICATION_TYPE = 'nearby';
export const NEARBY_HALL_TYPE = 'Dining Hall';

const storage = createMMKV({ id: 'nearby-alerts' });
const ZONES_KEY = 'zones';
const REGIONS_KEY = 'regions';
const SENT_KEY = 'sent';

const readJson = <T>(key: string, fallback: T): T => {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

type GeofenceEvent = {
  eventType: Location.GeofencingEventType;
  region: Location.LocationRegion;
};

const notifyForZone = async (zoneId: string): Promise<NearbyAlert['kind'] | 'unknown_zone'> => {
  const zone = readJson<NearbyZone[]>(ZONES_KEY, []).find((candidate) => candidate.id === zoneId);
  if (!zone) return 'unknown_zone';
  const now = new Date();
  const sent = readJson<SentAlerts>(SENT_KEY, {});
  const alert = decideNearbyAlert(zone, now, sent);
  if (alert.kind === 'skip') {
    log.debug('Nearby alert skipped', { zone: zone.id, reason: alert.reason });
    return alert.kind;
  }
  storage.set(SENT_KEY, JSON.stringify(recordSent(sent, alert.key, now.getTime())));
  await Notifications.scheduleNotificationAsync({
    content: {
      title: alert.title,
      body: alert.body,
      data: { redirect_url: alert.redirect, type: NEARBY_NOTIFICATION_TYPE },
    },
    trigger: null,
  });
  return alert.kind;
};

TaskManager.defineTask<GeofenceEvent>(NEARBY_TASK, async ({ data, error }) => {
  if (error) {
    log.warn('Nearby geofence error', { error: error.message });
    return;
  }
  const identifier = data?.region?.identifier;
  if (data?.eventType !== Location.GeofencingEventType.Enter || !identifier) return;
  try {
    await notifyForZone(identifier);
  } catch (caught) {
    log.error('Nearby alert failed', caught);
  }
});

type HallLocation = {
  id: string;
  name: string | null;
  type: string;
  has_menus: boolean;
  force_close: boolean;
  latitude: number | null;
  longitude: number | null;
  regular_service_hours: unknown;
  meal_times: unknown;
};

const toMealTimes = (value: unknown): MealTime[] =>
  (Array.isArray(value) ? value : []).flatMap((entry: unknown) => {
    const meal = typeof entry === 'string' ? (JSON.parse(entry) as unknown) : entry;
    return meal && typeof meal === 'object' && 'name' in meal ? [meal as MealTime] : [];
  });

export const nearbyHalls = (
  db: DrizzleDB,
  locations: HallLocation[],
  displayName: (name: string) => string,
): NearbyHall[] => {
  const menuDates = new Map<string, string[]>();
  for (const row of db.selectDistinct({ id: menu.location_id, date: menu.date }).from(menu).all()) {
    if (row.id === null) continue;
    menuDates.set(row.id, [...(menuDates.get(row.id) ?? []), row.date]);
  }

  return locations.flatMap((location) =>
    location.type === NEARBY_HALL_TYPE &&
    location.has_menus &&
    location.name &&
    location.latitude !== null &&
    location.longitude !== null
      ? [
          {
            name: location.name,
            displayName: displayName(location.name),
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            hours: (location.regular_service_hours ?? {}) as Partial<ServiceHours>,
            mealTimes: toMealTimes(location.meal_times),
            menuDates: menuDates.get(location.id) ?? [],
            forceClose: location.force_close,
          },
        ]
      : [],
  );
};

export const startNearbyAlerts = async (halls: NearbyHall[]) => {
  const zones = buildZones(halls);
  storage.set(ZONES_KEY, JSON.stringify(zones));
  if (zones.length === 0) {
    await stopNearbyAlerts();
    return;
  }
  const regions: Location.LocationRegion[] = zones.map((zone) => ({
    identifier: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    radius: zone.radius,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));
  const regionsKey = JSON.stringify(regions);
  const isRunning = await Location.hasStartedGeofencingAsync(NEARBY_TASK);
  if (isRunning && storage.getString(REGIONS_KEY) === regionsKey) return;
  await Location.startGeofencingAsync(NEARBY_TASK, regions);
  storage.set(REGIONS_KEY, regionsKey);
  log.debug('Nearby alerts watching', { zones: zones.map((zone) => zone.id) });
};

export const stopNearbyAlerts = async () => {
  storage.remove(ZONES_KEY);
  storage.remove(REGIONS_KEY);
  if (await TaskManager.isTaskRegisteredAsync(NEARBY_TASK)) {
    await Location.stopGeofencingAsync(NEARBY_TASK);
  }
};

export type NearbyPermissionResult = 'granted' | 'needs_location' | 'needs_notifications';

export const requestNearbyPermissions = async (): Promise<NearbyPermissionResult> => {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== 'granted') return 'needs_location';
  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== 'granted') return 'needs_location';
  const current = await Notifications.getPermissionsAsync();
  const notifications =
    current.status === 'undetermined' ? await Notifications.requestPermissionsAsync() : current;
  return notifications.status === 'granted' ? 'granted' : 'needs_notifications';
};

export const watchedZones = () => readJson<NearbyZone[]>(ZONES_KEY, []);

export const simulateNearbyEnter = async (zoneId: string) => {
  storage.remove(SENT_KEY);
  return notifyForZone(zoneId);
};

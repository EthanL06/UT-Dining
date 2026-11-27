import {
  formatHhmm,
  getOpenRanges,
  type Hhmm,
  type MealTime,
  type ServiceHours,
  toCentralTime,
  toMinutes,
} from '@ut-dining/core';

export type NearbyHall = {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  hours: Partial<ServiceHours>;
  mealTimes: MealTime[];
  menuDates: string[];
  forceClose: boolean;
};

export type NearbyZone = {
  id: string;
  latitude: number;
  longitude: number;
  radius: number;
  halls: NearbyHall[];
};

export type SentAlerts = Record<string, number>;

export type NearbyAlert =
  | { kind: 'skip'; reason: 'closed' | 'already_sent' }
  | { kind: 'notify'; key: string; title: string; body: string; redirect: string };

export type NearbyAlertsView =
  | { kind: 'checking' }
  | { kind: 'off' }
  | { kind: 'on' }
  | { kind: 'needs_location' }
  | { kind: 'needs_notifications' };

export type PermissionLevel = 'checking' | 'undetermined' | 'granted' | 'denied';

export const MAX_ZONES = 20;
export const SAME_BUILDING_METERS = 75;
export const MIN_RADIUS_METERS = 100;
const RADIUS_PADDING_METERS = 60;
const SENT_TTL_MS = 2 * 24 * 60 * 60 * 1000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const metersBetween = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

const zoneId = (halls: NearbyHall[]) =>
  halls
    .map((hall) => hall.name)
    .sort()
    .join('+');

export const buildZones = (halls: NearbyHall[]): NearbyZone[] => {
  const groups: NearbyHall[][] = [];
  for (const hall of halls) {
    const near = groups.filter((group) =>
      group.some((other) => metersBetween(other, hall) <= SAME_BUILDING_METERS),
    );
    const merged = [...near.flat(), hall];
    for (const group of near) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }

  return groups.slice(0, MAX_ZONES).map((group) => {
    const latitude = group.reduce((sum, hall) => sum + hall.latitude, 0) / group.length;
    const longitude = group.reduce((sum, hall) => sum + hall.longitude, 0) / group.length;
    const center = { latitude, longitude };
    const spread = Math.max(...group.map((hall) => metersBetween(center, hall)));
    return {
      id: zoneId(group),
      latitude,
      longitude,
      radius: Math.max(MIN_RADIUS_METERS, Math.round(spread + RADIUS_PADDING_METERS)),
      halls: group,
    };
  });
};

const shortTime = (time: Hhmm) => formatHhmm(time).replace(':00 ', ' ');

type OpenHall = { hall: NearbyHall; meal: string | null; closesAt: Hhmm };

const openHall = (hall: NearbyHall, now: Date): OpenHall | null => {
  if (hall.forceClose) return null;
  const { date, day, time } = toCentralTime(now);
  if (!hall.menuDates.includes(date)) return null;
  const minutes = toMinutes(time);
  const range = getOpenRanges(hall.hours, day)?.find(
    (r) => minutes >= toMinutes(r.open) && minutes < toMinutes(r.close),
  );
  if (!range) return null;
  const meal = hall.mealTimes.find(
    (m) => minutes >= toMinutes(m.start_time) && minutes < toMinutes(m.end_time),
  );
  return { hall, meal: meal?.name ?? null, closesAt: meal?.end_time ?? range.close };
};

const joinNames = (names: string[]) =>
  names.length <= 2
    ? names.join(' and ')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export const hallRoute = (name: string) => `/location/${encodeURIComponent(name)}`;

export const nearbyRoute = (names: string[]) =>
  `/nearby?halls=${encodeURIComponent(names.join('|'))}`;

export const parseNearbyRoute = (halls: string | string[] | undefined): string[] => {
  const value = Array.isArray(halls) ? halls[0] : halls;
  return value ? value.split('|').filter((name) => name.length > 0) : [];
};

export const decideNearbyAlert = (zone: NearbyZone, now: Date, sent: SentAlerts): NearbyAlert => {
  const open = zone.halls.flatMap((hall) => {
    const result = openHall(hall, now);
    return result ? [result] : [];
  });
  if (open.length === 0) return { kind: 'skip', reason: 'closed' };

  const meals = [...new Set(open.map((entry) => entry.meal ?? 'open'))];
  const key = `${zone.id}:${toCentralTime(now).date}`;
  if (sent[key] !== undefined) return { kind: 'skip', reason: 'already_sent' };

  if (open.length === 1) {
    const [{ hall, meal, closesAt }] = open;
    const until = `until ${shortTime(closesAt)}`;
    return {
      kind: 'notify',
      key,
      title: `You're near ${hall.displayName}`,
      body: meal
        ? `${meal} is being served ${until}. Tap to see the menu.`
        : `It's open ${until}. Tap to see the menu.`,
      redirect: hallRoute(hall.name),
    };
  }

  const names = open.map((entry) => entry.hall.displayName);
  const sharedMeal = meals.length === 1 && meals[0] !== 'open' ? meals[0].toLowerCase() : null;
  return {
    kind: 'notify',
    key,
    title: `You're near ${joinNames(names)}`,
    body: sharedMeal
      ? `${open.length === 2 ? 'Both are' : 'All are'} serving ${sharedMeal}. Tap to compare the menus.`
      : `${open.length === 2 ? 'Both are' : 'All are'} open. Tap to compare the menus.`,
    redirect: nearbyRoute(open.map((entry) => entry.hall.name)),
  };
};

export type ZonePresence = {
  insideSince: number | null;
  lastExitAt: number | null;
  lastOvernightAt: number | null;
};

export type NearbyHistory = {
  zones: Record<string, ZonePresence>;
  sent: SentAlerts;
  muted: string[];
  baseline: Record<string, number>;
};

export type ArrivalGate =
  | { kind: 'arrival' }
  | {
      kind: 'skip';
      reason: 'baseline' | 'already_inside' | 'muted' | 'home' | 'recently_here';
    };

export const EMPTY_HISTORY: NearbyHistory = { zones: {}, sent: {}, muted: [], baseline: {} };

const HOUR_MS = 60 * 60 * 1000;
export const AWAY_BEFORE_ARRIVAL_MS = 2 * HOUR_MS;
export const HOME_MEMORY_MS = 14 * 24 * HOUR_MS;
const OVERNIGHT_UTC_TIME = 'T08:30:00Z';
export const BASELINE_MS = 15 * 1000;

const presenceOf = (history: NearbyHistory, zoneId: string): ZonePresence =>
  history.zones[zoneId] ?? { insideSince: null, lastExitAt: null, lastOvernightAt: null };

const withPresence = (history: NearbyHistory, zoneId: string, presence: ZonePresence) => ({
  ...history,
  zones: { ...history.zones, [zoneId]: presence },
});

export const spansOvernight = (from: number, to: number) => {
  if (to <= from) return false;
  const start = toCentralTime(new Date(from)).date;
  const end = toCentralTime(new Date(to)).date;
  const nights = [start, end].map((date) => Date.parse(`${date}${OVERNIGHT_UTC_TIME}`));
  return start !== end || nights.some((night) => night >= from && night <= to);
};

export const isHome = (presence: ZonePresence, at: number) =>
  presence.lastOvernightAt !== null && at - presence.lastOvernightAt < HOME_MEMORY_MS;

export const startBaseline = (
  history: NearbyHistory,
  zoneIds: string[],
  at: number,
): NearbyHistory => ({
  ...history,
  baseline: Object.fromEntries(zoneIds.map((zoneId) => [zoneId, at])),
});

const takeBaseline = (history: NearbyHistory, zoneId: string, at: number) => {
  const startedAt = history.baseline[zoneId];
  const { [zoneId]: _taken, ...baseline } = history.baseline;
  return {
    history: { ...history, baseline },
    isBaseline: startedAt !== undefined && at - startedAt < BASELINE_MS,
  };
};

export const recordEnter = (
  history: NearbyHistory,
  zoneId: string,
  at: number,
): { history: NearbyHistory; gate: ArrivalGate } => {
  const taken = takeBaseline(history, zoneId, at);
  const presence = presenceOf(taken.history, zoneId);
  if (taken.isBaseline) {
    const insideSince = presence.insideSince ?? at;
    return {
      history: withPresence(taken.history, zoneId, { ...presence, insideSince }),
      gate: { kind: 'skip', reason: 'baseline' },
    };
  }
  if (presence.insideSince !== null) {
    return { history: taken.history, gate: { kind: 'skip', reason: 'already_inside' } };
  }
  const next = withPresence(taken.history, zoneId, { ...presence, insideSince: at });
  if (history.muted.includes(zoneId))
    return { history: next, gate: { kind: 'skip', reason: 'muted' } };
  if (isHome(presence, at)) return { history: next, gate: { kind: 'skip', reason: 'home' } };
  if (presence.lastExitAt !== null && at - presence.lastExitAt < AWAY_BEFORE_ARRIVAL_MS) {
    return { history: next, gate: { kind: 'skip', reason: 'recently_here' } };
  }
  return { history: next, gate: { kind: 'arrival' } };
};

export const recordExit = (history: NearbyHistory, zoneId: string, at: number): NearbyHistory => {
  const taken = takeBaseline(history, zoneId, at);
  const presence = presenceOf(taken.history, zoneId);
  if (taken.isBaseline) {
    return withPresence(taken.history, zoneId, { ...presence, insideSince: null });
  }
  if (presence.insideSince === null) return taken.history;
  const stayedOvernight = spansOvernight(presence.insideSince, at);
  return withPresence(taken.history, zoneId, {
    insideSince: null,
    lastExitAt: at,
    lastOvernightAt: stayedOvernight ? at : presence.lastOvernightAt,
  });
};

export const muteZone = (history: NearbyHistory, zoneId: string): NearbyHistory =>
  history.muted.includes(zoneId) ? history : { ...history, muted: [...history.muted, zoneId] };

export const recordSent = (sent: SentAlerts, key: string, at: number): SentAlerts => ({
  ...Object.fromEntries(Object.entries(sent).filter(([, time]) => at - time < SENT_TTL_MS)),
  [key]: at,
});

export const nearbyAlertsView = (
  enabled: boolean,
  location: PermissionLevel,
  notifications: PermissionLevel,
): NearbyAlertsView => {
  if (!enabled) return { kind: 'off' };
  if (location === 'checking' || notifications === 'checking') return { kind: 'checking' };
  if (location !== 'granted') return { kind: 'needs_location' };
  if (notifications !== 'granted') return { kind: 'needs_notifications' };
  return { kind: 'on' };
};

export type NearbyPickerView<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; halls: T[] }
  | { kind: 'missing' };

export const nearbyPickerView = <T extends { name: string | null }>(
  locations: T[] | undefined,
  names: string[],
): NearbyPickerView<T> => {
  if (locations === undefined) return { kind: 'loading' };
  const halls = names.flatMap((name) => locations.filter((location) => location.name === name));
  return halls.length > 0 ? { kind: 'ready', halls } : { kind: 'missing' };
};

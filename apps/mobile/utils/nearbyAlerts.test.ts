import { describe, expect, it } from 'vitest';
import {
  buildZones,
  decideNearbyAlert,
  type NearbyHall,
  nearbyAlertsView,
  nearbyPickerView,
  parseNearbyRoute,
  recordSent,
} from './nearbyAlerts';

const weekdays = (timeRanges: { open: number; close: number }[]) => ({
  monday: { isClosed: false, timeRanges },
  tuesday: { isClosed: false, timeRanges },
  saturday: { isClosed: true, timeRanges: [] },
});

const j2: NearbyHall = {
  name: 'J2 Dining',
  displayName: 'J2',
  latitude: 30.282682363225522,
  longitude: -97.73679372627767,
  hours: weekdays([
    { open: 700, close: 1000 },
    { open: 1100, close: 1400 },
    { open: 1630, close: 2000 },
  ]),
  mealTimes: [
    { name: 'Breakfast', start_time: 700, end_time: 1000 },
    { name: 'Lunch', start_time: 1100, end_time: 1400 },
    { name: 'Dinner', start_time: 1630, end_time: 2000 },
  ],
  menuDates: ['2026-11-30', '2026-12-01'],
  forceClose: false,
};

const jcl: NearbyHall = {
  name: 'JCL Dining',
  displayName: 'JCL',
  latitude: 30.28277572526695,
  longitude: -97.7370539650819,
  hours: weekdays([{ open: 1030, close: 2100 }]),
  mealTimes: [
    { name: 'Lunch', start_time: 1030, end_time: 1500 },
    { name: 'Dinner', start_time: 1500, end_time: 2100 },
  ],
  menuDates: ['2026-11-30'],
  forceClose: false,
};

const kins: NearbyHall = {
  ...jcl,
  name: 'Kins Dining',
  displayName: 'Kins',
  latitude: 30.290362065716167,
  longitude: -97.73941260816498,
  mealTimes: [],
};

const centralNoonMonday = new Date('2026-11-30T18:00:00Z');
const centralTenFortyFiveMonday = new Date('2026-11-30T16:45:00Z');
const centralThreePmMonday = new Date('2026-11-30T21:00:00Z');
const centralSaturdayNoon = new Date('2026-12-05T18:00:00Z');

describe('buildZones', () => {
  it('puts halls in the same building in one zone', () => {
    const zones = buildZones([j2, jcl, kins]);
    expect(zones.map((zone) => zone.id)).toEqual(['J2 Dining+JCL Dining', 'Kins Dining']);
    expect(zones[0].radius).toBeGreaterThanOrEqual(100);
    expect(zones[1].halls).toEqual([kins]);
  });

  it('keeps under the iOS limit of 20 regions', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...kins,
      name: `Hall ${index}`,
      latitude: 30 + index * 0.01,
    }));
    expect(buildZones(many)).toHaveLength(20);
  });
});

describe('decideNearbyAlert', () => {
  const [jester, kinsZone] = buildZones([j2, jcl, kins]);

  it('names both halls when both are open', () => {
    expect(decideNearbyAlert(jester, centralNoonMonday, {})).toEqual({
      kind: 'notify',
      key: 'J2 Dining+JCL Dining:2026-11-30:Lunch',
      title: "You're near J2 and JCL",
      body: 'Both are serving lunch. Tap to compare the menus.',
      redirect: '/nearby?halls=J2%20Dining%7CJCL%20Dining',
    });
  });

  it('links straight to the one hall that is open', () => {
    expect(decideNearbyAlert(jester, centralTenFortyFiveMonday, {})).toEqual({
      kind: 'notify',
      key: 'J2 Dining+JCL Dining:2026-11-30:Lunch',
      title: "You're near JCL",
      body: 'Lunch is being served until 3 PM. Tap to see the menu.',
      redirect: '/location/JCL%20Dining',
    });
  });

  it('falls back to closing time without meal times', () => {
    const result = decideNearbyAlert(kinsZone, centralNoonMonday, {});
    expect(result).toMatchObject({ body: "It's open until 9 PM. Tap to see the menu." });
  });

  it('stays quiet when everything is closed', () => {
    expect(decideNearbyAlert(jester, centralSaturdayNoon, {})).toEqual({
      kind: 'skip',
      reason: 'closed',
    });
  });

  it('treats a hall without a menu today as closed', () => {
    const [zone] = buildZones([{ ...j2, menuDates: [] }]);
    expect(decideNearbyAlert(zone, centralNoonMonday, {}).kind).toBe('skip');
  });

  it('treats a force-closed hall as closed', () => {
    const [zone] = buildZones([{ ...j2, forceClose: true }]);
    expect(decideNearbyAlert(zone, centralNoonMonday, {}).kind).toBe('skip');
  });

  it('sends once per zone per meal', () => {
    const first = decideNearbyAlert(jester, centralNoonMonday, {});
    if (first.kind !== 'notify') throw new Error('expected a notification');
    const sent = recordSent({}, first.key, centralNoonMonday.getTime());
    expect(decideNearbyAlert(jester, centralNoonMonday, sent)).toEqual({
      kind: 'skip',
      reason: 'already_sent',
    });
    expect(decideNearbyAlert(jester, centralThreePmMonday, sent).kind).toBe('notify');
  });
});

describe('recordSent', () => {
  it('drops entries older than two days', () => {
    const day = 24 * 60 * 60 * 1000;
    expect(recordSent({ old: 0, recent: 2 * day }, 'new', 3 * day)).toEqual({
      recent: 2 * day,
      new: 3 * day,
    });
  });
});

describe('parseNearbyRoute', () => {
  it('reads the halls back out of the link', () => {
    expect(parseNearbyRoute('J2 Dining|JCL Dining')).toEqual(['J2 Dining', 'JCL Dining']);
    expect(parseNearbyRoute(undefined)).toEqual([]);
  });
});

describe('nearbyAlertsView', () => {
  it('is off until turned on', () => {
    expect(nearbyAlertsView(false, 'granted', 'granted')).toEqual({ kind: 'off' });
  });

  it('waits for permission checks before showing a problem', () => {
    expect(nearbyAlertsView(true, 'checking', 'granted')).toEqual({ kind: 'checking' });
  });

  it('asks for Always location, then notifications', () => {
    expect(nearbyAlertsView(true, 'denied', 'denied')).toEqual({ kind: 'needs_location' });
    expect(nearbyAlertsView(true, 'granted', 'undetermined')).toEqual({
      kind: 'needs_notifications',
    });
    expect(nearbyAlertsView(true, 'granted', 'granted')).toEqual({ kind: 'on' });
  });
});

describe('nearbyPickerView', () => {
  const locations = [{ name: 'JCL Dining' }, { name: 'J2 Dining' }, { name: 'Kins Dining' }];

  it('loads before the cache is read', () => {
    expect(nearbyPickerView(undefined, ['J2 Dining'])).toEqual({ kind: 'loading' });
  });

  it('keeps the order from the notification', () => {
    expect(nearbyPickerView(locations, ['J2 Dining', 'JCL Dining'])).toEqual({
      kind: 'ready',
      halls: [{ name: 'J2 Dining' }, { name: 'JCL Dining' }],
    });
  });

  it('is missing when none of the halls exist anymore', () => {
    expect(nearbyPickerView(locations, ['Old Hall'])).toEqual({ kind: 'missing' });
    expect(nearbyPickerView([], ['J2 Dining'])).toEqual({ kind: 'missing' });
  });
});

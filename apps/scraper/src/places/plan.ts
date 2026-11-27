import { PAYMENT_METHODS, type PaymentMethod, type ServiceHours } from '@ut-dining/core';
import {
  type ListedPlace,
  parsePaymentMethods,
  parseUhdList,
  parseUnionsHours,
  parseUnionsTrucks,
  UHD_LISTS,
  UNIONS_TRUCKS_URL,
} from './pages.ts';
import type { PlaceChange, PlaceProblem } from './report.ts';
import { buildSchedule, changedDays, formatDay } from './schedule.ts';
import type { PlaceSource } from './sources.ts';
import { normalizeName, parseHoursPage, UHD_HOURS_URL } from './uhd-hours.ts';

export const DINING_HALL_ROWS = ['Jester City Limits', 'J2 Dining', 'Kins Dining'];

export interface LocationRow {
  id: string;
  name: string | null;
  regular_service_hours: unknown;
  methods_of_payment: string[];
}

export interface PlaceUpdate {
  id: string;
  location: string;
  regular_service_hours?: ServiceHours;
  methods_of_payment?: PaymentMethod[];
}

export interface PlacePlan {
  updates: PlaceUpdate[];
  changes: PlaceChange[];
  problems: PlaceProblem[];
  synced: number;
  preview: { location: string; hours: ServiceHours; payment?: PaymentMethod[]; from: string[] }[];
}

export type Pages = Map<string, string | Error>;

export const pageUrls = (sources: PlaceSource[]) => [
  UHD_HOURS_URL,
  ...UHD_LISTS,
  UNIONS_TRUCKS_URL,
  ...sources
    .flatMap((source) => [source.uhdPage, source.unionsTruck])
    .filter((url): url is string => Boolean(url)),
];

const sameUrl = (a: string, b: string) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

const sortPayment = (methods: PaymentMethod[]) =>
  PAYMENT_METHODS.filter((method) => methods.includes(method));

export const planPlaces = ({
  pages,
  sources,
  locations,
  today,
}: {
  pages: Pages;
  sources: PlaceSource[];
  locations: LocationRow[] | null;
  today: string;
}): PlacePlan => {
  const problems: PlaceProblem[] = [];
  const page = (url: string): string | null => {
    const value = pages.get(url);
    if (typeof value === 'string') return value;
    problems.push({ kind: 'unreachable', detail: value?.message ?? 'Not fetched', url });
    return null;
  };

  const hoursHtml = page(UHD_HOURS_URL);
  const hoursPage = hoursHtml ? parseHoursPage(hoursHtml) : { periods: [], unreadable: [] };
  if (hoursHtml && hoursPage.periods.length === 0) {
    problems.push({
      kind: 'layout',
      detail: 'The hours page has no date ranges the scraper can read',
      url: UHD_HOURS_URL,
    });
  }
  for (const detail of hoursPage.unreadable) {
    problems.push({ kind: 'layout', detail: `Hours page: ${detail}`, url: UHD_HOURS_URL });
  }

  const listed = (url: string, parse: (html: string) => ListedPlace[]) => {
    const html = page(url);
    if (!html) return null;
    const places = parse(html);
    if (places.length === 0) {
      problems.push({ kind: 'layout', detail: 'The list has no places the scraper can read', url });
    }
    return places;
  };
  const uhdPlaces = UHD_LISTS.map((url) => listed(url, parseUhdList));
  const trucks = listed(UNIONS_TRUCKS_URL, parseUnionsTrucks);

  const known = new Set(
    sources.flatMap((source) => [source.uhdPage, source.unionsTruck]).filter(Boolean),
  );
  const isKnown = (url: string) => [...known].some((candidate) => sameUrl(candidate ?? '', url));
  for (const place of [...uhdPlaces.flat(), ...(trucks ?? [])]) {
    if (place && !isKnown(place.url)) {
      problems.push({ kind: 'new', detail: place.name, url: place.url });
    }
  }
  const knownRows = new Set(
    [...sources.map((source) => source.hoursRow ?? ''), ...DINING_HALL_ROWS].map(normalizeName),
  );
  const newRows = new Set<string>();
  for (const period of hoursPage.periods) {
    if (period.end < today) continue;
    for (const row of period.rows.keys()) if (!knownRows.has(row)) newRows.add(row);
  }
  for (const row of newRows) {
    problems.push({ kind: 'new', detail: `"${row}" on the hours page`, url: UHD_HOURS_URL });
  }

  const allUhdListed = uhdPlaces.every((list) => list !== null);
  for (const source of sources) {
    if (source.uhdPage && allUhdListed) {
      const url = source.uhdPage;
      if (!uhdPlaces.flat().some((place) => place && sameUrl(place.url, url))) {
        problems.push({ kind: 'gone', detail: `${source.location} (UT's dining list)`, url });
      }
    }
    if (source.unionsTruck && trucks) {
      const url = source.unionsTruck;
      if (!trucks.some((place) => sameUrl(place.url, url))) {
        problems.push({ kind: 'gone', detail: `${source.location} (food truck list)`, url });
      }
    }
  }

  const byName = new Map(
    (locations ?? []).map((row) => [normalizeName(row.name ?? ''), row] as const),
  );
  const updates: PlaceUpdate[] = [];
  const changes: PlaceChange[] = [];
  const preview: PlacePlan['preview'] = [];
  let synced = 0;

  for (const source of sources) {
    const row = byName.get(normalizeName(source.location)) ?? null;

    let truckWeek: ReturnType<typeof parseUnionsHours> | null = null;
    if (source.unionsTruck) {
      const html = page(source.unionsTruck);
      truckWeek = html ? parseUnionsHours(html) : null;
      if (truckWeek && 'error' in truckWeek) {
        problems.push({
          kind: 'layout',
          detail: `${source.location}: ${truckWeek.error}`,
          url: source.unionsTruck,
        });
        truckWeek = null;
      }
    }

    let payment: PaymentMethod[] | undefined;
    if (source.uhdPage) {
      const html = page(source.uhdPage);
      const parsed = html ? parsePaymentMethods(html) : null;
      if (html && (!parsed || parsed.methods.length === 0)) {
        problems.push({
          kind: 'layout',
          detail: `${source.location}: no payment methods found`,
          url: source.uhdPage,
        });
      } else if (parsed) {
        payment = sortPayment(parsed.methods);
        if (parsed.unknown.length > 0) {
          problems.push({
            kind: 'layout',
            detail: `${source.location}: unknown payment methods ${parsed.unknown.join(', ')}`,
            url: source.uhdPage,
          });
        }
      }
    }

    const current = (row?.regular_service_hours ?? null) as Partial<ServiceHours> | null;
    const schedule = buildSchedule({
      current,
      today,
      periods: hoursPage.periods,
      hoursRow: source.hoursRow,
      truckWeek: truckWeek && !('error' in truckWeek) ? truckWeek.week : undefined,
    });
    const from = [...new Set(schedule.days.map((day) => day.from ?? 'kept (UT has not posted)'))];
    preview.push({ location: source.location, hours: schedule.hours, payment, from });
    if (!row) {
      if (locations) problems.push({ kind: 'missing', detail: source.location });
      continue;
    }
    synced++;

    const update: PlaceUpdate = { id: row.id, location: source.location };
    const detail: string[] = [];
    const days = changedDays(current, schedule.hours);
    if (days.length > 0) {
      update.regular_service_hours = schedule.hours;
      for (const day of days) {
        detail.push(`${day}: ${formatDay(current?.[day])} -> ${formatDay(schedule.hours[day])}`);
      }
    }
    if (
      payment &&
      payment.join('|') !== sortPayment(row.methods_of_payment as PaymentMethod[]).join('|')
    ) {
      update.methods_of_payment = payment;
      detail.push(`payment: ${row.methods_of_payment.join(', ')} -> ${payment.join(', ')}`);
    }
    if (update.regular_service_hours || update.methods_of_payment) {
      updates.push(update);
      changes.push({
        location: source.location,
        fields: [
          ...(update.regular_service_hours ? ['hours'] : []),
          ...(update.methods_of_payment ? ['payment'] : []),
        ],
        detail,
      });
    }
  }

  return { updates, changes, problems, synced, preview };
};

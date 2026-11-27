import { describe, expect, it } from 'vitest';
import {
  parseDaySpec,
  parsePaymentMethods,
  parseUhdList,
  parseUnionsHours,
  parseUnionsTrucks,
  UHD_LISTS,
  UNIONS_TRUCKS_URL,
} from './pages.ts';
import { type Pages, planPlaces } from './plan.ts';
import { buildPlacesReport, formatPlacesReport } from './report.ts';
import { buildSchedule, changedDays, weekAhead } from './schedule.ts';
import type { PlaceSource } from './sources.ts';
import { parseRange, parseRanges, parseTime } from './time.ts';
import { parseHoursPage, periodFor, UHD_HOURS_URL } from './uhd-hours.ts';

const td = (text: string) => `<td style="font-size:0.85rem;">${text}</td>`;
const hoursRow = (name: string, cells: string[]) =>
  `<tr><td style="background-color:#ebeced;"><strong>${name}</strong></td>${cells.map(td).join('')}</tr>`;
const period = (summary: string, rows: string) =>
  `<details><summary>${summary}</summary><h5>Restaurants</h5><table><thead><tr><th></th><th>Monday</th></tr></thead><tbody>${rows}</tbody></table></details>`;

const WEEKDAY_HOURS = ['9:30am - 5:00pm', '9:30am - 5:00pm', '9:30am - 5:00pm', '9:30am - 5:00pm'];
const hoursPage = [
  period(
    'Fall 2026 Semester (08/24/26 - 12/15/26)',
    hoursRow('Panda Express', [
      ...WEEKDAY_HOURS,
      '9:30am - 5:00pm',
      '11:00am - 5:00pm',
      '1:00pm - 5:00pm',
    ]) +
      hoursRow('Jesta Pizza', [
        '4:00pm - Midnight',
        '4:00pm - Midnight',
        '4:00pm - Midnight',
        '4:00pm - Midnight',
        '4:00pm - Midnight',
        'Closed',
        '5:00pm - Midnight',
      ]) +
      hoursRow(
        'La Fonda Food Trailer',
        Array(5)
          .fill('<div>8:00am - 10:30am</div><div style="margin-top:0.2rem;">11:00am - 2:00pm</div>')
          .concat(['Closed', 'Closed']),
      ),
  ),
  period(
    'Thanskgiving Break (11/23/26 - 11/29/26)',
    hoursRow('Panda Express', Array(7).fill('Closed')) +
      hoursRow('Jesta Pizza', [...Array(6).fill('Closed'), '5:00pm - Midnight']),
  ),
].join('');

describe('time parsing', () => {
  it('reads the formats UT uses', () => {
    expect(parseTime('10:00 am')).toBe(1000);
    expect(parseTime('4:00pm')).toBe(1600);
    expect(parseTime('Noon')).toBe(1200);
    expect(parseTime('Midnight')).toBe(2359);
    expect(parseTime('8:00 a.m.')).toBe(800);
    expect(parseTime('12:30 p.m.')).toBe(1230);
    expect(parseTime('13:00')).toBeNull();
  });

  it('borrows the closing meridiem and caps overnight ranges at midnight', () => {
    expect(parseRange('6:30 - 10 a.m.')).toEqual({ open: 630, close: 1000 });
    expect(parseRange('11 a.m. - 12 a.m.')).toEqual({ open: 1100, close: 2359 });
    expect(parseRange('10:00 am – 4:00 am')).toEqual({ open: 1000, close: 2359 });
  });

  it('treats closed cells as no ranges and rejects text it cannot read', () => {
    expect(parseRanges(['Closed'])).toEqual([]);
    expect(parseRanges(['Closed for Fall Break'])).toEqual([]);
    expect(parseRanges(['See website'])).toBeNull();
  });
});

describe('UHD hours page', () => {
  const parsed = parseHoursPage(hoursPage);

  it('reads every period and row', () => {
    expect(parsed.unreadable).toEqual([]);
    expect(parsed.periods.map((p) => [p.title, p.start, p.end])).toEqual([
      ['Fall 2026 Semester', '2026-08-24', '2026-12-15'],
      ['Thanskgiving Break', '2026-11-23', '2026-11-29'],
    ]);
    const fonda = parsed.periods[0].rows.get('la fonda food trailer');
    expect(fonda?.monday).toEqual([
      { open: 800, close: 1030 },
      { open: 1100, close: 1400 },
    ]);
    expect(parsed.periods[0].rows.get('jesta pizza')?.saturday).toEqual([]);
  });

  it('prefers the shortest period that lists the place', () => {
    expect(periodFor(parsed.periods, '2026-11-27', 'Panda Express')?.title).toBe(
      'Thanskgiving Break',
    );
    expect(periodFor(parsed.periods, '2026-11-30', 'Panda Express')?.title).toBe(
      'Fall 2026 Semester',
    );
    expect(periodFor(parsed.periods, '2026-11-27', 'La Fonda Food Trailer')?.title).toBe(
      'Fall 2026 Semester',
    );
    expect(periodFor(parsed.periods, '2027-01-05', 'Panda Express')).toBeNull();
  });

  it('reports rows it cannot read', () => {
    const broken = parseHoursPage(
      period(
        'Fall 2026 Semester (08/24/26 - 12/15/26)',
        hoursRow('Panda Express', Array(7).fill('TBD')),
      ),
    );
    expect(broken.unreadable).toEqual(['Fall 2026 Semester: Panda Express monday "TBD"']);
  });
});

describe('buildSchedule', () => {
  const { periods } = parseHoursPage(hoursPage);

  it('lists the next seven days starting today', () => {
    expect(weekAhead('2026-11-27').map((d) => d.day)).toEqual([
      'friday',
      'saturday',
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
    ]);
  });

  it('uses break hours for days inside the break and semester hours after it', () => {
    const { hours, days } = buildSchedule({
      current: null,
      today: '2026-11-27',
      periods,
      hoursRow: 'Jesta Pizza',
    });
    expect(hours.friday).toEqual({ timeRanges: [], isClosed: true });
    expect(hours.sunday.timeRanges).toEqual([{ open: 1700, close: 2359 }]);
    expect(hours.monday.timeRanges).toEqual([{ open: 1600, close: 2359 }]);
    expect(days.find((d) => d.day === 'monday')?.from).toBe('Fall 2026 Semester');
  });

  it('closes food trucks during breaks and keeps days UT has not posted', () => {
    const truckWeek = {
      monday: [{ open: 1100, close: 1700 }],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [{ open: 1100, close: 1700 }],
      saturday: [],
      sunday: [],
    };
    const thanksgiving = buildSchedule({ current: null, today: '2026-11-27', periods, truckWeek });
    expect(thanksgiving.hours.friday.isClosed).toBe(true);
    expect(thanksgiving.hours.monday.timeRanges).toEqual([{ open: 1100, close: 1700 }]);

    const current = { tuesday: { timeRanges: [{ open: 900, close: 1000 }], isClosed: false } };
    const winter = buildSchedule({
      current,
      today: '2027-01-04',
      periods,
      hoursRow: 'Panda Express',
    });
    expect(winter.hours.tuesday).toEqual(current.tuesday);
    expect(winter.days.every((d) => d.from === null)).toBe(true);
  });

  it('compares schedules by their open ranges only', () => {
    const before = { monday: { timeRanges: [{ open: 700, close: 1000 }], isClosed: true } };
    const { hours } = buildSchedule({
      current: null,
      today: '2026-11-27',
      periods,
      hoursRow: 'Panda Express',
    });
    expect(
      changedDays(before, { ...hours, monday: { timeRanges: [], isClosed: true } }),
    ).not.toContain('monday');
  });
});

const trucksPage = `
  <article class="uhd-alt-1 uhd-dining-location clearfix"><h3><a href="/eat/food-trucks/tacowey"><span>Tacowey</span></a></h3></article>
  <article class="uhd-alt-1 uhd-dining-location clearfix"><h3><a href="/kriya-matcha"><span>Kriya Matcha</span></a></h3></article>
  <h3 class="ut-headline"><a href="/eat/food-trucks/vendor-instructions">Vendor Instructions</a></h3>`;

const truckPage = (rows: string) => `
  <div class="field field--name-field-uhd-hours-paragraph"><h2>Hours</h2><div><h2>Fall Hours</h2>
  <table class="office-hours__table"><thead><tr><th colspan="3">Day</th><th>Time slot</th><th>Comment</th></tr></thead>
  <tbody>${rows}</tbody></table></div></div>`;

describe('Unions food truck pages', () => {
  it('lists only the trucks', () => {
    expect(parseUnionsTrucks(trucksPage)).toEqual([
      { name: 'Tacowey', url: 'https://universityunions.utexas.edu/eat/food-trucks/tacowey' },
      { name: 'Kriya Matcha', url: 'https://universityunions.utexas.edu/kriya-matcha' },
    ]);
  });

  it('reads day ranges and closed rows', () => {
    const result = parseUnionsHours(
      truckPage(
        '<tr><td>Monday - Friday: </td><td>8:00 a.m. - 2:00 p.m.</td><td></td></tr><tr><td>Saturday - Sunday: </td><td></td><td>Closed.</td></tr>',
      ),
    );
    expect('error' in result).toBe(false);
    if ('error' in result) return;
    expect(result.heading).toBe('Fall Hours');
    expect(result.week.friday).toEqual([{ open: 800, close: 1400 }]);
    expect(result.week.sunday).toEqual([]);
  });

  it('reports a table it cannot read', () => {
    expect(parseUnionsHours('<div></div>')).toEqual({ error: 'No hours table' });
    expect(
      parseUnionsHours(truckPage('<tr><td>Weekdays:</td><td>9 a.m. - 1 p.m.</td></tr>')),
    ).toEqual({
      error: 'Unreadable days "Weekdays:"',
    });
  });

  it('parses day lists', () => {
    expect(parseDaySpec('Tuesday, Thursday:')).toEqual(['tuesday', 'thursday']);
    expect(parseDaySpec('Mon - Wed')).toEqual(['monday', 'tuesday', 'wednesday']);
    expect(parseDaySpec('Sunday')).toEqual(['sunday']);
  });
});

const uhdPage = (methods: string[]) => `
  <div class="field field--name-field-uhd-dl-payment-type"><h2>Methods of Payment</h2><div class="field__items">
  ${methods.map((m) => `<div class="field__item"><div><img alt=""></div><div><div>${m}</div></div></div>`).join('')}
  </div></div>`;

describe('UHD location pages', () => {
  it('reads payment methods and flags new ones', () => {
    expect(parsePaymentMethods(uhdPage(['Credit/Debit', 'Dine In Dollars', 'Apple Pay']))).toEqual({
      methods: ['Credit/Debit', 'Dine In Dollars'],
      unknown: ['Apple Pay'],
    });
    expect(parsePaymentMethods('<main></main>')).toBeNull();
  });

  it('lists places but not dining halls', () => {
    const html =
      '<a href="/dining/dining-locations/restaurants/noodle-lab">Noodle Lab</a><a href="/dining/dining-locations/dining-halls/j2">J2</a><a href="/dining/dining-locations/restaurants">Restaurants</a>';
    expect(parseUhdList(html)).toEqual([
      {
        name: 'Noodle Lab',
        url: 'https://housing.utexas.edu/dining/dining-locations/restaurants/noodle-lab',
      },
    ]);
  });
});

describe('planPlaces', () => {
  const sources: PlaceSource[] = [
    {
      location: 'Panda Express',
      hoursRow: 'Panda Express',
      uhdPage: 'https://housing.utexas.edu/dining/dining-locations/restaurants/panda-express',
    },
    {
      location: 'Tacowey',
      unionsTruck: 'https://universityunions.utexas.edu/eat/food-trucks/tacowey',
    },
  ];
  const pages: Pages = new Map<string, string | Error>([
    [UHD_HOURS_URL, hoursPage],
    [UHD_LISTS[0], '<a href="/dining/dining-locations/restaurants/noodle-lab">Noodle Lab</a>'],
    [UHD_LISTS[1], '<a href="/dining/dining-locations/coffee-shops/jester-java">Jester Java</a>'],
    [UHD_LISTS[2], new Error('HTTP 503')],
    [UNIONS_TRUCKS_URL, trucksPage],
    [sources[0].uhdPage ?? '', uhdPage(['Credit/Debit'])],
    [
      sources[1].unionsTruck ?? '',
      truckPage('<tr><td>Monday - Friday:</td><td>11:00 a.m. - 5:00 p.m.</td><td></td></tr>'),
    ],
  ]);
  const panda = {
    id: 'panda',
    name: 'Panda Express',
    regular_service_hours: {},
    methods_of_payment: ['Bevo Pay', 'Credit/Debit'],
  };

  it('plans updates and reports drift', () => {
    const plan = planPlaces({ pages, sources, locations: [panda], today: '2026-11-27' });
    expect(plan.synced).toBe(1);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].methods_of_payment).toEqual(['Credit/Debit']);
    expect(plan.updates[0].regular_service_hours?.monday.timeRanges).toEqual([
      { open: 930, close: 1700 },
    ]);
    expect(plan.problems.map((p) => `${p.kind}: ${p.detail}`)).toEqual([
      'unreachable: HTTP 503',
      'new: Noodle Lab',
      'new: Jester Java',
      'new: Kriya Matcha',
      'new: "jesta pizza" on the hours page',
      'new: "la fonda food trailer" on the hours page',
      'missing: Tacowey',
    ]);
    const report = buildPlacesReport({ today: '2026-11-27', ...plan, checkedAt: 'now' });
    expect(report.failed).toBe(true);
    expect(formatPlacesReport(report)).toContain('### New on UT’s sites, not synced yet');
  });

  it('changes nothing when the database already matches', () => {
    const first = planPlaces({ pages, sources, locations: [panda], today: '2026-11-27' });
    const synced = {
      ...panda,
      regular_service_hours: first.updates[0].regular_service_hours,
      methods_of_payment: ['Credit/Debit'],
    };
    const second = planPlaces({ pages, sources, locations: [synced], today: '2026-11-27' });
    expect(second.updates).toEqual([]);
  });
});

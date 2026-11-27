import { describe, expect, it } from 'vitest';

import { planStripDates } from './mealPlanDays';

describe('planStripDates', () => {
  it('spans the range around today, one entry per day in order', () => {
    const dates = planStripDates('2026-11-27', { before: 2, after: 3 }, []);
    expect(dates).toEqual([
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
      '2026-11-30',
    ]);
  });

  it('reaches back or ahead to include plan days outside the range', () => {
    const dates = planStripDates('2026-11-27', { before: 1, after: 1 }, [
      '2026-11-20',
      '2026-12-02',
    ]);
    expect(dates[0]).toBe('2026-11-20');
    expect(dates.at(-1)).toBe('2026-12-02');
    expect(dates).toHaveLength(13);
  });

  it('crosses a month and a daylight saving change without gaps', () => {
    const dates = planStripDates('2026-11-01', { before: 3, after: 3 }, []);
    expect(dates).toEqual([
      '2026-10-29',
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
    ]);
  });
});

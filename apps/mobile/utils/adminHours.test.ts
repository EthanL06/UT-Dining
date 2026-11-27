import { describe, expect, it } from 'vitest';
import { formatDayRanges, parseDayRanges, parseHoursDraft, toHoursDraft } from './adminHours';

describe('formatDayRanges', () => {
  it('keeps leading zeros and joins ranges', () => {
    expect(
      formatDayRanges({
        isClosed: false,
        timeRanges: [
          { open: 700, close: 1400 },
          { open: 1630, close: 2359 },
        ],
      }),
    ).toBe('07:00-14:00, 16:30-23:59');
  });

  it('is blank for a closed day', () => {
    expect(formatDayRanges({ isClosed: true, timeRanges: [{ open: 700, close: 900 }] })).toBe('');
    expect(formatDayRanges(undefined)).toBe('');
  });
});

describe('parseDayRanges', () => {
  it('reads one or more ranges and sorts them', () => {
    expect(parseDayRanges('16:30-20:00, 7:00-14:00')).toEqual({
      kind: 'ok',
      day: {
        isClosed: false,
        timeRanges: [
          { open: 700, close: 1400 },
          { open: 1630, close: 2000 },
        ],
      },
    });
  });

  it('treats blank as closed', () => {
    expect(parseDayRanges('  ')).toEqual({ kind: 'ok', day: { isClosed: true, timeRanges: [] } });
  });

  it('allows a day that starts at midnight', () => {
    expect(parseDayRanges('00:00-04:00')).toEqual({
      kind: 'ok',
      day: { isClosed: false, timeRanges: [{ open: 0, close: 400 }] },
    });
  });

  it.each([
    '7am-2pm',
    '14:00-07:00',
    '07:00-07:00',
    '25:00-26:00',
    '07:00',
    '07:00-09:00-10:00',
    '07:00-12:00, 11:00-13:00',
  ])('refuses %s', (text) => {
    expect(parseDayRanges(text)).toEqual({ kind: 'invalid' });
  });
});

describe('hours drafts', () => {
  it('round trips a week', () => {
    const draft = toHoursDraft({
      monday: { isClosed: false, timeRanges: [{ open: 730, close: 1700 }] },
    });
    expect(draft.monday).toBe('07:30-17:00');
    expect(draft.sunday).toBe('');
    const parsed = parseHoursDraft(draft);
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      expect(parsed.hours.monday.timeRanges).toEqual([{ open: 730, close: 1700 }]);
      expect(parsed.hours.sunday.isClosed).toBe(true);
    }
  });

  it('names every day that does not parse', () => {
    const draft = { ...toHoursDraft(null), tuesday: 'nope', friday: '9-5' };
    expect(parseHoursDraft(draft)).toEqual({ kind: 'invalid', days: ['tuesday', 'friday'] });
  });
});

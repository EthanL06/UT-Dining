import { describe, expect, it } from 'vitest';
import {
  applyHours,
  emptyHours,
  formatHours,
  moveItem,
  parseAssignments,
  parseChange,
  parseDays,
  parseMealTime,
  parseRanges,
  parseTime,
  parseVersion,
} from './parse.ts';

describe('parseTime', () => {
  it.each([
    ['07:00', 700],
    ['7', 700],
    ['1430', 1430],
    ['700', 700],
    ['2:30pm', 1430],
    ['12am', 0],
    ['12pm', 1200],
    ['24:00', 2400],
  ])('reads %s', (input, expected) => {
    expect(parseTime(input)).toBe(expected);
  });

  it.each(['25:00', '7:60', '13pm', 'noon', ''])('rejects %s', (input) => {
    expect(() => parseTime(input)).toThrow();
  });
});

describe('parseRanges', () => {
  it('sorts ranges', () => {
    expect(parseRanges('17:00-21:00, 7am-2pm')).toEqual([
      { open: 700, close: 1400 },
      { open: 1700, close: 2100 },
    ]);
  });

  it('rejects overlaps and backwards ranges', () => {
    expect(() => parseRanges('07:00-14:00,13:00-15:00')).toThrow('overlap');
    expect(() => parseRanges('14:00-07:00')).toThrow('closes before');
  });
});

describe('parseDays', () => {
  it('expands groups and short names in week order', () => {
    expect(parseDays('sat,weekdays')).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]);
    expect(parseDays('all')).toHaveLength(7);
  });

  it('rejects unknown days', () => {
    expect(() => parseDays('funday')).toThrow('Unknown day');
  });
});

describe('applyHours', () => {
  it('changes only the given days', () => {
    const start = applyHours(emptyHours(), ['monday'], [{ open: 700, close: 1400 }]);
    const next = applyHours(start, ['tuesday'], [{ open: 800, close: 1000 }]);
    expect(next.monday).toEqual({ timeRanges: [{ open: 700, close: 1400 }], isClosed: false });
    expect(next.tuesday.timeRanges).toEqual([{ open: 800, close: 1000 }]);
    expect(applyHours(next, ['monday'], null).monday).toEqual({ timeRanges: [], isClosed: true });
    expect(formatHours(next)[1]).toEqual({ day: 'monday', hours: '7:00 AM - 2:00 PM' });
  });
});

describe('parseChange', () => {
  it('reads icon, title and description', () => {
    expect(parseChange('zap|Faster|Menus load in half the time')).toEqual({
      icon: 'zap',
      title: 'Faster',
      description: 'Menus load in half the time',
    });
  });

  it('defaults the icon when the first part is not one', () => {
    expect(parseChange('New design|Every screen')).toEqual({
      icon: 'sparkles',
      title: 'New design',
      description: 'Every screen',
    });
    expect(parseChange('zap')).toEqual({ icon: 'sparkles', title: 'zap' });
  });
});

describe('helpers', () => {
  it('parses meal times', () => {
    expect(parseMealTime('Late Night=21:00-24:00')).toEqual({
      name: 'Late Night',
      start_time: 2100,
      end_time: 2400,
    });
  });

  it('parses assignments as JSON when possible', () => {
    expect(parseAssignments(['latitude=30.28', 'name=J2', 'force_close=true', 'note=a=b'])).toEqual(
      {
        latitude: 30.28,
        name: 'J2',
        force_close: true,
        note: 'a=b',
      },
    );
  });

  it('validates versions and moves items', () => {
    expect(parseVersion(' 2.0.0 ')).toBe('2.0.0');
    expect(() => parseVersion('2.0')).toThrow();
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
});

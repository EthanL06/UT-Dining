import { describe, expect, it } from 'vitest';
import { formatDateForDisplay } from './date';

describe('formatDateForDisplay', () => {
  it('labels days relative to the Central date, not the phone clock', () => {
    expect(formatDateForDisplay('2026-11-28', '2026-11-28')).toBe('Today');
    expect(formatDateForDisplay('2026-11-27', '2026-11-28')).toBe('Yesterday');
    expect(formatDateForDisplay('2026-11-29', '2026-11-28')).toBe('Tomorrow');
    expect(formatDateForDisplay('2026-12-01', '2026-11-28')).toBe('Dec 1');
  });

  it('crosses month and year ends', () => {
    expect(formatDateForDisplay('2026-12-31', '2027-01-01')).toBe('Yesterday');
    expect(formatDateForDisplay('2026-03-01', '2026-02-28')).toBe('Tomorrow');
  });
});

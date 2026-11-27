import { describe, expect, it } from 'vitest';
import { displayLocationName } from './locationName';

describe('displayLocationName', () => {
  const j2 = { name: 'J2 Dining', colloquial_name: 'J2' };

  it('uses the official name unless colloquial names are on', () => {
    expect(displayLocationName(j2, false)).toBe('J2 Dining');
    expect(displayLocationName(j2, true)).toBe('J2');
  });

  it('falls back to the official name when there is no colloquial one', () => {
    expect(displayLocationName({ name: 'Kins Dining', colloquial_name: null }, true)).toBe(
      'Kins Dining',
    );
    expect(displayLocationName({ name: 'Kins Dining', colloquial_name: '' }, true)).toBe(
      'Kins Dining',
    );
  });
});

import { describe, expect, it } from 'vitest';
import { LOCATIONS, selectLocations } from './config.ts';

describe('selectLocations', () => {
  it('returns every location when no name is given', () => {
    expect(selectLocations(undefined)).toEqual(LOCATIONS);
    expect(selectLocations('  ')).toEqual(LOCATIONS);
  });

  it('picks one location by name, ignoring case', () => {
    expect(selectLocations('kins dining').map((location) => location.name)).toEqual([
      'Kins Dining',
    ]);
  });

  it('refuses a name the scraper does not know', () => {
    expect(() => selectLocations('Nowhere')).toThrow(/Unknown location "Nowhere"/);
  });
});

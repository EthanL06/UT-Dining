import { describe, expect, it } from 'vitest';
import { walkingMinutes, walkLabel } from './mapPlaces';

describe('walkLabel', () => {
  it('shows minutes for a walk on campus', () => {
    expect(walkLabel(1)).toBe('1 min walk');
    expect(walkLabel(45)).toBe('45 min walk');
  });

  it('shows miles instead of an absurd walk time', () => {
    expect(walkLabel(60)).toBe('2.4 mi away');
    expect(walkLabel(3109)).toBe('124 mi away');
  });

  it('agrees with walkingMinutes for Austin to Houston', () => {
    const austin = { latitude: 30.2849, longitude: -97.7341 };
    const houston = { latitude: 29.7604, longitude: -95.3698 };
    expect(walkLabel(walkingMinutes(austin, houston))).toBe('146 mi away');
  });
});

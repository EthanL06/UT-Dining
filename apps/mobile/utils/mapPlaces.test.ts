import { describe, expect, it } from 'vitest';
import { type PinnedPlace, stackOverlappingPins, walkingMinutes, walkLabel } from './mapPlaces';

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

describe('stackOverlappingPins', () => {
  const pin = (name: string, latitude: number, longitude: number): PinnedPlace => ({
    name,
    address: '',
    description: '',
    coordinates: { latitude, longitude },
    type: 'Dining Hall',
    hasMenu: true,
    isOpen: true,
    status: 'Open',
  });
  const j2 = pin('J2 Dining', 30.282682363225522, -97.73679372627767);
  const jcl = pin('JCL Dining', 30.28277572526695, -97.7370539650819);
  const kins = pin('Kins Dining', 30.290362065716167, -97.73941260816498);
  const region = {
    latitude: 30.2827,
    longitude: -97.7369,
    latitudeDelta: 0.004,
    longitudeDelta: 0.004,
  };

  it('stacks J2 and JCL so both can be tapped', () => {
    const [first, second, third] = stackOverlappingPins([j2, jcl, kins], region, 400);
    expect([first.place.name, second.place.name]).toEqual(['JCL Dining', 'J2 Dining']);
    const pointsPerLat = 400 / 0.004 / Math.cos((region.latitude * Math.PI) / 180);
    const gap = (first.coordinates.latitude - second.coordinates.latitude) * pointsPerLat;
    expect(gap).toBeCloseTo(40);
    expect(first.coordinates.longitude).toBe(second.coordinates.longitude);
    expect(third).toEqual({ place: kins, coordinates: kins.coordinates });
  });

  it('leaves them where they are once zoomed in far enough', () => {
    const close = { ...region, latitudeDelta: 0.0004, longitudeDelta: 0.0004 };
    expect(stackOverlappingPins([j2, jcl], close, 400)).toEqual([
      { place: j2, coordinates: j2.coordinates },
      { place: jcl, coordinates: jcl.coordinates },
    ]);
  });
});

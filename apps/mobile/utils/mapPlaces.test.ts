import { describe, expect, it } from 'vitest';
import {
  mapMarkers,
  type PinnedPlace,
  stackOverlappingPins,
  walkingMinutes,
  walkLabel,
} from './mapPlaces';

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

describe('mapMarkers', () => {
  const place = (name: string, latitude: number, longitude: number, isOpen: boolean) => ({
    name,
    address: '',
    description: '',
    coordinates: { latitude, longitude },
    type: 'Restaurant',
    hasMenu: false,
    isOpen,
    status: isOpen ? 'Open until 9 PM' : 'Closed',
  });
  const union = [
    place('Shake Smart', 30.2865267, -97.7411533, false),
    place('Chick-fil-A', 30.2866091, -97.7411437, false),
    place('Coffee Union House', 30.2860731, -97.7411286, false),
    place('Panda Express', 30.2867626, -97.7411207, false),
    place('Noodle Lab', 30.2867626, -97.7411207, false),
    place('Hook em Hut', 30.2866374, -97.7410159, false),
    place('Tower Burgers', 30.2864312, -97.7410134, false),
  ];
  const labelZoom = {
    latitude: 30.285,
    longitude: -97.739,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  it('groups closed places in one building into a count instead of a column', () => {
    const markers = mapMarkers(union, labelZoom, 400);
    const sizes = markers.map((marker) =>
      marker.kind === 'cluster' ? marker.cluster.places.length : 1,
    );
    expect(sizes.sort()).toEqual([1, 6]);
  });

  it('keeps a short stack of open labels so J2 and JCL are both tappable', () => {
    const j2 = place('J2 Dining', 30.282682, -97.736793, true);
    const jcl = place('JCL Dining', 30.282775, -97.737053, true);
    const markers = mapMarkers([j2, jcl], labelZoom, 400);
    expect(markers.map((marker) => marker.kind)).toEqual(['place', 'place']);
  });

  it('turns a tall stack of open labels into a count', () => {
    const open = union.map((closed) => ({ ...closed, isOpen: true }));
    const markers = mapMarkers(open, labelZoom, 400);
    expect(markers.filter((marker) => marker.kind === 'cluster')).toHaveLength(1);
  });

  it('spreads everything out once zoomed in close', () => {
    const close = {
      ...labelZoom,
      latitude: 30.2865,
      latitudeDelta: 0.0012,
      longitudeDelta: 0.0012,
    };
    const markers = mapMarkers(union, close, 400);
    expect(markers.every((marker) => marker.kind === 'place')).toBe(true);
    expect(markers).toHaveLength(7);
  });
});

import type { Region } from 'react-native-maps';

export type Coordinates = { latitude: number; longitude: number };

export type Place = {
  name: string;
  locationName?: string;
  address: string;
  description: string;
  coordinates: Coordinates | null;
  type: string;
  hasMenu: boolean;
  note?: string;
  isOpen: boolean;
  status: string;
};

export type PinnedPlace = Place & { coordinates: Coordinates };

export const isPinned = (place: Place): place is PinnedPlace => place.coordinates !== null;

export type Cluster = { id: string; coordinates: Coordinates; places: PinnedPlace[] };

export type ZoomLevel = 'pins' | 'labels';

const LABELS_BELOW_DELTA = 0.0055;
const WALKING_METERS_PER_MINUTE = 80;
const WALKING_DETOUR = 1.25;

export const zoomLevelFor = (region: Region): ZoomLevel =>
  region.latitudeDelta < LABELS_BELOW_DELTA ? 'labels' : 'pins';

const CLUSTER_DISTANCE_POINTS = 50;

const centerOf = (places: PinnedPlace[]): Coordinates => ({
  latitude: places.reduce((sum, p) => sum + p.coordinates.latitude, 0) / places.length,
  longitude: places.reduce((sum, p) => sum + p.coordinates.longitude, 0) / places.length,
});

export const clusterPlaces = (
  places: PinnedPlace[],
  region: Region,
  screenWidth: number,
): Cluster[] => {
  const pointsPerLng = screenWidth / region.longitudeDelta;
  const pointsPerLat = pointsPerLng / Math.cos((region.latitude * Math.PI) / 180);
  const distance = (a: Coordinates, b: Coordinates) =>
    Math.hypot(
      (a.longitude - b.longitude) * pointsPerLng,
      (a.latitude - b.latitude) * pointsPerLat,
    );

  let clusters: Cluster[] = places.map((place) => ({
    id: place.name,
    coordinates: place.coordinates,
    places: [place],
  }));

  let merged = true;
  while (merged) {
    merged = false;
    const next: Cluster[] = [];
    for (const cluster of clusters) {
      const near = next.find(
        (other) => distance(other.coordinates, cluster.coordinates) < CLUSTER_DISTANCE_POINTS,
      );
      if (near) {
        near.places.push(...cluster.places);
        near.coordinates = centerOf(near.places);
        merged = true;
      } else {
        next.push({ ...cluster, places: [...cluster.places] });
      }
    }
    clusters = next;
  }
  return clusters;
};

export const regionAround = (places: PinnedPlace[]): Region => {
  const lats = places.map((p) => p.coordinates.latitude);
  const lngs = places.map((p) => p.coordinates.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.8, 0.004),
    longitudeDelta: Math.max((maxLng - minLng) * 1.8, 0.004),
  };
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const walkingMinutes = (from: Coordinates, to: Coordinates) => {
  const earthRadius = 6_371_000;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLng = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLng / 2) ** 2;
  const meters = 2 * earthRadius * Math.asin(Math.sqrt(a));
  return Math.max(1, Math.round((meters * WALKING_DETOUR) / WALKING_METERS_PER_MINUTE));
};

export const walkFrom = (from: Coordinates | null, place: Place) =>
  from && place.coordinates ? walkingMinutes(from, place.coordinates) : null;

const MAX_WALK_MINUTES = 45;
const METERS_PER_MILE = 1609.344;

export const walkLabel = (minutes: number) => {
  if (minutes <= MAX_WALK_MINUTES) return `${minutes} min walk`;
  const miles = (minutes * WALKING_METERS_PER_MINUTE) / WALKING_DETOUR / METERS_PER_MILE;
  return miles < 10 ? `${miles.toFixed(1)} mi away` : `${Math.round(miles)} mi away`;
};

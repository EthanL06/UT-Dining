export type DirectionsTarget = {
  link?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

export const directionsUrl = (target: DirectionsTarget, platform: 'ios' | 'android') => {
  const link = target.link?.trim();
  if (link) return link;
  const hasCoordinates =
    typeof target.latitude === 'number' && typeof target.longitude === 'number';
  const destination = hasCoordinates
    ? `${target.latitude},${target.longitude}`
    : target.address?.trim();
  if (!destination) return null;
  const query = encodeURIComponent(destination);
  return platform === 'ios'
    ? `maps://?daddr=${query}&dirflg=w`
    : `https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=walking`;
};

import { Activity, Trip } from '../types';

export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Calculates Great Circle Distance between two coordinates in Kilometers (Haversine formula).
 * Canonical implementation supporting LatLng coordinate objects or individual lat/lng numbers.
 */
export function calculateHaversineDistanceKm(
  coord1: LatLng,
  coord2: LatLng
): number;
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  precision?: number
): number;
export function calculateHaversineDistanceKm(
  arg1: LatLng | number,
  arg2: LatLng | number,
  arg3?: number,
  arg4?: number,
  precision?: number
): number {
  let lat1: number, lon1: number, lat2: number, lon2: number;
  let roundToInt = true;
  let decimals = 0;

  if (typeof arg1 === 'object' && typeof arg2 === 'object') {
    lat1 = arg1.lat;
    lon1 = arg1.lng;
    lat2 = arg2.lat;
    lon2 = arg2.lng;
    roundToInt = true;
  } else {
    lat1 = arg1 as number;
    lon1 = arg2 as number;
    lat2 = arg3 as number;
    lon2 = arg4 as number;
    roundToInt = precision === undefined;
    decimals = precision ?? 1;
  }

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return roundToInt ? Math.round(dist) : Number(dist.toFixed(decimals));
}

/**
 * Gets exact or approximate coordinates for an activity dynamically
 */
export function getActivityCoordinates(
  activity: Activity,
  _destinationName: string,
  indexInDay: number = 0,
  totalInDay: number = 1
): LatLng {
  // If activity already has valid coordinates from AI or Google Maps
  if (
    activity.coordinates &&
    typeof activity.coordinates.lat === 'number' &&
    typeof activity.coordinates.lng === 'number' &&
    !isNaN(activity.coordinates.lat) &&
    !isNaN(activity.coordinates.lng)
  ) {
    return activity.coordinates;
  }

  // Fallback organic offset if coordinates not populated
  const angle = (indexInDay / Math.max(totalInDay, 1)) * Math.PI * 1.5 + indexInDay * 0.4;
  const distanceKm = 1.2 + (indexInDay * 1.8) % 6;

  const baseLat = 20.0;
  const baseLng = 78.0;

  const latOffset = (Math.sin(angle) * distanceKm) / 111;
  const lngOffset = (Math.cos(angle) * distanceKm) / (111 * Math.cos((baseLat * Math.PI) / 180));

  return {
    lat: Number((baseLat + latOffset).toFixed(6)),
    lng: Number((baseLng + lngOffset).toFixed(6))
  };
}

/**
 * Helper to get the best Google Maps view center for a trip or active day dynamically
 */
export function getDestinationMapCenter(
  trip: Trip,
  activities: Activity[]
): { center: LatLng; zoom: number } {
  const validCoords = activities
    .map((act) => act.coordinates)
    .filter((c): c is LatLng => Boolean(c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat)));

  if (validCoords.length > 0) {
    const avgLat = validCoords.reduce((acc, c) => acc + c.lat, 0) / validCoords.length;
    const avgLng = validCoords.reduce((acc, c) => acc + c.lng, 0) / validCoords.length;
    return {
      center: { lat: Number(avgLat.toFixed(6)), lng: Number(avgLng.toFixed(6)) },
      zoom: validCoords.length > 3 ? 12 : 14
    };
  }

  return {
    center: { lat: 20.5937, lng: 78.9629 },
    zoom: 12
  };
}

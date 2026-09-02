import { Activity, Trip } from '../types';

export interface LatLng {
  lat: number;
  lng: number;
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

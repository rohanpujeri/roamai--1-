import { LatLng } from './geoCoordinates';

/**
 * Parses time string (e.g. "09:30 AM", "2:15 PM") into minutes from midnight for sorting
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3]?.toUpperCase();

  if (meridian === 'PM' && hours < 12) hours += 12;
  if (meridian === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Builds external Google Maps URL for single destination navigation
 */
export function buildGoogleMapsPlaceUrl(lat: number, lng: number, placeName?: string): string {
  const query = placeName
    ? `&destination_place_id=${encodeURIComponent(placeName)}`
    : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}${query}`;
}

/**
 * Builds external Google Maps URL for multi-stop day route
 */
export function buildGoogleMapsMultiStopUrl(
  stops: { title?: string; location?: string; lat?: number; lng?: number }[],
  destinationName?: string
): string {
  if (!stops || stops.length === 0) return '';
  
  // Format coordinate or text query for stop
  const formatStop = (s: { title?: string; location?: string; lat?: number; lng?: number }) => {
    if (typeof s.lat === 'number' && typeof s.lng === 'number') {
      return `${s.lat},${s.lng}`;
    }
    const loc = s.location || destinationName || '';
    const name = s.title ? (loc ? `${s.title}, ${loc}` : s.title) : (loc || 'Location');
    return encodeURIComponent(name);
  };

  const origin = formatStop(stops[0]);
  const destination = formatStop(stops[stops.length - 1]);
  const waypoints = stops
    .slice(1, -1)
    .map((s) => formatStop(s))
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }
  return url;
}

/**
 * Standard category color styling for Google Maps pins
 */
export const MAP_DEFAULT_CATEGORY_STYLES: Record<string, { bg: string; text: string; pinBg: string; glyphColor: string }> = {
  Sightseeing: { bg: 'bg-emerald-500', text: 'text-white', pinBg: '#10b981', glyphColor: '#ffffff' },
  Nature: { bg: 'bg-emerald-500', text: 'text-white', pinBg: '#059669', glyphColor: '#ffffff' },
  Food: { bg: 'bg-amber-500', text: 'text-white', pinBg: '#f59e0b', glyphColor: '#ffffff' },
  Adventure: { bg: 'bg-rose-500', text: 'text-white', pinBg: '#f43f5e', glyphColor: '#ffffff' },
  Relaxation: { bg: 'bg-sky-500', text: 'text-white', pinBg: '#0ea5e9', glyphColor: '#ffffff' },
  Culture: { bg: 'bg-purple-500', text: 'text-white', pinBg: '#a855f7', glyphColor: '#ffffff' },
  Nightlife: { bg: 'bg-indigo-500', text: 'text-white', pinBg: '#6366f1', glyphColor: '#ffffff' },
  Shopping: { bg: 'bg-pink-500', text: 'text-white', pinBg: '#ec4899', glyphColor: '#ffffff' },
  Transit: { bg: 'bg-slate-600', text: 'text-white', pinBg: '#475569', glyphColor: '#ffffff' }
};

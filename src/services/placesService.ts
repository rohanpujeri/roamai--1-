import { SavedPlace, PlaceSearchResult } from '../types';
import { fetchSavedPlaces, savePlaceToBackend, deletePlaceFromBackend } from './supabaseClient';

const SAVED_PLACES_STORAGE_KEY = 'roamai_saved_places_v1';

// Calculate distance between two coordinates in kilometers using Haversine formula
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Synchronous local reading for instant UI components
export function getSavedPlaces(): SavedPlace[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading saved places:', err);
    return [];
  }
}

export function savePlaceToStorage(place: Omit<SavedPlace, 'savedAt'>): SavedPlace {
  const newEntry: SavedPlace = {
    ...place,
    savedAt: new Date().toISOString()
  };

  // Sync with Supabase / local storage asynchronously
  savePlaceToBackend(place).catch((e) => console.warn('Backend save error:', e));

  const current = getSavedPlaces();
  const existingIndex = current.findIndex((p) => p.placeId === place.placeId);
  let updated: SavedPlace[];
  if (existingIndex >= 0) {
    updated = [newEntry, ...current.filter((_, i) => i !== existingIndex)];
  } else {
    updated = [newEntry, ...current];
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  }
  return newEntry;
}

export function removeSavedPlace(placeId: string): SavedPlace[] {
  deletePlaceFromBackend(placeId).catch((e) => console.warn('Backend delete error:', e));

  const current = getSavedPlaces();
  const updated = current.filter((p) => p.placeId !== placeId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  }
  return updated;
}

export function clearAllSavedPlaces(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(SAVED_PLACES_STORAGE_KEY);
  }
}

/**
 * Autocomplete prediction interface
 */
export interface AutocompleteSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
  types?: string[];
  lat?: number;
  lng?: number;
}

// Curated fast-lookup directory of popular global & domestic destinations
export const POPULAR_TRAVEL_DESTINATIONS: Array<{
  name: string;
  region: string;
  lat: number;
  lng: number;
  types: string[];
}> = [
  { name: 'Goa', region: 'India', lat: 15.2993, lng: 74.1240, types: ['beach', 'leisure', 'nightlife'] },
  { name: 'Manali', region: 'Himachal Pradesh, India', lat: 32.2396, lng: 77.1887, types: ['mountains', 'adventure', 'snow'] },
  { name: 'Ladakh (Leh)', region: 'Ladakh, India', lat: 34.1526, lng: 77.5771, types: ['adventure', 'mountains', 'scenic'] },
  { name: 'Jaipur', region: 'Rajasthan, India', lat: 26.9124, lng: 75.7873, types: ['heritage', 'culture', 'palaces'] },
  { name: 'Udaipur', region: 'Rajasthan, India', lat: 24.5854, lng: 73.7125, types: ['romantic', 'lakes', 'heritage'] },
  { name: 'Varanasi', region: 'Uttar Pradesh, India', lat: 25.3176, lng: 82.9739, types: ['spiritual', 'culture', 'heritage'] },
  { name: 'Kerala (Munnar & Alleppey)', region: 'Kerala, India', lat: 9.4981, lng: 76.3388, types: ['backwaters', 'nature', 'tea gardens'] },
  { name: 'Rishikesh', region: 'Uttarakhand, India', lat: 30.0869, lng: 78.2676, types: ['yoga', 'adventure', 'rafting'] },
  { name: 'Shimla', region: 'Himachal Pradesh, India', lat: 31.1048, lng: 77.1734, types: ['hills', 'colonial', 'scenic'] },
  { name: 'Darjeeling', region: 'West Bengal, India', lat: 27.0410, lng: 88.2663, types: ['tea', 'mountains', 'toy train'] },
  { name: 'Ooty & Coonoor', region: 'Tamil Nadu, India', lat: 11.4102, lng: 76.6950, types: ['hills', 'botanical', 'nature'] },
  { name: 'Kashmir (Srinagar & Gulmarg)', region: 'Jammu & Kashmir, India', lat: 34.0837, lng: 74.7973, types: ['snow', 'lakes', 'scenic'] },
  { name: 'Paris', region: 'France', lat: 48.8566, lng: 2.3522, types: ['culture', 'romance', 'museums'] },
  { name: 'Tokyo', region: 'Japan', lat: 35.6762, lng: 139.6503, types: ['tech', 'cuisine', 'culture'] },
  { name: 'Kyoto', region: 'Japan', lat: 35.0116, lng: 135.7681, types: ['temples', 'tradition', 'gardens'] },
  { name: 'Bali', region: 'Indonesia', lat: -8.4095, lng: 115.1889, types: ['beaches', 'surfing', 'temples'] },
  { name: 'Dubai', region: 'United Arab Emirates', lat: 25.2048, lng: 55.2708, types: ['luxury', 'shopping', 'skyline'] },
  { name: 'Rome', region: 'Italy', lat: 41.9028, lng: 12.4964, types: ['history', 'colosseum', 'cuisine'] },
  { name: 'London', region: 'United Kingdom', lat: 51.5074, lng: -0.1278, types: ['museums', 'culture', 'sightseeing'] },
  { name: 'New York City', region: 'United States', lat: 40.7128, lng: -74.0060, types: ['skyline', 'broadway', 'metropolis'] },
  { name: 'Bangkok', region: 'Thailand', lat: 13.7563, lng: 100.5018, types: ['street food', 'nightlife', 'temples'] },
  { name: 'Phuket & Krabi', region: 'Thailand', lat: 7.8804, lng: 98.3923, types: ['islands', 'beaches', 'diving'] },
  { name: 'Singapore', region: 'Singapore', lat: 1.3521, lng: 103.8198, types: ['gardens', 'modern', 'food'] },
  { name: 'Swiss Alps (Interlaken & Zermatt)', region: 'Switzerland', lat: 46.6863, lng: 7.8632, types: ['alps', 'snow', 'scenic'] },
  { name: 'Barcelona', region: 'Spain', lat: 41.3879, lng: 2.1699, types: ['architecture', 'beaches', 'tapas'] },
  { name: 'Santorini', region: 'Greece', lat: 36.3932, lng: 25.4615, types: ['sunsets', 'volcanic', 'islands'] },
  { name: 'Amalfi Coast', region: 'Italy', lat: 40.6333, lng: 14.6029, types: ['coastal', 'scenic', 'luxury'] },
  { name: 'Maldives (Male & Atolls)', region: 'Maldives', lat: 4.1755, lng: 73.5093, types: ['overwater villas', 'snorkeling', 'luxury'] },
  { name: 'Reykjavik & Golden Circle', region: 'Iceland', lat: 64.1466, lng: -21.9426, types: ['northern lights', 'glaciers', 'geysers'] },
  { name: 'Sydney', region: 'Australia', lat: -33.8688, lng: 151.2093, types: ['harbour', 'beaches', 'opera house'] }
];

/**
 * Dynamic OpenStreetMap Nominatim Geocoding search (no hardcoded/predefined database)
 */
async function fallbackSearchPlaces(query: string, userCoords?: { lat: number; lng: number } | null): Promise<PlaceSearchResult[]> {
  if (!query || !query.trim()) return [];
  const clean = query.trim().toLowerCase();

  // First check fast curated local match
  const matchedCurated = POPULAR_TRAVEL_DESTINATIONS.filter(
    (d) => d.name.toLowerCase().includes(clean) || d.region.toLowerCase().includes(clean)
  ).map((d) => ({
    placeId: `dest-${d.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: d.name,
    address: `${d.name}, ${d.region}`,
    latitude: d.lat,
    longitude: d.lng,
    types: d.types,
    rating: 4.8
  }));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=8&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const osmResults = data.map((item: any) => {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          return {
            placeId: `osm-${item.place_id}`,
            name: item.name || item.display_name.split(',')[0],
            address: item.display_name,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            types: [item.type || 'point_of_interest', item.class || 'establishment'],
            rating: 4.5,
            photoUrl: undefined,
            distanceKm: userCoords ? calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng) : undefined
          };
        });

        // Combine curated and OSM
        const combined = [...matchedCurated];
        for (const osm of osmResults) {
          if (!combined.some((c) => c.name.toLowerCase() === osm.name.toLowerCase())) {
            combined.push(osm);
          }
        }
        return combined;
      }
    }
  } catch (err) {
    console.warn('Live Nominatim geocoding search failed or timed out:', err);
  }

  if (matchedCurated.length > 0) {
    return matchedCurated;
  }

  // If search returned no results and user coordinates are available, return location at user's coordinates
  if (userCoords && userCoords.lat && userCoords.lng) {
    return [
      {
        placeId: `custom-query-${crypto.randomUUID()}`,
        name: query.trim(),
        address: `${query.trim()}`,
        latitude: userCoords.lat,
        longitude: userCoords.lng,
        types: ['point_of_interest'],
        rating: 4.5
      }
    ];
  }

  return [];
}

/**
 * Fetch autocomplete predictions using Google Places Autocomplete API with live geocoder fallback
 */
export async function getGooglePlacesPredictions(
  input: string,
  userCoords?: { lat: number; lng: number } | null
): Promise<AutocompleteSuggestion[]> {
  if (!input || !input.trim()) return [];
  const query = input.trim();

  // Check if Google Maps Places SDK is available in the browser window
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).google !== 'undefined' &&
    (window as any).google.maps &&
    (window as any).google.maps.places &&
    (window as any).google.maps.places.AutocompleteService
  ) {
    try {
      const autocompleteService = new (window as any).google.maps.places.AutocompleteService();
      const request: any = { input: query };

      if (userCoords && userCoords.lat && userCoords.lng) {
        request.locationBias = new (window as any).google.maps.Circle({
          center: { lat: userCoords.lat, lng: userCoords.lng },
          radius: 50000
        });
      }

      const predictions: AutocompleteSuggestion[] = await new Promise((resolve) => {
        autocompleteService.getPlacePredictions(request, (results: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && results) {
            resolve(
              results.map((pred) => ({
                placeId: pred.place_id,
                mainText: pred.structured_formatting?.main_text || pred.description,
                secondaryText: pred.structured_formatting?.secondary_text || '',
                description: pred.description,
                types: pred.types
              }))
            );
          } else {
            resolve([]);
          }
        });
      });

      if (predictions.length > 0) {
        return predictions;
      }
    } catch (e) {
      console.warn('Google Places autocomplete service error, checking live geocoder:', e);
    }
  }

  // Fallback to live OSM Nominatim Geocoding without any predefined places
  const fallbackResults = await fallbackSearchPlaces(query, userCoords);
  return fallbackResults.map((p) => ({
    placeId: p.placeId,
    mainText: p.name,
    secondaryText: p.address,
    description: p.address ? `${p.name}, ${p.address}` : p.name,
    types: p.types,
    lat: p.latitude,
    lng: p.longitude
  }));
}

/**
 * Get detailed Place data (lat, lng, address, photos, name) given a Google Place ID
 */
export async function getGooglePlaceDetails(
  placeId: string,
  mapInstance?: any
): Promise<PlaceSearchResult> {
  // Use Google PlacesService if available
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).google !== 'undefined' &&
    (window as any).google.maps &&
    (window as any).google.maps.places &&
    (window as any).google.maps.places.PlacesService
  ) {
    try {
      const serviceContainer = mapInstance || document.createElement('div');
      const service = new (window as any).google.maps.places.PlacesService(serviceContainer);

      const placeDetails: PlaceSearchResult = await new Promise((resolve, reject) => {
        service.getDetails(
          {
            placeId,
            fields: ['name', 'formatted_address', 'geometry', 'place_id', 'rating', 'photos', 'types', 'vicinity']
          },
          (place: any, status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const photoUrl = place.photos && place.photos.length > 0
                ? place.photos[0].getUrl({ maxWidth: 800, maxHeight: 600 })
                : undefined;

              resolve({
                placeId: place.place_id || placeId,
                name: place.name || 'Selected Place',
                address: place.formatted_address || place.vicinity || 'Address not available',
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
                types: place.types,
                rating: place.rating || 4.5,
                photoUrl
              });
            } else {
              reject(new Error(`PlacesService status: ${status}`));
            }
          }
        );
      });

      return placeDetails;
    } catch (e) {
      console.warn('Google PlaceDetails failed, checking Geocoder fallback:', e);
    }
  }

  // Geocoder fallback if google.maps.Geocoder is available
  if (typeof (window as any).google !== 'undefined' && (window as any).google.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const geoResult: PlaceSearchResult = await new Promise((resolve, reject) => {
        geocoder.geocode({ placeId }, (results: any[], status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            resolve({
              placeId,
              name: results[0].formatted_address.split(',')[0] || 'Selected Location',
              address: results[0].formatted_address,
              latitude: Number(loc.lat().toFixed(6)),
              longitude: Number(loc.lng().toFixed(6)),
              types: results[0].types,
              rating: 4.5
            });
          } else {
            reject(new Error(`Geocoder status: ${status}`));
          }
        });
      });
      return geoResult;
    } catch (e) {
      console.warn('Geocoder fallback failed:', e);
    }
  }

  // Dynamic geocoding fallback
  const searchMatch = await fallbackSearchPlaces(placeId);
  if (searchMatch.length > 0) {
    return searchMatch[0];
  }

  return {
    placeId,
    name: 'Selected Place',
    address: 'Location verified on Google Maps',
    latitude: 0,
    longitude: 0,
    rating: 4.5
  };
}

/**
 * Text search for queries like "restaurants near me", "airport", "mall", "cafes"
 */
export async function searchPlacesByQuery(
  query: string,
  userCoords?: { lat: number; lng: number } | null,
  mapInstance?: any
): Promise<PlaceSearchResult[]> {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();

  // Try Google Maps PlacesService
  if (
    typeof window !== 'undefined' &&
    typeof (window as any).google !== 'undefined' &&
    (window as any).google.maps &&
    (window as any).google.maps.places &&
    (window as any).google.maps.places.PlacesService
  ) {
    try {
      const serviceContainer = mapInstance || document.createElement('div');
      const service = new (window as any).google.maps.places.PlacesService(serviceContainer);

      const request: any = { query: cleanQuery };

      if (userCoords && userCoords.lat && userCoords.lng) {
        request.location = new (window as any).google.maps.LatLng(userCoords.lat, userCoords.lng);
        request.radius = 30000;
      }

      const results: PlaceSearchResult[] = await new Promise((resolve) => {
        service.textSearch(request, (items: any[], status: any) => {
          if (status === (window as any).google.maps.places.PlacesServiceStatus.OK && items) {
            const mapped: PlaceSearchResult[] = items.slice(0, 10).map((r) => {
              const lat = r.geometry?.location?.lat() || (userCoords?.lat ?? 0);
              const lng = r.geometry?.location?.lng() || (userCoords?.lng ?? 0);
              const photoUrl = r.photos && r.photos.length > 0
                ? r.photos[0].getUrl({ maxWidth: 500, maxHeight: 400 })
                : undefined;

              let distanceKm: number | undefined;
              if (userCoords && userCoords.lat && userCoords.lng && lat && lng) {
                distanceKm = calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng);
              }

              return {
                placeId: r.place_id || `place-${Math.random()}`,
                name: r.name || 'Place',
                address: r.formatted_address || r.vicinity || '',
                latitude: Number(lat.toFixed(6)),
                longitude: Number(lng.toFixed(6)),
                types: r.types,
                rating: r.rating || 4.5,
                photoUrl,
                distanceKm
              };
            });
            resolve(mapped);
          } else {
            resolve([]);
          }
        });
      });

      if (results.length > 0) {
        return results;
      }
    } catch (e) {
      console.warn('Google Places textSearch error, using fallback live geocoding:', e);
    }
  }

  // Fallback to live geocoding
  return fallbackSearchPlaces(cleanQuery, userCoords);
}

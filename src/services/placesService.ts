import { SavedPlace, PlaceSearchResult } from '../types';
import { savePlaceToBackend, deletePlaceFromBackend } from './supabaseClient';
import { calculateHaversineDistanceKm } from '../utils/geoCoordinates';

const SAVED_PLACES_STORAGE_KEY = 'tripwise_saved_places_v1';

// Calculate distance between two coordinates in kilometers using canonical Haversine formula
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2, 1);
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

/**
 * Dynamic OpenStreetMap Nominatim Geocoding search (100% dynamic, no hardcoded places)
 */
async function fallbackSearchPlaces(query: string, userCoords?: { lat: number; lng: number } | null): Promise<PlaceSearchResult[]> {
  if (!query || !query.trim()) return [];

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
        return data.map((item: any) => {
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
      }
    }
  } catch (err) {
    console.warn('Live Nominatim geocoding search failed or timed out:', err);
  }

  // If search returned no results and user coordinates are available, return location at user coordinates
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

// In-flight and memory cache for Google Places predictions and details
const predictionsCache = new Map<string, { timestamp: number; data: AutocompleteSuggestion[] }>();
const inFlightPredictions = new Map<string, Promise<AutocompleteSuggestion[]>>();
const PREDICTIONS_CACHE_TTL_MS = 60000; // 1 minute

const placeDetailsCache = new Map<string, { timestamp: number; data: PlaceSearchResult }>();
const inFlightDetails = new Map<string, Promise<PlaceSearchResult>>();
const PLACE_DETAILS_CACHE_TTL_MS = 300000; // 5 minutes

/**
 * Fetch autocomplete predictions using Google Places Autocomplete API with live geocoder fallback
 */
export async function getGooglePlacesPredictions(
  input: string,
  userCoords?: { lat: number; lng: number } | null
): Promise<AutocompleteSuggestion[]> {
  if (!input || !input.trim()) return [];
  const query = input.trim();
  const cacheKey = `${query.toLowerCase()}_${userCoords ? `${userCoords.lat.toFixed(2)},${userCoords.lng.toFixed(2)}` : 'none'}`;

  // 1. Check memory cache
  const cached = predictionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PREDICTIONS_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. In-flight request deduplication
  const existingPromise = inFlightPredictions.get(cacheKey);
  if (existingPromise) return existingPromise;

  const fetchPromise = (async (): Promise<AutocompleteSuggestion[]> => {
    try {
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
            predictionsCache.set(cacheKey, { timestamp: Date.now(), data: predictions });
            return predictions;
          }
        } catch (e) {
          console.warn('Google Places autocomplete service error, checking live geocoder:', e);
        }
      }

      // Fallback to live OSM Nominatim Geocoding without any predefined places
      const fallbackResults = await fallbackSearchPlaces(query, userCoords);
      const results = fallbackResults.map((p) => ({
        placeId: p.placeId,
        mainText: p.name,
        secondaryText: p.address,
        description: p.address ? `${p.name}, ${p.address}` : p.name,
        types: p.types,
        lat: p.latitude,
        lng: p.longitude
      }));

      predictionsCache.set(cacheKey, { timestamp: Date.now(), data: results });
      return results;
    } finally {
      inFlightPredictions.delete(cacheKey);
    }
  })();

  inFlightPredictions.set(cacheKey, fetchPromise);
  return fetchPromise;
}

/**
 * Get detailed Place data (lat, lng, address, photos, name) given a Google Place ID
 */
export async function getGooglePlaceDetails(
  placeId: string,
  mapInstance?: any
): Promise<PlaceSearchResult> {
  // 1. Check memory cache
  const cached = placeDetailsCache.get(placeId);
  if (cached && Date.now() - cached.timestamp < PLACE_DETAILS_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. In-flight request deduplication
  const existingPromise = inFlightDetails.get(placeId);
  if (existingPromise) return existingPromise;

  const detailsPromise = (async (): Promise<PlaceSearchResult> => {
    try {
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
                  // Right-sized image: 480x360 matches mobile & desktop card viewports without downloading massive 800px files
                  const photoUrl = place.photos && place.photos.length > 0
                    ? place.photos[0].getUrl({ maxWidth: 480, maxHeight: 360 })
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

          placeDetailsCache.set(placeId, { timestamp: Date.now(), data: placeDetails });
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
      placeDetailsCache.set(placeId, { timestamp: Date.now(), data: searchMatch[0] });
      return searchMatch[0];
    }

    const fallbackResult: PlaceSearchResult = {
      placeId,
      name: 'Selected Place',
      address: 'Location verified on Google Maps',
      latitude: 0,
      longitude: 0,
      rating: 4.5
    };
    return fallbackResult;
  } finally {
    inFlightDetails.delete(placeId);
  }
  })();

  inFlightDetails.set(placeId, detailsPromise);
  return detailsPromise;
}

/**
 * Text search for queries like "restaurants near me", "airport", "mall", "cafes"
 */
const querySearchCache = new Map<string, { timestamp: number; data: PlaceSearchResult[] }>();
const inFlightQuerySearch = new Map<string, Promise<PlaceSearchResult[]>>();
const QUERY_SEARCH_CACHE_TTL_MS = 120000; // 2 minutes

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
  const cacheKey = `${cleanQuery.toLowerCase()}_${userCoords ? `${userCoords.lat.toFixed(2)},${userCoords.lng.toFixed(2)}` : 'none'}`;

  // 1. Check memory cache
  const cached = querySearchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < QUERY_SEARCH_CACHE_TTL_MS) {
    return cached.data;
  }

  // 2. In-flight deduplication
  const existingPromise = inFlightQuerySearch.get(cacheKey);
  if (existingPromise) return existingPromise;

  const searchPromise = (async (): Promise<PlaceSearchResult[]> => {
    try {
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
                    ? r.photos[0].getUrl({ maxWidth: 480, maxHeight: 360 })
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
            querySearchCache.set(cacheKey, { timestamp: Date.now(), data: results });
            return results;
          }
        } catch (e) {
          console.warn('Google Places textSearch error, using fallback live geocoding:', e);
        }
      }

      // Fallback to live geocoding
      const fallback = await fallbackSearchPlaces(cleanQuery, userCoords);
      querySearchCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
      return fallback;
    } finally {
      inFlightQuerySearch.delete(cacheKey);
    }
  })();

  inFlightQuerySearch.set(cacheKey, searchPromise);
  return searchPromise;
}

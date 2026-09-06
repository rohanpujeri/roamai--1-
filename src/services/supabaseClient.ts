import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { Trip, SavedPlace } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const url = config.supabase.url;
  const anonKey = config.supabase.anonKey;

  if (url && anonKey && url.startsWith('http')) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return null;
}

export const isSupabaseConfigured = (): boolean => {
  return Boolean(config.supabase.url && config.supabase.anonKey && config.supabase.url.startsWith('http'));
};

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  } catch (err) {
    return null;
  }
}

const TRIPS_LOCAL_STORAGE_KEY = 'roamai_user_trips_v2';
const PLACES_LOCAL_STORAGE_KEY = 'roamai_saved_places_v2';

const getTripsStorageKey = (userId?: string) => userId ? `${TRIPS_LOCAL_STORAGE_KEY}_${userId}` : TRIPS_LOCAL_STORAGE_KEY;
const getPlacesStorageKey = (userId?: string) => userId ? `${PLACES_LOCAL_STORAGE_KEY}_${userId}` : PLACES_LOCAL_STORAGE_KEY;

// --- Trips Persistence ---

export async function fetchUserTrips(): Promise<Trip[]> {
  const user = await getCurrentUser();
  const storageKey = getTripsStorageKey(user?.id);

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(config.db.tables.trips)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Supabase fetch trips error, falling back to local storage:', error.message);
        } else if (data) {
          const trips = data.map((row: any) => row.trip_data || row);
          // Sync successful fetch (even if empty) to local storage
          if (typeof window !== 'undefined') {
            localStorage.setItem(storageKey, JSON.stringify(trips));
          }
          return trips;
        }
      } catch (err) {
        console.warn('Supabase fetch trips failed:', err);
      }
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading local trips:', e);
    }
  }
  return [];
}

export async function saveTripToBackend(trip: Trip): Promise<Trip> {
  const user = await getCurrentUser();
  const storageKey = getTripsStorageKey(user?.id);

  // Save locally first
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      const current: Trip[] = raw ? JSON.parse(raw) : [];
      const idx = current.findIndex((t) => t.id === trip.id);
      const updated = idx >= 0 ? current.map((t) => (t.id === trip.id ? trip : t)) : [trip, ...current];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage error:', e);
    }
  }

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase
          .from(config.db.tables.trips)
          .upsert(
            {
              id: trip.id,
              user_id: user.id,
              title: trip.title,
              destination: trip.destination,
              trip_data: trip,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );

        if (error) {
          console.warn('Supabase upsert trip error:', error.message);
          throw new Error('Cloud sync failed: Could not save trip to your account. (Trip saved locally)');
        }
      } catch (err: any) {
        console.warn('Supabase save trip failed:', err);
        // Rethrow a safe error string if it is the one we threw above, otherwise wrap it
        if (err.message && err.message.includes('Cloud sync failed')) {
          throw err;
        }
        throw new Error('Cloud sync failed: Unexpected error saving trip. (Trip saved locally)');
      }
    }
  }

  return trip;
}

export async function deleteTripFromBackend(tripId: string): Promise<void> {
  const user = await getCurrentUser();
  const storageKey = getTripsStorageKey(user?.id);

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const current: Trip[] = JSON.parse(raw);
        localStorage.setItem(storageKey, JSON.stringify(current.filter((t) => t.id !== tripId)));
      }
    } catch (e) {
      console.warn('Local storage delete error:', e);
    }
  }

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from(config.db.tables.trips).delete().eq('id', tripId).eq('user_id', user.id);
      } catch (err) {
        console.warn('Supabase delete trip failed:', err);
      }
    }
  }
}

// --- Places Persistence ---

export async function fetchSavedPlaces(): Promise<SavedPlace[]> {
  const user = await getCurrentUser();
  const storageKey = getPlacesStorageKey(user?.id);

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from(config.db.tables.places)
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((row: any) => row.place_data || row);
        }
      } catch (err) {
        console.warn('Supabase fetch places error:', err);
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading saved places:', e);
    }
  }
  return [];
}

export async function savePlaceToBackend(place: Omit<SavedPlace, 'savedAt'>): Promise<SavedPlace> {
  const user = await getCurrentUser();
  const storageKey = getPlacesStorageKey(user?.id);

  const newEntry: SavedPlace = {
    ...place,
    savedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      const current: SavedPlace[] = raw ? JSON.parse(raw) : [];
      const updated = [newEntry, ...current.filter((p) => p.placeId !== place.placeId)];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  }

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from(config.db.tables.places).upsert(
          {
            user_id: user.id,
            place_id: place.placeId,
            place_data: newEntry,
            updated_at: newEntry.savedAt
          },
          { onConflict: 'user_id, place_id' }
        );
      } catch (err) {
        console.warn('Supabase save place error:', err);
      }
    }
  }

  return newEntry;
}

export async function deletePlaceFromBackend(placeId: string): Promise<void> {
  const user = await getCurrentUser();
  const storageKey = getPlacesStorageKey(user?.id);

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const current: SavedPlace[] = JSON.parse(raw);
        localStorage.setItem(storageKey, JSON.stringify(current.filter((p) => p.placeId !== placeId)));
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  if (user) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from(config.db.tables.places).delete().eq('place_id', placeId).eq('user_id', user.id);
      } catch (err) {
        console.warn('Supabase delete place error:', err);
      }
    }
  }
}

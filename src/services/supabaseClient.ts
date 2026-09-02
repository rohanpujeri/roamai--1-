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

const TRIPS_LOCAL_STORAGE_KEY = 'roamai_user_trips_v1';
const PLACES_LOCAL_STORAGE_KEY = 'roamai_saved_places_v1';

// --- Trips Persistence ---

export async function fetchUserTrips(): Promise<Trip[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(config.db.tables.trips)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch trips error, falling back to local storage:', error.message);
      } else if (data && data.length > 0) {
        return data.map((row: any) => row.trip_data || row);
      }
    } catch (err) {
      console.warn('Supabase fetch trips failed:', err);
    }
  }

  // Local storage fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TRIPS_LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading local trips:', e);
    }
  }
  return [];
}

export async function saveTripToBackend(trip: Trip): Promise<Trip> {
  // Save locally first
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TRIPS_LOCAL_STORAGE_KEY);
      const current: Trip[] = raw ? JSON.parse(raw) : [];
      const idx = current.findIndex((t) => t.id === trip.id);
      const updated = idx >= 0 ? current.map((t) => (t.id === trip.id ? trip : t)) : [trip, ...current];
      localStorage.setItem(TRIPS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage error:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from(config.db.tables.trips)
        .upsert(
          {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
            trip_data: trip,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.warn('Supabase upsert trip error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase save trip failed:', err);
    }
  }

  return trip;
}

export async function deleteTripFromBackend(tripId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(TRIPS_LOCAL_STORAGE_KEY);
      if (raw) {
        const current: Trip[] = JSON.parse(raw);
        localStorage.setItem(TRIPS_LOCAL_STORAGE_KEY, JSON.stringify(current.filter((t) => t.id !== tripId)));
      }
    } catch (e) {
      console.warn('Local storage delete error:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from(config.db.tables.trips).delete().eq('id', tripId);
    } catch (err) {
      console.warn('Supabase delete trip failed:', err);
    }
  }
}

// --- Places Persistence ---

export async function fetchSavedPlaces(): Promise<SavedPlace[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from(config.db.tables.places)
        .select('*')
        .order('saved_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => row.place_data || row);
      }
    } catch (err) {
      console.warn('Supabase fetch places error:', err);
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(PLACES_LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error reading saved places:', e);
    }
  }
  return [];
}

export async function savePlaceToBackend(place: Omit<SavedPlace, 'savedAt'>): Promise<SavedPlace> {
  const newEntry: SavedPlace = {
    ...place,
    savedAt: new Date().toISOString()
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(PLACES_LOCAL_STORAGE_KEY);
      const current: SavedPlace[] = raw ? JSON.parse(raw) : [];
      const updated = [newEntry, ...current.filter((p) => p.placeId !== place.placeId)];
      localStorage.setItem(PLACES_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage quota exceeded:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from(config.db.tables.places).upsert(
        {
          place_id: place.placeId,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          place_data: newEntry,
          saved_at: newEntry.savedAt
        },
        { onConflict: 'place_id' }
      );
    } catch (err) {
      console.warn('Supabase save place error:', err);
    }
  }

  return newEntry;
}

export async function deletePlaceFromBackend(placeId: string): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(PLACES_LOCAL_STORAGE_KEY);
      if (raw) {
        const current: SavedPlace[] = JSON.parse(raw);
        localStorage.setItem(PLACES_LOCAL_STORAGE_KEY, JSON.stringify(current.filter((p) => p.placeId !== placeId)));
      }
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from(config.db.tables.places).delete().eq('place_id', placeId);
    } catch (err) {
      console.warn('Supabase delete place error:', err);
    }
  }
}

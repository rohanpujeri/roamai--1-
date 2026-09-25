import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { Trip, SavedPlace, UserProfileData } from '../types';

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

const TRIPS_LOCAL_STORAGE_KEY = 'tripwise_user_trips_v2';
const PLACES_LOCAL_STORAGE_KEY = 'tripwise_saved_places_v2';

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

// --- User Profile Persistence ---

const PROFILE_STORAGE_KEY = 'tripwise_user_profile';

/**
 * Strips out any hardcoded or predefined stock avatars (such as the Unsplash photo-1534528741775-53994a69daeb)
 * so that users only see their own uploaded photo or clean initial avatars.
 */
export function sanitizeAvatarUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (trimmed.includes('photo-1534528741775-53994a69daeb')) return '';
  return trimmed;
}

/**
 * Resizes and compresses an uploaded user image to a clean ~512x512 JPEG data URL.
 * Keeps storage light (<60KB) to comfortably fit in localStorage and Supabase user_metadata.
 */
export function processAvatarImageFile(file: File, maxDimension = 512, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (PNG, JPG, JPEG, or WEBP).'));
    }

    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error('Image file is too large. Please select an image under 15MB.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image for processing.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function getCachedUserProfile(userId?: string): UserProfileData | null {
  if (typeof window === 'undefined') return null;
  try {
    const keys = [
      userId ? `${PROFILE_STORAGE_KEY}_${userId}` : null,
      userId ? `roamai_user_profile_${userId}` : null,
      'tripwise_user_profile_guest',
      'roamai_user_profile_guest',
      PROFILE_STORAGE_KEY,
      'roamai_user_profile'
    ].filter(Boolean) as string[];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          parsed.avatarUrl = sanitizeAvatarUrl(parsed.avatarUrl);
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to parse cached user profile:', e);
  }
  return null;
}

export function getCanonicalUsername(
  user?: { id?: string; email?: string; user_metadata?: Record<string, any> } | null,
  cachedProfile?: { username?: string } | null
): string {
  if (cachedProfile?.username?.trim()) {
    const u = cachedProfile.username.trim();
    return u.startsWith('@') ? u : `@${u}`;
  }
  const meta = user?.user_metadata || {};
  if (meta?.username?.trim()) {
    const u = meta.username.trim();
    return u.startsWith('@') ? u : `@${u}`;
  }
  if (user?.id) {
    return `@user_${user.id.slice(0, 8)}`;
  }
  return '@traveler';
}

export async function updateUserProfileData(profile: UserProfileData, fallbackUserId?: string): Promise<{ error?: string }> {
  let user = await getCurrentUser();
  const userId = user?.id || fallbackUserId;
  if (!userId) return { error: 'Not authenticated' };

  const sanitizedProfile: UserProfileData = {
    ...profile,
    avatarUrl: sanitizeAvatarUrl(profile.avatarUrl)
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${PROFILE_STORAGE_KEY}_${userId}`, JSON.stringify(sanitizedProfile));
      localStorage.setItem(`tripwise_user_profile_${userId}`, JSON.stringify(sanitizedProfile));
      localStorage.setItem(`roamai_user_profile_${userId}`, JSON.stringify(sanitizedProfile));
    } catch (e) {
      console.warn('Failed to cache profile in localStorage:', e);
    }
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            full_name: sanitizedProfile.name,
            name: sanitizedProfile.name,
            username: sanitizedProfile.username,
            bio: typeof sanitizedProfile.bio === 'string' ? sanitizedProfile.bio : '',
            avatarUrl: sanitizedProfile.avatarUrl,
            avatar_url: sanitizedProfile.avatarUrl,
            dob: sanitizedProfile.dob,
            place: sanitizedProfile.place,
            travelDNA: sanitizedProfile.travelDNA,
            travelPreferences: sanitizedProfile.travelPreferences
          }
        });
        if (error) {
          console.warn('supabase.auth.updateUser notice:', error.message);
        }
      }

      // Also upsert public.profiles table so other users can search this profile immediately
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          username: sanitizedProfile.username,
          name: sanitizedProfile.name,
          avatar_url: sanitizedProfile.avatarUrl,
          bio: typeof sanitizedProfile.bio === 'string' ? sanitizedProfile.bio : '',
          place: sanitizedProfile.place,
          location: sanitizedProfile.place || 'Traveler',
          trips_count: sanitizedProfile.stats?.tripsCount || 0,
          places_count: sanitizedProfile.stats?.placesCount || 0,
          countries_count: sanitizedProfile.stats?.countriesCount || 0,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (upsertErr) {
        console.warn('Could not sync to public profiles table:', upsertErr);
      }
    } catch (err: any) {
      return { error: err?.message || 'Failed to update profile' };
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('roamai_profile_updated', { detail: sanitizedProfile }));
  }

  return {};
}


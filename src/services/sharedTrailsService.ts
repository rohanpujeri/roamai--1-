import { getSupabaseClient } from './supabaseClient';
import { saveTrailMedia, deleteTrailMedia } from './trailMediaStorage';

export interface TrailCreator {
  id?: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isFollowed?: boolean;
}

export interface TrailComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
}

export interface TrailReel {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  mediaType: 'video' | 'image';
  title: string;
  creator: TrailCreator;
  caption: string;
  destination: string;
  tags: string[];
  audioTitle: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  viewsCount?: number;
  comments?: TrailComment[];
  createdAt?: string;
}

const LOCAL_STORAGE_KEY = 'roamai_user_trails';
const LEGACY_STORAGE_KEY = 'tripwise_user_trails';

/**
 * Convert a File or Blob into base64 Data URL for API transmission
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Read locally cached trails
 */
export function getLocalTrails(): TrailReel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (t: any) =>
          t &&
          !t.id?.startsWith('sample-trail-') &&
          t.creator?.username !== '@elena_voyages' &&
          t.creator?.username !== '@rohan_treks'
      );
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Fetch all shared trails globally from the backend API and Supabase,
 * merging with local cache so all profiles see everyone's trails.
 */
export async function fetchGlobalTrails(): Promise<TrailReel[]> {
  const localList = getLocalTrails();
  const trailMap = new Map<string, TrailReel>();

  // 1. Seed with local trails
  localList.forEach((t) => {
    if (t.id) trailMap.set(t.id, t);
  });

  // 2. Fetch from backend server API /api/trails
  try {
    const res = await fetch('/api/trails');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.trails)) {
        data.trails.forEach((t: TrailReel) => {
          if (t && t.id) {
            const existing = trailMap.get(t.id);
            trailMap.set(t.id, {
              ...t,
              // Preserve local interactions if already liked/saved in this session
              isLiked: existing?.isLiked ?? t.isLiked,
              isSaved: existing?.isSaved ?? t.isSaved
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to fetch server trails:', err);
  }

  // 3. Fetch from Supabase trails table if configured
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from('trails')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          const t: TrailReel = row.trail_data || row;
          if (t && t.id) {
            const existing = trailMap.get(t.id);
            trailMap.set(t.id, {
              ...t,
              isLiked: existing?.isLiked ?? t.isLiked,
              isSaved: existing?.isSaved ?? t.isSaved
            });
          }
        });
      }
    }
  } catch (err) {
    // Supabase table might not exist yet, ignore
  }

  // Convert map to sorted array (newest first)
  const combined = Array.from(trailMap.values()).sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id.replace(/\D/g, '')) || 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id.replace(/\D/g, '')) || 0;
    return timeB - timeA;
  });

  // Sync unified list back to localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
    } catch {
      // ignore
    }
  }

  return combined;
}

/**
 * Publish a trail globally so all other users/profiles can view it
 */
export async function publishGlobalTrail(
  trail: TrailReel,
  file?: File | Blob | null
): Promise<TrailReel> {
  // 1. Save binary file to IndexedDB for instant, zero-lag local playback
  if (file) {
    await saveTrailMedia(trail.id, file);
  }

  // 2. Save locally immediately for optimistic UI
  const current = getLocalTrails();
  const updatedList = [trail, ...current.filter((t) => t.id !== trail.id)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
    } catch {
      // ignore
    }
  }

  // 3. Prepare media data URL to upload to the server
  let mediaDataUrl: string | undefined = undefined;
  if (file && file.size < 40 * 1024 * 1024) { // Under 40MB
    try {
      mediaDataUrl = await fileToBase64(file);
    } catch (err) {
      console.warn('[sharedTrailsService] Could not convert file to base64:', err);
    }
  }

  // 4. Send to backend API
  let serverSavedTrail = trail;
  try {
    const res = await fetch('/api/trails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trail,
        mediaDataUrl,
        posterDataUrl: trail.posterUrl?.startsWith('data:') ? trail.posterUrl : undefined
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.trail) {
        serverSavedTrail = data.trail;
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to publish trail to server API:', err);
  }

  // 5. Sync to Supabase if available
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('trails').upsert({
        id: serverSavedTrail.id,
        trail_data: serverSavedTrail,
        created_at: new Date().toISOString()
      });
    }
  } catch {
    // ignore
  }

  // 6. Update local storage with final server record
  const finalList = [serverSavedTrail, ...current.filter((t) => t.id !== trail.id)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalList));
    } catch {
      // ignore
    }
  }

  return serverSavedTrail;
}

/**
 * Delete a trail globally
 */
export async function deleteGlobalTrail(trailId: string): Promise<void> {
  // 1. Delete locally
  await deleteTrailMedia(trailId);
  const current = getLocalTrails();
  const filtered = current.filter((t) => t.id !== trailId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }

  // 2. Delete from server API
  try {
    await fetch(`/api/trails/${encodeURIComponent(trailId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to delete from server:', err);
  }

  // 3. Delete from Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('trails').delete().eq('id', trailId);
    }
  } catch {
    // ignore
  }
}

/**
 * Like / unlike a trail globally
 */
export async function likeGlobalTrail(trailId: string, increment: boolean): Promise<void> {
  try {
    await fetch(`/api/trails/${encodeURIComponent(trailId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment })
    });
  } catch {
    // ignore
  }
}

/**
 * Add comment globally
 */
export async function commentOnGlobalTrail(
  trailId: string,
  comment: { user: string; avatar: string; text: string }
): Promise<void> {
  try {
    await fetch(`/api/trails/${encodeURIComponent(trailId)}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
  } catch {
    // ignore
  }
}

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

export interface TrailLiker {
  id?: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  likedAt?: string;
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
  likedBy?: TrailLiker[];
  createdAt?: string;
}

const LOCAL_STORAGE_KEY = 'roamai_user_trails';
const LEGACY_STORAGE_KEY = 'tripwise_user_trails';
const LIKED_TRAILS_KEY = 'roamai_liked_trail_ids';

export function getLikedTrailIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LIKED_TRAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isTrailLikedByUser(trailId: string): boolean {
  if (!trailId) return false;
  return getLikedTrailIds().includes(trailId);
}

export function setTrailLikedByUser(trailId: string, liked: boolean): void {
  if (!trailId || typeof window === 'undefined') return;
  try {
    const ids = new Set(getLikedTrailIds());
    if (liked) ids.add(trailId);
    else ids.delete(trailId);
    localStorage.setItem(LIKED_TRAILS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

const TRAIL_LIKERS_PREFIX = 'roamai_trail_likers_';

export function getLocalTrailLikers(trailId: string): TrailLiker[] {
  if (typeof window === 'undefined' || !trailId) return [];
  try {
    const raw = localStorage.getItem(TRAIL_LIKERS_PREFIX + trailId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Also check inside trail object
    const trails = getLocalTrails();
    const trail = trails.find((t) => t.id === trailId);
    if (trail?.likedBy && Array.isArray(trail.likedBy)) {
      return trail.likedBy;
    }
  } catch {
    // ignore
  }
  return [];
}

export function setLocalTrailLikers(trailId: string, likers: TrailLiker[]): void {
  if (typeof window === 'undefined' || !trailId) return;
  try {
    localStorage.setItem(TRAIL_LIKERS_PREFIX + trailId, JSON.stringify(likers));
  } catch {
    // ignore
  }
}

/**
 * Fetch users who liked a trail globally from server, Supabase, and local cache
 */
export async function fetchTrailLikers(trailId: string): Promise<TrailLiker[]> {
  if (!trailId) return [];
  const likersMap = new Map<string, TrailLiker>();

  // 1. Check local cache
  getLocalTrailLikers(trailId).forEach((l) => {
    const cleanU = (l.username || '').toLowerCase().replace(/^@+/, '');
    if (cleanU && !likersMap.has(cleanU)) {
      likersMap.set(cleanU, l);
    }
  });

  // 2. Fetch from server API
  try {
    const res = await fetch(`/api/trails/${encodeURIComponent(trailId)}/likes`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.likers)) {
        data.likers.forEach((l: TrailLiker) => {
          const cleanU = (l.username || '').toLowerCase().replace(/^@+/, '');
          if (cleanU && !likersMap.has(cleanU)) {
            likersMap.set(cleanU, l);
          }
        });
      }
    }
  } catch {
    // ignore
  }

  // 3. Fetch from Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('trails').select('trail_data').eq('id', trailId).single();
      if (data?.trail_data?.likedBy && Array.isArray(data.trail_data.likedBy)) {
        data.trail_data.likedBy.forEach((l: TrailLiker) => {
          const cleanU = (l.username || '').toLowerCase().replace(/^@+/, '');
          if (cleanU && !likersMap.has(cleanU)) {
            likersMap.set(cleanU, l);
          }
        });
      }
    }
  } catch {
    // ignore
  }

  const list = Array.from(likersMap.values());
  setLocalTrailLikers(trailId, list);
  return list;
}

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
 * Fetch all shared trails globally from Supabase and the backend API,
 * merging with local cache so all profiles see everyone's trails in real time.
 */
export async function fetchGlobalTrails(): Promise<TrailReel[]> {
  const localList = getLocalTrails();
  const trailMap = new Map<string, TrailReel>();

  // 1. Primary: Fetch from Supabase trails table (ground truth for all devices and accounts)
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
            trailMap.set(t.id, {
              ...t,
              createdAt: row.created_at || t.createdAt
            });
          }
        });
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Supabase trails query:', err);
  }

  // 2. Secondary: Fetch from backend server API /api/trails
  try {
    const res = await fetch('/api/trails');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.trails)) {
        data.trails.forEach((t: TrailReel) => {
          if (t && t.id && !trailMap.has(t.id)) {
            trailMap.set(t.id, t);
          }
        });
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to fetch server trails:', err);
  }

  // 3. Fallback: Merge local trails so un-synced or offline trails are preserved
  localList.forEach((t) => {
    if (t.id && !trailMap.has(t.id)) {
      trailMap.set(t.id, t);
    }
  });

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
  const supabase = getSupabaseClient();
  let serverSavedTrail: TrailReel = { ...trail };

  // 1. Save binary file to IndexedDB for instant, zero-lag local playback on this device
  if (file) {
    await saveTrailMedia(trail.id, file);
  }

  // 2. Upload video/image binary directly to Supabase Storage bucket 'trails'
  if (file && supabase) {
    try {
      const isImg = file.type?.startsWith('image/') || trail.mediaType === 'image';
      const ext = isImg
        ? (file.type?.includes('png') ? 'png' : 'jpg')
        : (file.type?.includes('webm') ? 'webm' : 'mp4');
      const filePath = `media/${trail.id}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trails')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || (isImg ? 'image/jpeg' : 'video/mp4')
        });

      if (!uploadError && uploadData) {
        const { data: publicUrlObj } = supabase.storage
          .from('trails')
          .getPublicUrl(filePath);

        if (publicUrlObj?.publicUrl) {
          serverSavedTrail.videoUrl = publicUrlObj.publicUrl;
        }
      } else if (uploadError) {
        console.warn('[sharedTrailsService] Supabase storage upload warning:', uploadError.message);
      }
    } catch (storageErr) {
      console.warn('[sharedTrailsService] Direct storage upload error:', storageErr);
    }
  }

  // 3. If poster is a base64 Data URL, upload poster to Supabase Storage as well
  if (serverSavedTrail.posterUrl?.startsWith('data:') && supabase) {
    try {
      const res = await fetch(serverSavedTrail.posterUrl);
      const posterBlob = await res.blob();
      const posterPath = `posters/${trail.id}.jpg`;
      const { data: pData, error: pErr } = await supabase.storage
        .from('trails')
        .upload(posterPath, posterBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (!pErr && pData) {
        const { data: pUrlObj } = supabase.storage.from('trails').getPublicUrl(posterPath);
        if (pUrlObj?.publicUrl) {
          serverSavedTrail.posterUrl = pUrlObj.publicUrl;
        }
      }
    } catch (err) {
      console.warn('[sharedTrailsService] Poster upload warning:', err);
    }
  }

  // 4. Send to backend Express API if running
  try {
    let mediaDataUrl: string | undefined = undefined;
    if (file && file.size < 10 * 1024 * 1024 && (!serverSavedTrail.videoUrl || serverSavedTrail.videoUrl.startsWith('blob:'))) {
      try {
        mediaDataUrl = await fileToBase64(file);
      } catch {
        // ignore
      }
    }

    const res = await fetch('/api/trails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trail: serverSavedTrail,
        mediaDataUrl,
        posterDataUrl: serverSavedTrail.posterUrl?.startsWith('data:') ? serverSavedTrail.posterUrl : undefined
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.trail) {
        // Prefer server saved trail if local video was still a blob
        if (!serverSavedTrail.videoUrl || serverSavedTrail.videoUrl.startsWith('blob:')) {
          serverSavedTrail = data.trail;
        }
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to publish trail to server API:', err);
  }

  // 5. Persist trail record to Supabase public.trails table so all accounts can read it
  if (supabase) {
    try {
      const { error: dbError } = await supabase.from('trails').upsert({
        id: serverSavedTrail.id,
        user_id: serverSavedTrail.creator?.id || undefined,
        trail_data: serverSavedTrail,
        created_at: serverSavedTrail.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (dbError) {
        console.warn('[sharedTrailsService] Supabase trails table upsert warning:', dbError.message);
      }
    } catch (err) {
      console.warn('[sharedTrailsService] Supabase table sync error:', err);
    }
  }

  // 6. Update local storage with final record
  const current = getLocalTrails();
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
export async function likeGlobalTrail(
  trailId: string, 
  increment: boolean,
  liker?: TrailLiker
): Promise<void> {
  // 1. Update user liked state
  setTrailLikedByUser(trailId, increment);

  // 2. Update local likers list
  let currentLikers = getLocalTrailLikers(trailId);
  if (liker && liker.username) {
    const cleanU = liker.username.toLowerCase().replace(/^@+/, '');
    if (increment) {
      if (!currentLikers.some((l) => (l.username || '').toLowerCase().replace(/^@+/, '') === cleanU)) {
        currentLikers = [{ ...liker, likedAt: new Date().toISOString() }, ...currentLikers];
      }
    } else {
      currentLikers = currentLikers.filter((l) => (l.username || '').toLowerCase().replace(/^@+/, '') !== cleanU);
    }
    setLocalTrailLikers(trailId, currentLikers);
  }

  // 3. Update local storage cache immediately for zero latency
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const trails: TrailReel[] = JSON.parse(raw);
        if (Array.isArray(trails)) {
          const updated = trails.map((t) => {
            if (t.id === trailId) {
              const currentLikes = Number(t.likesCount || 0);
              const nextLikes = Math.max(0, currentLikes + (increment ? 1 : -1));
              return { 
                ...t, 
                likesCount: nextLikes, 
                isLiked: increment,
                likedBy: currentLikers 
              };
            }
            return t;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('roamai_trail_liked', { detail: { trailId, increment, liker } }));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  }

  // 4. Update in Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('trails').select('trail_data').eq('id', trailId).single();
      if (data && data.trail_data) {
        const currentLikes = Number(data.trail_data.likesCount || 0);
        const updatedLikes = Math.max(0, currentLikes + (increment ? 1 : -1));
        const updatedTrail = { 
          ...data.trail_data, 
          likesCount: updatedLikes,
          likedBy: currentLikers 
        };
        await supabase.from('trails').update({ trail_data: updatedTrail }).eq('id', trailId);
      }
    }
  } catch {
    // ignore
  }

  // 5. Update in server
  try {
    await fetch(`/api/trails/${encodeURIComponent(trailId)}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ increment, liker })
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
  const newCommentObj = {
    id: `comment-${Date.now()}`,
    user: comment.user,
    avatar: comment.avatar,
    text: comment.text,
    time: 'Just now'
  };

  // 1. Update local cache immediately
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const trails: TrailReel[] = JSON.parse(raw);
        if (Array.isArray(trails)) {
          const updated = trails.map((t) => {
            if (t.id === trailId) {
              const existingComments = Array.isArray(t.comments) ? [...t.comments] : [];
              const comments = [newCommentObj, ...existingComments];
              return {
                ...t,
                comments,
                commentsCount: comments.length
              };
            }
            return t;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('roamai_trail_commented', { detail: { trailId, comment: newCommentObj } }));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  }

  // 2. Update in Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data } = await supabase.from('trails').select('trail_data').eq('id', trailId).single();
      if (data && data.trail_data) {
        const comments = Array.isArray(data.trail_data.comments) ? [...data.trail_data.comments] : [];
        comments.push(newCommentObj);
        const updatedTrail = { 
          ...data.trail_data, 
          comments,
          commentsCount: comments.length 
        };
        await supabase.from('trails').update({ trail_data: updatedTrail }).eq('id', trailId);
      }
    }
  } catch {
    // ignore
  }

  // 3. Update in server
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

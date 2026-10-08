import { config } from '../config';
import { getSupabaseClient } from './supabaseClient';
import { saveTrailMedia, deleteTrailMedia } from './trailMediaStorage';
import { isFakeMockUser } from './followService';
import { optimizeMp4ForWeb } from '../utils/mp4Faststart';

export interface TrailCreator {
  id?: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  isFollowed?: boolean;
  isVerified?: boolean;
}

export const DEFAULT_TRAIL_CREATOR: TrailCreator = {
  id: '',
  name: 'User',
  username: '',
  avatarUrl: '',
  isFollowed: false,
  isVerified: false,
};

export function sanitizeTrail(t: any): TrailReel {
  if (!t || typeof t !== 'object') {
    return {
      id: `trail-${Date.now()}`,
      videoUrl: '',
      mediaType: 'image',
      title: 'Trail',
      caption: '',
      destination: '',
      tags: [],
      audioTitle: 'Original Audio',
      likesCount: 0,
      commentsCount: 0,
      creator: { ...DEFAULT_TRAIL_CREATOR },
    };
  }

  const creatorRaw = t.creator || {};
  const creator: TrailCreator = {
    id: creatorRaw.id || '',
    name: creatorRaw.name || 'User',
    username: creatorRaw.username ? (creatorRaw.username.startsWith('@') ? creatorRaw.username : `@${creatorRaw.username}`) : '',
    avatarUrl: creatorRaw.avatarUrl || '',
    isFollowed: Boolean(creatorRaw.isFollowed),
    isVerified: Boolean(creatorRaw.isVerified),
  };

  return {
    ...t,
    id: String(t.id || `trail-${Date.now()}`),
    videoUrl: t.videoUrl || '',
    posterUrl: t.posterUrl || undefined,
    mediaType: t.mediaType === 'video' ? 'video' : 'image',
    title: t.title || 'Trail',
    caption: t.caption || '',
    destination: t.destination || '',
    tags: Array.isArray(t.tags) ? t.tags : [],
    audioTitle: t.audioTitle || 'Original Audio',
    likesCount: typeof t.likesCount === 'number' && !isNaN(t.likesCount)
      ? Math.max(t.likesCount, Array.isArray(t.likedBy) ? t.likedBy.length : 0)
      : (Array.isArray(t.likedBy) && t.likedBy.length > 0
          ? t.likedBy.length
          : Math.max(0, Number(t.likesCount) || 0)),
    commentsCount: typeof t.commentsCount === 'number' ? t.commentsCount : (Number(t.commentsCount) || 0),
    viewsCount: typeof t.viewsCount === 'number' ? Math.max(0, t.viewsCount) : (Number(t.viewsCount) || 0),
    viewedBy: Array.isArray(t.viewedBy) ? t.viewedBy : [],
    comments: Array.isArray(t.comments) ? t.comments : [],
    likedBy: Array.isArray(t.likedBy) ? t.likedBy : [],
    creator,
    aspectRatio: t.aspectRatio || 'original',
    fitMode: t.fitMode || (t.aspectRatio === '16:9' ? 'cover' : 'contain'),
  };
}

export interface TrailComment {
  id: string;
  user: string;
  avatar: string;
  text: string;
  time: string;
  timestamp?: number;
  likesCount?: number;
  isLiked?: boolean;
  isAuthor?: boolean;
  isAuthorLiked?: boolean;
  replyToUser?: string;
  replies?: TrailComment[];
}

export interface TrailLiker {
  id?: string;
  name: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
  likedAt?: string;
  isFollowing?: boolean;
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
  viewedBy?: Array<{ id?: string; username: string; viewedAt?: string }>;
  comments?: TrailComment[];
  likedBy?: TrailLiker[];
  createdAt?: string;
  aspectRatio?: 'original' | '9:16' | '1:1' | '4:5' | '16:9';
  fitMode?: 'contain' | 'cover';
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

const DELETED_TRAILS_KEY = 'roamai_deleted_trail_ids';

export function getDeletedTrailIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(DELETED_TRAILS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isTrailDeletedLocally(trailId: string): boolean {
  if (!trailId) return false;
  return getDeletedTrailIds().includes(trailId);
}

export function addDeletedTrailId(trailId: string): void {
  if (!trailId || typeof window === 'undefined') return;
  try {
    const ids = new Set(getDeletedTrailIds());
    ids.add(trailId);
    localStorage.setItem(DELETED_TRAILS_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore
  }
}

export function removeDeletedTrailId(trailId: string): void {
  if (!trailId || typeof window === 'undefined') return;
  try {
    const ids = new Set(getDeletedTrailIds());
    if (ids.has(trailId)) {
      ids.delete(trailId);
      localStorage.setItem(DELETED_TRAILS_KEY, JSON.stringify(Array.from(ids)));
    }
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
    if (cleanU && !isFakeMockUser(cleanU) && !likersMap.has(cleanU)) {
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
          if (cleanU && !isFakeMockUser(cleanU) && !likersMap.has(cleanU)) {
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
          if (cleanU && !isFakeMockUser(cleanU) && !likersMap.has(cleanU)) {
            likersMap.set(cleanU, l);
          }
        });
      }
    }
  } catch {
    // ignore
  }

  // 4. Enrich likers with live profiles from Supabase profiles table
  try {
    const supabase = getSupabaseClient();
    if (supabase && likersMap.size > 0) {
      const unames: string[] = [];
      const ids: string[] = [];
      likersMap.forEach((l) => {
        const u = (l.username || '').toLowerCase().replace(/^@+/, '');
        if (u) unames.push(u);
        if (l.id && !l.id.startsWith('user_') && !l.id.startsWith('claimed_')) {
          ids.push(l.id.replace(/^supa_/, ''));
        }
      });

      const orClauses: string[] = [];
      if (ids.length > 0) orClauses.push(`id.in.(${ids.join(',')})`);
      if (unames.length > 0) {
        orClauses.push(`username.in.(${unames.map((u) => `@${u}`).join(',')})`);
        orClauses.push(`username.in.(${unames.join(',')})`);
      }

      if (orClauses.length > 0) {
        const { data: liveProfiles } = await supabase
          .from('profiles')
          .select('id, username, name, avatar_url')
          .or(orClauses.join(','));

        if (Array.isArray(liveProfiles) && liveProfiles.length > 0) {
          const profMap = new Map<string, any>();
          liveProfiles.forEach((p) => {
            if (p.id) profMap.set(p.id, p);
            const clean = (p.username || '').toLowerCase().replace(/^@+/, '');
            if (clean) {
              profMap.set(clean, p);
              profMap.set(clean.replace(/[._]/g, ''), p);
            }
          });

          likersMap.forEach((liker) => {
            const cleanU = (liker.username || '').toLowerCase().replace(/^@+/, '');
            const cleanId = (liker.id || '').replace(/^supa_/, '');
            const matched = (cleanId && profMap.get(cleanId)) ||
                            (cleanU && (profMap.get(cleanU) || profMap.get(cleanU.replace(/[._]/g, ''))));
            if (matched) {
              if (matched.name) liker.name = matched.name;
              if (matched.username) liker.username = matched.username.startsWith('@') ? matched.username : `@${matched.username}`;
              if (matched.avatar_url) liker.avatarUrl = matched.avatar_url;
              if (matched.id) liker.id = matched.id;
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to hydrate likers from profiles table:', err);
  }

  // 5. Also check any cached profiles in localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tripwise_user_profile_') || key.startsWith('roamai_user_profile_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const p = JSON.parse(raw);
            if (p && p.username) {
              const u = (p.username || '').toLowerCase().replace(/^@+/, '');
              likersMap.forEach((liker) => {
                const cleanU = (liker.username || '').toLowerCase().replace(/^@+/, '');
                if (cleanU === u || cleanU.replace(/[._]/g, '') === u.replace(/[._]/g, '')) {
                  if (p.name) liker.name = p.name;
                  if (p.avatarUrl) liker.avatarUrl = p.avatarUrl;
                }
              });
            }
          }
        }
      }
    } catch {}
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
 * Validate that a trail's media belongs to the current active Supabase project.
 * Filters out ghost/orphaned trails from prior Supabase projects.
 */
export function isValidTrailMedia(t: any): boolean {
  if (!t || !t.id) return false;
  try {
    const currentUrl = config.supabase.url;
    if (currentUrl && currentUrl.startsWith('http')) {
      const currentHost = new URL(currentUrl).hostname;
      const mediaUrl = t.videoUrl || t.posterUrl || '';
      if (typeof mediaUrl === 'string' && mediaUrl.includes('.supabase.co')) {
        // If it references a Supabase storage bucket from another project, discard
        if (!mediaUrl.includes(currentHost)) {
          return false;
        }
      }
    }
  } catch {}
  return true;
}

/**
 * Read locally cached trails
 */
export function getLocalTrails(): TrailReel[] {
  if (typeof window === 'undefined') return [];
  try {
    const deletedIds = new Set(getDeletedTrailIds());
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const valid = parsed
        .filter(
          (t: any) =>
            t &&
            t.id &&
            !deletedIds.has(t.id) &&
            !t.id?.startsWith('sample-trail-') &&
            !isFakeMockUser(t.creator?.username) &&
            isValidTrailMedia(t)
        )
        .map((t) => sanitizeTrail(t));

      // Auto-prune stale project trails from localStorage
      if (valid.length !== parsed.length) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(valid));
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(valid));
      }
      return valid;
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Storage index path for public cross-device shared trails registry.
 * Using .png extension as Supabase storage bucket policy requires image/video MIME types.
 * Content is standard UTF-8 JSON text.
 */
const STORAGE_INDEX_FILE = 'meta/global_trails_index.png';

/**
 * Fetch all trails directly from the public Supabase Storage global registry index.
 */
export async function fetchStorageTrailsIndex(): Promise<TrailReel[]> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return [];

    const deletedIds = new Set(getDeletedTrailIds());

    // 1. Download via Supabase storage client
    try {
      const { data, error } = await supabase.storage
        .from('trails')
        .download(STORAGE_INDEX_FILE);

      if (!error && data) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((t: any) => t && t.id && !deletedIds.has(t.id) && !isFakeMockUser(t.creator?.username) && isValidTrailMedia(t))
            .map(sanitizeTrail);
        }
      }
    } catch {
      // Fall through to public URL
    }

    // 2. Direct HTTP GET using public URL
    const { data: pubData } = supabase.storage
      .from('trails')
      .getPublicUrl(STORAGE_INDEX_FILE);

    if (pubData?.publicUrl) {
      const resp = await fetch(`${pubData.publicUrl}?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          return json
            .filter((t: any) => t && t.id && !deletedIds.has(t.id) && !isFakeMockUser(t.creator?.username) && isValidTrailMedia(t))
            .map(sanitizeTrail);
        }
      }
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Storage index fetch notice:', err);
  }
  return [];
}

/**
 * Save updated list of trails to the public Supabase Storage global registry index.
 */
export async function saveStorageTrailsIndex(trails: TrailReel[]): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const deletedIds = new Set(getDeletedTrailIds());
    const cleanTrails = trails
      .filter((t) => t && t.id && !deletedIds.has(t.id) && !t.id.startsWith('sample-trail-') && !isFakeMockUser(t.creator?.username) && isValidTrailMedia(t))
      .map(sanitizeTrail);

    const jsonString = JSON.stringify(cleanTrails, null, 2);
    const blob = new Blob([jsonString], { type: 'image/png' });

    const { error } = await supabase.storage
      .from('trails')
      .upload(STORAGE_INDEX_FILE, blob, {
        contentType: 'image/png',
        upsert: true,
        cacheControl: '60'
      });

    return !error;
  } catch (err) {
    console.warn('[sharedTrailsService] saveStorageTrailsIndex error:', err);
    return false;
  }
}

const INITIAL_TRAILS_BATCH_LIMIT = 12;

// In-memory cache & request deduplication for instant response
let cachedGlobalTrails: TrailReel[] | null = null;
let lastGlobalTrailsFetchTime = 0;
let inFlightGlobalTrailsPromise: Promise<TrailReel[]> | null = null;
const GLOBAL_TRAILS_CACHE_TTL = 30000; // 30 seconds fresh cache

export function invalidateGlobalTrailsCache(): void {
  cachedGlobalTrails = null;
  lastGlobalTrailsFetchTime = 0;
}

/**
 * Fetch all shared trails globally from Supabase and the backend API,
 * merging with local cache so all profiles see everyone's trails in real time.
 * Stale-While-Revalidate: Returns cached memory/local trails in 0ms, revalidating in background.
 */
export async function fetchGlobalTrails(forceRefresh = false): Promise<TrailReel[]> {
  const now = Date.now();

  // If memory cache exists
  if (!forceRefresh && cachedGlobalTrails && cachedGlobalTrails.length > 0) {
    if (now - lastGlobalTrailsFetchTime < GLOBAL_TRAILS_CACHE_TTL) {
      return cachedGlobalTrails;
    }
    // Stale-While-Revalidate: Return existing cache immediately for 0ms lag,
    // and revalidate in background without blocking the caller!
    revalidateGlobalTrails().catch(() => {});
    return cachedGlobalTrails;
  }

  // If memory cache is null, check local storage
  if (!cachedGlobalTrails) {
    const local = getLocalTrails();
    if (local && local.length > 0) {
      cachedGlobalTrails = local;
      lastGlobalTrailsFetchTime = now;
      if (!forceRefresh) {
        // Trigger background revalidation asynchronously without blocking the caller
        revalidateGlobalTrails().catch(() => {});
        return local;
      }
    }
  }

  if (inFlightGlobalTrailsPromise) {
    return inFlightGlobalTrailsPromise;
  }

  inFlightGlobalTrailsPromise = revalidateGlobalTrails();
  return inFlightGlobalTrailsPromise;
}

/**
 * Non-blocking background avatar & profile enrichment for creators without avatars
 */
async function hydrateMissingAvatars(missingAvatarIds: string[], supabase: any) {
  if (!missingAvatarIds.length || !supabase) return;
  try {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, username, name, avatar_url')
      .in('id', missingAvatarIds.slice(0, 20));

    if (Array.isArray(profs) && profs.length > 0 && cachedGlobalTrails) {
      const profMap = new Map<string, any>(profs.map((p) => [p.id, p]));
      let updatedAny = false;

      cachedGlobalTrails = cachedGlobalTrails.map((t) => {
        if (t.creator && t.creator.id) {
          const matched = profMap.get(t.creator.id.replace(/^supa_/, ''));
          if (matched && (matched.avatar_url || matched.name)) {
            updatedAny = true;
            return {
              ...t,
              creator: {
                ...t.creator,
                avatarUrl: matched.avatar_url || t.creator.avatarUrl,
                name: matched.name || t.creator.name
              }
            };
          }
        }
        return t;
      });

      if (updatedAny && typeof window !== 'undefined') {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cachedGlobalTrails));
          window.dispatchEvent(new CustomEvent('roamai_trail_creators_hydrated'));
        } catch {}
      }
    }
  } catch {
    // Non-fatal background task
  }
}

/**
 * Background revalidation for global trails:
 * Prioritizes the indexed Supabase trails table with targeted column selection,
 * small first batch limit (12 items) to render fast, and non-blocking avatar hydration.
 */
async function revalidateGlobalTrails(): Promise<TrailReel[]> {
  try {
    const deletedIds = new Set(getDeletedTrailIds());
    const localList = getLocalTrails();
    const trailMap = new Map<string, TrailReel>();

    const supabase = getSupabaseClient();
    let supabaseSuccess = false;

    // 1. Primary Source: Query indexed Supabase trails table with lean initial batch (limit 12)
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('trails')
          .select('id, user_id, trail_data, created_at')
          .order('created_at', { ascending: false })
          .limit(INITIAL_TRAILS_BATCH_LIMIT);

        if (!error && Array.isArray(data) && data.length > 0) {
          supabaseSuccess = true;
          data.forEach((row: any) => {
            const rawTrail = row.trail_data || row;
            if (rawTrail && rawTrail.id && !deletedIds.has(rawTrail.id) && !rawTrail.id.startsWith('sample-trail-') && isValidTrailMedia(rawTrail)) {
              const t = sanitizeTrail({
                ...rawTrail,
                createdAt: row.created_at || rawTrail.createdAt,
              });
              if (!isFakeMockUser(t.creator?.username)) {
                trailMap.set(t.id, t);
              }
            }
          });
        }
      } catch (err) {
        console.warn('[sharedTrailsService] Supabase trails query notice:', err);
      }
    }

    // 2. Fallback: If Supabase returned no trails or failed, query storage index and Express API in parallel
    if (!supabaseSuccess || trailMap.size === 0) {
      const [storageResult, serverResult] = await Promise.allSettled([
        fetchStorageTrailsIndex(),
        (async () => {
          try {
            const res = await fetch('/api/trails');
            if (res.ok) {
              const data = await res.json();
              return Array.isArray(data.trails) ? data.trails : [];
            }
          } catch {}
          return [];
        })()
      ]);

      if (storageResult.status === 'fulfilled' && Array.isArray(storageResult.value)) {
        storageResult.value.forEach((t) => {
          if (t && t.id && !deletedIds.has(t.id) && !t.id.startsWith('sample-trail-') && !isFakeMockUser(t.creator?.username) && isValidTrailMedia(t)) {
            trailMap.set(t.id, t);
          }
        });
      }

      if (serverResult.status === 'fulfilled' && Array.isArray(serverResult.value)) {
        serverResult.value.forEach((tRaw: any) => {
          if (tRaw && tRaw.id && !deletedIds.has(tRaw.id) && !tRaw.id.startsWith('sample-trail-') && isValidTrailMedia(tRaw) && !trailMap.has(tRaw.id)) {
            const t = sanitizeTrail(tRaw);
            if (!isFakeMockUser(t.creator?.username)) {
              trailMap.set(t.id, t);
            }
          }
        });
      }
    }

    // 3. Include recent local drafts (uploaded in the last 2 minutes)
    const nowMs = Date.now();
    localList.forEach((t) => {
      if (t && t.id && !deletedIds.has(t.id) && isValidTrailMedia(t)) {
        const createdTime = t.createdAt ? new Date(t.createdAt).getTime() : 0;
        const isFreshDraft = createdTime && (nowMs - createdTime < 2 * 60 * 1000);
        if (isFreshDraft && !trailMap.has(t.id)) {
          trailMap.set(t.id, sanitizeTrail(t));
        } else if (!supabaseSuccess && !trailMap.has(t.id)) {
          trailMap.set(t.id, sanitizeTrail(t));
        }
      }
    });

    // Extract creators missing avatars for asynchronous background hydration
    const missingAvatarIds: string[] = [];
    trailMap.forEach((t) => {
      if (t.creator && !t.creator.avatarUrl && t.creator.id && !t.creator.id.startsWith('user_')) {
        missingAvatarIds.push(t.creator.id.replace(/^supa_/, ''));
      }
    });

    // 4. Convert map to sorted array (newest first)
    const combined = Array.from(trailMap.values()).map(sanitizeTrail).sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : parseInt(a.id.replace(/\D/g, '')) || 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : parseInt(b.id.replace(/\D/g, '')) || 0;
      return timeB - timeA;
    });

    // Update in-memory cache & local storage immediately
    cachedGlobalTrails = combined;
    lastGlobalTrailsFetchTime = Date.now();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(combined));
      } catch {
        // ignore
      }
    }

    // 5. Fire non-blocking profile hydration in background without blocking initial feed display
    if (missingAvatarIds.length > 0 && supabase) {
      hydrateMissingAvatars(missingAvatarIds, supabase).catch(() => {});
    }

    return combined;
  } finally {
    inFlightGlobalTrailsPromise = null;
  }
}

let inFlightFetchMorePromise: Promise<TrailReel[]> | null = null;

/**
 * Fetch more trails progressively from Supabase without loading the entire database at once
 */
export async function fetchMoreGlobalTrails(offset: number, limit = 20): Promise<TrailReel[]> {
  if (inFlightFetchMorePromise) return inFlightFetchMorePromise;

  inFlightFetchMorePromise = (async () => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return [];
      const deletedIds = new Set(getDeletedTrailIds());

      const { data, error } = await supabase
        .from('trails')
        .select('id, user_id, trail_data, created_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && Array.isArray(data) && data.length > 0) {
        const moreTrails: TrailReel[] = [];
        data.forEach((row: any) => {
          const raw = row.trail_data || row;
          if (raw && raw.id && !deletedIds.has(raw.id) && !raw.id.startsWith('sample-trail-') && isValidTrailMedia(raw)) {
            const t = sanitizeTrail({
              ...raw,
              createdAt: row.created_at || raw.createdAt
            });
            if (!isFakeMockUser(t.creator?.username)) {
              moreTrails.push(t);
            }
          }
        });

        if (moreTrails.length > 0 && cachedGlobalTrails) {
          const existingIds = new Set(cachedGlobalTrails.map((t) => t.id));
          const newUnique = moreTrails.filter((t) => !existingIds.has(t.id));
          cachedGlobalTrails = [...cachedGlobalTrails, ...newUnique];
          try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cachedGlobalTrails));
          } catch {}
          return newUnique;
        }
      }
      return [];
    } catch (e) {
      console.warn('[sharedTrailsService] fetchMoreGlobalTrails notice:', e);
      return [];
    } finally {
      inFlightFetchMorePromise = null;
    }
  })();

  return inFlightFetchMorePromise;
}

/**
 * Paginate an in-memory or loaded trails array for smooth infinite scrolling
 */
export function getPaginatedTrails(
  allTrails: TrailReel[],
  page = 1,
  pageSize = 10
): { trails: TrailReel[]; hasMore: boolean; total: number } {
  const start = 0;
  const end = page * pageSize;
  const sliced = allTrails.slice(start, end);
  return {
    trails: sliced,
    hasMore: end < allTrails.length,
    total: allTrails.length
  };
}

/**
 * Publish a trail globally so all other users/profiles can view it
 */
export async function publishGlobalTrail(
  trail: TrailReel,
  file?: File | Blob | null
): Promise<TrailReel> {
  const supabase = getSupabaseClient();
  let serverSavedTrail: TrailReel = sanitizeTrail(trail);

  // Clear tombstone if previously deleted
  removeDeletedTrailId(trail.id);
  invalidateGlobalTrailsCache();

  // 1. Optimize video with client-side faststart (moves moov atom to start for instant progressive streaming)
  let uploadFile = file;
  if (file && (file.type?.includes('mp4') || file.type?.includes('video') || file.type?.includes('quicktime'))) {
    try {
      uploadFile = await optimizeMp4ForWeb(file);
    } catch {
      uploadFile = file;
    }
  }

  // Save optimized binary file to IndexedDB for instant, zero-lag local playback on this device
  if (uploadFile) {
    await saveTrailMedia(trail.id, uploadFile);
  }

  // 2. Upload video/image binary directly to Supabase Storage bucket 'trails'
  if (uploadFile && supabase) {
    try {
      const isImg = uploadFile.type?.startsWith('image/') || trail.mediaType === 'image';
      const ext = isImg
        ? (uploadFile.type?.includes('png') ? 'png' : 'jpg')
        : (uploadFile.type?.includes('webm') ? 'webm' : 'mp4');
      const filePath = `media/${trail.id}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('trails')
        .upload(filePath, uploadFile, {
          cacheControl: '31536000',
          upsert: true,
          contentType: uploadFile.type || (isImg ? 'image/jpeg' : 'video/mp4')
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
          cacheControl: '31536000',
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
      let authUserId: string | null = null;
      try {
        const { data: aData } = await supabase.auth.getUser();
        if (aData?.user?.id) {
          authUserId = aData.user.id;
        }
      } catch {
        authUserId = null;
      }

      const { error: dbError } = await supabase.from('trails').upsert({
        id: serverSavedTrail.id,
        user_id: authUserId,
        trail_data: serverSavedTrail,
        created_at: serverSavedTrail.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      if (dbError) {
        console.warn('[sharedTrailsService] Supabase trails table upsert warning, retrying with user_id: null:', dbError.message);
        const { error: retryErr } = await supabase.from('trails').upsert({
          id: serverSavedTrail.id,
          user_id: null,
          trail_data: serverSavedTrail,
          created_at: serverSavedTrail.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        if (retryErr) {
          console.warn('[sharedTrailsService] Supabase trails retry warning:', retryErr.message);
        }
      }
    } catch (err) {
      console.warn('[sharedTrailsService] Supabase table sync error:', err);
    }
  }

  // 6. Update global storage index in Supabase Storage so all devices see the new trail
  try {
    const currentStorageTrails = await fetchStorageTrailsIndex();
    const updatedStorageTrails = [
      serverSavedTrail,
      ...currentStorageTrails.filter((t) => t.id !== serverSavedTrail.id)
    ];
    await saveStorageTrailsIndex(updatedStorageTrails);
  } catch (storageIndexErr) {
    console.warn('[sharedTrailsService] Failed to update storage trails index:', storageIndexErr);
  }

  // 7. Update local storage with final record
  const current = getLocalTrails();
  const finalList = [serverSavedTrail, ...current.filter((t) => t.id !== trail.id)];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalList));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(finalList));
    } catch {
      // ignore
    }
  }

  return serverSavedTrail;
}

/**
 * Delete a trail globally from the backend:
 * 1. Mark as tombstone locally so UI never resurfaces it
 * 2. Delete binary media from local IndexedDB
 * 3. Remove from localStorage (roamai_user_trails, tripwise_user_trails, saved trails, likers)
 * 4. Delete from Backend Express Server API (/api/trails/:id)
 * 5. Delete from Supabase Storage global registry index (meta/global_trails_index.png)
 * 6. Delete media and poster files from Supabase Storage bucket ('trails')
 * 7. Delete from Supabase public.trails table
 * 8. Dispatch custom events to inform all UI components
 */
export async function deleteGlobalTrail(trailId: string): Promise<void> {
  if (!trailId) return;
  const cleanId = String(trailId).trim();

  // 1. Mark as deleted locally so it never resurfaces in this session
  addDeletedTrailId(cleanId);
  invalidateGlobalTrailsCache();

  // 2. Delete binary media from IndexedDB
  try {
    await deleteTrailMedia(cleanId);
  } catch (err) {
    console.warn('[sharedTrailsService] deleteTrailMedia error:', err);
  }

  // 3. Clean local storage
  const current = getLocalTrails().filter((t) => t.id !== cleanId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(current));
      localStorage.removeItem(TRAIL_LIKERS_PREFIX + cleanId);
      setTrailLikedByUser(cleanId, false);
    } catch {
      // ignore
    }

    // Also clean up from saved trails localStorage
    try {
      const rawSaved = localStorage.getItem('roamai_saved_trail_ids');
      if (rawSaved) {
        const savedIds = JSON.parse(rawSaved);
        if (Array.isArray(savedIds) && savedIds.includes(cleanId)) {
          const filteredSaved = savedIds.filter((id) => id !== cleanId);
          localStorage.setItem('roamai_saved_trail_ids', JSON.stringify(filteredSaved));
        }
      }
      const rawCache = localStorage.getItem('roamai_saved_trails_cache');
      if (rawCache) {
        const cache = JSON.parse(rawCache);
        if (Array.isArray(cache)) {
          const filteredCache = cache.filter((t: any) => t && t.id !== cleanId);
          localStorage.setItem('roamai_saved_trails_cache', JSON.stringify(filteredCache));
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Delete from Backend Server API
  try {
    await fetch(`/api/trails/${encodeURIComponent(cleanId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to delete from server API:', err);
  }

  // 5. Delete from Supabase Storage global registry index
  try {
    const list = await fetchStorageTrailsIndex();
    const updated = list.filter((t) => t.id !== cleanId);
    if (updated.length !== list.length) {
      await saveStorageTrailsIndex(updated);
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Failed to update storage index on delete:', err);
  }

  // 6. Delete media and poster files from Supabase Storage bucket
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.storage.from('trails').remove([
        `media/${cleanId}.mp4`,
        `media/${cleanId}.webm`,
        `media/${cleanId}.png`,
        `media/${cleanId}.jpg`,
        `media/${cleanId}.mov`,
        `posters/${cleanId}.jpg`,
        `posters/${cleanId}.png`
      ]);
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Supabase storage file remove warning:', err);
  }

  // 7. Delete from Supabase public.trails table
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('trails').delete().eq('id', cleanId);
    }
  } catch (err) {
    console.warn('[sharedTrailsService] Supabase table delete warning:', err);
  }

  // 8. Dispatch custom events across window so all components update in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('roamai_trail_deleted', { detail: { trailId: cleanId } }));
    window.dispatchEvent(new CustomEvent('roamai_saved_trails_changed'));
  }
}

const inFlightLikes = new Set<string>();

/**
 * Like / unlike a trail globally.
 * ONLY signed up users with a valid username can like a trail.
 */
export async function likeGlobalTrail(
  trailId: string, 
  increment: boolean,
  liker?: TrailLiker
): Promise<{ success: boolean }> {
  // Strict check: only registered/signed up users can like
  if (!liker || (!liker.username && !liker.id)) {
    console.warn('[sharedTrailsService] likeGlobalTrail requires a signed-up user');
    return { success: false };
  }

  if (inFlightLikes.has(trailId)) {
    return { success: true };
  }
  inFlightLikes.add(trailId);

  try {
    // 1. Update user liked state
    setTrailLikedByUser(trailId, increment);

    // 2. Update local likers list
    let currentLikers = getLocalTrailLikers(trailId);
    const cleanU = (liker.username || '').toLowerCase().replace(/^@+/, '');
    if (!cleanU) return { success: false };

    if (increment) {
      if (!currentLikers.some((l) => (l.username || '').toLowerCase().replace(/^@+/, '') === cleanU)) {
        currentLikers = [{ ...liker, likedAt: new Date().toISOString() }, ...currentLikers];
      }
    } else {
      currentLikers = currentLikers.filter((l) => (l.username || '').toLowerCase().replace(/^@+/, '') !== cleanU);
    }
    setLocalTrailLikers(trailId, currentLikers);

    // 3. Update local storage cache immediately for zero latency
    let calculatedLikesCount: number = currentLikers.length;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (raw) {
          const trails: TrailReel[] = JSON.parse(raw);
          if (Array.isArray(trails)) {
            const updated = trails.map((t) => {
              if (t.id === trailId) {
                const prevCount = typeof t.likesCount === 'number' ? t.likesCount : (Number(t.likesCount) || 0);
                calculatedLikesCount = increment ? Math.max(prevCount + 1, currentLikers.length) : Math.max(0, prevCount - 1);
                return { 
                  ...t, 
                  likesCount: calculatedLikesCount, 
                  isLiked: increment,
                  likedBy: currentLikers 
                };
              }
              return t;
            });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
          }
        }
        window.dispatchEvent(new CustomEvent('roamai_trail_liked', { detail: { trailId, increment, liker, likesCount: calculatedLikesCount } }));
        window.dispatchEvent(new Event('storage'));
      } catch {
        // ignore
      }
    }

    // 4. Update in Supabase & Server concurrently in background
    Promise.allSettled([
      (async () => {
        const supabase = getSupabaseClient();
        if (supabase) {
          const { data } = await supabase.from('trails').select('trail_data').eq('id', trailId).single();
          if (data && data.trail_data) {
            const prevCount = typeof data.trail_data.likesCount === 'number' ? data.trail_data.likesCount : (Number(data.trail_data.likesCount) || 0);
            const nextCount = increment ? Math.max(prevCount + 1, currentLikers.length) : Math.max(0, prevCount - 1);
            const updatedTrail = { 
              ...data.trail_data, 
              likesCount: nextCount, 
              likedBy: currentLikers 
            };
            await supabase.from('trails').update({ trail_data: updatedTrail }).eq('id', trailId);
          }
        }
      })(),
      fetch(`/api/trails/${encodeURIComponent(trailId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ increment, liker })
      })
    ]).catch(() => {});

    return { success: true };
  } finally {
    inFlightLikes.delete(trailId);
  }
}

/**
 * Record view on a trail globally.
 * ONLY signed up users can increase view count.
 */
export async function recordTrailView(
  trailId: string,
  viewer?: { id?: string; username: string }
): Promise<number | undefined> {
  if (!trailId || !viewer || (!viewer.id && !viewer.username)) {
    // Only signed up users can record views
    return undefined;
  }

  // Deduplicate in this browser session
  const cleanU = (viewer.username || '').toLowerCase().replace(/^@+/, '');
  const sessionKey = `roamai_viewed_${viewer.id || cleanU}_${trailId}`;
  if (typeof window !== 'undefined') {
    try {
      if (sessionStorage.getItem(sessionKey)) {
        return undefined; // Already counted this session
      }
      sessionStorage.setItem(sessionKey, '1');
    } catch {
      // ignore
    }
  }

  let updatedViewsCount = 1;

  // 1. Update local storage cache immediately
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const trails: TrailReel[] = JSON.parse(raw);
        if (Array.isArray(trails)) {
          const updated = trails.map((t) => {
            if (t.id === trailId) {
              const currentViews = Number(t.viewsCount || 0);
              updatedViewsCount = currentViews + 1;
              const viewedBy = Array.isArray(t.viewedBy) ? t.viewedBy : [];
              const viewerExists = viewedBy.some((v: any) => 
                (typeof v === 'string' && v.toLowerCase().replace(/^@+/, '') === cleanU) ||
                (v && v.username && v.username.toLowerCase().replace(/^@+/, '') === cleanU)
              );
              const newViewedBy = viewerExists ? viewedBy : [...viewedBy, { id: viewer.id, username: viewer.username, viewedAt: new Date().toISOString() }];
              return {
                ...t,
                viewsCount: updatedViewsCount,
                viewedBy: newViewedBy
              };
            }
            return t;
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
      }
      window.dispatchEvent(new CustomEvent('roamai_trail_viewed', { detail: { trailId, viewsCount: updatedViewsCount, viewer } }));
    } catch {
      // ignore
    }
  }

  // 2. Update in server API and Supabase concurrently without sequential waterfalls
  try {
    const serverPromise = fetch(`/api/trails/${encodeURIComponent(trailId)}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer })
    }).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (typeof data.viewsCount === 'number') {
          updatedViewsCount = data.viewsCount;
        }
      }
    }).catch(() => {});

    const supabasePromise = (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) return;
      const { data } = await supabase.from('trails').select('trail_data').eq('id', trailId).single();
      if (data && data.trail_data) {
        const currentViews = Number(data.trail_data.viewsCount || 0);
        const nextViews = currentViews + 1;
        const viewedBy = Array.isArray(data.trail_data.viewedBy) ? data.trail_data.viewedBy : [];
        const viewerExists = viewedBy.some((v: any) => 
          (typeof v === 'string' && v.toLowerCase().replace(/^@+/, '') === cleanU) ||
          (v && v.username && v.username.toLowerCase().replace(/^@+/, '') === cleanU)
        );
        const newViewedBy = viewerExists ? viewedBy : [...viewedBy, { id: viewer.id, username: viewer.username, viewedAt: new Date().toISOString() }];
        
        await supabase.from('trails').update({
          trail_data: {
            ...data.trail_data,
            viewsCount: nextViews,
            viewedBy: newViewedBy
          }
        }).eq('id', trailId);
      }
    })().catch(() => {});

    await Promise.allSettled([serverPromise, supabasePromise]);
  } catch (err) {
    // ignore
  }

  return updatedViewsCount;
}

/**
 * Add comment globally
 */
export async function commentOnGlobalTrail(
  trailId: string,
  comment: { user: string; avatar: string; text: string; time?: string; timestamp?: number }
): Promise<void> {
  const now = comment.timestamp || Date.now();
  const newCommentObj: TrailComment = {
    id: `comment-${now}`,
    user: comment.user,
    avatar: comment.avatar,
    text: comment.text,
    time: comment.time || '1m',
    timestamp: now
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

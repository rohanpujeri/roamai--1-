import { TrailReel, fetchGlobalTrails, getLocalTrails } from './sharedTrailsService';

const SAVED_IDS_KEY = 'roamai_saved_trail_ids';
const SAVED_CACHE_KEY = 'roamai_saved_trails_cache';

/**
 * Returns array of saved trail IDs from localStorage
 */
export function getSavedTrailIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific trail ID is saved
 */
export function isTrailSaved(trailId: string): boolean {
  if (!trailId) return false;
  const ids = getSavedTrailIds();
  return ids.includes(trailId);
}

/**
 * Returns saved trail count
 */
export function getSavedTrailsCount(): number {
  return getSavedTrailIds().length;
}

/**
 * Read cached saved trail objects
 */
function getCachedSavedTrails(): TrailReel[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Persist cache of saved trail objects
 */
function setCachedSavedTrails(trails: TrailReel[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify(trails));
  } catch {
    // ignore
  }
}

function notifyChange(count: number, trailId: string, isSaved: boolean) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('roamai_saved_trails_changed', {
      detail: { count, trailId, isSaved }
    })
  );
  window.dispatchEvent(new Event('storage'));
}

/**
 * Save a trail to Saved Trails
 */
export function saveTrail(trail: TrailReel): void {
  if (!trail || !trail.id) return;
  const ids = new Set(getSavedTrailIds());
  ids.add(trail.id);
  localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(Array.from(ids)));

  const cache = getCachedSavedTrails().filter((t) => t.id !== trail.id);
  cache.unshift({ ...trail, isSaved: true });
  setCachedSavedTrails(cache);

  notifyChange(ids.size, trail.id, true);
}

/**
 * Remove a trail from Saved Trails
 */
export function unsaveTrail(trailId: string): void {
  if (!trailId) return;
  const ids = new Set(getSavedTrailIds());
  ids.delete(trailId);
  localStorage.setItem(SAVED_IDS_KEY, JSON.stringify(Array.from(ids)));

  const cache = getCachedSavedTrails().filter((t) => t.id !== trailId);
  setCachedSavedTrails(cache);

  notifyChange(ids.size, trailId, false);
}

/**
 * Toggle saved status of a trail
 */
export function toggleSaveTrail(trail: TrailReel): boolean {
  if (!trail || !trail.id) return false;
  const saved = isTrailSaved(trail.id);
  if (saved) {
    unsaveTrail(trail.id);
    return false;
  } else {
    saveTrail(trail);
    return true;
  }
}

/**
 * Fetches full list of saved trails, merging cached objects with global trails
 */
export async function getSavedTrails(): Promise<TrailReel[]> {
  const savedIds = new Set(getSavedTrailIds());
  if (savedIds.size === 0) return [];

  const trailsMap = new Map<string, TrailReel>();

  // 1. Load from local cache first for instant response
  const cached = getCachedSavedTrails();
  cached.forEach((t) => {
    if (savedIds.has(t.id)) {
      trailsMap.set(t.id, { ...t, isSaved: true });
    }
  });

  // 2. Fetch fresh global trails
  try {
    const globalList = await fetchGlobalTrails();
    globalList.forEach((t) => {
      if (savedIds.has(t.id)) {
        trailsMap.set(t.id, { ...t, isSaved: true });
      }
    });
  } catch {
    // fallback to local trails
    const local = getLocalTrails();
    local.forEach((t) => {
      if (savedIds.has(t.id)) {
        trailsMap.set(t.id, { ...t, isSaved: true });
      }
    });
  }

  // Update cached objects
  const result = Array.from(trailsMap.values());
  setCachedSavedTrails(result);

  return result;
}

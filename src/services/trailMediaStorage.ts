/**
 * Trail Media Storage Service
 * Uses IndexedDB to store persistent video and image blobs across browser reloads,
 * and extracts video poster frames for instant thumbnails.
 */

const DB_NAME = 'RoamAITrailsMediaDB';
const STORE_NAME = 'trail_media';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Persist a video or image File/Blob into IndexedDB
 */
export async function saveTrailMedia(trailId: string, file: Blob | File): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, trailId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save trail media in IndexedDB:', err);
  }
}

/**
 * Retrieve the raw media Blob from IndexedDB
 */
export async function getTrailMediaBlob(trailId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(trailId);
      req.onsuccess = () => {
        resolve((req.result as Blob) || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to retrieve trail media from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete media from IndexedDB
 */
export async function deleteTrailMedia(trailId: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(trailId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

// Memory cache of active Object URLs with LRU size limit to prevent memory bloat
const MAX_ACTIVE_OBJECT_URLS = 25;
const activeObjectUrlMap = new Map<string, string>();

function cacheMediaUrl(trailId: string, url: string): void {
  if (activeObjectUrlMap.has(trailId)) {
    activeObjectUrlMap.delete(trailId);
  } else if (activeObjectUrlMap.size >= MAX_ACTIVE_OBJECT_URLS) {
    const oldestKey = activeObjectUrlMap.keys().next().value;
    if (oldestKey) {
      const oldestUrl = activeObjectUrlMap.get(oldestKey);
      if (oldestUrl && oldestUrl.startsWith('blob:') && typeof URL !== 'undefined') {
        try {
          URL.revokeObjectURL(oldestUrl);
        } catch {}
      }
      activeObjectUrlMap.delete(oldestKey);
    }
  }
  activeObjectUrlMap.set(trailId, url);
}

/**
 * Resolve an active, playable media URL for a given trail.
 * Prioritizes local IndexedDB storage for instant 0ms playback with zero network usage,
 * falling back to cached remote HTTP URLs.
 */
export async function resolveTrailMediaUrl(trailId: string, fallbackUrl?: string): Promise<string> {
  // If we already have a live Object URL in this tab session, return it
  if (activeObjectUrlMap.has(trailId)) {
    return activeObjectUrlMap.get(trailId)!;
  }

  // 1. Check local IndexedDB first for instant local playback without network transfer
  try {
    const blob = await getTrailMediaBlob(trailId);
    if (blob) {
      const newUrl = URL.createObjectURL(blob);
      cacheMediaUrl(trailId, newUrl);
      return newUrl;
    }
  } catch {
    // Non-fatal, proceed to remote fallback
  }

  // 2. If fallbackUrl is a valid external URL (not expired blob:), cache and return it
  if (fallbackUrl && !fallbackUrl.startsWith('blob:') && fallbackUrl.startsWith('http')) {
    cacheMediaUrl(trailId, fallbackUrl);
    return fallbackUrl;
  }

  return fallbackUrl || '';
}

/**
 * Automatically captures a high quality video poster frame from a video file or blob.
 * If file is an image, converts it to a data URL.
 */
export function generateVideoPoster(file: Blob | File): Promise<string> {
  return new Promise((resolve) => {
    // If it's an image, read directly as data URL
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    try {
      const video = document.createElement('video');
      const tempUrl = URL.createObjectURL(file);
      video.src = tempUrl;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('webkit-playsinline', 'true');
      video.preload = 'auto';

      let resolved = false;
      const cleanup = () => {
        try {
          URL.revokeObjectURL(tempUrl);
          video.remove();
        } catch {
          // ignore
        }
      };

      const captureFrame = () => {
        if (resolved) return;
        resolved = true;
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 1136;
          // Scale to max 720 width for lightweight storage
          const scale = Math.min(1, 720 / width);
          canvas.width = Math.round(width * scale);
          canvas.height = Math.round(height * scale);

          const ctx = canvas.getContext('2d');
          if (ctx && canvas.width > 0 && canvas.height > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
            cleanup();
            return resolve(dataUrl);
          }
        } catch (e) {
          console.warn('Error capturing video frame:', e);
        }
        cleanup();
        resolve('');
      };

      video.onloadeddata = () => {
        // Seek to 0.1s to avoid black starting frames
        try {
          video.currentTime = Math.min(0.2, (video.duration || 1) / 2);
        } catch {
          captureFrame();
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve('');
        }
      };

      // Fallback timer in case video takes long to load
      setTimeout(() => {
        if (!resolved) {
          captureFrame();
        }
      }, 3000);
    } catch {
      resolve('');
    }
  });
}

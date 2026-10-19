import fs from 'fs';
import path from 'path';
import { isFakeMockUser } from './serverUserUtils';
import { serverConfig } from '../config';

export interface ServerTrailRecord {
  id: string;
  mediaUrl: string;
  posterUrl?: string;
  mediaType: 'video' | 'image';
  title: string;
  creator: {
    id?: string;
    name: string;
    username: string;
    avatarUrl?: string;
  };
  caption: string;
  destination: string;
  tags: string[];
  audioTitle: string;
  isSaved?: boolean;
  createdAt: string;
}

// In-memory cache for fast, zero-latency feed serving
const trailsMap = new Map<string, ServerTrailRecord>();

// Determine data directory (use /tmp in serverless/Vercel environments)
const dataDir = process.env.VERCEL ? '/tmp/roamai_data' : path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'trails.json');

// Directory for static uploaded video/photo files
const publicUploadsDir = path.join(process.cwd(), 'public/uploads/trails');
const tmpUploadsDir = '/tmp/roamai_uploads';
const uploadsDir = process.env.VERCEL ? tmpUploadsDir : publicUploadsDir;

// Initialize from disk if available
try {
  if (fs.existsSync(dataFile)) {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed: ServerTrailRecord[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((rec) => {
        if (
          rec &&
          rec.id &&
          !rec.id.startsWith('sample-trail-') &&
          !isFakeMockUser(rec.creator?.username) &&
          rec.mediaType !== 'video' &&
          !rec.mediaUrl?.includes('.mp4')
        ) {
          trailsMap.set(rec.id, rec);
        }
      });
    }
  }
} catch (err) {
  console.warn('[serverTrailsRegistry] Could not read trails.json from disk:', err);
}

function persistToDisk(): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const array = Array.from(trailsMap.values());
    fs.writeFileSync(dataFile, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[serverTrailsRegistry] Could not persist trails to disk:', err);
  }
}

const SUPABASE_URL = serverConfig.supabase.url;
const SUPABASE_KEY = serverConfig.supabase.anonKey;

export async function syncServerTrailsFromStorage(): Promise<void> {
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/trails/meta/global_trails_index.png?t=${Date.now()}`);
    if (res.ok) {
      const parsed: ServerTrailRecord[] = await res.json();
      if (Array.isArray(parsed)) {
        parsed.forEach((rec) => {
          if (
            rec &&
            rec.id &&
            !rec.id.startsWith('sample-trail-') &&
            !isFakeMockUser(rec.creator?.username) &&
            rec.mediaType !== 'video' &&
            !rec.mediaUrl?.includes('.mp4')
          ) {
            trailsMap.set(rec.id, rec);
          }
        });
        persistToDisk();
      }
    }
  } catch {
    // Non-fatal
  }
}

// Initial background sync from storage on startup
syncServerTrailsFromStorage().catch(() => {});

/**
 * Save binary base64 file to disk if possible, returning the public static URL
 */
function saveMediaFileToDisk(trailId: string, base64Data: string, prefix: string = 'media'): string | null {
  try {
    if (!base64Data || !base64Data.startsWith('data:')) return null;

    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1];
    const dataBuffer = Buffer.from(matches[2], 'base64');

    let ext = 'bin';
    if (mimeType.includes('video/mp4')) ext = 'mp4';
    else if (mimeType.includes('video/webm')) ext = 'webm';
    else if (mimeType.includes('video/quicktime') || mimeType.includes('video/mov')) ext = 'mov';
    else if (mimeType.includes('image/jpeg') || mimeType.includes('image/jpg')) ext = 'jpg';
    else if (mimeType.includes('image/png')) ext = 'png';
    else if (mimeType.includes('image/webp')) ext = 'webp';

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const fileName = `${trailId}_${prefix}.${ext}`;
    const targetPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(targetPath, dataBuffer);

    return `/uploads/trails/${fileName}`;
  } catch (err) {
    console.warn('[serverTrailsRegistry] Could not write media file to disk:', err);
    return null;
  }
}

/**
 * Get all public trails uploaded by all profiles, sorted newest first
 */
export function getAllServerTrails(): ServerTrailRecord[] {
  const records = Array.from(trailsMap.values()).filter(
    (t) => t && !t.id?.startsWith('sample-trail-') && !isFakeMockUser(t.creator?.username) && t.mediaType !== 'video' && !t.mediaUrl?.includes('.mp4')
  );
  return records.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Save or publish a trail to the global shared registry
 */
export function saveServerTrail(
  trailData: Partial<ServerTrailRecord> & { id: string },
  mediaBase64?: string,
  posterBase64?: string
): ServerTrailRecord {
  let mediaUrl = trailData.mediaUrl || '';
  let posterUrl = trailData.posterUrl || '';

  // If base64 media was sent, attempt to write to disk for static serving
  if (mediaBase64 && mediaBase64.startsWith('data:')) {
    const diskMediaUrl = saveMediaFileToDisk(trailData.id, mediaBase64, 'media');
    if (diskMediaUrl) {
      mediaUrl = diskMediaUrl;
    } else {
      mediaUrl = mediaBase64; // keep data url as fallback
    }
  }

  if (posterBase64 && posterBase64.startsWith('data:')) {
    const diskPosterUrl = saveMediaFileToDisk(trailData.id, posterBase64, 'poster');
    if (diskPosterUrl) {
      posterUrl = diskPosterUrl;
    } else {
      posterUrl = posterBase64;
    }
  }

  const existing = trailsMap.get(trailData.id);

  const cleanRecord: ServerTrailRecord = {
    id: trailData.id,
    mediaUrl: mediaUrl || existing?.mediaUrl || '',
    posterUrl: posterUrl || existing?.posterUrl || undefined,
    mediaType: trailData.mediaType || existing?.mediaType || (mediaUrl.includes('image') ? 'image' : 'video'),
    title: trailData.title || existing?.title || 'Travel Trail',
    creator: {
      id: trailData.creator?.id || existing?.creator?.id || undefined,
      name: trailData.creator?.name || existing?.creator?.name || 'Explorer',
      username: trailData.creator?.username || existing?.creator?.username || '@traveler',
      avatarUrl: trailData.creator?.avatarUrl || existing?.creator?.avatarUrl || ''
    },
    caption: trailData.caption || existing?.caption || '',
    destination: trailData.destination || existing?.destination || 'Everywhere',
    tags: Array.isArray(trailData.tags) ? trailData.tags : (existing?.tags || []),
    audioTitle: trailData.audioTitle || existing?.audioTitle || 'Original Travel Sound',
    isSaved: trailData.isSaved ?? existing?.isSaved ?? false,
    createdAt: trailData.createdAt || existing?.createdAt || new Date().toISOString()
  };

  trailsMap.set(cleanRecord.id, cleanRecord);
  persistToDisk();

  // Async sync to Supabase public.trails table so all users on any device see it
  if (SUPABASE_URL && SUPABASE_KEY) {
    fetch(`${SUPABASE_URL}/rest/v1/trails`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: cleanRecord.id,
        user_id: null,
        trail_data: cleanRecord,
        created_at: cleanRecord.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    }).catch(err => {
      console.warn('[serverTrailsRegistry] Supabase trails table sync notice:', err);
    });

    // Also update global storage index
    (async () => {
      try {
        const allTrails = Array.from(trailsMap.values())
          .filter(t => t && t.id && !t.id.startsWith('sample-trail-'))
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const jsonBody = JSON.stringify(allTrails, null, 2);
        await fetch(`${SUPABASE_URL}/storage/v1/object/trails/meta/global_trails_index.png`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'image/png',
            'x-upsert': 'true'
          },
          body: jsonBody
        });
      } catch (err) {
        console.warn('[serverTrailsRegistry] Global storage index sync notice:', err);
      }
    })();
  }

  return cleanRecord;
}

/**
 * Delete a trail completely from the backend:
 * 1. In-memory map
 * 2. Persistent disk JSON
 * 3. Local uploaded media and poster files on disk
 * 4. Supabase Storage files
 * 5. Supabase Storage global registry index
 * 6. Supabase public.trails table
 */
export async function deleteServerTrail(trailId: string): Promise<boolean> {
  if (!trailId) return false;
  const cleanId = String(trailId).trim();
  const decodedId = decodeURIComponent(cleanId);
  const encodedId = encodeURIComponent(cleanId);

  // 1. Remove from in-memory map
  trailsMap.delete(cleanId);
  trailsMap.delete(decodedId);
  trailsMap.delete(encodedId);

  for (const [k] of trailsMap) {
    if (k === cleanId || k === decodedId || k === encodedId || decodeURIComponent(k) === decodedId) {
      trailsMap.delete(k);
    }
  }

  // 2. Persist to disk trails.json
  persistToDisk();

  // 3. Remove disk media files (both /uploads/trails and /tmp/roamai_uploads)
  const candidateDirs = [uploadsDir, publicUploadsDir, tmpUploadsDir];
  for (const dir of candidateDirs) {
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (
            file.startsWith(`${cleanId}_`) || file.startsWith(`${cleanId}.`) ||
            file.startsWith(`${decodedId}_`) || file.startsWith(`${decodedId}.`)
          ) {
            try {
              fs.unlinkSync(path.join(dir, file));
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }
    }
  }

  // 4. Delete media & poster files from Supabase Storage
  try {
    const prefixes = [
      `media/${cleanId}.mp4`,
      `media/${cleanId}.webm`,
      `media/${cleanId}.png`,
      `media/${cleanId}.jpg`,
      `media/${cleanId}.mov`,
      `posters/${cleanId}.jpg`,
      `posters/${cleanId}.png`,
      `media/${decodedId}.mp4`,
      `media/${decodedId}.webm`,
      `media/${decodedId}.png`,
      `media/${decodedId}.jpg`,
      `media/${decodedId}.mov`,
      `posters/${decodedId}.jpg`,
      `posters/${decodedId}.png`
    ];
    await fetch(`${SUPABASE_URL}/storage/v1/object/trails`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefixes })
    });
  } catch (err) {
    console.warn('[serverTrailsRegistry] Supabase storage file remove warning:', err);
  }

  // 5. Update global storage index in Supabase Storage
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/public/trails/meta/global_trails_index.png?t=${Date.now()}`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const filtered = list.filter((t: any) => t && t.id !== cleanId && t.id !== decodedId);
        if (filtered.length !== list.length) {
          await fetch(`${SUPABASE_URL}/storage/v1/object/trails/meta/global_trails_index.png`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'image/png',
              'x-upsert': 'true'
            },
            body: JSON.stringify(filtered)
          });
        }
      }
    }
  } catch {
    // Non-fatal
  }

  // 6. Delete from Supabase public.trails table
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/trails?id=eq.${encodeURIComponent(decodedId)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
  } catch (err) {
    console.warn('[serverTrailsRegistry] Supabase table delete warning:', err);
  }

  return true;
}

/**
 * Delete all trails created by a user
 */
export async function deleteServerUserTrails(userId?: string, username?: string): Promise<boolean> {
  const cleanU = (username || '').replace(/^@+/, '').trim().toLowerCase();
  const trailIdsToDelete: string[] = [];

  for (const [id, record] of trailsMap.entries()) {
    const creatorUser = (record.creator?.username || '').replace(/^@+/, '').trim().toLowerCase();
    const creatorId = record.creator?.id;

    if ((userId && creatorId === userId) || (cleanU && creatorUser === cleanU)) {
      trailIdsToDelete.push(id);
    }
  }

  for (const id of trailIdsToDelete) {
    try {
      await deleteServerTrail(id);
    } catch (e) {
      console.warn(`Failed to delete trail ${id} during user deletion:`, e);
    }
  }

  return true;
}



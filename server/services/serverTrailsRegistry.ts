import fs from 'fs';
import path from 'path';

export interface ServerTrailRecord {
  id: string;
  videoUrl: string;
  posterUrl?: string;
  mediaType: 'video' | 'image';
  title: string;
  creator: {
    id?: string;
    name: string;
    username: string;
    avatarUrl?: string;
    isFollowed?: boolean;
  };
  caption: string;
  destination: string;
  tags: string[];
  audioTitle: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  comments?: Array<{
    id: string;
    user: string;
    avatar: string;
    text: string;
    time: string;
  }>;
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
        if (rec && rec.id) {
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
  const records = Array.from(trailsMap.values());
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
  let videoUrl = trailData.videoUrl || '';
  let posterUrl = trailData.posterUrl || '';

  // If base64 media was sent, attempt to write to disk for static serving
  if (mediaBase64 && mediaBase64.startsWith('data:')) {
    const diskMediaUrl = saveMediaFileToDisk(trailData.id, mediaBase64, 'media');
    if (diskMediaUrl) {
      videoUrl = diskMediaUrl;
    } else {
      videoUrl = mediaBase64; // keep data url as fallback
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
    videoUrl: videoUrl || existing?.videoUrl || '',
    posterUrl: posterUrl || existing?.posterUrl || undefined,
    mediaType: trailData.mediaType || existing?.mediaType || (videoUrl.includes('image') ? 'image' : 'video'),
    title: trailData.title || existing?.title || 'Travel Trail',
    creator: {
      id: trailData.creator?.id || existing?.creator?.id || undefined,
      name: trailData.creator?.name || existing?.creator?.name || 'Explorer',
      username: trailData.creator?.username || existing?.creator?.username || '@traveler',
      avatarUrl: trailData.creator?.avatarUrl || existing?.creator?.avatarUrl || '',
      isFollowed: trailData.creator?.isFollowed ?? existing?.creator?.isFollowed ?? false
    },
    caption: trailData.caption || existing?.caption || '',
    destination: trailData.destination || existing?.destination || 'Everywhere',
    tags: Array.isArray(trailData.tags) ? trailData.tags : (existing?.tags || []),
    audioTitle: trailData.audioTitle || existing?.audioTitle || 'Original Travel Sound',
    likesCount: trailData.likesCount ?? existing?.likesCount ?? 0,
    commentsCount: trailData.commentsCount ?? existing?.commentsCount ?? 0,
    isLiked: trailData.isLiked ?? existing?.isLiked ?? false,
    isSaved: trailData.isSaved ?? existing?.isSaved ?? false,
    comments: trailData.comments || existing?.comments || [],
    createdAt: trailData.createdAt || existing?.createdAt || new Date().toISOString()
  };

  trailsMap.set(cleanRecord.id, cleanRecord);
  persistToDisk();

  return cleanRecord;
}

/**
 * Delete a trail from the global shared registry
 */
export function deleteServerTrail(trailId: string): boolean {
  if (!trailsMap.has(trailId)) return false;

  trailsMap.delete(trailId);
  persistToDisk();
  return true;
}

/**
 * Like or unlike a trail globally
 */
export function toggleLikeServerTrail(trailId: string, increment: boolean): { success: boolean; likesCount: number } {
  const trail = trailsMap.get(trailId);
  if (!trail) return { success: false, likesCount: 0 };

  trail.likesCount = Math.max(0, trail.likesCount + (increment ? 1 : -1));
  trail.isLiked = increment;
  persistToDisk();

  return { success: true, likesCount: trail.likesCount };
}

/**
 * Add a comment to a trail globally
 */
export function addCommentToServerTrail(
  trailId: string,
  comment: { user: string; avatar: string; text: string }
): boolean {
  const trail = trailsMap.get(trailId);
  if (!trail) return false;

  const newComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    user: comment.user,
    avatar: comment.avatar,
    text: comment.text,
    time: 'Just now'
  };

  trail.comments = [newComment, ...(trail.comments || [])];
  trail.commentsCount = (trail.commentsCount || 0) + 1;
  persistToDisk();

  return true;
}

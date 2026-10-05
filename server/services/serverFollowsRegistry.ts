import fs from 'fs';
import path from 'path';
import { serverConfig } from '../config';

export interface ServerFollowRecord {
  id: string;
  followerId: string;
  followerUsername: string;
  followerName: string;
  followerAvatar?: string;
  followingId: string;
  followingUsername: string;
  followingName: string;
  followingAvatar?: string;
  createdAt: string;
}

function cleanHandle(u: string): string {
  return (u || '').replace(/^@+/, '').trim().toLowerCase();
}

function makeKey(followerUsername: string, followingUsername: string): string {
  return `${cleanHandle(followerUsername)}->${cleanHandle(followingUsername)}`;
}

// In-memory registry
const followsMap = new Map<string, ServerFollowRecord>();

const dataDir = process.env.VERCEL ? '/tmp/roamai_data' : path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'follows.json');

const SUPABASE_URL = serverConfig.supabase.url;
const SUPABASE_KEY = serverConfig.supabase.anonKey;

export function isFakeMockUser(_username?: string | null): boolean {
  // All authenticated or registered users are valid real accounts
  return false;
}

// Initialize from disk and aggressively scrub any fake seed accounts
try {
  if (fs.existsSync(dataFile)) {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed: ServerFollowRecord[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((rec) => {
        if (
          rec &&
          rec.followerUsername &&
          rec.followingUsername &&
          !isFakeMockUser(rec.followerUsername) &&
          !isFakeMockUser(rec.followingUsername) &&
          !rec.id?.startsWith('seed_') &&
          !rec.id?.startsWith('rel_init_') &&
          !rec.id?.startsWith('rel_follower_')
        ) {
          const key = makeKey(rec.followerUsername, rec.followingUsername);
          followsMap.set(key, rec);
        }
      });
    }
  }
} catch (err) {
  console.warn('[serverFollowsRegistry] Could not read follows.json:', err);
}

// Write cleaned registry back to disk to purge any stale fake records
persistToDisk();

function persistToDisk(): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const array = Array.from(followsMap.values());
    fs.writeFileSync(dataFile, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[serverFollowsRegistry] Could not persist follows to disk:', err);
  }
}

export function getAllServerFollows(): ServerFollowRecord[] {
  return Array.from(followsMap.values());
}

export function followServerUser(
  follower: { id?: string; username: string; name?: string; avatarUrl?: string },
  target: { id?: string; username: string; name?: string; avatarUrl?: string }
): ServerFollowRecord | null {
  const fClean = cleanHandle(follower.username);
  const tClean = cleanHandle(target.username);
  if (!fClean || !tClean || fClean === tClean || isFakeMockUser(fClean) || isFakeMockUser(tClean)) return null;

  const key = makeKey(fClean, tClean);
  const existing = followsMap.get(key);
  if (existing) return existing;

  const rec: ServerFollowRecord = {
    id: `fol_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    followerId: follower.id || `user_${fClean}`,
    followerUsername: `@${fClean}`,
    followerName: follower.name || (fClean.charAt(0).toUpperCase() + fClean.slice(1)),
    followerAvatar: follower.avatarUrl || '',
    followingId: target.id || `user_${tClean}`,
    followingUsername: `@${tClean}`,
    followingName: target.name || (tClean.charAt(0).toUpperCase() + tClean.slice(1)),
    followingAvatar: target.avatarUrl || '',
    createdAt: new Date().toISOString()
  };

  followsMap.set(key, rec);
  persistToDisk();

  // Async sync to Supabase
  try {
    fetch(`${SUPABASE_URL}/rest/v1/follows`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        follower_id: rec.followerId,
        following_id: rec.followingId
      })
    }).catch(() => {});
  } catch {}

  return rec;
}

export function unfollowServerUser(
  follower: { id?: string; username: string },
  target: { id?: string; username: string }
): boolean {
  const fClean = cleanHandle(follower.username);
  const tClean = cleanHandle(target.username);
  if (!fClean || !tClean) return false;

  const key = makeKey(fClean, tClean);
  const existed = followsMap.delete(key);
  if (existed) {
    persistToDisk();

    // Async sync to Supabase
    try {
      const fId = follower.id || `user_${fClean}`;
      const tId = target.id || `user_${tClean}`;
      fetch(`${SUPABASE_URL}/rest/v1/follows?follower_id=eq.${encodeURIComponent(fId)}&following_id=eq.${encodeURIComponent(tId)}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }).catch(() => {});
    } catch {}
  }

  return existed;
}

export function removeServerFollower(
  currentUser: { id?: string; username: string },
  targetFollower: { id?: string; username: string }
): boolean {
  // targetFollower is following currentUser; remove that relationship
  return unfollowServerUser(targetFollower, currentUser);
}

export function deleteServerUserFollows(userId?: string, username?: string): boolean {
  const clean = cleanHandle(username || '');
  let changed = false;

  for (const [key, record] of followsMap.entries()) {
    const matchesUser =
      (userId && (record.followerId === userId || record.followingId === userId)) ||
      (clean && (cleanHandle(record.followerUsername) === clean || cleanHandle(record.followingUsername) === clean));

    if (matchesUser) {
      followsMap.delete(key);
      changed = true;
    }
  }

  if (changed) {
    persistToDisk();
  }
  return changed;
}

import fs from 'fs';
import path from 'path';

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kfqdlajqarsfdoskeahh.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_sczvF-TyjyC1jNz2RV7EkQ_skgH9A5l';

// Blacklist of mock/seed fake accounts to ensure only 100% real users exist
export const FAKE_MOCK_USERNAMES = new Set([
  'samruddhi.kadam',
  'pics.dibs',
  'shivapavan44',
  'naveen_goudar1',
  'siddhant_bhosale',
  'idkwhereismyguitar',
  'fatahdalive',
  'mohan_k_1402',
  'elena_voyages',
  'rohan_treks',
  'traveler',
  'traveler1',
  'traveler_99',
  'explorer',
  'roam_explorer',
  'guest',
  'guest_user',
  'test_user',
  'admin',
  'sample',
  'sample_user',
  'demo',
  'demo_user',
  'you'
]);

export function isFakeMockUser(username?: string | null): boolean {
  if (!username) return true;
  const clean = cleanHandle(username);
  if (!clean) return true;
  if (FAKE_MOCK_USERNAMES.has(clean)) return true;
  if (
    clean.startsWith('sample') ||
    clean.startsWith('mock_') ||
    clean.startsWith('test_') ||
    clean.startsWith('fake_') ||
    clean === 'traveler' ||
    clean === 'guest' ||
    clean === 'explorer' ||
    clean === 'admin' ||
    clean === 'you'
  ) {
    return true;
  }
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

export function getServerFollowCounts(identifier: string): { followersCount: number; followingCount: number } {
  const clean = cleanHandle(identifier);
  if (!clean) return { followersCount: 0, followingCount: 0 };

  let followersCount = 0;
  let followingCount = 0;

  followsMap.forEach((rec) => {
    const fFollower = cleanHandle(rec.followerUsername);
    const fFollowing = cleanHandle(rec.followingUsername);

    if (fFollowing === clean || rec.followingId === identifier) {
      followersCount++;
    }
    if (fFollower === clean || rec.followerId === identifier) {
      followingCount++;
    }
  });

  return { followersCount, followingCount };
}

export function isServerUserFollowing(followerIdentifier: string, targetIdentifier: string): boolean {
  const fClean = cleanHandle(followerIdentifier);
  const tClean = cleanHandle(targetIdentifier);
  if (!fClean || !tClean) return false;

  const key = makeKey(fClean, tClean);
  return followsMap.has(key);
}

export function getServerFollowers(targetIdentifier: string): ServerFollowRecord[] {
  const tClean = cleanHandle(targetIdentifier);
  if (!tClean) return [];

  const results: ServerFollowRecord[] = [];
  followsMap.forEach((rec) => {
    const fFollowing = cleanHandle(rec.followingUsername);
    if (fFollowing === tClean || rec.followingId === targetIdentifier) {
      results.push(rec);
    }
  });
  return results;
}

export function getServerFollowing(userIdentifier: string): ServerFollowRecord[] {
  const uClean = cleanHandle(userIdentifier);
  if (!uClean) return [];

  const results: ServerFollowRecord[] = [];
  followsMap.forEach((rec) => {
    const fFollower = cleanHandle(rec.followerUsername);
    if (fFollower === uClean || rec.followerId === userIdentifier) {
      results.push(rec);
    }
  });
  return results;
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

export function toggleServerFollow(
  follower: { id?: string; username: string; name?: string; avatarUrl?: string },
  target: { id?: string; username: string; name?: string; avatarUrl?: string }
): { following: boolean; record?: ServerFollowRecord } {
  const fClean = cleanHandle(follower.username);
  const tClean = cleanHandle(target.username);
  if (!fClean || !tClean || fClean === tClean) return { following: false };

  const key = makeKey(fClean, tClean);
  if (followsMap.has(key)) {
    unfollowServerUser(follower, target);
    return { following: false };
  } else {
    const rec = followServerUser(follower, target);
    return { following: true, record: rec || undefined };
  }
}

export function removeServerFollower(
  currentUser: { id?: string; username: string },
  targetFollower: { id?: string; username: string }
): boolean {
  // targetFollower is following currentUser; remove that relationship
  return unfollowServerUser(targetFollower, currentUser);
}

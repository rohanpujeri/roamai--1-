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

// Seed community users for authentic Instagram feel
const SEED_COMMUNITY = [
  { username: 'samruddhi.kadam', name: '~samruddhi!', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { username: 'pics.dibs', name: 'pics.dibs', avatarUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80' },
  { username: 'shivapavan44', name: 'Kp shiva Pavan', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { username: 'naveen_goudar1', name: 'NAVEEN', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { username: 'siddhant_bhosale', name: 'SIDDHANT BHOSALE', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { username: 'idkwhereismyguitar', name: 'parker', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { username: 'fatahdalive', name: 'Fatah 🧃', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { username: 'mohan_k_1402', name: 'Mohan', avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' }
];

function seedDefaultFollows(): void {
  const defaultUser = 'rohan_pujeri';
  SEED_COMMUNITY.forEach((c, idx) => {
    // defaultUser follows community member
    const key1 = makeKey(defaultUser, c.username);
    if (!followsMap.has(key1)) {
      followsMap.set(key1, {
        id: `seed_${idx}_1`,
        followerId: `user_${defaultUser}`,
        followerUsername: `@${defaultUser}`,
        followerName: 'Rohan Pujeri',
        followingId: `user_${c.username}`,
        followingUsername: `@${c.username}`,
        followingName: c.name,
        followingAvatar: c.avatarUrl,
        createdAt: new Date(Date.now() - (idx + 1) * 3600000).toISOString()
      });
    }

    // community member follows defaultUser
    if (idx % 2 === 0) {
      const key2 = makeKey(c.username, defaultUser);
      if (!followsMap.has(key2)) {
        followsMap.set(key2, {
          id: `seed_${idx}_2`,
          followerId: `user_${c.username}`,
          followerUsername: `@${c.username}`,
          followerName: c.name,
          followerAvatar: c.avatarUrl,
          followingId: `user_${defaultUser}`,
          followingUsername: `@${defaultUser}`,
          followingName: 'Rohan Pujeri',
          createdAt: new Date(Date.now() - (idx + 2) * 7200000).toISOString()
        });
      }
    }
  });
}

// Initialize from disk
try {
  if (fs.existsSync(dataFile)) {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed: ServerFollowRecord[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((rec) => {
        if (rec && rec.followerUsername && rec.followingUsername) {
          const key = makeKey(rec.followerUsername, rec.followingUsername);
          followsMap.set(key, rec);
        }
      });
    }
  }
} catch (err) {
  console.warn('[serverFollowsRegistry] Could not read follows.json:', err);
}

// Seed default if empty
if (followsMap.size === 0) {
  seedDefaultFollows();
  persistToDisk();
}

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
  if (!fClean || !tClean || fClean === tClean) return null;

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

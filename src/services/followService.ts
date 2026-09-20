import { getSupabaseClient, sanitizeAvatarUrl } from './supabaseClient';
import { searchRealTravellers } from './usernameService';

export interface FollowUserProfile {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  isFollowing?: boolean;
  followsYou?: boolean;
}

export interface FollowRelationship {
  id?: string;
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

const STORAGE_KEY_RELATIONSHIPS = 'roamai_follow_relationships_v1';
const STORAGE_KEY_LEGACY_FOLLOWING = 'roamai_following_users';

export function cleanHandle(u: string): string {
  return (u || '').replace(/^@+/, '').trim().toLowerCase();
}

function makeRelKey(followerU: string, followingU: string): string {
  return `${cleanHandle(followerU)}->${cleanHandle(followingU)}`;
}

export const SEED_COMMUNITY_USERS = [
  { username: '@samruddhi.kadam', name: '~samruddhi!', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { username: '@pics.dibs', name: 'pics.dibs', avatarUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=150&auto=format&fit=crop&q=80' },
  { username: '@shivapavan44', name: 'Kp shiva Pavan', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80' },
  { username: '@naveen_goudar1', name: 'NAVEEN', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { username: '@siddhant_bhosale', name: 'SIDDHANT BHOSALE', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80' },
  { username: '@idkwhereismyguitar', name: 'parker', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80' },
  { username: '@fatahdalive', name: 'Fatah 🧃', avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { username: '@mohan_k_1402', name: 'Mohan', avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80' }
];

/**
 * Load locally cached follow relationships synchronously
 */
export function getLocalFollowRelationships(): FollowRelationship[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Seed default relationships on initial startup
    const initialRels: FollowRelationship[] = [];
    let currentUname = 'rohan_pujeri';
    let currentId = 'user_default';

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tripwise_user_profile_')) {
        const pRaw = localStorage.getItem(key);
        if (pRaw) {
          try {
            const p = JSON.parse(pRaw);
            if (p.username) currentUname = cleanHandle(p.username);
            if (p.id) currentId = p.id;
          } catch {}
        }
      }
    }

    SEED_COMMUNITY_USERS.forEach((user, idx) => {
      const uClean = cleanHandle(user.username);
      // User is following community members
      initialRels.push({
        id: `rel_init_${idx}`,
        followerId: currentId,
        followerUsername: `@${currentUname}`,
        followerName: currentUname,
        followingId: `user_${uClean}`,
        followingUsername: user.username,
        followingName: user.name,
        followingAvatar: user.avatarUrl,
        createdAt: new Date(Date.now() - idx * 3600000).toISOString()
      });

      // Some community members also follow back
      if (idx % 2 === 0) {
        initialRels.push({
          id: `rel_follower_${idx}`,
          followerId: `user_${uClean}`,
          followerUsername: user.username,
          followerName: user.name,
          followerAvatar: user.avatarUrl,
          followingId: currentId,
          followingUsername: `@${currentUname}`,
          followingName: currentUname,
          createdAt: new Date(Date.now() - idx * 7200000).toISOString()
        });
      }
    });

    localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(initialRels));
    return initialRels;
  } catch {
    return [];
  }
}

/**
 * Save relationships locally, sync legacy key, and broadcast events
 */
function saveLocalFollowRelationships(relationships: FollowRelationship[], currentUserId?: string, currentUsername?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(relationships));

    // Update legacy following users set
    const cUname = currentUsername ? cleanHandle(currentUsername) : '';
    const legacySet = new Set<string>();

    relationships.forEach((rel) => {
      const relFollowerUname = cleanHandle(rel.followerUsername);
      if ((currentUserId && rel.followerId === currentUserId) || (cUname && relFollowerUname === cUname)) {
        if (rel.followingId) legacySet.add(rel.followingId);
        if (rel.followingUsername) legacySet.add(cleanHandle(rel.followingUsername));
      }
    });

    localStorage.setItem(STORAGE_KEY_LEGACY_FOLLOWING, JSON.stringify(Array.from(legacySet)));

    // Update local profile stats followingCount & followersCount if cached
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tripwise_user_profile_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const profile = JSON.parse(raw);
            if (profile && profile.stats) {
              const counts = getFollowCounts(profile.id || profile.username);
              profile.stats.followingCount = counts.followingCount;
              profile.stats.followersCount = counts.followersCount;
              localStorage.setItem(key, JSON.stringify(profile));
            }
          } catch {}
        }
      }
    }

    // Broadcast global events for instant reactivity across all views
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('roamai_follow_changed', { 
      detail: { 
        totalRelationships: relationships.length 
      } 
    }));
  } catch (e) {
    console.warn('Failed to save follow relationships:', e);
  }
}

/**
 * Sync follows from backend server API and Supabase database, merging with local storage
 */
export async function syncFollowsFromServer(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const localRels = getLocalFollowRelationships();
    const relsMap = new Map<string, FollowRelationship>();

    localRels.forEach((r) => {
      const key = makeRelKey(r.followerUsername, r.followingUsername);
      if (key && key !== '->') relsMap.set(key, r);
    });

    // 1. Fetch from server API /api/follows
    try {
      const res = await fetch('/api/follows');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.follows)) {
          data.follows.forEach((serverRec: any) => {
            const key = makeRelKey(serverRec.followerUsername, serverRec.followingUsername);
            if (key && key !== '->') {
              const existing = relsMap.get(key);
              relsMap.set(key, {
                id: serverRec.id || existing?.id,
                followerId: serverRec.followerId || existing?.followerId,
                followerUsername: serverRec.followerUsername || existing?.followerUsername,
                followerName: serverRec.followerName || existing?.followerName,
                followerAvatar: serverRec.followerAvatar || existing?.followerAvatar,
                followingId: serverRec.followingId || existing?.followingId,
                followingUsername: serverRec.followingUsername || existing?.followingUsername,
                followingName: serverRec.followingName || existing?.followingName,
                followingAvatar: serverRec.followingAvatar || existing?.followingAvatar,
                createdAt: serverRec.createdAt || existing?.createdAt || new Date().toISOString()
              });
            }
          });
        }
      }
    } catch {
      // Backend offline or local fallback
    }

    // 2. Fetch from Supabase follows table if configured
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('follows').select('*').limit(300);
        if (!error && Array.isArray(data)) {
          data.forEach((row: any) => {
            const fClean = cleanHandle(row.follower_id);
            const tClean = cleanHandle(row.following_id);
            if (fClean && tClean) {
              const key = `${fClean}->${tClean}`;
              if (!relsMap.has(key)) {
                relsMap.set(key, {
                  id: row.id,
                  followerId: row.follower_id,
                  followerUsername: `@${fClean}`,
                  followerName: fClean.charAt(0).toUpperCase() + fClean.slice(1),
                  followingId: row.following_id,
                  followingUsername: `@${tClean}`,
                  followingName: tClean.charAt(0).toUpperCase() + tClean.slice(1),
                  createdAt: row.created_at || new Date().toISOString()
                });
              }
            }
          });
        }
      } catch {
        // Supabase table not created or network failure
      }
    }

    const merged = Array.from(relsMap.values());
    if (merged.length !== localRels.length) {
      saveLocalFollowRelationships(merged);
    }
  } catch (err) {
    console.warn('Sync follows error:', err);
  }
}

// Initial sync and listener for tab focus
if (typeof window !== 'undefined') {
  syncFollowsFromServer();
  window.addEventListener('focus', () => {
    syncFollowsFromServer();
  });
}

/**
 * Get follower and following counts synchronously for an ID or username
 */
export function getFollowCounts(identifier: string): { followersCount: number; followingCount: number } {
  if (!identifier) return { followersCount: 0, followingCount: 0 };
  const clean = cleanHandle(identifier);
  const rels = getLocalFollowRelationships();

  let followersCount = 0;
  let followingCount = 0;

  rels.forEach((rel) => {
    const followerUname = cleanHandle(rel.followerUsername);
    const followingUname = cleanHandle(rel.followingUsername);

    // Is identifier followed by someone?
    if (rel.followingId === identifier || (clean && followingUname === clean)) {
      followersCount++;
    }

    // Is identifier following someone?
    if (rel.followerId === identifier || (clean && followerUname === clean)) {
      followingCount++;
    }
  });

  return { followersCount, followingCount };
}

/**
 * Check whether followerIdentifier is currently following targetIdentifier
 */
export function isUserFollowing(followerIdentifier: string, targetIdentifier: string): boolean {
  if (!followerIdentifier || !targetIdentifier) return false;
  const fClean = cleanHandle(followerIdentifier);
  const tClean = cleanHandle(targetIdentifier);
  if (!fClean || !tClean || fClean === tClean) return false;

  const rels = getLocalFollowRelationships();

  return rels.some((rel) => {
    const relFollowerUname = cleanHandle(rel.followerUsername);
    const relFollowingUname = cleanHandle(rel.followingUsername);

    const matchesFollower = rel.followerId === followerIdentifier || (fClean && relFollowerUname === fClean);
    const matchesTarget = rel.followingId === targetIdentifier || (tClean && relFollowingUname === tClean);

    return matchesFollower && matchesTarget;
  });
}

/**
 * Check whether targetIdentifier is following userIdentifier ("Follows you" / "Follow back")
 */
export function isFollowedBy(userIdentifier: string, targetIdentifier: string): boolean {
  return isUserFollowing(targetIdentifier, userIdentifier);
}

/**
 * Get mutual followers between viewer and target
 */
export function getMutualFollowers(currentViewer: string, targetIdentifier: string): string[] {
  if (!currentViewer || !targetIdentifier) return [];
  const vClean = cleanHandle(currentViewer);
  const tClean = cleanHandle(targetIdentifier);
  if (!vClean || !tClean || vClean === tClean) return [];

  const rels = getLocalFollowRelationships();
  // People who viewer follows
  const viewerFollowing = new Set<string>();
  rels.forEach((r) => {
    if (cleanHandle(r.followerUsername) === vClean || r.followerId === currentViewer) {
      viewerFollowing.add(cleanHandle(r.followingUsername));
    }
  });

  // People who also follow target
  const mutuals: string[] = [];
  rels.forEach((r) => {
    const folU = cleanHandle(r.followerUsername);
    const tgtU = cleanHandle(r.followingUsername);
    if ((tgtU === tClean || r.followingId === targetIdentifier) && folU !== vClean && viewerFollowing.has(folU)) {
      if (!mutuals.includes(folU)) mutuals.push(folU);
    }
  });

  return mutuals;
}

/**
 * Get list of all profiles following the given user
 */
export async function getFollowers(targetIdentifier: string, currentViewerIdentifier?: string): Promise<FollowUserProfile[]> {
  if (!targetIdentifier) return [];
  const tClean = cleanHandle(targetIdentifier);
  const vClean = currentViewerIdentifier ? cleanHandle(currentViewerIdentifier) : '';
  const rels = getLocalFollowRelationships();

  // Find relationships where the target is the one being followed
  const followerRels = rels.filter((rel) => {
    const followingUname = cleanHandle(rel.followingUsername);
    return rel.followingId === targetIdentifier || (tClean && followingUname === tClean);
  });

  // Fetch all known registered profiles to enrich details
  const allProfiles = await searchRealTravellers();
  const profilesMap = new Map<string, any>();
  allProfiles.forEach((p) => {
    const cleanU = cleanHandle(p.username);
    if (cleanU) profilesMap.set(cleanU, p);
    if (p.id) profilesMap.set(p.id, p);
  });

  const results: FollowUserProfile[] = [];
  const seen = new Set<string>();

  followerRels.forEach((rel) => {
    const fUname = cleanHandle(rel.followerUsername);
    const key = fUname || rel.followerId;
    if (!key || seen.has(key)) return;
    seen.add(key);

    const enriched = (fUname && profilesMap.get(fUname)) || profilesMap.get(rel.followerId);
    const isF = currentViewerIdentifier ? isUserFollowing(currentViewerIdentifier, rel.followerId || fUname) : false;
    const followsViewer = currentViewerIdentifier ? isUserFollowing(rel.followerId || fUname, currentViewerIdentifier) : false;

    results.push({
      id: rel.followerId || enriched?.id || `user_${fUname}`,
      username: rel.followerUsername.startsWith('@') ? rel.followerUsername : `@${rel.followerUsername}`,
      name: enriched?.name || rel.followerName || (fUname.charAt(0).toUpperCase() + fUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followerAvatar || ''),
      bio: enriched?.bio || 'Exploring new places, one trip at a time 🌍',
      location: enriched?.location || 'Traveler',
      isFollowing: isF,
      followsYou: followsViewer
    });
  });

  return results;
}

/**
 * Get list of all profiles that the given user is following
 */
export async function getFollowing(userIdentifier: string, currentViewerIdentifier?: string): Promise<FollowUserProfile[]> {
  if (!userIdentifier) return [];
  const uClean = cleanHandle(userIdentifier);
  const rels = getLocalFollowRelationships();

  // Find relationships where userIdentifier is the follower
  const followingRels = rels.filter((rel) => {
    const followerUname = cleanHandle(rel.followerUsername);
    return rel.followerId === userIdentifier || (uClean && followerUname === uClean);
  });

  // Fetch all known registered profiles to enrich details
  const allProfiles = await searchRealTravellers();
  const profilesMap = new Map<string, any>();
  allProfiles.forEach((p) => {
    const cleanU = cleanHandle(p.username);
    if (cleanU) profilesMap.set(cleanU, p);
    if (p.id) profilesMap.set(p.id, p);
  });

  const results: FollowUserProfile[] = [];
  const seen = new Set<string>();

  followingRels.forEach((rel) => {
    const tUname = cleanHandle(rel.followingUsername);
    const key = tUname || rel.followingId;
    if (!key || seen.has(key)) return;
    seen.add(key);

    const enriched = (tUname && profilesMap.get(tUname)) || profilesMap.get(rel.followingId);
    const isF = currentViewerIdentifier ? isUserFollowing(currentViewerIdentifier, rel.followingId || tUname) : true;
    const followsViewer = currentViewerIdentifier ? isUserFollowing(rel.followingId || tUname, currentViewerIdentifier) : false;

    results.push({
      id: rel.followingId || enriched?.id || `user_${tUname}`,
      username: rel.followingUsername.startsWith('@') ? rel.followingUsername : `@${rel.followingUsername}`,
      name: enriched?.name || rel.followingName || (tUname.charAt(0).toUpperCase() + tUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followingAvatar || ''),
      bio: enriched?.bio || 'Exploring new places, one trip at a time 🌍',
      location: enriched?.location || 'Traveler',
      isFollowing: isF,
      followsYou: followsViewer
    });
  });

  return results;
}

/**
 * Explicitly follow a user
 */
export async function followUser(
  currentUser: { id?: string; username: string; name?: string; avatarUrl?: string },
  targetUser: { id?: string; username: string; name?: string; avatarUrl?: string }
): Promise<boolean> {
  const fUname = cleanHandle(currentUser.username);
  const tUname = cleanHandle(targetUser.username);
  if (!fUname || !tUname || fUname === tUname) return false;

  const fId = currentUser.id || `user_${fUname}`;
  const tId = targetUser.id || `user_${tUname}`;

  const currentRels = getLocalFollowRelationships();
  const exists = currentRels.some((rel) => {
    const rFollowerU = cleanHandle(rel.followerUsername);
    const rTargetU = cleanHandle(rel.followingUsername);
    return (rel.followerId === fId || rFollowerU === fUname) && (rel.followingId === tId || rTargetU === tUname);
  });

  if (!exists) {
    const newRel: FollowRelationship = {
      id: `rel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      followerId: fId,
      followerUsername: `@${fUname}`,
      followerName: currentUser.name || (fUname.charAt(0).toUpperCase() + fUname.slice(1)),
      followerAvatar: currentUser.avatarUrl || '',
      followingId: tId,
      followingUsername: `@${tUname}`,
      followingName: targetUser.name || (tUname.charAt(0).toUpperCase() + tUname.slice(1)),
      followingAvatar: targetUser.avatarUrl || '',
      createdAt: new Date().toISOString()
    };
    currentRels.push(newRel);
    saveLocalFollowRelationships(currentRels, fId, fUname);
  }

  // Server API async sync
  try {
    fetch('/api/follows/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, target: targetUser })
    }).catch(() => {});
  } catch {}

  // Supabase async sync
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('follows').insert({
        follower_id: fId,
        following_id: tId
      });
    } catch {}
  }

  return true;
}

/**
 * Explicitly unfollow a user
 */
export async function unfollowUser(
  currentUser: { id?: string; username: string },
  targetUser: { id?: string; username: string }
): Promise<boolean> {
  const fUname = cleanHandle(currentUser.username);
  const tUname = cleanHandle(targetUser.username);
  if (!fUname || !tUname) return false;

  const fId = currentUser.id || `user_${fUname}`;
  const tId = targetUser.id || `user_${tUname}`;

  const currentRels = getLocalFollowRelationships();
  const nextRels = currentRels.filter((rel) => {
    const rFollowerU = cleanHandle(rel.followerUsername);
    const rTargetU = cleanHandle(rel.followingUsername);
    const matchF = rel.followerId === fId || rFollowerU === fUname;
    const matchT = rel.followingId === tId || rTargetU === tUname;
    return !(matchF && matchT);
  });

  saveLocalFollowRelationships(nextRels, fId, fUname);

  // Server API async sync
  try {
    fetch('/api/follows/unfollow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower: currentUser, target: targetUser })
    }).catch(() => {});
  } catch {}

  // Supabase async sync
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('follows').delete().match({
        follower_id: fId,
        following_id: tId
      });
    } catch {}
  }

  return true;
}

/**
 * Toggle follow status between currentUser and targetUser.
 * Returns true if now following, false if unfollowed.
 */
export async function toggleFollowUser(
  currentUser: { id?: string; username: string; name?: string; avatarUrl?: string },
  targetUser: { id?: string; username: string; name?: string; avatarUrl?: string }
): Promise<boolean> {
  const fUname = cleanHandle(currentUser.username);
  const tUname = cleanHandle(targetUser.username);
  if (!fUname || !tUname || fUname === tUname) return false;

  const currentlyFollowing = isUserFollowing(currentUser.username, targetUser.username);
  if (currentlyFollowing) {
    await unfollowUser(currentUser, targetUser);
    return false;
  } else {
    await followUser(currentUser, targetUser);
    return true;
  }
}

/**
 * Remove follower: targetFollower is removed from following currentUser
 */
export async function removeFollowerUser(
  currentUser: { id?: string; username: string },
  targetFollower: { id?: string; username: string }
): Promise<boolean> {
  const cUname = cleanHandle(currentUser.username);
  const fUname = cleanHandle(targetFollower.username);
  if (!cUname || !fUname) return false;

  // targetFollower was following currentUser -> unfollow
  await unfollowUser(targetFollower, currentUser);

  // Server API async sync
  try {
    fetch('/api/follows/remove-follower', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUser, targetFollower })
    }).catch(() => {});
  } catch {}

  return true;
}

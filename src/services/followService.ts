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

function cleanHandle(u: string): string {
  return (u || '').replace(/^@+/, '').trim().toLowerCase();
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
 * Load locally cached follow relationships
 */
export function getLocalFollowRelationships(): FollowRelationship[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // Check if legacy following users exist
    const legacyRaw = localStorage.getItem(STORAGE_KEY_LEGACY_FOLLOWING);
    const initialRels: FollowRelationship[] = [];

    // Find current user handle if cached
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

    // Seed default community members so following and followers look rich like Instagram
    SEED_COMMUNITY_USERS.forEach((user, idx) => {
      const uClean = cleanHandle(user.username);
      // User is following these community members
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

      // Some community members also follow the user
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
 * Save relationships locally and sync with legacy storage key
 */
function saveLocalFollowRelationships(relationships: FollowRelationship[], currentUserId?: string, currentUsername?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(relationships));

    // Update legacy following users set for backwards-compatibility
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

    // Update local profile stats followingCount if cached
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tripwise_user_profile_')) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const profile = JSON.parse(raw);
          if (profile && profile.stats) {
            const counts = getFollowCounts(profile.id || profile.username);
            profile.stats.followingCount = counts.followingCount;
            profile.stats.followersCount = counts.followersCount;
            localStorage.setItem(key, JSON.stringify(profile));
          }
        }
      }
    }

    // Dispatch global events for instant reactivity across all tabs and components
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
 * Check whether follower is currently following target
 */
export function isUserFollowing(followerIdentifier: string, targetIdentifier: string): boolean {
  if (!followerIdentifier || !targetIdentifier) return false;
  const fClean = cleanHandle(followerIdentifier);
  const tClean = cleanHandle(targetIdentifier);
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

    results.push({
      id: rel.followerId || enriched?.id || `user_${fUname}`,
      username: rel.followerUsername.startsWith('@') ? rel.followerUsername : `@${rel.followerUsername}`,
      name: enriched?.name || rel.followerName || (fUname.charAt(0).toUpperCase() + fUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followerAvatar || ''),
      bio: enriched?.bio || 'Exploring new places, one trip at a time 🌍',
      location: enriched?.location || 'Traveler',
      isFollowing: isF
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

    results.push({
      id: rel.followingId || enriched?.id || `user_${tUname}`,
      username: rel.followingUsername.startsWith('@') ? rel.followingUsername : `@${rel.followingUsername}`,
      name: enriched?.name || rel.followingName || (tUname.charAt(0).toUpperCase() + tUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followingAvatar || ''),
      bio: enriched?.bio || 'Exploring new places, one trip at a time 🌍',
      location: enriched?.location || 'Traveler',
      isFollowing: isF
    });
  });

  return results;
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

  const fId = currentUser.id || `user_${fUname}`;
  const tId = targetUser.id || `user_${tUname}`;

  const currentRels = getLocalFollowRelationships();
  const existingIdx = currentRels.findIndex((rel) => {
    const rFollowerU = cleanHandle(rel.followerUsername);
    const rTargetU = cleanHandle(rel.followingUsername);
    const matchF = rel.followerId === fId || rFollowerU === fUname;
    const matchT = rel.followingId === tId || rTargetU === tUname;
    return matchF && matchT;
  });

  let nowFollowing = false;
  let nextRels = [...currentRels];

  if (existingIdx !== -1) {
    // Unfollow
    nextRels.splice(existingIdx, 1);
    nowFollowing = false;
  } else {
    // Follow
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
    nextRels.push(newRel);
    nowFollowing = true;
  }

  // Save locally and notify immediately
  saveLocalFollowRelationships(nextRels, fId, fUname);

  // Sync with Supabase follows table asynchronously in background
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      if (nowFollowing) {
        await supabase.from('follows').insert({
          follower_id: fId,
          following_id: tId
        });
      } else {
        await supabase.from('follows').delete().match({
          follower_id: fId,
          following_id: tId
        });
      }
    } catch (e) {
      // Supabase table might not exist yet or offline, handled gracefully
      console.warn('Supabase follow sync:', e);
    }
  }

  return nowFollowing;
}

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

export function isFakeMockUser(_username?: string | null): boolean {
  // All authenticated or registered users are valid real accounts
  return false;
}

/**
 * Check if a relationship is a self-follow (same person with different identifier formats)
 */
export function isSelfRel(fId?: string, fUname?: string, tId?: string, tUname?: string): boolean {
  if (fId && tId) {
    const cFId = fId.replace(/^supa_/, '').replace(/^user_/, '');
    const cTId = tId.replace(/^supa_/, '').replace(/^user_/, '');
    if (cFId === cTId && cFId.length > 0) return true;
  }
  const cleanF = cleanHandle(fUname || '').replace(/^user_/, '').replace(/[._]/g, '');
  const cleanT = cleanHandle(tUname || '').replace(/^user_/, '').replace(/[._]/g, '');
  if (cleanF && cleanT && cleanF === cleanT) return true;
  return false;
}

/**
 * Load locally cached follow relationships synchronously
 */
export function getLocalFollowRelationships(): FollowRelationship[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RELATIONSHIPS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Scrub any mock/seed fake accounts and self-follows immediately
        const cleaned = parsed.filter((r) => {
          if (!r || !r.followerUsername || !r.followingUsername) return false;
          const fol = cleanHandle(r.followerUsername);
          const fng = cleanHandle(r.followingUsername);
          if (isFakeMockUser(fol) || isFakeMockUser(fng)) return false;
          if (r.id?.startsWith('seed_') || r.id?.startsWith('rel_init_') || r.id?.startsWith('rel_follower_')) return false;
          if (isSelfRel(r.followerId, r.followerUsername, r.followingId, r.followingUsername)) return false;
          return true;
        });

        // If dirty mock records existed in localStorage, overwrite with only real relationships
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY_RELATIONSHIPS, JSON.stringify(cleaned));
        }
        return cleaned;
      }
    }
    return [];
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
      const relFollowingUname = cleanHandle(rel.followingUsername);
      if (isFakeMockUser(relFollowingUname) || isFakeMockUser(relFollowerUname)) return;
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
      if (key && key !== '->' && !isFakeMockUser(r.followerUsername) && !isFakeMockUser(r.followingUsername)) {
        relsMap.set(key, r);
      }
    });

    // 1. If Supabase is connected, treat Supabase follows as the single source of truth
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data: supabaseFollows, error: followsError } = await supabase.from('follows').select('*').limit(500);
        if (!followsError && Array.isArray(supabaseFollows)) {
          // Fetch Supabase registered profiles to map UUIDs to handles
          const { data: supabaseProfiles } = await supabase.from('profiles').select('id, username, name, avatar_url, bio, location').limit(500);
          const profMap = new Map<string, any>();
          if (Array.isArray(supabaseProfiles)) {
            supabaseProfiles.forEach((p) => {
              const u = cleanHandle(p.username);
              if (u) {
                profMap.set(u, p);
                profMap.set(u.replace(/[._]/g, ''), p);
              }
              if (p.id) {
                profMap.set(p.id, p);
                profMap.set(p.id.replace(/^supa_/, '').replace(/^user_/, ''), p);
              }
            });
          }

          const authoritativeRels: FollowRelationship[] = [];
          supabaseFollows.forEach((row: any) => {
            const fProf = profMap.get(row.follower_id) || profMap.get(cleanHandle(row.follower_id));
            const tProf = profMap.get(row.following_id) || profMap.get(cleanHandle(row.following_id));

            const fClean = fProf ? cleanHandle(fProf.username) : cleanHandle(row.follower_id);
            const tClean = tProf ? cleanHandle(tProf.username) : cleanHandle(row.following_id);

            // Filter out self-follows
            if (isSelfRel(row.follower_id, fClean, row.following_id, tClean)) return;
            if (!fClean || !tClean) return;

            authoritativeRels.push({
              id: row.id,
              followerId: row.follower_id,
              followerUsername: fProf?.username || `@${fClean}`,
              followerName: fProf?.name || (fClean.charAt(0).toUpperCase() + fClean.slice(1)),
              followerAvatar: sanitizeAvatarUrl(fProf?.avatar_url || ''),
              followingId: row.following_id,
              followingUsername: tProf?.username || `@${tClean}`,
              followingName: tProf?.name || (tClean.charAt(0).toUpperCase() + tClean.slice(1)),
              followingAvatar: sanitizeAvatarUrl(tProf?.avatar_url || ''),
              createdAt: row.created_at || new Date().toISOString()
            });
          });

          // Supabase is authoritative: overwrite local storage immediately
          saveLocalFollowRelationships(authoritativeRels);
          return;
        }
      } catch (err) {
        console.warn('Supabase follows sync error:', err);
      }
    }

    // 2. Fallback: Fetch from server API /api/follows if Supabase is offline
    try {
      const res = await fetch('/api/follows');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.follows)) {
          data.follows.forEach((serverRec: any) => {
            if (!serverRec || !serverRec.followerUsername || !serverRec.followingUsername) return;
            const folU = cleanHandle(serverRec.followerUsername);
            const fngU = cleanHandle(serverRec.followingUsername);
            if (isFakeMockUser(folU) || isFakeMockUser(fngU)) return;
            if (serverRec.id?.startsWith('seed_') || serverRec.id?.startsWith('rel_init_') || serverRec.id?.startsWith('rel_follower_')) return;
            if (isSelfRel(serverRec.followerId, folU, serverRec.followingId, fngU)) return;

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
export function getFollowCounts(identifier: string | { id?: string; username?: string }): { followersCount: number; followingCount: number } {
  if (!identifier) return { followersCount: 0, followingCount: 0 };
  const targetId = typeof identifier === 'string' ? identifier : identifier.id;
  const targetUsername = typeof identifier === 'string' ? identifier : identifier.username;

  const clean = cleanHandle(targetUsername || targetId || '');
  const cleanNoUnderscore = clean.replace(/_/g, '');
  const cleanId = targetId ? targetId.replace(/^supa_/, '').replace(/^user_/, '') : '';
  const rels = getLocalFollowRelationships();

  let followersCount = 0;
  let followingCount = 0;

  rels.forEach((rel) => {
    const followerUname = cleanHandle(rel.followerUsername);
    const followerUnameNoUnderscore = followerUname.replace(/_/g, '');
    const followingUname = cleanHandle(rel.followingUsername);
    const followingUnameNoUnderscore = followingUname.replace(/_/g, '');
    const relFollowerId = rel.followerId ? rel.followerId.replace(/^supa_/, '').replace(/^user_/, '') : '';
    const relFollowingId = rel.followingId ? rel.followingId.replace(/^supa_/, '').replace(/^user_/, '') : '';

    if (isFakeMockUser(followerUname) || isFakeMockUser(followingUname)) return;
    if (isSelfRel(rel.followerId, rel.followerUsername, rel.followingId, rel.followingUsername)) return;

    // Is identifier followed by someone?
    if (
      (targetId && (rel.followingId === targetId || (cleanId && relFollowingId === cleanId))) ||
      (clean && followingUname === clean) ||
      (cleanNoUnderscore && followingUnameNoUnderscore === cleanNoUnderscore)
    ) {
      followersCount++;
    }

    // Is identifier following someone?
    if (
      (targetId && (rel.followerId === targetId || (cleanId && relFollowerId === cleanId))) ||
      (clean && followerUname === clean) ||
      (cleanNoUnderscore && followerUnameNoUnderscore === cleanNoUnderscore)
    ) {
      followingCount++;
    }
  });

  return { followersCount, followingCount };
}

/**
 * Check whether followerIdentifier is currently following targetIdentifier
 */
export function isUserFollowing(
  follower: string | { id?: string; username?: string },
  target: string | { id?: string; username?: string }
): boolean {
  if (!follower || !target) return false;
  const fId = typeof follower === 'string' ? follower : follower.id;
  const fUname = cleanHandle(typeof follower === 'string' ? follower : follower.username || fId || '');
  const fUnameNoUnderscore = fUname.replace(/_/g, '');
  const fCleanId = fId ? fId.replace(/^supa_/, '').replace(/^user_/, '') : '';

  const tId = typeof target === 'string' ? target : target.id;
  const tUname = cleanHandle(typeof target === 'string' ? target : target.username || tId || '');
  const tCleanNoUnderscore = tUname.replace(/_/g, '');
  const tCleanId = tId ? tId.replace(/^supa_/, '').replace(/^user_/, '') : '';

  const rels = getLocalFollowRelationships();
  return rels.some((rel) => {
    const relFolU = cleanHandle(rel.followerUsername);
    const relFolUNoUnderscore = relFolU.replace(/_/g, '');
    const relFolId = rel.followerId ? rel.followerId.replace(/^supa_/, '').replace(/^user_/, '') : '';

    const relFngU = cleanHandle(rel.followingUsername);
    const relFngUNoUnderscore = relFngU.replace(/_/g, '');
    const relFngId = rel.followingId ? rel.followingId.replace(/^supa_/, '').replace(/^user_/, '') : '';

    const followerMatches =
      (fId && (rel.followerId === fId || (fCleanId && relFolId === fCleanId))) ||
      (fUname && relFolU === fUname) ||
      (fUnameNoUnderscore && relFolUNoUnderscore === fUnameNoUnderscore);

    const targetMatches =
      (tId && (rel.followingId === tId || (tCleanId && relFngId === tCleanId))) ||
      (tUname && relFngU === tUname) ||
      (tCleanNoUnderscore && relFngUNoUnderscore === tCleanNoUnderscore);

    return followerMatches && targetMatches;
  });
}

/**
 * Check whether followerIdentifier is followed by targetIdentifier
 */
export function isFollowedBy(
  currentViewer: string | { id?: string; username?: string },
  targetUser: string | { id?: string; username?: string }
): boolean {
  return isUserFollowing(targetUser, currentViewer);
}

/**
 * Get mutual followers between viewer and target
 */
export function getMutualFollowers(
  viewerIdentifier: string | { id?: string; username?: string },
  targetIdentifier: string | { id?: string; username?: string }
): string[] {
  if (!viewerIdentifier || !targetIdentifier) return [];
  const rels = getLocalFollowRelationships();
  const targetFollowers: string[] = [];

  const tId = typeof targetIdentifier === 'string' ? targetIdentifier : targetIdentifier.id;
  const tU = cleanHandle(typeof targetIdentifier === 'string' ? targetIdentifier : targetIdentifier.username || tId || '');
  const tCleanNoUnderscore = tU.replace(/_/g, '');
  const tCleanId = tId ? tId.replace(/^supa_/, '').replace(/^user_/, '') : '';

  rels.forEach((rel) => {
    const folU = cleanHandle(rel.followerUsername);
    const fngU = cleanHandle(rel.followingUsername);
    const relFngId = rel.followingId ? rel.followingId.replace(/^supa_/, '').replace(/^user_/, '') : '';
    if (isFakeMockUser(folU) || isFakeMockUser(fngU)) return;
    if (
      (tId && (rel.followingId === tId || (tCleanId && relFngId === tCleanId))) ||
      (tU && fngU === tU) ||
      (tCleanNoUnderscore && fngU.replace(/_/g, '') === tCleanNoUnderscore)
    ) {
      if (!targetFollowers.includes(folU)) targetFollowers.push(folU);
    }
  });

  const mutuals: string[] = [];
  targetFollowers.forEach((folU) => {
    if (isUserFollowing(viewerIdentifier, folU)) {
      if (!mutuals.includes(folU)) mutuals.push(folU);
    }
  });

  return mutuals;
}

/**
 * Get list of all profiles following the given user
 */
export async function getFollowers(
  target: string | { id?: string; username?: string },
  currentViewer?: string | { id?: string; username?: string }
): Promise<FollowUserProfile[]> {
  if (!target) return [];
  await syncFollowsFromServer().catch(() => {});

  const targetId = typeof target === 'string' ? target : target.id;
  const targetUsername = typeof target === 'string' ? target : target.username;
  const tClean = cleanHandle(targetUsername || targetId || '');
  const tCleanNoUnderscore = tClean.replace(/_/g, '');
  const cleanTargetId = targetId ? targetId.replace(/^supa_/, '').replace(/^user_/, '') : '';

  const viewerId = typeof currentViewer === 'string' ? currentViewer : currentViewer?.id;
  const viewerUsername = typeof currentViewer === 'string' ? currentViewer : currentViewer?.username;
  const vClean = cleanHandle(viewerUsername || viewerId || '');

  const rels = getLocalFollowRelationships();

  // Find relationships where the target is the one being followed
  const followerRels = rels.filter((rel) => {
    const followingUname = cleanHandle(rel.followingUsername);
    const followingUnameNoUnderscore = followingUname.replace(/_/g, '');
    const followerUname = cleanHandle(rel.followerUsername);
    const cleanRelFollowingId = rel.followingId ? rel.followingId.replace(/^supa_/, '').replace(/^user_/, '') : '';

    if (isFakeMockUser(followerUname) || isFakeMockUser(followingUname)) return false;
    if (isSelfRel(rel.followerId, rel.followerUsername, rel.followingId, rel.followingUsername)) return false;
    return (
      (targetId && (rel.followingId === targetId || (cleanTargetId && cleanRelFollowingId === cleanTargetId))) ||
      (tClean && followingUname === tClean) ||
      (tCleanNoUnderscore && followingUnameNoUnderscore === tCleanNoUnderscore)
    );
  });

  // Fetch all known registered profiles to enrich details
  const allProfiles = await searchRealTravellers().catch(() => []);
  const profilesMap = new Map<string, any>();
  allProfiles.forEach((p) => {
    const cleanU = cleanHandle(p.username);
    if (cleanU && !isFakeMockUser(cleanU)) {
      profilesMap.set(cleanU, p);
      profilesMap.set(cleanU.replace(/_/g, ''), p);
    }
    if (p.id) {
      profilesMap.set(p.id, p);
      profilesMap.set(p.id.replace(/^supa_/, '').replace(/^user_/, ''), p);
    }
  });

  const results: FollowUserProfile[] = [];
  const seen = new Set<string>();

  followerRels.forEach((rel) => {
    const fUname = cleanHandle(rel.followerUsername);
    const key = fUname || rel.followerId;
    if (!key || seen.has(key) || isFakeMockUser(fUname)) return;
    seen.add(key);

    const enriched = (fUname && (profilesMap.get(fUname) || profilesMap.get(fUname.replace(/_/g, '')))) || profilesMap.get(rel.followerId);
    const isF = vClean ? isUserFollowing(viewerUsername || viewerId || '', rel.followerId || fUname) : false;
    const followsViewer = vClean ? isUserFollowing(rel.followerId || fUname, viewerUsername || viewerId || '') : false;

    results.push({
      id: rel.followerId || enriched?.id || `user_${fUname}`,
      username: rel.followerUsername.startsWith('@') ? rel.followerUsername : `@${rel.followerUsername}`,
      name: enriched?.name || rel.followerName || (fUname.charAt(0).toUpperCase() + fUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followerAvatar || ''),
      bio: enriched?.bio || '',
      location: '',
      isFollowing: isF,
      followsYou: followsViewer
    });
  });

  return results;
}

/**
 * Get list of all profiles that the given user is following
 */
export async function getFollowing(
  user: string | { id?: string; username?: string },
  currentViewer?: string | { id?: string; username?: string }
): Promise<FollowUserProfile[]> {
  if (!user) return [];
  await syncFollowsFromServer().catch(() => {});

  const userId = typeof user === 'string' ? user : user.id;
  const userUsername = typeof user === 'string' ? user : user.username;
  const uClean = cleanHandle(userUsername || userId || '');
  const uCleanNoUnderscore = uClean.replace(/_/g, '');
  const cleanUserId = userId ? userId.replace(/^supa_/, '').replace(/^user_/, '') : '';

  const viewerId = typeof currentViewer === 'string' ? currentViewer : currentViewer?.id;
  const viewerUsername = typeof currentViewer === 'string' ? currentViewer : currentViewer?.username;
  const vClean = cleanHandle(viewerUsername || viewerId || '');

  const rels = getLocalFollowRelationships();

  // Find relationships where user is the follower
  const followingRels = rels.filter((rel) => {
    const followerUname = cleanHandle(rel.followerUsername);
    const followerUnameNoUnderscore = followerUname.replace(/_/g, '');
    const followingUname = cleanHandle(rel.followingUsername);
    const cleanRelFollowerId = rel.followerId ? rel.followerId.replace(/^supa_/, '').replace(/^user_/, '') : '';

    if (isFakeMockUser(followerUname) || isFakeMockUser(followingUname)) return false;
    if (isSelfRel(rel.followerId, rel.followerUsername, rel.followingId, rel.followingUsername)) return false;
    return (
      (userId && (rel.followerId === userId || (cleanUserId && cleanRelFollowerId === cleanUserId))) ||
      (uClean && followerUname === uClean) ||
      (uCleanNoUnderscore && followerUnameNoUnderscore === uCleanNoUnderscore)
    );
  });

  // Fetch all known registered profiles to enrich details
  const allProfiles = await searchRealTravellers().catch(() => []);
  const profilesMap = new Map<string, any>();
  allProfiles.forEach((p) => {
    const cleanU = cleanHandle(p.username);
    if (cleanU && !isFakeMockUser(cleanU)) {
      profilesMap.set(cleanU, p);
      profilesMap.set(cleanU.replace(/_/g, ''), p);
    }
    if (p.id) {
      profilesMap.set(p.id, p);
      profilesMap.set(p.id.replace(/^supa_/, '').replace(/^user_/, ''), p);
    }
  });

  const results: FollowUserProfile[] = [];
  const seen = new Set<string>();

  followingRels.forEach((rel) => {
    const tUname = cleanHandle(rel.followingUsername);
    const key = tUname || rel.followingId;
    if (!key || seen.has(key) || isFakeMockUser(tUname)) return;
    seen.add(key);

    const enriched = (tUname && (profilesMap.get(tUname) || profilesMap.get(tUname.replace(/_/g, '')))) || profilesMap.get(rel.followingId);
    const isF = vClean ? isUserFollowing(viewerUsername || viewerId || '', rel.followingId || tUname) : true;
    const followsViewer = vClean ? isUserFollowing(rel.followingId || tUname, viewerUsername || viewerId || '') : false;

    results.push({
      id: rel.followingId || enriched?.id || `user_${tUname}`,
      username: rel.followingUsername.startsWith('@') ? rel.followingUsername : `@${rel.followingUsername}`,
      name: enriched?.name || rel.followingName || (tUname.charAt(0).toUpperCase() + tUname.slice(1)),
      avatarUrl: sanitizeAvatarUrl(enriched?.avatarUrl || rel.followingAvatar || ''),
      bio: enriched?.bio || '',
      location: '',
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
  if (!fUname || !tUname || isFakeMockUser(fUname) || isFakeMockUser(tUname)) return false;
  if (isSelfRel(currentUser.id, fUname, targetUser.id, tUname)) return false;

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

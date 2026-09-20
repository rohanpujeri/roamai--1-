import { getSupabaseClient, sanitizeAvatarUrl } from './supabaseClient';

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'tripwise',
  'roamai',
  'support',
  'official',
  'help',
  'root',
  'system',
  'moderator',
  'explore',
  'trails',
  'profile',
  'api',
  'dev',
  'guest',
  'null',
  'undefined'
]);

export interface UsernameValidationResult {
  isValid: boolean;
  cleanUsername: string;
  error?: string;
}

export function cleanUsernameInput(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '_');
}

export function validateUsernameFormat(rawInput: string): UsernameValidationResult {
  const cleanUsername = cleanUsernameInput(rawInput);

  if (!cleanUsername) {
    return {
      isValid: false,
      cleanUsername: '',
      error: 'Username is required.'
    };
  }

  if (cleanUsername.length < 3) {
    return {
      isValid: false,
      cleanUsername,
      error: 'Username must be at least 3 characters long.'
    };
  }

  if (cleanUsername.length > 20) {
    return {
      isValid: false,
      cleanUsername,
      error: 'Username cannot exceed 20 characters.'
    };
  }

  const validCharsRegex = /^[a-z0-9_]+$/;
  if (!validCharsRegex.test(cleanUsername)) {
    return {
      isValid: false,
      cleanUsername,
      error: 'Only lowercase letters, numbers, and underscores are allowed.'
    };
  }

  if (RESERVED_USERNAMES.has(cleanUsername)) {
    return {
      isValid: false,
      cleanUsername,
      error: 'This username is reserved. Please choose another.'
    };
  }

  return {
    isValid: true,
    cleanUsername
  };
}

const LOCAL_STORAGE_USERNAMES_KEY = 'roamai_claimed_usernames';

function getLocalClaimedUsernames(): Record<string, { userId?: string; email?: string; claimedAt: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_USERNAMES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalClaimedUsername(username: string, userId?: string, email?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalClaimedUsernames();
    current[username] = {
      userId,
      email,
      claimedAt: new Date().toISOString()
    };
    localStorage.setItem(LOCAL_STORAGE_USERNAMES_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn('Failed to save username locally', e);
  }
}

/**
 * Check if a username is available across the system.
 */
export async function checkUsernameAvailability(
  rawUsername: string,
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> {
  const validation = validateUsernameFormat(rawUsername);
  if (!validation.isValid) {
    return { available: false, error: validation.error };
  }

  const clean = validation.cleanUsername;

  // 1. PRIMARY SOURCE OF TRUTH: Query Supabase public.profiles & public.usernames tables
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const withAt = `@${clean}`;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username')
        .or(`username.ilike.${clean},username.ilike.${withAt}`)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        const existing = data[0];
        if (currentUserId && (existing.id === currentUserId || existing.id === `supa_${currentUserId}`)) {
          return { available: true };
        }
        return { available: false, error: `@${clean} is already registered. Please choose another username.` };
      }
    } catch (err) {
      console.warn('Error querying public.profiles in checkUsernameAvailability:', err);
    }

    try {
      const withAt = `@${clean}`;
      const { data: uData, error: uErr } = await supabase
        .from('usernames')
        .select('username, user_id')
        .or(`username.ilike.${clean},username.ilike.${withAt}`)
        .limit(1);

      if (!uErr && Array.isArray(uData) && uData.length > 0) {
        const uRow = uData[0];
        if (currentUserId && (uRow.user_id === currentUserId || uRow.user_id === `supa_${currentUserId}`)) {
          return { available: true };
        }
        return { available: false, error: `@${clean} is already registered. Please choose another username.` };
      }
    } catch {
      // Table might not exist yet; gracefully handled
    }
  }

  // 2. Query backend API server endpoint (only reject if backend explicitly flags it as taken)
  try {
    const apiRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(currentUserId || '')}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (!data.available) {
        return { available: false, error: data.error || `@${clean} is already taken.` };
      }
    }
  } catch {
    // If backend is unreachable or local development, fall through to local cache check
  }

  // 3. Check local cache registry
  const localRegistry = getLocalClaimedUsernames();
  const withAt = `@${clean}`;
  const localRecord = localRegistry[clean] || localRegistry[withAt];
  if (localRecord) {
    if (currentUserId && localRecord.userId === currentUserId) {
      return { available: true };
    }
    return { available: false, error: `@${clean} is already registered.` };
  }

  // Also check any profiles cached in localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tripwise_user_profile_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const pUser = (parsed?.username || '').toLowerCase().replace(/^@+/, '');
            if (pUser === clean) {
              const pId = parsed?.id || key.replace('tripwise_user_profile_', '');
              if (currentUserId && pId === currentUserId) {
                return { available: true };
              }
              return { available: false, error: `@${clean} is already registered.` };
            }
          }
        }
      }
    } catch {}
  }

  return { available: true };
}

/**
 * Reserve/claim a username for a user upon successful signup or profile update.
 */
export async function claimUsername(
  rawUsername: string,
  userId?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const validation = validateUsernameFormat(rawUsername);
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const clean = validation.cleanUsername;

  // 1. Save in local persistent registry
  saveLocalClaimedUsername(clean, userId, email);

  // 2. Save in backend server registry
  try {
    await fetch('/api/auth/register-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: clean,
        userId,
        email
      })
    });
  } catch (e) {
    console.warn('Could not register username on backend server API:', e);
  }

  // 3. Save in Supabase usernames & profiles tables if configured
  const supabase = getSupabaseClient();
  if (supabase && userId) {
    try {
      await supabase.from('usernames').upsert(
        {
          username: clean,
          user_id: userId,
          created_at: new Date().toISOString()
        },
        { onConflict: 'username' }
      );
    } catch (e) {
      console.warn('Could not upsert username into Supabase usernames table:', e);
    }

    try {
      await supabase.from('profiles').upsert(
        {
          id: userId,
          username: `@${clean}`,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      );
    } catch (e) {
      console.warn('Could not upsert into public.profiles:', e);
    }
  }

  return { success: true };
}

export interface RealTravellerResult {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  location: string;
  bio: string;
  level: string;
  tripsCount: number;
  placesCount: number;
  topDNA: string[];
  recentPlaces: string[];
  isFollowing?: boolean;
}

/**
 * Searches real registered users across Supabase database, server username registry, and local profiles.
 * Eliminates all fake / predefined mock profiles.
 */
export async function searchRealTravellers(searchQuery?: string): Promise<RealTravellerResult[]> {
  const q = (searchQuery || '').trim().toLowerCase().replace(/^@+/, '');
  const profilesMap = new Map<string, RealTravellerResult>();

  // Helper to add or merge a real profile record
  const recordProfile = (p: Partial<RealTravellerResult> & { username: string }) => {
    const cleanUser = cleanUsernameInput(p.username);
    if (!cleanUser) return;
    const existing = profilesMap.get(cleanUser);
    const updated: RealTravellerResult = {
      id: p.id || existing?.id || `user_${cleanUser}`,
      name: p.name || existing?.name || (cleanUser.charAt(0).toUpperCase() + cleanUser.slice(1)),
      username: `@${cleanUser}`,
      avatarUrl: sanitizeAvatarUrl(p.avatarUrl || existing?.avatarUrl || ''),
      location: p.location || existing?.location || 'Traveler',
      bio: p.bio || existing?.bio || 'Exploring new places, one trip at a time 🌍',
      level: p.level || existing?.level || 'Travel Explorer',
      tripsCount: p.tripsCount ?? existing?.tripsCount ?? 0,
      placesCount: p.placesCount ?? existing?.placesCount ?? 0,
      topDNA: p.topDNA || existing?.topDNA || ['Adventure', 'Nature', 'Photography'],
      recentPlaces: p.recentPlaces || existing?.recentPlaces || [],
      isFollowing: p.isFollowing ?? existing?.isFollowing ?? false
    };
    profilesMap.set(cleanUser, updated);
  };

  // 1. Gather all cached real profiles from localStorage
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('tripwise_user_profile_')) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (data && (data.username || data.name)) {
              recordProfile({
                id: data.id || key.replace('tripwise_user_profile_', ''),
                name: data.name,
                username: data.username || data.name?.toLowerCase().replace(/\s+/g, '_') || 'traveler',
                avatarUrl: data.avatarUrl,
                location: data.place,
                bio: data.bio,
                tripsCount: data.stats?.tripsCount || 0,
                placesCount: data.stats?.placesCount || 0,
                level: data.stats?.level || 'Travel Explorer'
              });
            }
          }
        }
      }

      // Claimed usernames registry in localStorage
      const claimed = getLocalClaimedUsernames();
      Object.entries(claimed).forEach(([username, meta]) => {
        recordProfile({
          id: meta.userId || `claimed_${username}`,
          username: username,
          name: username.charAt(0).toUpperCase() + username.slice(1)
        });
      });

      // User creators from real uploaded trails
      const rawTrails = localStorage.getItem('roamai_user_trails') || localStorage.getItem('tripwise_user_trails');
      if (rawTrails) {
        const trails = JSON.parse(rawTrails);
        if (Array.isArray(trails)) {
          trails.forEach((t: any) => {
            if (t.creator && t.creator.username) {
              recordProfile({
                username: t.creator.username,
                name: t.creator.name,
                avatarUrl: t.creator.avatarUrl,
                location: t.destination,
                recentPlaces: t.destination ? [t.destination] : []
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error reading local profiles:', e);
    }
  }

  // 2. Query backend API endpoint /api/auth/search-users
  try {
    const res = await fetch(`/api/auth/search-users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        data.users.forEach((u: any) => {
          if (u.username) {
            recordProfile({
              id: u.userId || `server_${u.username}`,
              username: u.username,
              name: u.username.charAt(0).toUpperCase() + u.username.slice(1)
            });
          }
        });
      }
    }
  } catch {
    // Local / offline fallback handled
  }

  // 3. Query Supabase public profiles table
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('profiles').select('*');
      if (q) {
        query = query.or(`username.ilike.%${q}%,name.ilike.%${q}%,location.ilike.%${q}%,place.ilike.%${q}%`);
      }
      const { data, error } = await query.limit(50);
      if (!error && Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row.username || row.name) {
            const rawUname = row.username || `@${(row.name || 'traveler').toLowerCase().replace(/\s+/g, '_')}`;
            recordProfile({
              id: row.id,
              username: rawUname.startsWith('@') ? rawUname : `@${rawUname}`,
              name: row.name || rawUname.replace(/^@/, '') || 'Traveler',
              avatarUrl: row.avatar_url,
              bio: row.bio,
              location: row.location || row.place || 'Traveler',
              level: row.level || 'Travel Explorer',
              tripsCount: row.trips_count || 0,
              placesCount: row.places_count || 0
            });
          }
        });
      }
    } catch {
      // Table may not be active yet; gracefully handled
    }

    // 4. Also fallback query Supabase public usernames table
    try {
      let uQuery = supabase.from('usernames').select('username, user_id, created_at');
      if (q) {
        uQuery = uQuery.ilike('username', `%${q}%`);
      }
      const { data: uData, error: uErr } = await uQuery.limit(40);
      if (!uErr && Array.isArray(uData)) {
        uData.forEach((row) => {
          if (row.username) {
            const clean = row.username.replace(/^@+/, '');
            recordProfile({
              id: row.user_id || `supa_${clean}`,
              username: `@${clean}`,
              name: clean.charAt(0).toUpperCase() + clean.slice(1)
            });
          }
        });
      }
    } catch {
      // Table may not be active; gracefully handled
    }
  }

  const all = Array.from(profilesMap.values());
  if (!q) return all;

  return all.filter((p) => {
    const uClean = p.username.toLowerCase().replace(/^@+/, '');
    const nClean = p.name.toLowerCase();
    const lClean = p.location.toLowerCase();
    return uClean.includes(q) || nClean.includes(q) || lClean.includes(q);
  });
}


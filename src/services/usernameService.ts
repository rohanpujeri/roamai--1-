import { getSupabaseClient } from './supabaseClient';

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

  // 1. Check local cache registry first
  const localRegistry = getLocalClaimedUsernames();
  if (localRegistry[clean]) {
    const record = localRegistry[clean];
    if (currentUserId && record.userId === currentUserId) {
      return { available: true };
    }
    return { available: false, error: `@${clean} is already registered.` };
  }

  // 2. Query backend API server endpoint
  try {
    const apiRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(clean)}&userId=${encodeURIComponent(currentUserId || '')}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (!data.available) {
        return { available: false, error: data.error || `@${clean} is already taken.` };
      }
      return { available: true };
    }
  } catch {
    // If backend is unreachable or local development, fall through to Supabase/Local check
  }

  // 3. Query Supabase public usernames table if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('usernames')
        .select('username, user_id')
        .eq('username', clean)
        .maybeSingle();

      if (!error && data) {
        if (currentUserId && data.user_id === currentUserId) {
          return { available: true };
        }
        return { available: false, error: `@${clean} is already taken.` };
      }
    } catch {
      // Table might not exist yet; gracefully handled
    }
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

  // 3. Save in Supabase usernames table if configured
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
  }

  return { success: true };
}

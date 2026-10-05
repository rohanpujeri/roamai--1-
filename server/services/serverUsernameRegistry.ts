import fs from 'fs';
import path from 'path';
import { isFakeMockUser } from './serverFollowsRegistry';
import { serverConfig } from '../config';

interface UsernameRecord {
  username: string;
  userId?: string;
  email?: string;
  createdAt: string;
}

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
  'guest'
]);

// In-memory cache for fast lookup
const claimedUsernamesMap = new Map<string, UsernameRecord>();

// Path to persistent JSON file
const dataDir = path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'usernames.json');

// Initialize map from disk if exists
try {
  if (fs.existsSync(dataFile)) {
    const raw = fs.readFileSync(dataFile, 'utf-8');
    const parsed: UsernameRecord[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach((rec) => {
        if (rec.username && !isFakeMockUser(rec.username)) {
          claimedUsernamesMap.set(rec.username.toLowerCase(), rec);
        }
      });
    }
  }
} catch (err) {
  console.warn('Could not read usernames.json from disk:', err);
}

function persistToDisk(): void {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const array = Array.from(claimedUsernamesMap.values());
    fs.writeFileSync(dataFile, JSON.stringify(array, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist usernames to disk:', err);
  }
}

const SUPABASE_URL = serverConfig.supabase.url;
const SUPABASE_KEY = serverConfig.supabase.anonKey;

// In-flight deduplication and memory cache for username availability checks
const inFlightUsernameChecks = new Map<string, Promise<{ available: boolean; error?: string }>>();
const usernameCheckCache = new Map<string, { result: { available: boolean; error?: string }; timestamp: number }>();
const USERNAME_CACHE_TTL_MS = 15000; // 15 seconds

export function invalidateUsernameCache(username?: string) {
  if (username) {
    const clean = username.trim().toLowerCase().replace(/^@+/, '');
    usernameCheckCache.delete(clean);
  } else {
    usernameCheckCache.clear();
  }
}

export async function isUsernameAvailable(
  rawUsername: string,
  currentUserId?: string
): Promise<{ available: boolean; error?: string }> {
  if (!rawUsername) {
    return { available: false, error: 'Username is required.' };
  }

  const clean = rawUsername.trim().toLowerCase().replace(/^@+/, '');

  if (clean.length < 3) {
    return { available: false, error: 'Username must be at least 3 characters long.' };
  }

  if (clean.length > 20) {
    return { available: false, error: 'Username cannot exceed 20 characters.' };
  }

  const validRegex = /^[a-z0-9_.]+$/;
  if (!validRegex.test(clean)) {
    return { available: false, error: 'Only letters, numbers, periods, and underscores are allowed.' };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return { available: false, error: 'This username is reserved. Please choose another.' };
  }

  // 1. Check in-memory claimed usernames registry
  const existing = claimedUsernamesMap.get(clean);
  if (existing) {
    if (currentUserId && existing.userId === currentUserId) {
      return { available: true };
    }
    return { available: false, error: `@${clean} is already registered. Please choose another username.` };
  }

  // 2. Check local memory cache (0ms response)
  const cached = usernameCheckCache.get(clean);
  if (cached && Date.now() - cached.timestamp < USERNAME_CACHE_TTL_MS) {
    return cached.result;
  }

  // 3. In-flight request deduplication
  const inFlightKey = `${clean}:${currentUserId || ''}`;
  if (inFlightUsernameChecks.has(inFlightKey)) {
    return inFlightUsernameChecks.get(inFlightKey)!;
  }

  const checkPromise = (async () => {
    try {
      // Check Supabase profiles table with targeted column projection
      const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?or=(username.ilike.${clean},username.ilike.@${clean})&select=id,username&limit=1`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const found = data[0];
          if (currentUserId && (found.id === currentUserId || found.id === `supa_${currentUserId}`)) {
            const okResult = { available: true };
            usernameCheckCache.set(clean, { result: okResult, timestamp: Date.now() });
            return okResult;
          }
          const takenResult = { available: false, error: `@${clean} is already registered. Please choose another username.` };
          usernameCheckCache.set(clean, { result: takenResult, timestamp: Date.now() });
          return takenResult;
        }
      }
    } catch (err) {
      console.warn('[serverUsernameRegistry] Could not check Supabase profiles:', err);
    } finally {
      inFlightUsernameChecks.delete(inFlightKey);
    }

    const finalOk = { available: true };
    usernameCheckCache.set(clean, { result: finalOk, timestamp: Date.now() });
    return finalOk;
  })();

  inFlightUsernameChecks.set(inFlightKey, checkPromise);
  return checkPromise;
}

export async function registerServerUsername(
  rawUsername: string,
  userId?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const check = await isUsernameAvailable(rawUsername, userId);
  if (!check.available) {
    return { success: false, error: check.error };
  }

  const clean = rawUsername.trim().toLowerCase().replace(/^@+/, '');
  const record: UsernameRecord = {
    username: clean,
    userId,
    email,
    createdAt: new Date().toISOString()
  };

  claimedUsernamesMap.set(clean, record);
  invalidateUsernameCache(clean);
  persistToDisk();

  return { success: true };
}

export function searchServerUsers(query?: string): UsernameRecord[] {
  const all = Array.from(claimedUsernamesMap.values()).filter((u) => !isFakeMockUser(u.username));
  if (!query || !query.trim()) return all;
  const cleanQ = query.trim().toLowerCase().replace(/^@+/, '');
  return all.filter((u) => u.username.toLowerCase().includes(cleanQ));
}

export function deleteServerUsername(userId?: string, rawUsername?: string): boolean {
  let changed = false;
  const clean = rawUsername ? rawUsername.trim().toLowerCase().replace(/^@+/, '') : '';

  if (clean && claimedUsernamesMap.has(clean)) {
    claimedUsernamesMap.delete(clean);
    invalidateUsernameCache(clean);
    changed = true;
  }

  if (userId) {
    for (const [key, record] of claimedUsernamesMap.entries()) {
      if (record.userId === userId) {
        claimedUsernamesMap.delete(key);
        invalidateUsernameCache(key);
        changed = true;
      }
    }
  }

  if (changed) {
    persistToDisk();
  }
  return changed;
}



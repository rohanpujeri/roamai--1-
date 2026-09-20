import fs from 'fs';
import path from 'path';

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
        if (rec.username) {
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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://kfqdlajqarsfdoskeahh.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_sczvF-TyjyC1jNz2RV7EkQ_skgH9A5l';

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

  const validRegex = /^[a-z0-9_]+$/;
  if (!validRegex.test(clean)) {
    return { available: false, error: 'Only lowercase letters, numbers, and underscores are allowed.' };
  }

  if (RESERVED_USERNAMES.has(clean)) {
    return { available: false, error: 'This username is reserved. Please choose another.' };
  }

  // 1. Check in-memory map
  const existing = claimedUsernamesMap.get(clean);
  if (existing) {
    if (currentUserId && existing.userId === currentUserId) {
      return { available: true };
    }
    return { available: false, error: `@${clean} is already registered. Please choose another username.` };
  }

  // 2. Check Supabase profiles table
  try {
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
          return { available: true };
        }
        return { available: false, error: `@${clean} is already registered. Please choose another username.` };
      }
    }
  } catch (err) {
    console.warn('[serverUsernameRegistry] Could not check Supabase profiles:', err);
  }

  return { available: true };
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
  persistToDisk();

  return { success: true };
}

export function searchServerUsers(query?: string): UsernameRecord[] {
  const all = Array.from(claimedUsernamesMap.values());
  if (!query || !query.trim()) return all;
  const cleanQ = query.trim().toLowerCase().replace(/^@+/, '');
  return all.filter((u) => u.username.toLowerCase().includes(cleanQ));
}



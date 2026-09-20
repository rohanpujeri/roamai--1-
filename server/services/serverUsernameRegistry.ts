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

export function isUsernameAvailable(
  rawUsername: string,
  currentUserId?: string
): { available: boolean; error?: string } {
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

  const existing = claimedUsernamesMap.get(clean);
  if (existing) {
    if (currentUserId && existing.userId === currentUserId) {
      return { available: true };
    }
    return { available: false, error: `@${clean} is already registered. Please choose another username.` };
  }

  return { available: true };
}

export function registerServerUsername(
  rawUsername: string,
  userId?: string,
  email?: string
): { success: boolean; error?: string } {
  const check = isUsernameAvailable(rawUsername, userId);
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



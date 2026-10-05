import { UserProfileData } from '../types';
import { getCachedUserProfile, updateUserProfileData, sanitizeAvatarUrl } from './supabaseClient';

export interface ResolvedProfileState extends UserProfileData {
  memberSince: string;
  userInitial: string;
}

/**
 * Format DOB nicely for display (e.g., "15 Aug 1998 (27 yrs)")
 */
export function formatDobDisplay(dobStr?: string): string {
  if (!dobStr) return 'Not provided';
  const parts = dobStr.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const formatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    // Calculate age
    const now = new Date();
    let age = now.getFullYear() - parts[0];
    const m = now.getMonth() - (parts[1] - 1);
    if (m < 0 || (m === 0 && now.getDate() < parts[2])) {
      age--;
    }
    return `${formatted}${age > 0 ? ` (${age} yrs)` : ''}`;
  }
  return dobStr;
}

/**
 * Format Member Since date (e.g., "Aug 2024")
 */
export function formatMemberSince(createdAt?: string): string {
  return createdAt
    ? new Date(createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recent Traveler';
}

/**
 * Get display initial letter for user avatar
 */
export function getUserInitial(name?: string, email?: string, username?: string): string {
  const candidate = name || username?.replace(/^@/, '') || email?.split('@')[0] || 'U';
  return candidate.trim().charAt(0).toUpperCase() || 'U';
}

/**
 * Resolve full initial user profile from cached storage and session metadata
 */
export function resolveInitialProfile(user?: any, userMeta?: Record<string, any>): ResolvedProfileState {
  const meta = userMeta || (user?.user_metadata || {}) as Record<string, any>;
  const cached = user?.id ? getCachedUserProfile(user.id) : null;

  const fallbackEmailName = user?.email ? user.email.split('@')[0] : '';
  const name = cached?.name || meta.full_name || meta.name || fallbackEmailName || 'Traveler';
  const username = cached?.username || meta.username || (fallbackEmailName ? `@${fallbackEmailName}` : '@traveler');
  const avatarUrl = sanitizeAvatarUrl(cached?.avatarUrl || meta.avatar_url || meta.avatarUrl || '');
  const dob = cached?.dob || meta.dob || '';
  const place = cached?.place || meta.place || '';
  const bio = cached?.bio || meta.bio || '';
  const email = user?.email || cached?.email || '';
  const memberSince = formatMemberSince(user?.created_at);
  const userInitial = getUserInitial(name, email, username);

  return {
    name,
    username,
    avatarUrl,
    dob,
    place,
    bio,
    email,
    memberSince,
    userInitial
  };
}

/**
 * Persist user profile updates to backend and local cache
 */
export async function persistUserProfile(
  updatedProfile: UserProfileData,
  user?: any
): Promise<{ data?: UserProfileData; error?: string }> {
  try {
    if (typeof window !== 'undefined') {
      try {
        if (user?.id) {
          localStorage.setItem(`tripwise_user_profile_${user.id}`, JSON.stringify(updatedProfile));
          localStorage.setItem(`roamai_user_profile_${user.id}`, JSON.stringify(updatedProfile));
        } else {
          localStorage.setItem('tripwise_user_profile_guest', JSON.stringify(updatedProfile));
          localStorage.setItem('roamai_user_profile_guest', JSON.stringify(updatedProfile));
        }
        localStorage.setItem('tripwise_user_profile', JSON.stringify(updatedProfile));
        localStorage.setItem('roamai_user_profile', JSON.stringify(updatedProfile));
        window.dispatchEvent(new CustomEvent('roamai_profile_updated', { detail: updatedProfile }));
        window.dispatchEvent(new Event('storage'));
      } catch {}
    }

    if (user?.id) {
      return await updateUserProfileData(updatedProfile, user.id);
    }
    return { data: updatedProfile };
  } catch (err: any) {
    return { error: err?.message || 'Failed to update user profile' };
  }
}

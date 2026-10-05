import { getSupabaseClient } from './supabaseClient';
import { deleteTrailMedia } from './trailMediaStorage';

export interface DeleteAccountParams {
  userId: string;
  username?: string;
  email?: string;
}

export async function deleteUserAccountCompletely(
  params: DeleteAccountParams
): Promise<{ success: boolean; error?: string }> {
  const { userId, username, email } = params;
  if (!userId) {
    return { success: false, error: 'User ID is required to delete account' };
  }

  const supabase = getSupabaseClient();

  try {
    // 1. Delete user's public trails and media
    if (supabase) {
      try {
        const { data: userTrails } = await supabase
          .from('trails')
          .select('id')
          .eq('user_id', userId);

        if (Array.isArray(userTrails)) {
          for (const t of userTrails) {
            if (t?.id) {
              await deleteTrailMedia(t.id).catch(() => {});
            }
          }
        }
        await supabase.from('trails').delete().eq('user_id', userId);
      } catch (trailErr) {
        console.warn('Trails cleanup notice during account deletion:', trailErr);
      }
    }

    // 2. Delete user's trips from Supabase
    if (supabase) {
      try {
        await supabase.from('trips').delete().eq('user_id', userId);
      } catch (tripErr) {
        console.warn('Trips cleanup notice during account deletion:', tripErr);
      }
    }

    // 3. Delete user's saved places from Supabase
    if (supabase) {
      try {
        await supabase.from('saved_places').delete().eq('user_id', userId);
      } catch (placesErr) {
        console.warn('Places cleanup notice during account deletion:', placesErr);
      }
    }

    // 4. Delete user's follows & followers from Supabase
    if (supabase) {
      try {
        await supabase.from('follows').delete().eq('follower_id', userId);
        await supabase.from('follows').delete().eq('following_id', userId);
      } catch (followErr) {
        console.warn('Follows cleanup notice during account deletion:', followErr);
      }
    }

    // 5. Delete username claim from Supabase
    if (supabase) {
      try {
        await supabase.from('usernames').delete().eq('user_id', userId);
      } catch (userErr) {
        console.warn('Username cleanup notice during account deletion:', userErr);
      }
    }

    // 6. Delete user profile row
    if (supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (profErr) {
        console.warn('Profile delete notice during account deletion:', profErr);
      }
    }

    // 7. Invoke database RPC delete_user_account() if installed
    if (supabase) {
      try {
        await supabase.rpc('delete_user_account');
      } catch (rpcErr) {
        console.warn('RPC delete_user_account notice (non-fatal):', rpcErr);
      }
    }

    // 8. Inform backend server to purge cached trails, usernames, and follows
    try {
      const session = (await supabase?.auth.getSession())?.data.session;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId, username, email })
      });
    } catch (serverErr) {
      console.warn('Server delete-account call notice:', serverErr);
    }

    // 9. Wipe all local browser storage related to user
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes(userId) ||
              key.startsWith('tripwise_user_trips') ||
              key.startsWith('tripwise_saved_places') ||
              key.startsWith('roamai_user_profile') ||
              key.startsWith('roamai_profile_draft') ||
              key.startsWith('roamai_user_follow') ||
              key.startsWith('roamai_user_feed') ||
              key.startsWith('tripwise_saved_trails') ||
              key.startsWith('sb-') ||
              key.includes('auth-token'))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {}
        });
      } catch {}

      try {
        sessionStorage.clear();
      } catch {}

      // Delete IndexedDB databases used for media
      try {
        if (window.indexedDB) {
          indexedDB.deleteDatabase('roamai_trail_media');
          indexedDB.deleteDatabase('roamai_trail_posters');
        }
      } catch {}
    }

    // 10. Sign out from Supabase auth session
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }

    // 11. Dispatch notifications so all components reset state immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('roamai_account_deleted', { detail: { userId } }));
      window.dispatchEvent(new CustomEvent('roamai_trips_changed', { detail: [] }));
      window.dispatchEvent(new CustomEvent('roamai_profile_updated', { detail: null }));
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteUserAccountCompletely failed:', err);
    return { success: false, error: err?.message || 'An error occurred while deleting your account' };
  }
}

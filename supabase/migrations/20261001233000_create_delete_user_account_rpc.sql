-- Migration: Create delete_user_account RPC for self-service account deletion
-- This allows authenticated users to permanently delete their own account from auth.users,
-- cascading to all associated user data (profiles, trips, saved places, trails, follows).

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ensure only the authenticated user can delete their own account
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- 1. Clean up public tables
  DELETE FROM public.trips WHERE user_id = v_user_id;
  DELETE FROM public.saved_places WHERE user_id = v_user_id;
  DELETE FROM public.trails WHERE user_id = v_user_id;
  DELETE FROM public.follows WHERE follower_id = v_user_id OR following_id = v_user_id;
  DELETE FROM public.usernames WHERE user_id = v_user_id;
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- 2. Delete from auth.users (cascades any foreign keys)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

-- Grant execution permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

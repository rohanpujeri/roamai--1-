-- ==============================================================================
-- Migration: 20260925193000_remove_email_fallback_for_usernames.sql
-- Description: Ensure usernames use the exact chosen username from user metadata,
--              allowing letters, numbers, periods, and underscores.
--              Completely removes fallback extraction from email or surname.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  extracted_username text;
  extracted_name text;
  extracted_place text;
  extracted_avatar text;
  extracted_bio text;
BEGIN
  -- 1. Use the exact username provided during signup, never extracting from email
  extracted_username := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'username'), ''),
    '@traveler_' || substr(new.id::text, 1, 8)
  );
  
  -- Ensure username starts with @
  IF NOT extracted_username LIKE '@%' THEN
    extracted_username := '@' || extracted_username;
  END IF;

  -- 2. Use exact full name or name, or fallback to the clean username without email extraction
  extracted_name := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'name'), ''),
    ltrim(extracted_username, '@')
  );

  extracted_place := COALESCE(
    NULLIF(TRIM(new.raw_user_meta_data->>'place'), ''),
    'Traveler'
  );

  extracted_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatarUrl',
    ''
  );

  extracted_bio := COALESCE(
    new.raw_user_meta_data->>'bio',
    ''
  );

  INSERT INTO public.profiles (
    id,
    username,
    name,
    avatar_url,
    bio,
    place,
    location,
    level,
    trips_count,
    places_count,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    extracted_username,
    extracted_name,
    extracted_avatar,
    extracted_bio,
    extracted_place,
    extracted_place,
    'Travel Explorer',
    0,
    0,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(NULLIF(EXCLUDED.username, ''), profiles.username),
    name = COALESCE(NULLIF(EXCLUDED.name, ''), profiles.name),
    avatar_url = COALESCE(NULLIF(EXCLUDED.avatar_url, ''), profiles.avatar_url),
    bio = COALESCE(NULLIF(EXCLUDED.bio, ''), profiles.bio),
    place = COALESCE(NULLIF(EXCLUDED.place, ''), profiles.place),
    location = COALESCE(NULLIF(EXCLUDED.location, ''), profiles.location),
    updated_at = now();

  RETURN new;
END;
$$;

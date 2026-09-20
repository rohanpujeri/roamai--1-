-- ==============================================================================
-- Migration: 20260920150000_fix_public_profiles_and_search.sql
-- Description: Create public profiles table with full search capabilities,
--              automatic trigger on auth.users for new signups,
--              backfill for already signed-up users, and open public read RLS.
-- ==============================================================================

-- 1. Create or alter public.profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  name text,
  avatar_url text,
  bio text DEFAULT 'Exploring new places, one trip at a time 🌍',
  place text DEFAULT '',
  location text DEFAULT 'Traveler',
  level text DEFAULT 'Travel Explorer',
  trips_count int DEFAULT 0,
  places_count int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Ensure columns exist if table was already created with minimal schema
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username') THEN
    ALTER TABLE public.profiles ADD COLUMN username text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE public.profiles ADD COLUMN name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE public.profiles ADD COLUMN bio text DEFAULT 'Exploring new places, one trip at a time 🌍';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'place') THEN
    ALTER TABLE public.profiles ADD COLUMN place text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location') THEN
    ALTER TABLE public.profiles ADD COLUMN location text DEFAULT 'Traveler';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'level') THEN
    ALTER TABLE public.profiles ADD COLUMN level text DEFAULT 'Travel Explorer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trips_count') THEN
    ALTER TABLE public.profiles ADD COLUMN trips_count int DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'places_count') THEN
    ALTER TABLE public.profiles ADD COLUMN places_count int DEFAULT 0;
  END IF;
END $$;

-- 2. Indexes for fast real-time search
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_name_idx ON public.profiles(name);

-- 3. Row Level Security: Allow EVERYONE to read profiles so users can search each other
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 4. Automatic Trigger: Whenever any user signs up or updates in auth.users, sync to public.profiles
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
  extracted_username := COALESCE(
    new.raw_user_meta_data->>'username',
    '@' || split_part(new.email, '@', 1)
  );
  
  -- Ensure username starts with @
  IF NOT extracted_username LIKE '@%' THEN
    extracted_username := '@' || extracted_username;
  END IF;

  extracted_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    initcap(replace(split_part(new.email, '@', 1), '.', ' '))
  );

  extracted_place := COALESCE(
    new.raw_user_meta_data->>'place',
    'Traveler'
  );

  extracted_avatar := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatarUrl',
    ''
  );

  extracted_bio := COALESCE(
    new.raw_user_meta_data->>'bio',
    'Exploring new places, one trip at a time 🌍'
  );

  INSERT INTO public.profiles (
    id,
    username,
    name,
    avatar_url,
    bio,
    place,
    location,
    updated_at
  ) VALUES (
    new.id,
    extracted_username,
    extracted_name,
    extracted_avatar,
    extracted_bio,
    extracted_place,
    extracted_place,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    name = EXCLUDED.name,
    avatar_url = CASE WHEN EXCLUDED.avatar_url <> '' THEN EXCLUDED.avatar_url ELSE public.profiles.avatar_url END,
    place = CASE WHEN EXCLUDED.place <> '' THEN EXCLUDED.place ELSE public.profiles.place END,
    location = CASE WHEN EXCLUDED.location <> '' THEN EXCLUDED.location ELSE public.profiles.location END,
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Backfill all existing signed up users from auth.users into public.profiles
INSERT INTO public.profiles (
  id,
  username,
  name,
  avatar_url,
  bio,
  place,
  location
)
SELECT
  u.id,
  CASE 
    WHEN (u.raw_user_meta_data->>'username') IS NOT NULL AND (u.raw_user_meta_data->>'username') <> ''
      THEN (CASE WHEN (u.raw_user_meta_data->>'username') LIKE '@%' THEN (u.raw_user_meta_data->>'username') ELSE '@' || (u.raw_user_meta_data->>'username') END)
    ELSE '@' || split_part(u.email, '@', 1)
  END,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    initcap(replace(split_part(u.email, '@', 1), '.', ' '))
  ),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'avatarUrl', ''),
  COALESCE(u.raw_user_meta_data->>'bio', 'Exploring new places, one trip at a time 🌍'),
  COALESCE(u.raw_user_meta_data->>'place', 'Traveler'),
  COALESCE(u.raw_user_meta_data->>'place', 'Traveler')
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  name = EXCLUDED.name,
  updated_at = now();

-- 6. Grant read/write permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO anon, authenticated;

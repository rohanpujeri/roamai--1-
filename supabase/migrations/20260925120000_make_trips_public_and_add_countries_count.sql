-- Migration: 20260925120000_make_trips_public_and_add_countries_count.sql
-- Description: Allow public reading of trips so users can view journeys on each other's profiles,
--              and ensure countries_count column exists on public.profiles.

-- 1. Ensure countries_count column exists on public.profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'countries_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN countries_count int DEFAULT 0;
  END IF;
END $$;

-- 2. Open SELECT on public.trips so trips are publicly viewable on traveller profiles
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public trips are viewable by everyone" ON public.trips;
DROP POLICY IF EXISTS "Users can view own trips" ON public.trips;

CREATE POLICY "Public trips are viewable by everyone" 
  ON public.trips FOR SELECT 
  USING (true);

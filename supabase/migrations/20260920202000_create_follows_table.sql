-- ==============================================================================
-- Migration: 20260920202000_create_follows_table.sql
-- Description: Create follows table to track followers & following relationships
--              across all registered users with RLS policies and indexes.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id text NOT NULL,
  following_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Indexes for lightning-fast lookups in both directions
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);

-- Enable RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Allow public read access to follows so anyone can see followers / following counts and lists
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON public.follows;
CREATE POLICY "Follows are viewable by everyone" 
  ON public.follows FOR SELECT 
  USING (true);

-- Allow inserting follows (authenticated users or guest sessions)
DROP POLICY IF EXISTS "Anyone can insert follows" ON public.follows;
CREATE POLICY "Anyone can insert follows" 
  ON public.follows FOR INSERT 
  WITH CHECK (true);

-- Allow deleting follows
DROP POLICY IF EXISTS "Anyone can delete follows" ON public.follows;
CREATE POLICY "Anyone can delete follows" 
  ON public.follows FOR DELETE 
  USING (true);

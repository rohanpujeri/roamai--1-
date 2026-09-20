-- Create Trails Table for Global Shared Reels / Trails
CREATE TABLE IF NOT EXISTS public.trails (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index on created_at for fast chronological feed
CREATE INDEX IF NOT EXISTS trails_created_at_idx ON public.trails(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

-- Anyone can view all trails uploaded by every profile
CREATE POLICY "Anyone can view trails" 
  ON public.trails FOR SELECT 
  USING (true);

-- Anyone can upload and share trails
CREATE POLICY "Anyone can insert trails" 
  ON public.trails FOR INSERT 
  WITH CHECK (true);

-- Anyone can update trails (likes, comments, views)
CREATE POLICY "Anyone can update trails" 
  ON public.trails FOR UPDATE 
  USING (true);

-- Users or creators can delete trails
CREATE POLICY "Anyone can delete own trails" 
  ON public.trails FOR DELETE 
  USING (true);

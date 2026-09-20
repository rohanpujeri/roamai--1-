-- ==============================================================================
-- Migration: Create Global Trails Table & Public Storage Bucket for Trails Media
-- ==============================================================================

-- 1. Create trails table in public schema
CREATE TABLE IF NOT EXISTS public.trails (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  trail_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Index for instant chronological feed ordering
CREATE INDEX IF NOT EXISTS trails_created_at_idx ON public.trails(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view trails" ON public.trails;
DROP POLICY IF EXISTS "Anyone can insert trails" ON public.trails;
DROP POLICY IF EXISTS "Anyone can update trails" ON public.trails;
DROP POLICY IF EXISTS "Anyone can delete trails" ON public.trails;
DROP POLICY IF EXISTS "Anyone can delete own trails" ON public.trails;

-- Policies allowing public viewing and creation across all accounts
CREATE POLICY "Anyone can view trails" 
  ON public.trails FOR SELECT 
  USING (true);

CREATE POLICY "Anyone can insert trails" 
  ON public.trails FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Anyone can update trails" 
  ON public.trails FOR UPDATE 
  USING (true);

CREATE POLICY "Anyone can delete trails" 
  ON public.trails FOR DELETE 
  USING (true);

-- 2. Create public storage bucket for video/photo uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'trails',
  'trails',
  true,
  52428800, -- 50MB max file size
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- 3. Storage RLS Policies for the trails bucket
DROP POLICY IF EXISTS "Anyone can view trail media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload trail media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update trail media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete trail media" ON storage.objects;

CREATE POLICY "Anyone can view trail media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trails');

CREATE POLICY "Anyone can upload trail media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trails');

CREATE POLICY "Anyone can update trail media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'trails');

CREATE POLICY "Anyone can delete trail media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trails');

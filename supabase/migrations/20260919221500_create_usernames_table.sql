-- Create Usernames Table to enforce unique usernames system-wide
CREATE TABLE IF NOT EXISTS public.usernames (
  username text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous prospective users during signup) to check username availability
CREATE POLICY "Allow public select for username availability"
  ON public.usernames FOR SELECT
  TO public
  USING (true);

-- Allow authenticated users to claim/update their username
CREATE POLICY "Allow authenticated users to insert usernames"
  ON public.usernames FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their usernames"
  ON public.usernames FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to delete their usernames"
  ON public.usernames FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

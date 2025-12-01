-- Create table to track game progress
CREATE TABLE IF NOT EXISTS public.game_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  current_position integer NOT NULL DEFAULT 0,
  games_played integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read game progress"
  ON public.game_progress
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert game progress"
  ON public.game_progress
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update game progress"
  ON public.game_progress
  FOR UPDATE
  USING (true);
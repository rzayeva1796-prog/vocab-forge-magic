-- Add category column to movies table
ALTER TABLE public.movies ADD COLUMN category text DEFAULT 'Dizi';

-- Create watch_history table for user viewing history
CREATE TABLE public.watch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  progress_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false
);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX watch_history_user_episode_idx ON public.watch_history(user_id, episode_id);

-- Enable RLS
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for watch_history
CREATE POLICY "Users can view their own watch history"
ON public.watch_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
ON public.watch_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
ON public.watch_history
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own watch history"
ON public.watch_history
FOR DELETE
USING (auth.uid() = user_id);
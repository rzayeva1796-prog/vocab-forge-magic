-- Create league enum
CREATE TYPE public.league_type AS ENUM (
  'bronze', 'silver', 'gold', 'platinum', 'emerald', 
  'diamond', 'sapphire', 'ruby', 'obsidian', 'titan'
);

-- Create user leagues table
CREATE TABLE public.user_leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_league league_type NOT NULL DEFAULT 'bronze',
  period_xp INTEGER NOT NULL DEFAULT 0,
  period_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_leagues ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can read user leagues" 
ON public.user_leagues 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own league" 
ON public.user_leagues 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own league" 
ON public.user_leagues 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_leagues_updated_at
BEFORE UPDATE ON public.user_leagues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
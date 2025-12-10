-- Add daily_period_start column to profiles for 24-hour countdown
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_period_start timestamp with time zone DEFAULT timezone('utc'::text, now());

-- Create global_settings table for synced 24h countdown
CREATE TABLE IF NOT EXISTS public.global_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  daily_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read global settings
CREATE POLICY "Anyone can read global settings" ON public.global_settings FOR SELECT USING (true);

-- Only admins can update global settings
CREATE POLICY "Admins can update global settings" ON public.global_settings FOR UPDATE USING (is_admin(auth.uid()));

-- Insert default row
INSERT INTO public.global_settings (id, daily_period_start) 
VALUES ('main', timezone('utc'::text, now()))
ON CONFLICT (id) DO NOTHING;

-- Update leaderboard_bots to add original_league column to track which league bot originally belongs to
ALTER TABLE public.leaderboard_bots ADD COLUMN IF NOT EXISTS original_league TEXT DEFAULT 'bronze';

-- Add bot_id column (like bot1, bot2... bot12 per league)
ALTER TABLE public.leaderboard_bots ADD COLUMN IF NOT EXISTS bot_number INTEGER DEFAULT 1;
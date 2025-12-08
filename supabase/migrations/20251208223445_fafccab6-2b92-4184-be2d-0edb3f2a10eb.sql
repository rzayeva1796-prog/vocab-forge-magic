-- Create leaderboard_bots table to store persistent bots
CREATE TABLE public.leaderboard_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  current_league text NOT NULL DEFAULT 'bronze',
  period_xp integer NOT NULL DEFAULT 0,
  daily_xp_rate integer NOT NULL DEFAULT 3000,
  is_male boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.leaderboard_bots ENABLE ROW LEVEL SECURITY;

-- Create policies - bots are readable by everyone, only admins can modify
CREATE POLICY "Anyone can read leaderboard bots" 
ON public.leaderboard_bots 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert leaderboard bots" 
ON public.leaderboard_bots 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update leaderboard bots" 
ON public.leaderboard_bots 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete leaderboard bots" 
ON public.leaderboard_bots 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_leaderboard_bots_updated_at
BEFORE UPDATE ON public.leaderboard_bots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert 2 bots per league (20 bots total)
-- Bronze League bots (3000-6000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Ahmet', 'https://randomuser.me/api/portraits/men/1.jpg', 'bronze', 3500, true),
('Ayşe', 'https://randomuser.me/api/portraits/women/1.jpg', 'bronze', 5000, false);

-- Silver League bots (6000-12000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Mehmet', 'https://randomuser.me/api/portraits/men/2.jpg', 'silver', 8000, true),
('Fatma', 'https://randomuser.me/api/portraits/women/2.jpg', 'silver', 10000, false);

-- Gold League bots (12000-18000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Mustafa', 'https://randomuser.me/api/portraits/men/3.jpg', 'gold', 14000, true),
('Zeynep', 'https://randomuser.me/api/portraits/women/3.jpg', 'gold', 16000, false);

-- Platinum League bots (18000-24000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Ali', 'https://randomuser.me/api/portraits/men/4.jpg', 'platinum', 20000, true),
('Elif', 'https://randomuser.me/api/portraits/women/4.jpg', 'platinum', 22000, false);

-- Emerald League bots (24000-30000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Hüseyin', 'https://randomuser.me/api/portraits/men/5.jpg', 'emerald', 26000, true),
('Ece', 'https://randomuser.me/api/portraits/women/5.jpg', 'emerald', 28000, false);

-- Diamond League bots (30000-36000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Hasan', 'https://randomuser.me/api/portraits/men/11.jpg', 'diamond', 32000, true),
('Selin', 'https://randomuser.me/api/portraits/women/11.jpg', 'diamond', 34000, false);

-- Sapphire League bots (36000-42000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Emre', 'https://randomuser.me/api/portraits/men/12.jpg', 'sapphire', 38000, true),
('Ceren', 'https://randomuser.me/api/portraits/women/12.jpg', 'sapphire', 40000, false);

-- Ruby League bots (42000-48000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Can', 'https://randomuser.me/api/portraits/men/13.jpg', 'ruby', 44000, true),
('Dilara', 'https://randomuser.me/api/portraits/women/13.jpg', 'ruby', 46000, false);

-- Obsidian League bots (48000-54000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Burak', 'https://randomuser.me/api/portraits/men/14.jpg', 'obsidian', 50000, true),
('İrem', 'https://randomuser.me/api/portraits/women/14.jpg', 'obsidian', 52000, false);

-- Titan League bots (54000-60000 daily XP)
INSERT INTO public.leaderboard_bots (name, avatar_url, current_league, daily_xp_rate, is_male) VALUES
('Kaan', 'https://randomuser.me/api/portraits/men/15.jpg', 'titan', 56000, true),
('Defne', 'https://randomuser.me/api/portraits/women/15.jpg', 'titan', 58000, false);
-- Create music table (similar to movies)
CREATE TABLE public.music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  category TEXT DEFAULT 'Müzik',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create music_albums table (similar to seasons)
CREATE TABLE public.music_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  music_id UUID NOT NULL REFERENCES public.music(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create music_tracks table (similar to episodes)
CREATE TABLE public.music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES public.music_albums(id) ON DELETE CASCADE,
  track_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  audio_url TEXT,
  package_id UUID REFERENCES public.word_packages(id),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create listen_history table (similar to watch_history)
CREATE TABLE public.listen_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  listened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  completed BOOLEAN DEFAULT false,
  UNIQUE(user_id, track_id)
);

-- Enable RLS on all tables
ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listen_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for music (same as movies)
CREATE POLICY "Anyone can read music" ON public.music FOR SELECT USING (true);
CREATE POLICY "Admins can insert music" ON public.music FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update music" ON public.music FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete music" ON public.music FOR DELETE USING (is_admin(auth.uid()));

-- RLS policies for music_albums (same as seasons)
CREATE POLICY "Anyone can read music_albums" ON public.music_albums FOR SELECT USING (true);
CREATE POLICY "Admins can insert music_albums" ON public.music_albums FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update music_albums" ON public.music_albums FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete music_albums" ON public.music_albums FOR DELETE USING (is_admin(auth.uid()));

-- RLS policies for music_tracks (same as episodes)
CREATE POLICY "Anyone can read music_tracks" ON public.music_tracks FOR SELECT USING (true);
CREATE POLICY "Admins can insert music_tracks" ON public.music_tracks FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update music_tracks" ON public.music_tracks FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete music_tracks" ON public.music_tracks FOR DELETE USING (is_admin(auth.uid()));

-- RLS policies for listen_history (same as watch_history)
CREATE POLICY "Users can view their own listen history" ON public.listen_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own listen history" ON public.listen_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listen history" ON public.listen_history FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listen history" ON public.listen_history FOR DELETE USING (auth.uid() = user_id);
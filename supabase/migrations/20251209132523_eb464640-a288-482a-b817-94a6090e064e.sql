-- Create movies table
CREATE TABLE public.movies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create episodes table
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  video_url TEXT,
  package_id UUID REFERENCES public.word_packages(id),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Movies policies
CREATE POLICY "Anyone can read movies" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Admins can insert movies" ON public.movies FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update movies" ON public.movies FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete movies" ON public.movies FOR DELETE USING (is_admin(auth.uid()));

-- Seasons policies
CREATE POLICY "Anyone can read seasons" ON public.seasons FOR SELECT USING (true);
CREATE POLICY "Admins can insert seasons" ON public.seasons FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update seasons" ON public.seasons FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete seasons" ON public.seasons FOR DELETE USING (is_admin(auth.uid()));

-- Episodes policies
CREATE POLICY "Anyone can read episodes" ON public.episodes FOR SELECT USING (true);
CREATE POLICY "Admins can insert episodes" ON public.episodes FOR INSERT WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update episodes" ON public.episodes FOR UPDATE USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete episodes" ON public.episodes FOR DELETE USING (is_admin(auth.uid()));

-- Create storage bucket for movie covers
INSERT INTO storage.buckets (id, name, public) VALUES ('movie-covers', 'movie-covers', true);

-- Storage policies for movie covers
CREATE POLICY "Anyone can view movie covers" ON storage.objects FOR SELECT USING (bucket_id = 'movie-covers');
CREATE POLICY "Admins can upload movie covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'movie-covers' AND is_admin(auth.uid()));
CREATE POLICY "Admins can update movie covers" ON storage.objects FOR UPDATE USING (bucket_id = 'movie-covers' AND is_admin(auth.uid()));
CREATE POLICY "Admins can delete movie covers" ON storage.objects FOR DELETE USING (bucket_id = 'movie-covers' AND is_admin(auth.uid()));
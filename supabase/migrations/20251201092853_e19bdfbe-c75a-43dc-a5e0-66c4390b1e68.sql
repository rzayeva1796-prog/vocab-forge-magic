-- Create words table for vocabulary database
CREATE TABLE IF NOT EXISTS public.words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  english TEXT NOT NULL,
  turkish TEXT NOT NULL,
  frequency_group TEXT NOT NULL, -- '1k', '2k', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(english, turkish)
);

-- Create learned_words table
CREATE TABLE IF NOT EXISTS public.learned_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  english TEXT NOT NULL,
  turkish TEXT NOT NULL,
  frequency_group TEXT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(english, turkish)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_words_english ON public.words(english);
CREATE INDEX IF NOT EXISTS idx_words_turkish ON public.words(turkish);
CREATE INDEX IF NOT EXISTS idx_words_frequency ON public.words(frequency_group);
CREATE INDEX IF NOT EXISTS idx_learned_english ON public.learned_words(english);
CREATE INDEX IF NOT EXISTS idx_learned_turkish ON public.learned_words(turkish);

-- Enable Row Level Security
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_words ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to words (public dictionary)
CREATE POLICY "Anyone can read words"
ON public.words FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert words"
ON public.words FOR INSERT
WITH CHECK (true);

-- Create policies for learned_words (public access for simplicity)
CREATE POLICY "Anyone can read learned words"
ON public.learned_words FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert learned words"
ON public.learned_words FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete learned words"
ON public.learned_words FOR DELETE
USING (true);
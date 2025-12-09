-- Add audio_url column to learned_words table for caching TTS audio
ALTER TABLE public.learned_words ADD COLUMN IF NOT EXISTS audio_url TEXT;
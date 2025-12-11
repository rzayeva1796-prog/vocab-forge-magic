-- Add image_url column to learned_words table
ALTER TABLE public.learned_words
ADD COLUMN image_url text;
-- Add background_url column to subsections table
ALTER TABLE public.subsections ADD COLUMN IF NOT EXISTS background_url TEXT;
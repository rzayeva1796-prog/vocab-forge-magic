-- Add sentence game settings columns to subsections table
ALTER TABLE public.subsections 
ADD COLUMN IF NOT EXISTS sentence_package TEXT,
ADD COLUMN IF NOT EXISTS sentence_round INTEGER;
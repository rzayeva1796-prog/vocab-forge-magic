-- Add name column to subsections table for custom subsection naming
ALTER TABLE public.subsections 
ADD COLUMN name text;
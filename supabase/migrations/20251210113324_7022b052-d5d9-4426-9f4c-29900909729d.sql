-- Add content_background_url column to sections for separate header and content backgrounds
ALTER TABLE public.sections ADD COLUMN IF NOT EXISTS content_background_url text;
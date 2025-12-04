-- Add package_name column to learned_words
ALTER TABLE public.learned_words 
ADD COLUMN package_name text;

-- Update existing words with their package names
UPDATE public.learned_words lw
SET package_name = wp.name
FROM public.word_packages wp
WHERE lw.package_id = wp.id;
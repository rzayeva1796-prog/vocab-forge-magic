-- Add order column to word_packages for tracking package sequence
ALTER TABLE public.word_packages ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Update existing packages with order based on created_at
WITH ordered_packages AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as new_order
  FROM public.word_packages
)
UPDATE public.word_packages 
SET display_order = ordered_packages.new_order
FROM ordered_packages
WHERE public.word_packages.id = ordered_packages.id;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_word_packages_display_order ON public.word_packages(display_order);
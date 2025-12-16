-- Add selected_game column to subsections table
ALTER TABLE public.subsections 
ADD COLUMN selected_game text DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.subsections.selected_game IS 'The game URL that should be played for this subsection (admin-selected)';
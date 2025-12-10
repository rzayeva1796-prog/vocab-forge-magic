-- Add background_url column to sections table for section background images
ALTER TABLE public.sections ADD COLUMN background_url TEXT;

-- Add unique constraint to user_subsection_activations if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_subsection_activations_user_id_subsection_id_key'
  ) THEN
    ALTER TABLE public.user_subsection_activations 
    ADD CONSTRAINT user_subsection_activations_user_id_subsection_id_key 
    UNIQUE (user_id, subsection_id);
  END IF;
END $$;
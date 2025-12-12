-- Add additional_package_ids column to subsections table for multiple package selection
ALTER TABLE public.subsections 
ADD COLUMN additional_package_ids uuid[] DEFAULT '{}';

-- Add comment explaining the column
COMMENT ON COLUMN public.subsections.additional_package_ids IS 'Array of additional package IDs that can be assigned to this subsection alongside the primary package_id';
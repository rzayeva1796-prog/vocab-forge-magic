-- Add selected_sub_package_id column to subsections table for persisting sub-package selection
ALTER TABLE public.subsections 
ADD COLUMN selected_sub_package_id uuid REFERENCES public.sub_packages(id) ON DELETE SET NULL;
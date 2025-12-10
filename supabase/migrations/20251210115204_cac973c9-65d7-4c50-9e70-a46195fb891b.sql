-- Drop existing restrictive update policy and create permissive one
DROP POLICY IF EXISTS "Admins can update subsections" ON public.subsections;

CREATE POLICY "Admins can update subsections" 
ON public.subsections 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
-- Create sections table for grouping packages
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Yeni Bölüm',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read sections
CREATE POLICY "Anyone can read sections" 
ON public.sections 
FOR SELECT 
USING (true);

-- Only admins can insert sections
CREATE POLICY "Admins can insert sections" 
ON public.sections 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update sections
CREATE POLICY "Admins can update sections" 
ON public.sections 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Only admins can delete sections
CREATE POLICY "Admins can delete sections" 
ON public.sections 
FOR DELETE 
USING (is_admin(auth.uid()));

-- Create subsections table (visual representation linking to packages)
CREATE TABLE public.subsections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.word_packages(id) ON DELETE SET NULL,
  icon_url TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;

-- Anyone can read subsections
CREATE POLICY "Anyone can read subsections" 
ON public.subsections 
FOR SELECT 
USING (true);

-- Only admins can insert subsections
CREATE POLICY "Admins can insert subsections" 
ON public.subsections 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

-- Only admins can update subsections
CREATE POLICY "Admins can update subsections" 
ON public.subsections 
FOR UPDATE 
USING (is_admin(auth.uid()));

-- Only admins can delete subsections
CREATE POLICY "Admins can delete subsections" 
ON public.subsections 
FOR DELETE 
USING (is_admin(auth.uid()));
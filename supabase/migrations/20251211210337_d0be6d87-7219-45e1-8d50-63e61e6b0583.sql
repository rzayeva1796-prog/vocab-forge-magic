-- Create sub_packages table
CREATE TABLE public.sub_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.word_packages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add sub_package_id to learned_words
ALTER TABLE public.learned_words
ADD COLUMN sub_package_id UUID REFERENCES public.sub_packages(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.sub_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for sub_packages
CREATE POLICY "Anyone can read sub_packages" 
ON public.sub_packages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert sub_packages" 
ON public.sub_packages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update sub_packages" 
ON public.sub_packages 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete sub_packages" 
ON public.sub_packages 
FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_sub_packages_package_id ON public.sub_packages(package_id);
CREATE INDEX idx_learned_words_sub_package_id ON public.learned_words(sub_package_id);
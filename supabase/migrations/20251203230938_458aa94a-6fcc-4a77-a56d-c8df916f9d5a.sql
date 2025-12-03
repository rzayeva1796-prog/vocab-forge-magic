-- Create word_packages table
CREATE TABLE public.word_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.word_packages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read word packages" 
ON public.word_packages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert word packages" 
ON public.word_packages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can delete word packages" 
ON public.word_packages 
FOR DELETE 
USING (true);

-- Add package_id to learned_words table
ALTER TABLE public.learned_words 
ADD COLUMN package_id UUID REFERENCES public.word_packages(id) ON DELETE SET NULL;
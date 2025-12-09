-- Create user_subsection_activations table to track if user has viewed and activated a subsection
CREATE TABLE public.user_subsection_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subsection_id UUID NOT NULL REFERENCES public.subsections(id) ON DELETE CASCADE,
  activated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subsection_id)
);

-- Enable RLS
ALTER TABLE public.user_subsection_activations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read user subsection activations" 
ON public.user_subsection_activations 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert user subsection activations with user_id" 
ON public.user_subsection_activations 
FOR INSERT 
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Anyone can delete user subsection activations" 
ON public.user_subsection_activations 
FOR DELETE 
USING (true);
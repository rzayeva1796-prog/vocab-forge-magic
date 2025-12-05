
-- Create user_word_progress table for per-user star ratings
CREATE TABLE public.user_word_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  word_id UUID NOT NULL REFERENCES public.learned_words(id) ON DELETE CASCADE,
  star_rating INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, word_id)
);

-- Enable RLS
ALTER TABLE public.user_word_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for external projects (using user_id from URL)
CREATE POLICY "Anyone can read user word progress" 
ON public.user_word_progress FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert user word progress with user_id" 
ON public.user_word_progress FOR INSERT 
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Anyone can update user word progress" 
ON public.user_word_progress FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete user word progress" 
ON public.user_word_progress FOR DELETE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_user_word_progress_user_id ON public.user_word_progress(user_id);
CREATE INDEX idx_user_word_progress_word_id ON public.user_word_progress(word_id);

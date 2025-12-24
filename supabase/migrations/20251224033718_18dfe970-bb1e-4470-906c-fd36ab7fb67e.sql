CREATE TABLE public.word_search_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_level INTEGER DEFAULT 1,
  used_word_index INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.word_search_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.word_search_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON public.word_search_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON public.word_search_progress
  FOR UPDATE USING (auth.uid() = user_id);
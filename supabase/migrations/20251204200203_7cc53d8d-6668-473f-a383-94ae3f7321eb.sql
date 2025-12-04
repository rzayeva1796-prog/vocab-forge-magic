-- Add user_id column to game_progress table
ALTER TABLE public.game_progress 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to flashcard_progress table
ALTER TABLE public.flashcard_progress 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update RLS policies for game_progress to be user-specific
DROP POLICY IF EXISTS "Anyone can insert game progress" ON public.game_progress;
DROP POLICY IF EXISTS "Anyone can read game progress" ON public.game_progress;
DROP POLICY IF EXISTS "Anyone can update game progress" ON public.game_progress;

CREATE POLICY "Users can insert their own game progress" 
ON public.game_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own game progress" 
ON public.game_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own game progress" 
ON public.game_progress 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Update RLS policies for flashcard_progress to be user-specific
DROP POLICY IF EXISTS "Anyone can insert flashcard progress" ON public.flashcard_progress;
DROP POLICY IF EXISTS "Anyone can read flashcard progress" ON public.flashcard_progress;
DROP POLICY IF EXISTS "Anyone can update flashcard progress" ON public.flashcard_progress;

CREATE POLICY "Users can insert their own flashcard progress" 
ON public.flashcard_progress 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own flashcard progress" 
ON public.flashcard_progress 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own flashcard progress" 
ON public.flashcard_progress 
FOR UPDATE 
USING (auth.uid() = user_id);
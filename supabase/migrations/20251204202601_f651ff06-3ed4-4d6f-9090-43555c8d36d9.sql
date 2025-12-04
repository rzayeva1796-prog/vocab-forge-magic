-- Drop existing policies for game_progress
DROP POLICY IF EXISTS "Users can insert their own game progress" ON game_progress;
DROP POLICY IF EXISTS "Users can read their own game progress" ON game_progress;
DROP POLICY IF EXISTS "Users can update their own game progress" ON game_progress;

-- Create new policies that allow access by user_id (for external projects)
CREATE POLICY "Anyone can read game progress by user_id" 
ON game_progress FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert game progress with user_id" 
ON game_progress FOR INSERT 
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Anyone can update game progress by user_id" 
ON game_progress FOR UPDATE 
USING (true);

-- Drop existing policies for flashcard_progress
DROP POLICY IF EXISTS "Users can insert their own flashcard progress" ON flashcard_progress;
DROP POLICY IF EXISTS "Users can read their own flashcard progress" ON flashcard_progress;
DROP POLICY IF EXISTS "Users can update their own flashcard progress" ON flashcard_progress;

-- Create new policies for flashcard_progress
CREATE POLICY "Anyone can read flashcard progress by user_id" 
ON flashcard_progress FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert flashcard progress with user_id" 
ON flashcard_progress FOR INSERT 
WITH CHECK (user_id IS NOT NULL);

CREATE POLICY "Anyone can update flashcard progress by user_id" 
ON flashcard_progress FOR UPDATE 
USING (true);
-- Add star rating to learned words
ALTER TABLE learned_words ADD COLUMN IF NOT EXISTS star_rating INTEGER DEFAULT 0;
ALTER TABLE learned_words ADD COLUMN IF NOT EXISTS is_flipped BOOLEAN DEFAULT false;

-- Create flashcard progress table
CREATE TABLE IF NOT EXISTS flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_round_words JSONB DEFAULT '[]'::jsonb,
  current_position INTEGER DEFAULT 0,
  last_word_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can read flashcard progress" ON flashcard_progress FOR SELECT USING (true);
CREATE POLICY "Anyone can insert flashcard progress" ON flashcard_progress FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update flashcard progress" ON flashcard_progress FOR UPDATE USING (true);

-- Add index for learned words star rating
CREATE INDEX IF NOT EXISTS idx_learned_words_star_rating ON learned_words(star_rating);

-- Update learned_words policies to allow updates
DROP POLICY IF EXISTS "Anyone can update learned words" ON learned_words;
CREATE POLICY "Anyone can update learned words" ON learned_words FOR UPDATE USING (true);
export interface Word {
  id: string;
  english: string;
  turkish: string;
  level: string;
  package_name?: string;
}

export interface WordWithStar extends Word {
  star_rating: number;
}

export interface Package {
  name: string;
  words: Word[];
}

export interface UserWordProgress {
  word_id: string;
  star_rating: number;
}

export type ButtonState = 'default' | 'selected' | 'correct' | 'wrong';

export interface GameState {
  leftWords: WordWithStar[];
  rightWords: WordWithStar[];
  selectedLeft: number | null;
  selectedRight: number | null;
  leftStates: ButtonState[];
  rightStates: ButtonState[];
}

export interface GameProgress {
  user_id: string;
  selected_package: string;
  round: number;
  pool_index: number;
  word_pool: WordWithStar[];
  total_score: number;
  game_score: number;
  combo: number;
  match_count: number;
  total_match_count: number;
  left_words: WordWithStar[];
  right_words: WordWithStar[];
  updated_at: string;
}

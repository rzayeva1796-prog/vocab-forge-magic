export interface Word {
  id: string;
  package_id: string;
  english: string;
  turkish: string;
  image_url: string | null;
  word_index: number;
}

export interface WordPackage {
  id: string;
  name: string;
  created_at: string;
}

export interface GameContent {
  id: string;
  word_id: string;
  content_type: 'sentence' | 'question';
  content: string;
  options: { text: string; isCorrect: boolean }[] | null;
}

export interface UserProgress {
  id: string;
  package_id: string;
  round_index: number;
  completed_at: string | null;
}

export type GameStage = 'image-match' | 'sentence-fill' | 'question-answer' | 'audio-match';

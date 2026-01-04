export interface Word {
  id: string;
  english: string;
  turkish: string;
  stars: number;
  word_id?: number;
}

export interface LearnedWord {
  id: number;
  word: string;
  meaning: string;
  package_name: string;
}

export interface UserWordProgress {
  word_id: number;
  star_rating: number;
}

export interface WordPackage {
  id: string;
  name: string;
  words: Word[];
}

export type FileType = 'pdf' | 'word' | 'manual';

export interface Book {
  id: string;
  title: string;
  coverUrl: string;
  fileUrl?: string;
  fileType: FileType;
  category?: string;
  displayOrder?: number;
  createdAt: Date;
  updatedAt?: Date;
}

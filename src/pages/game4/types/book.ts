export type FileType = 'pdf' | 'docx' | 'epub' | 'txt';

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

export interface Word {
  id: string;
  english: string;
  turkish: string;
  stars?: number;
  package_id?: string;
  package_name?: string;
  audio_url?: string;
  image_url?: string;
  star_rating?: number;
}

export interface PackageInfo {
  id: string;
  name: string;
}

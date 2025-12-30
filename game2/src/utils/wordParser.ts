export interface Word {
  id: string;
  english: string;
  turkish: string;
  level: string;
}

export const parseCSV = (csvContent: string): Word[] => {
  try {
    const lines = csvContent.split('\n');
    
    // Skip header row
    const words: Word[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(';');
      if (parts.length >= 4) {
        words.push({
          id: parts[0],
          english: parts[1],
          turkish: parts[2],
          level: parts[3],
        });
      }
    }
    
    return words;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
};

export const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

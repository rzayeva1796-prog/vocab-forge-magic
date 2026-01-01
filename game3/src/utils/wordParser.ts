export interface Word {
  id: string;
  english: string;
  turkish: string;
  level: string;
}

export function parseCSV(csvContent: string): Word[] {
  const lines = csvContent.trim().split('\n');
  const words: Word[] = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(';');
    
    if (parts.length >= 4) {
      words.push({
        id: parts[0],
        english: parts[1].toLowerCase(),
        turkish: parts[2],
        level: parts[3]
      });
    }
  }
  
  return words;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

import { Word, WordProgress, StarLevel } from "@/types/word";

const STORAGE_KEY = "flashcard-progress";

export function parseCSV(csvContent: string): Word[] {
  const lines = csvContent.trim().split("\n");
  const words: Word[] = [];

  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(";");
    if (parts.length >= 3) {
      words.push({
        id: parts[0],
        english: parts[1],
        turkish: parts[2],
        level: parts[3] || "A1",
        stars: 0, // New words start with 0 stars (New group)
        packageId: parts[4] || null,
        packageName: parts[5] || null,
      });
    }
  }

  return words;
}

export function loadProgress(): WordProgress {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return {};
    }
  }
  return {};
}

export function saveProgress(progress: WordProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getWordsWithProgress(words: Word[]): Word[] {
  const progress = loadProgress();
  return words.map((word) => ({
    ...word,
    stars: (progress[word.id] ?? 0) as StarLevel,
  }));
}

export function updateWordStars(
  wordId: string,
  stars: StarLevel
): WordProgress {
  const progress = loadProgress();
  progress[wordId] = stars;
  saveProgress(progress);
  return progress;
}

export function createLearningSession(words: Word[]): Word[] {
  const session: Word[] = [];

  words.forEach((word) => {
    const repeatCount = word.stars === 0 ? 1 : 6 - word.stars;
    for (let i = 0; i < repeatCount; i++) {
      session.push(word);
    }
  });

  // Shuffle without consecutive duplicates
  const shuffled = session.sort(() => Math.random() - 0.5);
  
  // Prevent consecutive duplicates
  for (let i = 1; i < shuffled.length; i++) {
    if (shuffled[i].id === shuffled[i - 1].id) {
      // Find a different word to swap with
      let swapIndex = i + 1;
      while (swapIndex < shuffled.length && shuffled[swapIndex].id === shuffled[i].id) {
        swapIndex++;
      }
      if (swapIndex < shuffled.length) {
        [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
      }
    }
  }
  
  return shuffled;
}

export function groupWordsByStars(words: Word[]): Record<StarLevel, Word[]> {
  const groups: Record<StarLevel, Word[]> = {
    0: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  words.forEach((word) => {
    groups[word.stars].push(word);
  });

  return groups;
}

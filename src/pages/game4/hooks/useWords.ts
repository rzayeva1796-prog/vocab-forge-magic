import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/pages/game4/lib/supabase";
import { useUser } from "@/pages/game4/contexts/UserContext";
import { Word, LearnedWord, UserWordProgress } from "@/pages/game4/types/book";

export function useWords(packageName: string | null) {
  const { userId } = useUser();
  const [words, setWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = useCallback(async () => {
    if (!packageName) {
      setWords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Get all words from learned_words for this package
      const { data: learnedWords, error: wordsError } = await supabase
        .from("learned_words")
        .select("*")
        .eq("package_name", packageName);

      if (wordsError) throw wordsError;

      if (!learnedWords || learnedWords.length === 0) {
        setWords([]);
        setIsLoading(false);
        return;
      }

      // 2. Get star ratings for this user if userId exists
      let starRatings: Record<number, number> = {};
      
      if (userId) {
        const wordIds = learnedWords.map((w: LearnedWord) => w.id);
        const { data: progressData, error: progressError } = await supabase
          .from("user_word_progress")
          .select("word_id, star_rating")
          .eq("user_id", userId)
          .in("word_id", wordIds);

        if (!progressError && progressData) {
          progressData.forEach((p: UserWordProgress) => {
            starRatings[p.word_id] = p.star_rating;
          });
        }
      }

      // 3. Combine words with star ratings
      const combinedWords: Word[] = learnedWords.map((w: LearnedWord) => ({
        id: w.id.toString(),
        word_id: w.id,
        english: w.word,
        turkish: w.meaning,
        stars: starRatings[w.id] || 1, // Default to 1 star if no progress
      }));

      setWords(combinedWords);
    } catch (err: any) {
      console.error("Error fetching words:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [packageName, userId]);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  return { words, isLoading, error, refetch: fetchWords };
}

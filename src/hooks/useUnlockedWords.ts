import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UnlockedWord {
  id: string;
  english: string;
  turkish: string;
  frequency_group: string;
  package_id: string;
  package_name: string;
  star_rating?: number; // From user_word_progress
}

interface UnlockedPackage {
  id: string;
  name: string;
  display_order: number;
}

interface UnlockedData {
  words: UnlockedWord[];
  unlockedPackages: UnlockedPackage[];
  totalUnlockedWords: number;
}

export const useUnlockedWords = (userId: string | null, initialPackageId?: string | null) => {
  const [data, setData] = useState<UnlockedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnlockedWords = useCallback(async (packageId?: string) => {
    if (!userId) {
      setLoading(false);
      setError("Kullanıcı ID'si bulunamadı");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_SUPABASE_URL;
      let url = `${baseUrl}/functions/v1/get-unlocked-words?user_id=${userId}`;

      if (packageId && packageId !== "all") {
        url += `&package_id=${packageId}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        // Fetch user's star ratings from user_word_progress
        const { data: progressData } = await supabase
          .from("user_word_progress")
          .select("word_id, star_rating")
          .eq("user_id", userId);

        // Create a map of word_id -> star_rating
        const progressMap = new Map<string, number>();
        if (progressData) {
          progressData.forEach((p) => {
            progressMap.set(p.word_id, p.star_rating);
          });
        }

        // Merge star ratings into words
        const wordsWithStars = result.words.map((word: UnlockedWord) => ({
          ...word,
          star_rating: progressMap.get(word.id) || 0,
        }));

        setData({
          ...result,
          words: wordsWithStars,
        });
        setError(null);
      } else {
        setError(result.error || "Bir hata oluştu");
      }
    } catch (err) {
      setError("Bağlantı hatası");
      console.error("Error fetching unlocked words:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch with package_id from URL
  useEffect(() => {
    if (initialPackageId && initialPackageId !== "all") {
      fetchUnlockedWords(initialPackageId);
    } else {
      fetchUnlockedWords();
    }
  }, [fetchUnlockedWords, initialPackageId]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchUnlockedWords,
    words: data?.words || [],
    packages: data?.unlockedPackages || []
  };
};

import { useState, useEffect, useRef } from "react";

export interface UnlockedWord {
  id: string;
  english: string;
  turkish: string;
  frequency_group: string;
  package_id: string;
  package_name: string;
  star_rating?: number;
}

export interface UnlockedPackage {
  id: string;
  name: string;
  display_order: number;
}

interface UnlockedData {
  words: UnlockedWord[];
  unlockedPackages: UnlockedPackage[];
  totalUnlockedWords: number;
}

const EMPTY_WORDS: UnlockedWord[] = [];
const EMPTY_PACKAGES: UnlockedPackage[] = [];

export const useUnlockedWords = (userId: string | null) => {
  const [data, setData] = useState<UnlockedData | null>(null);
  const [words, setWords] = useState<UnlockedWord[]>(EMPTY_WORDS);
  const [packages, setPackages] = useState<UnlockedPackage[]>(EMPTY_PACKAGES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchUnlockedWords = async (packageId?: string) => {
    if (!userId) {
      setLoading(false);
      setError("user_id gerekli");
      return;
    }

    setLoading(true);
    try {
      let url = `https://qwqkrsvbmabodvmfktvj.supabase.co/functions/v1/get-unlocked-words?user_id=${userId}`;
      
      if (packageId && packageId !== "all") {
        url += `&package_id=${packageId}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (response.ok) {
        setData(result);
        setWords(result.words || EMPTY_WORDS);
        setPackages(result.unlockedPackages || EMPTY_PACKAGES);
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
  };

  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchUnlockedWords();
    }
  }, [userId]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchUnlockedWords,
    words,
    packages
  };
};
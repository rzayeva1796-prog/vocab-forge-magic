import { useState, useEffect } from "react";

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

export const useUnlockedWords = (userId: string | null) => {
  const [data, setData] = useState<UnlockedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (userId) {
      fetchUnlockedWords();
    }
  }, [userId]);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchUnlockedWords,
    words: data?.words || [],
    packages: data?.unlockedPackages || []
  };
};
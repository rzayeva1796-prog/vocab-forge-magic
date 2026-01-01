import { useState, useEffect } from "react";

interface UnlockedWord {
  id: string;
  english: string;
  turkish: string;
  frequency_group: string;
  package_id: string;
  package_name: string;
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

  const fetchUnlockedWords = async (packageId?: string) => {
    // Use passed packageId, or fall back to initialPackageId
    const pkgId = packageId !== undefined ? packageId : initialPackageId;
    
    if (!userId) {
      console.log('[useUnlockedWords] No userId, skipping fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let url = `https://qwqkrsvbmabodvmfktvj.supabase.co/functions/v1/get-unlocked-words?user_id=${userId}`;
      
      if (pkgId && pkgId !== "all") {
        url += `&package_id=${pkgId}`;
      }

      console.log('[useUnlockedWords] Fetching with packageId:', pkgId, 'URL:', url);
      const response = await fetch(url);
      const result = await response.json();
      console.log('[useUnlockedWords] Response:', response.ok, result);

      if (response.ok) {
        setData(result);
        setError(null);
      } else {
        setError(result.error || "Bir hata oluştu");
      }
    } catch (err) {
      setError("Bağlantı hatası");
      console.error("[useUnlockedWords] Error fetching unlocked words:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnlockedWords();
  }, [userId]);
  
  // Re-fetch when package changes
  const fetchByPackage = async (packageId?: string) => {
    return fetchUnlockedWords(packageId);
  };

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchUnlockedWords,
    words: data?.words || [],
    packages: data?.unlockedPackages || []
  };
};

import { useState, useEffect } from "react";
import { supabase } from "@/pages/game4/lib/supabase";

interface PackageInfo {
  id: string;
  name: string;
}

export function useWordPackages() {
  const [packages, setPackages] = useState<PackageInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setIsLoading(true);
      try {
        // Get unique package names from learned_words
        const { data, error: fetchError } = await supabase
          .from("learned_words")
          .select("package_name");

        if (fetchError) throw fetchError;

        if (data) {
          // Get unique package names
          const uniquePackages = [...new Set(data.map((d: { package_name: string }) => d.package_name))];
          const packageList: PackageInfo[] = uniquePackages.map((name) => ({
            id: name,
            name: name,
          }));
          setPackages(packageList);
        }
      } catch (err: any) {
        console.error("Error fetching packages:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, []);

  return { packages, isLoading, error };
}

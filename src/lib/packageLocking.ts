import { supabase } from "@/integrations/supabase/client";

interface Package {
  id: string;
  name: string;
  display_order: number;
}

interface PackageProgress {
  packageId: string;
  totalWords: number;
  wordsWith3Stars: number;
  isComplete: boolean;
}

/**
 * Get all unlocked package IDs for a user
 * First package is always unlocked
 * Next packages unlock when ALL words in previous packages have 3+ stars
 */
export async function getUnlockedPackageIds(userId: string | null): Promise<string[]> {
  // Get all packages ordered by display_order
  const { data: packages, error: packagesError } = await supabase
    .from("word_packages")
    .select("id, name, display_order")
    .order("display_order", { ascending: true });

  if (packagesError || !packages || packages.length === 0) {
    return [];
  }

  // For each package, calculate progress
  const packageProgress: PackageProgress[] = await Promise.all(
    packages.map(async (pkg) => {
      // Get all words in this package
      const { data: words } = await supabase
        .from("learned_words")
        .select("id")
        .eq("package_id", pkg.id);

      const wordIds = (words || []).map(w => w.id);
      let wordsWith3Stars = 0;

      if (userId && wordIds.length > 0) {
        // Get user's star progress for these words
        const { data: progressData } = await supabase
          .from("user_word_progress")
          .select("star_rating")
          .eq("user_id", userId)
          .in("word_id", wordIds);

        wordsWith3Stars = (progressData || []).filter(p => p.star_rating >= 3).length;
      }

      return {
        packageId: pkg.id,
        totalWords: wordIds.length,
        wordsWith3Stars,
        isComplete: wordIds.length > 0 && wordsWith3Stars >= wordIds.length
      };
    })
  );

  // Calculate which packages are unlocked
  const unlockedIds: string[] = [];
  
  for (let i = 0; i < packageProgress.length; i++) {
    if (i === 0) {
      // First package is always unlocked
      unlockedIds.push(packageProgress[i].packageId);
    } else {
      // Check if all previous packages are complete
      let allPreviousComplete = true;
      for (let j = 0; j < i; j++) {
        if (!packageProgress[j].isComplete) {
          allPreviousComplete = false;
          break;
        }
      }
      
      if (allPreviousComplete) {
        unlockedIds.push(packageProgress[i].packageId);
      }
    }
  }

  return unlockedIds;
}

/**
 * Get all learned words from unlocked packages only
 * This is used by external games to filter available words
 */
export async function getUnlockedWords(userId: string | null): Promise<any[]> {
  const unlockedPackageIds = await getUnlockedPackageIds(userId);
  
  if (unlockedPackageIds.length === 0) {
    return [];
  }

  // Get words from unlocked packages only
  const { data: words, error } = await supabase
    .from("learned_words")
    .select("*")
    .in("package_id", unlockedPackageIds);

  if (error) {
    console.error("Error fetching unlocked words:", error);
    return [];
  }

  return words || [];
}

/**
 * Check if a specific package is unlocked
 */
export async function isPackageUnlocked(packageId: string, userId: string | null): Promise<boolean> {
  const unlockedIds = await getUnlockedPackageIds(userId);
  return unlockedIds.includes(packageId);
}

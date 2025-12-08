import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PackageCard } from "@/components/PackageCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface WordPackage {
  id: string;
  name: string;
  display_order: number;
  word_count: number;
  unlocked: boolean;
  stars_progress: { total: number; with3Stars: number };
}

const Words = () => {
  const { user } = useAuth();
  const [packages, setPackages] = useState<WordPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [user]);

  const checkIsAdmin = async (userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();
    return !!data;
  };

  const loadPackages = async () => {
    setLoading(true);
    try {
      // Check if user is admin
      let userIsAdmin = false;
      if (user) {
        userIsAdmin = await checkIsAdmin(user.id);
        setIsAdmin(userIsAdmin);
      }

      // Get all packages ordered by display_order
      const { data: packagesData, error: packagesError } = await supabase
        .from("word_packages")
        .select("id, name, display_order")
        .order("display_order", { ascending: true });

      if (packagesError) throw packagesError;

      // For each package, calculate word count and star progress
      const packagesWithProgress: WordPackage[] = await Promise.all(
        (packagesData || []).map(async (pkg, index) => {
          // Get all words in this package
          const { data: words } = await supabase
            .from("learned_words")
            .select("id")
            .eq("package_id", pkg.id);

          const wordIds = (words || []).map(w => w.id);
          
          let with3Stars = 0;
          
          if (user && wordIds.length > 0) {
            // Get user's star progress for these words
            const { data: progressData } = await supabase
              .from("user_word_progress")
              .select("star_rating")
              .eq("user_id", user.id)
              .in("word_id", wordIds);

            with3Stars = (progressData || []).filter(p => p.star_rating >= 3).length;
          }

          return {
            id: pkg.id,
            name: pkg.name,
            display_order: pkg.display_order || index + 1,
            word_count: wordIds.length,
            unlocked: userIsAdmin, // Admin users have all packages unlocked
            stars_progress: {
              total: wordIds.length,
              with3Stars: with3Stars
            }
          };
        })
      );

      // Calculate unlock status for non-admin users
      const processedPackages = packagesWithProgress.map((pkg, index) => {
        // Admin users already have unlocked: true
        if (userIsAdmin) {
          return pkg;
        }
        
        if (index === 0) {
          return { ...pkg, unlocked: true };
        }
        
        // Check if all previous packages are completed
        let allPreviousCompleted = true;
        for (let i = 0; i < index; i++) {
          const prevPkg = packagesWithProgress[i];
          if (prevPkg.stars_progress.total === 0 || 
              prevPkg.stars_progress.with3Stars < prevPkg.stars_progress.total) {
            allPreviousCompleted = false;
            break;
          }
        }
        
        return { ...pkg, unlocked: allPreviousCompleted };
      });

      setPackages(processedPackages);
    } catch (error) {
      console.error("Error loading packages:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Kelime Paketleri
        </h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>Henüz kelime paketi yok.</p>
            <p className="text-sm mt-2">Sözlük bölümünden paket ekleyebilirsiniz.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {packages.map((pkg, index) => (
              <PackageCard
                key={pkg.id}
                package={pkg}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Words;

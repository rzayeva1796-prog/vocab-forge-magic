import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PackageProgress {
  packageId: string;
  totalWords: number;
  wordsWith3Stars: number;
  isComplete: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const packageId = url.searchParams.get("package_id"); // Optional: filter by specific package

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user is admin
    let isAdmin = false;
    if (userId) {
      const { data: adminCheck } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .single();
      isAdmin = !!adminCheck;
    }

    // Get all packages ordered by display_order
    const { data: packages, error: packagesError } = await supabase
      .from("word_packages")
      .select("id, name, display_order")
      .order("display_order", { ascending: true });

    if (packagesError) {
      throw new Error(`Failed to fetch packages: ${packagesError.message}`);
    }

    if (!packages || packages.length === 0) {
      return new Response(
        JSON.stringify({ words: [], unlockedPackages: [], isAdmin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If admin, unlock all packages
    if (isAdmin) {
      const allPackageIds = packages.map((pkg: any) => pkg.id);
      
      // Build query for words
      let wordsQuery = supabase
        .from("learned_words")
        .select("id, english, turkish, frequency_group, package_id, package_name");

      if (packageId && packageId !== "all") {
        wordsQuery = wordsQuery.eq("package_id", packageId);
      } else {
        wordsQuery = wordsQuery.in("package_id", allPackageIds);
      }

      const { data: words, error: wordsError } = await wordsQuery;

      if (wordsError) {
        throw new Error(`Failed to fetch words: ${wordsError.message}`);
      }

      return new Response(
        JSON.stringify({
          words: words || [],
          unlockedPackages: packages.map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            display_order: pkg.display_order
          })),
          totalUnlockedWords: (words || []).length,
          isAdmin: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate progress for each package (non-admin flow)
    const packageProgress: PackageProgress[] = await Promise.all(
      packages.map(async (pkg) => {
        const { data: words } = await supabase
          .from("learned_words")
          .select("id")
          .eq("package_id", pkg.id);

        const wordIds = (words || []).map((w: any) => w.id);
        let wordsWith3Stars = 0;

        if (userId && wordIds.length > 0) {
          const { data: progressData } = await supabase
            .from("user_word_progress")
            .select("star_rating")
            .eq("user_id", userId)
            .in("word_id", wordIds);

          wordsWith3Stars = (progressData || []).filter((p: any) => p.star_rating >= 3).length;
        }

        return {
          packageId: pkg.id,
          totalWords: wordIds.length,
          wordsWith3Stars,
          isComplete: wordIds.length > 0 && wordsWith3Stars >= wordIds.length
        };
      })
    );

    // Calculate unlocked packages
    const unlockedPackageIds: string[] = [];
    for (let i = 0; i < packageProgress.length; i++) {
      if (i === 0) {
        unlockedPackageIds.push(packageProgress[i].packageId);
      } else {
        let allPreviousComplete = true;
        for (let j = 0; j < i; j++) {
          if (!packageProgress[j].isComplete) {
            allPreviousComplete = false;
            break;
          }
        }
        if (allPreviousComplete) {
          unlockedPackageIds.push(packageProgress[i].packageId);
        }
      }
    }

    // Build query for words
    let wordsQuery = supabase
      .from("learned_words")
      .select("id, english, turkish, frequency_group, package_id, package_name");

    if (packageId && packageId !== "all") {
      // Filter by specific package if requested
      if (!unlockedPackageIds.includes(packageId)) {
        return new Response(
          JSON.stringify({ 
            error: "Package is locked", 
            words: [], 
            unlockedPackages: unlockedPackageIds 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
      wordsQuery = wordsQuery.eq("package_id", packageId);
    } else {
      // Get all words from unlocked packages
      wordsQuery = wordsQuery.in("package_id", unlockedPackageIds);
    }

    const { data: words, error: wordsError } = await wordsQuery;

    if (wordsError) {
      throw new Error(`Failed to fetch words: ${wordsError.message}`);
    }

    // Get package info for response
    const unlockedPackages = packages
      .filter((pkg: any) => unlockedPackageIds.includes(pkg.id))
      .map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        display_order: pkg.display_order
      }));

    return new Response(
      JSON.stringify({
        words: words || [],
        unlockedPackages,
        totalUnlockedWords: (words || []).length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

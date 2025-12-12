import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");
    const packageId = url.searchParams.get("package_id"); // Optional: filter by specific package
    const additionalPackageIds = url.searchParams.get("additional_package_ids"); // Comma-separated additional package IDs

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Request params:", { userId, packageId, additionalPackageIds });

    // Build list of package IDs to fetch
    const packageIdsToFetch: string[] = [];
    
    if (packageId && packageId !== "all") {
      packageIdsToFetch.push(packageId);
    }
    
    if (additionalPackageIds) {
      const additional = additionalPackageIds.split(",").filter(id => id.trim());
      packageIdsToFetch.push(...additional);
    }

    console.log("Package IDs to fetch:", packageIdsToFetch);

    // If specific packages are requested, fetch words from those packages directly
    // No unlock check needed - the main app already handles unlock logic
    if (packageIdsToFetch.length > 0) {
      const { data: words, error: wordsError } = await supabase
        .from("learned_words")
        .select("id, english, turkish, frequency_group, package_id, package_name, sub_package_id")
        .in("package_id", packageIdsToFetch);

      if (wordsError) {
        console.error("Words fetch error:", wordsError);
        throw new Error(`Failed to fetch words: ${wordsError.message}`);
      }

      console.log(`Found ${(words || []).length} words for packages:`, packageIdsToFetch);

      // Get user's star ratings for these words if userId provided
      let wordsWithProgress = words || [];
      if (userId && words && words.length > 0) {
        const wordIds = words.map(w => w.id);
        const { data: progressData } = await supabase
          .from("user_word_progress")
          .select("word_id, star_rating")
          .eq("user_id", userId)
          .in("word_id", wordIds);

        const progressMap: Record<string, number> = {};
        (progressData || []).forEach((p: any) => {
          progressMap[p.word_id] = p.star_rating;
        });

        wordsWithProgress = words.map(word => ({
          ...word,
          star_rating: progressMap[word.id] || 0
        }));
      }

      return new Response(
        JSON.stringify({
          words: wordsWithProgress,
          totalUnlockedWords: wordsWithProgress.length,
          requestedPackages: packageIdsToFetch
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no specific package requested, return all words (for "all" mode)
    // Check if user is admin for returning all packages info
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

    // Get all packages
    const { data: packages, error: packagesError } = await supabase
      .from("word_packages")
      .select("id, name, display_order")
      .order("name", { ascending: true });

    if (packagesError) {
      throw new Error(`Failed to fetch packages: ${packagesError.message}`);
    }

    if (!packages || packages.length === 0) {
      return new Response(
        JSON.stringify({ words: [], unlockedPackages: [], isAdmin }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all words
    const { data: words, error: wordsError } = await supabase
      .from("learned_words")
      .select("id, english, turkish, frequency_group, package_id, package_name, sub_package_id");

    if (wordsError) {
      throw new Error(`Failed to fetch words: ${wordsError.message}`);
    }

    // Get user's star ratings if userId provided
    let wordsWithProgress = words || [];
    if (userId && words && words.length > 0) {
      const wordIds = words.map(w => w.id);
      const { data: progressData } = await supabase
        .from("user_word_progress")
        .select("word_id, star_rating")
        .eq("user_id", userId)
        .in("word_id", wordIds);

      const progressMap: Record<string, number> = {};
      (progressData || []).forEach((p: any) => {
        progressMap[p.word_id] = p.star_rating;
      });

      wordsWithProgress = words.map(word => ({
        ...word,
        star_rating: progressMap[word.id] || 0
      }));
    }

    return new Response(
      JSON.stringify({
        words: wordsWithProgress,
        unlockedPackages: packages.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name,
          display_order: pkg.display_order
        })),
        totalUnlockedWords: wordsWithProgress.length,
        isAdmin
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

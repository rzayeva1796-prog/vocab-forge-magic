import { supabase } from "@/integrations/supabase/client";

export interface SubPackage {
  id: string;
  package_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

// Generate sub-packages for a package (5 words each)
export const generateSubPackages = async (packageId: string, packageName: string): Promise<SubPackage[]> => {
  // First check if sub-packages already exist
  const { data: existing } = await supabase
    .from("sub_packages")
    .select("*")
    .eq("package_id", packageId)
    .order("display_order");
  
  if (existing && existing.length > 0) {
    return existing as SubPackage[];
  }

  // Get words for this package
  const { data: words } = await supabase
    .from("learned_words")
    .select("id")
    .eq("package_id", packageId)
    .order("added_at");

  if (!words || words.length === 0) return [];

  // Calculate number of sub-packages needed (5 words each)
  const wordsPerSubPackage = 5;
  const numSubPackages = Math.ceil(words.length / wordsPerSubPackage);

  // Create sub-packages
  const subPackagesToCreate = [];
  for (let i = 0; i < numSubPackages; i++) {
    subPackagesToCreate.push({
      package_id: packageId,
      name: `${packageName}.${i + 1}`,
      display_order: i,
    });
  }

  const { data: createdSubPackages, error } = await supabase
    .from("sub_packages")
    .insert(subPackagesToCreate)
    .select();

  if (error) {
    console.error("Error creating sub-packages:", error);
    return [];
  }

  // Assign words to sub-packages
  for (let i = 0; i < words.length; i++) {
    const subPackageIdx = Math.floor(i / wordsPerSubPackage);
    const subPackage = createdSubPackages[subPackageIdx];
    if (subPackage) {
      await supabase
        .from("learned_words")
        .update({ sub_package_id: subPackage.id })
        .eq("id", words[i].id);
    }
  }

  return createdSubPackages as SubPackage[];
};

// Get words filtered by sub-package (or all if null)
export const getWordsForSubPackage = async (
  packageId: string,
  subPackageId: string | null
): Promise<string[]> => {
  let query = supabase
    .from("learned_words")
    .select("id")
    .eq("package_id", packageId);

  if (subPackageId) {
    query = query.eq("sub_package_id", subPackageId);
  }

  const { data } = await query;
  return (data || []).map((w) => w.id);
};

// Fetch sub-packages for a package
export const fetchSubPackages = async (packageId: string): Promise<SubPackage[]> => {
  const { data } = await supabase
    .from("sub_packages")
    .select("*")
    .eq("package_id", packageId)
    .order("display_order");

  return (data || []) as SubPackage[];
};

// Parse hierarchical package name like "1.2.3" into parts
export const parsePackageName = (name: string): number[] => {
  return name.split(".").map((p) => parseInt(p) || 0);
};

// Get main package number (e.g., "1.1.2" -> 1)
export const getMainPackageNumber = (name: string): number => {
  const parts = parsePackageName(name);
  return parts[0] || 0;
};

// Get sub-package number (e.g., "1.1.2" -> 1)
export const getSubPackageNumber = (name: string): number => {
  const parts = parsePackageName(name);
  return parts[1] || 0;
};

// Group packages by main number (1, 2, 3...)
export const groupPackagesByMainNumber = (
  packages: { id: string; name: string; word_count: number }[]
): Map<number, { id: string; name: string; word_count: number }[]> => {
  const groups = new Map<number, { id: string; name: string; word_count: number }[]>();

  packages.forEach((pkg) => {
    const mainNum = getMainPackageNumber(pkg.name);
    if (!groups.has(mainNum)) {
      groups.set(mainNum, []);
    }
    groups.get(mainNum)!.push(pkg);
  });

  // Sort packages within each group
  groups.forEach((pkgs) => {
    pkgs.sort((a, b) => {
      const aParts = parsePackageName(a.name);
      const bParts = parsePackageName(b.name);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        if ((aParts[i] || 0) !== (bParts[i] || 0)) {
          return (aParts[i] || 0) - (bParts[i] || 0);
        }
      }
      return 0;
    });
  });

  return groups;
};

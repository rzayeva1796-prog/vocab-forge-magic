import { useState, useEffect } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SectionCard } from "@/components/SectionCard";
import { SubsectionCard } from "@/components/SubsectionCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Section {
  id: string;
  name: string;
  display_order: number;
  min_star_rating?: number;
}

interface Subsection {
  id: string;
  section_id: string;
  package_id: string | null;
  icon_url: string | null;
  display_order: number;
  package_name?: string;
  word_count?: number;
  unlocked?: boolean;
  min_star_rating?: number;
}

interface WordPackage {
  id: string;
  name: string;
}

const Words = () => {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [subsections, setSubsections] = useState<Subsection[]>([]);
  const [packages, setPackages] = useState<WordPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    setLoading(true);
    try {
      // Check if user is admin
      let userIsAdmin = false;
      if (user) {
        userIsAdmin = await checkIsAdmin(user.id);
        setIsAdmin(userIsAdmin);
      }

      // Load all data in parallel for better performance
      const [sectionsResult, packagesResult, subsectionsResult, allWordsResult, userProgressResult] = await Promise.all([
        supabase.from("sections").select("*").order("display_order", { ascending: true }),
        supabase.from("word_packages").select("id, name").order("display_order", { ascending: true }),
        supabase.from("subsections").select("*").order("display_order", { ascending: true }),
        supabase.from("learned_words").select("id, package_id"),
        user ? supabase.from("user_word_progress").select("word_id, star_rating").eq("user_id", user.id) : Promise.resolve({ data: [] })
      ]);

      if (sectionsResult.error) throw sectionsResult.error;
      if (packagesResult.error) throw packagesResult.error;
      if (subsectionsResult.error) throw subsectionsResult.error;

      const sectionsData = sectionsResult.data;
      const packagesData = packagesResult.data || [];
      const subsectionsData = subsectionsResult.data || [];
      const allWords = allWordsResult.data || [];
      const userProgress = userProgressResult.data || [];

      // Auto-expand first section
      if (sectionsData && sectionsData.length > 0) {
        setExpandedSections(new Set([sectionsData[0].id]));
      }

      setPackages(packagesData);

      // Create lookup maps for fast access
      const wordsByPackage: Record<string, string[]> = {};
      allWords.forEach(w => {
        if (w.package_id) {
          if (!wordsByPackage[w.package_id]) wordsByPackage[w.package_id] = [];
          wordsByPackage[w.package_id].push(w.id);
        }
      });

      const progressByWordId: Record<string, number> = {};
      userProgress.forEach(p => {
        progressByWordId[p.word_id] = p.star_rating;
      });

      // Enrich subsections without additional DB calls
      const enrichedSubsections = subsectionsData.map(sub => {
        if (!sub.package_id) {
          return { ...sub, package_name: undefined, word_count: 0, unlocked: true, min_star_rating: 0 };
        }

        const pkg = packagesData.find(p => p.id === sub.package_id);
        const wordIds = wordsByPackage[sub.package_id] || [];
        let minStarRating = 0;

        if (user && wordIds.length > 0) {
          const ratings = wordIds.map(wid => progressByWordId[wid] ?? 0);
          minStarRating = Math.min(...ratings);
        }

        return {
          ...sub,
          package_name: pkg?.name,
          word_count: wordIds.length,
          unlocked: true,
          min_star_rating: minStarRating,
        };
      });

      // Calculate unlock status for subsections
      // First subsection is always unlocked, others unlock when previous has >= 3 stars
      const subsectionsBySectionId: { [key: string]: typeof enrichedSubsections } = {};
      enrichedSubsections.forEach(sub => {
        if (!subsectionsBySectionId[sub.section_id]) {
          subsectionsBySectionId[sub.section_id] = [];
        }
        subsectionsBySectionId[sub.section_id].push(sub);
      });

      // Sort by display_order within each section and calculate unlock
      // Admin users always have all subsections unlocked
      Object.keys(subsectionsBySectionId).forEach(sectionId => {
        const subs = subsectionsBySectionId[sectionId].sort((a, b) => a.display_order - b.display_order);
        subs.forEach((sub, idx) => {
          if (userIsAdmin) {
            sub.unlocked = true; // Admin always has access
          } else if (idx === 0) {
            sub.unlocked = true;
          } else {
            const prevSub = subs[idx - 1];
            sub.unlocked = (prevSub.min_star_rating ?? 0) >= 3;
          }
        });
      });

      // Flatten back
      const finalSubsections = Object.values(subsectionsBySectionId).flat();
      setSubsections(finalSubsections);

      // Calculate section min star rating and lock status
      const sectionsWithStars = (sectionsData || []).map((section, sectionIdx) => {
        const sectionSubs = finalSubsections.filter(s => s.section_id === section.id);
        const minSubRating = sectionSubs.length > 0 
          ? Math.min(...sectionSubs.map(s => s.min_star_rating ?? 0))
          : 0;
        
        return {
          ...section,
          min_star_rating: minSubRating,
        };
      });

      setSections(sectionsWithStars);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Check if section is locked (previous section must have 5 stars)
  // Admin users always have all sections unlocked
  const isSectionLocked = (sectionIdx: number): boolean => {
    if (isAdmin) return false; // Admin always has access
    if (sectionIdx === 0) return false;
    const prevSection = sections[sectionIdx - 1];
    return (prevSection?.min_star_rating ?? 0) < 5;
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleUpdateSectionName = async (sectionId: string, name: string) => {
    try {
      const { error } = await supabase
        .from("sections")
        .update({ name })
        .eq("id", sectionId);

      if (error) throw error;
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, name } : s));
      toast.success("Bölüm adı güncellendi");
    } catch (error) {
      console.error("Error updating section name:", error);
      toast.error("Bölüm adı güncellenemedi");
    }
  };

  const handleAddSection = async () => {
    try {
      const { data, error } = await supabase
        .from("sections")
        .insert({ name: "Yeni Bölüm", display_order: sections.length })
        .select()
        .single();

      if (error) throw error;
      setSections(prev => [...prev, { ...data, min_star_rating: 0 }]);
      setExpandedSections(prev => new Set([...prev, data.id]));
      toast.success("Yeni bölüm eklendi");
    } catch (error) {
      console.error("Error adding section:", error);
      toast.error("Bölüm eklenemedi");
    }
  };

  const handleAddSubsection = async (sectionId: string) => {
    try {
      const sectionSubs = subsections.filter(s => s.section_id === sectionId);
      const { data, error } = await supabase
        .from("subsections")
        .insert({ 
          section_id: sectionId, 
          display_order: sectionSubs.length 
        })
        .select()
        .single();

      if (error) throw error;
      setSubsections(prev => [...prev, { ...data, unlocked: true, min_star_rating: 0 }]);
      toast.success("Yeni alt bölüm eklendi");
    } catch (error) {
      console.error("Error adding subsection:", error);
      toast.error("Alt bölüm eklenemedi");
    }
  };

  const handleDeleteSubsection = (subsectionId: string) => {
    setSubsections(prev => prev.filter(s => s.id !== subsectionId));
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
        ) : sections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p>Henüz bölüm yok.</p>
            {isAdmin && (
              <Button onClick={handleAddSection} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Bölüm Ekle
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sections.map((section, sectionIdx) => (
              <SectionCard
                key={section.id}
                section={section}
                isAdmin={isAdmin}
                isExpanded={expandedSections.has(section.id)}
                isLocked={isSectionLocked(sectionIdx)}
                onToggle={() => toggleSection(section.id)}
                onUpdateName={handleUpdateSectionName}
              >
                <div className="flex flex-col items-center gap-20 py-4">
                  {subsections
                    .filter(sub => sub.section_id === section.id)
                    .map((sub, index) => (
                      <SubsectionCard
                        key={sub.id}
                        subsection={sub}
                        index={index}
                        isAdmin={isAdmin}
                        availablePackages={packages}
                        onUpdate={loadData}
                        onDelete={handleDeleteSubsection}
                      />
                    ))}

                  {/* Add subsection button for admin */}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSubsection(section.id)}
                      className="mt-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Alt Bölüm Ekle
                    </Button>
                  )}
                </div>
              </SectionCard>
            ))}

            {/* Add section button for admin */}
            {isAdmin && (
              <Button onClick={handleAddSection} variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Bölüm Ekle
              </Button>
            )}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Words;

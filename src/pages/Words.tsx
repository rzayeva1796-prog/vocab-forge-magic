import { useState, useEffect, useCallback, useMemo } from "react";
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
  background_url?: string | null;
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
  activated?: boolean;
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
      const [sectionsResult, packagesResult, subsectionsResult, allWordsResult, userProgressResult, activationsResult] = await Promise.all([
        supabase.from("sections").select("*").order("display_order", { ascending: true }),
        supabase.from("word_packages").select("id, name").order("display_order", { ascending: true }),
        supabase.from("subsections").select("*").order("display_order", { ascending: true }),
        supabase.from("learned_words").select("id, package_id"),
        user ? supabase.from("user_word_progress").select("word_id, star_rating").eq("user_id", user.id) : Promise.resolve({ data: [] }),
        user ? supabase.from("user_subsection_activations").select("subsection_id").eq("user_id", user.id) : Promise.resolve({ data: [] })
      ]);

      if (sectionsResult.error) throw sectionsResult.error;
      if (packagesResult.error) throw packagesResult.error;
      if (subsectionsResult.error) throw subsectionsResult.error;

      const sectionsData = sectionsResult.data;
      const packagesData = packagesResult.data || [];
      const subsectionsData = subsectionsResult.data || [];
      const allWords = allWordsResult.data || [];
      const userProgress = userProgressResult.data || [];
      const activations = activationsResult.data || [];

      // Create set of activated subsection IDs
      const activatedSubsectionIds = new Set(activations.map((a: any) => a.subsection_id));

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
          return { ...sub, package_name: undefined, word_count: 0, unlocked: true, min_star_rating: 0, activated: true };
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
          activated: activatedSubsectionIds.has(sub.id),
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
      // For regular users: subsection unlocks when:
      // 1. First subsection: must be activated (viewed words + clicked Aktifleştir)
      // 2. Other subsections: previous subsection must have >= 3 stars AND this subsection must be activated
      Object.keys(subsectionsBySectionId).forEach(sectionId => {
        const subs = subsectionsBySectionId[sectionId].sort((a, b) => a.display_order - b.display_order);
        subs.forEach((sub, idx) => {
          if (userIsAdmin) {
            sub.unlocked = true; // Admin always has access
          } else if (idx === 0) {
            // First subsection: only needs activation
            sub.unlocked = sub.activated === true;
          } else {
            const prevSub = subs[idx - 1];
            const prevHasMinStars = (prevSub.min_star_rating ?? 0) >= 3;
            const isActivated = sub.activated === true;
            sub.unlocked = prevHasMinStars && isActivated;
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
          background_url: (section as any).background_url,
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

  const handleReorderSubsection = (draggedId: string, targetId: string) => {
    setSubsections(prev => {
      const newList = [...prev];
      const draggedIdx = newList.findIndex(s => s.id === draggedId);
      const targetIdx = newList.findIndex(s => s.id === targetId);
      
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      // Swap display_order values
      const draggedOrder = newList[draggedIdx].display_order;
      const targetOrder = newList[targetIdx].display_order;
      
      newList[draggedIdx] = { ...newList[draggedIdx], display_order: targetOrder };
      newList[targetIdx] = { ...newList[targetIdx], display_order: draggedOrder };
      
      return newList;
    });
  };

  return (
    <div className="min-h-screen bg-page-words-bg pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-fredoka font-bold text-center mb-6 text-page-words-accent">
          📚 Kelime Paketleri
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
                onUpdateBackground={(id, url) => {
                  setSections(prev => prev.map(s => s.id === id ? { ...s, background_url: url } : s));
                }}
              >
                <div className="flex flex-col items-center gap-20 py-4">
                  {subsections
                    .filter(sub => sub.section_id === section.id)
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((sub, index) => (
                      <SubsectionCard
                        key={sub.id}
                        subsection={sub}
                        index={index}
                        isAdmin={isAdmin}
                        availablePackages={packages}
                        onUpdate={loadData}
                        onDelete={handleDeleteSubsection}
                        onReorder={handleReorderSubsection}
                        allSubsections={subsections.filter(s => s.section_id === section.id)}
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

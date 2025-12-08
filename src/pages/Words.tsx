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
  stars_progress?: { total: number; with3Stars: number };
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

      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .order("display_order", { ascending: true });

      if (sectionsError) throw sectionsError;
      setSections(sectionsData || []);

      // Auto-expand first section
      if (sectionsData && sectionsData.length > 0) {
        setExpandedSections(new Set([sectionsData[0].id]));
      }

      // Load all packages for selection
      const { data: packagesData, error: packagesError } = await supabase
        .from("word_packages")
        .select("id, name")
        .order("display_order", { ascending: true });

      if (packagesError) throw packagesError;
      setPackages(packagesData || []);

      // Load subsections
      const { data: subsectionsData, error: subsectionsError } = await supabase
        .from("subsections")
        .select("*")
        .order("display_order", { ascending: true });

      if (subsectionsError) throw subsectionsError;

      // Enrich subsections with package info and progress
      const enrichedSubsections = await Promise.all(
        (subsectionsData || []).map(async (sub) => {
          if (!sub.package_id) {
            return { ...sub, package_name: undefined, word_count: 0, unlocked: true, stars_progress: { total: 0, with3Stars: 0 } };
          }

          // Get package info
          const pkg = packagesData?.find(p => p.id === sub.package_id);

          // Get word count
          const { data: words } = await supabase
            .from("learned_words")
            .select("id")
            .eq("package_id", sub.package_id);

          const wordIds = (words || []).map(w => w.id);
          let with3Stars = 0;

          if (user && wordIds.length > 0) {
            const { data: progressData } = await supabase
              .from("user_word_progress")
              .select("star_rating")
              .eq("user_id", user.id)
              .in("word_id", wordIds);

            with3Stars = (progressData || []).filter(p => p.star_rating >= 3).length;
          }

          // Determine unlock status (admin always unlocked)
          const unlocked = userIsAdmin || true; // For now all unlocked, can add logic later

          return {
            ...sub,
            package_name: pkg?.name,
            word_count: wordIds.length,
            unlocked,
            stars_progress: { total: wordIds.length, with3Stars },
          };
        })
      );

      setSubsections(enrichedSubsections);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
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
      setSections(prev => [...prev, data]);
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
      setSubsections(prev => [...prev, { ...data, unlocked: true, stars_progress: { total: 0, with3Stars: 0 } }]);
      toast.success("Yeni alt bölüm eklendi");
    } catch (error) {
      console.error("Error adding subsection:", error);
      toast.error("Alt bölüm eklenemedi");
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
            {sections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isAdmin={isAdmin}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                onUpdateName={handleUpdateSectionName}
              >
                <div className="flex flex-col items-center gap-6 py-4">
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

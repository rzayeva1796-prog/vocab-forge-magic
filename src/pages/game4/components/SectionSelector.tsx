import { Check, Lock, Play, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Section {
  id: string; // e.g., "1.1", "1.2", "2.10"
  rounds: string[]; // e.g., ["1.1.1", "1.1.2", ...]
}

interface SectionSelectorProps {
  sections: Section[];
  completedPackages: string[]; // Package names that are completed
  onSelectSection: (section: Section) => void;
  onBack: () => void;
}

export function SectionSelector({ sections, completedPackages, onSelectSection, onBack }: SectionSelectorProps) {
  const isSectionCompleted = (section: Section) => {
    return section.rounds.every(round => completedPackages.includes(round));
  };

  const getSectionProgress = (section: Section) => {
    const completed = section.rounds.filter(round => completedPackages.includes(round)).length;
    return { completed, total: section.rounds.length };
  };

  const isSectionUnlocked = (index: number) => {
    if (index === 0) return true;
    // Previous section must be completed
    return isSectionCompleted(sections[index - 1]);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-muted-foreground">
          ← Geri
        </button>
        <h2 className="text-xl font-bold text-foreground">Bölüm Seç</h2>
      </div>

      <p className="text-muted-foreground mb-6">
        Her bölümde 10 tur bulunuyor. Bölümleri sırayla tamamlayarak ilerleyin.
      </p>

      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4">
          {sections.map((section, index) => {
            const isCompleted = isSectionCompleted(section);
            const isUnlocked = isSectionUnlocked(index);
            const progress = getSectionProgress(section);

            return (
              <button
                key={section.id}
                onClick={() => isUnlocked && onSelectSection(section)}
                disabled={!isUnlocked}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                  isCompleted
                    ? 'border-green-500 bg-green-500/10'
                    : isUnlocked
                    ? 'border-primary bg-card hover:bg-primary/10'
                    : 'border-muted bg-muted/50 cursor-not-allowed'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isCompleted
                    ? 'bg-green-500'
                    : isUnlocked
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}>
                  {isCompleted ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : isUnlocked ? (
                    <Play className="w-6 h-6 text-primary-foreground" />
                  ) : (
                    <Lock className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <span className={`font-semibold text-lg ${
                    isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    Bölüm {section.id}
                  </span>
                  <div className="text-sm text-muted-foreground">
                    {progress.completed}/{progress.total} tur tamamlandı
                  </div>
                </div>

                {isUnlocked && (
                  <ChevronRight className={`w-5 h-5 ${isCompleted ? 'text-green-500' : 'text-primary'}`} />
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// Utility function to parse sections from package names
export function parseSectionsFromPackages(packageNames: string[]): Section[] {
  const sectionMap = new Map<string, string[]>();

  for (const name of packageNames) {
    // Expected format: "X.Y.Z" where X.Y is section, Z is round
    const parts = name.split('.');
    if (parts.length >= 3) {
      const sectionId = `${parts[0]}.${parts[1]}`;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)!.push(name);
    }
  }

  // Sort sections and rounds
  const sections: Section[] = [];
  const sortedSectionIds = Array.from(sectionMap.keys()).sort((a, b) => {
    const [a1, a2] = a.split('.').map(Number);
    const [b1, b2] = b.split('.').map(Number);
    if (a1 !== b1) return a1 - b1;
    return a2 - b2;
  });

  for (const sectionId of sortedSectionIds) {
    const rounds = sectionMap.get(sectionId)!.sort((a, b) => {
      const aRound = parseInt(a.split('.')[2] || '0');
      const bRound = parseInt(b.split('.')[2] || '0');
      return aRound - bRound;
    });
    sections.push({ id: sectionId, rounds });
  }

  return sections;
}

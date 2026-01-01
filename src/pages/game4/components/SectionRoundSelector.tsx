import { Check, Lock, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Section {
  id: string;
  rounds: string[];
}

interface SectionRoundSelectorProps {
  section: Section;
  completedPackages: string[];
  onSelectRound: (packageName: string) => void;
  onBack: () => void;
}

export function SectionRoundSelector({ section, completedPackages, onSelectRound, onBack }: SectionRoundSelectorProps) {
  const isRoundCompleted = (packageName: string) => {
    return completedPackages.includes(packageName);
  };

  const isRoundUnlocked = (index: number) => {
    if (index === 0) return true;
    // Previous round must be completed
    return isRoundCompleted(section.rounds[index - 1]);
  };

  const getRoundNumber = (packageName: string) => {
    const parts = packageName.split('.');
    return parts[2] || '1';
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-muted-foreground">
          ← Geri
        </button>
        <h2 className="text-xl font-bold text-foreground">Bölüm {section.id} - Tur Seç</h2>
      </div>

      <p className="text-muted-foreground mb-6">
        Bu bölümde {section.rounds.length} tur bulunuyor. Turları sırayla tamamlayın.
      </p>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-2 gap-3 pb-4">
          {section.rounds.map((packageName, index) => {
            const isCompleted = isRoundCompleted(packageName);
            const isUnlocked = isRoundUnlocked(index);
            const roundNumber = getRoundNumber(packageName);

            return (
              <button
                key={packageName}
                onClick={() => isUnlocked && onSelectRound(packageName)}
                disabled={!isUnlocked}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  isCompleted
                    ? 'border-green-500 bg-green-500/10'
                    : isUnlocked
                    ? 'border-primary bg-card hover:bg-primary/10'
                    : 'border-muted bg-muted/50 cursor-not-allowed'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
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
                <span className={`font-semibold ${
                  isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  Tur {roundNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  {packageName}
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

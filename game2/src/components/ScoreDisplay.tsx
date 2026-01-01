import { Zap, Target } from 'lucide-react';

interface ScoreDisplayProps {
  totalScore: number;
  gameScore: number;
  combo: number;
  matchedCount: number;
  poolSize: number;
}

export const ScoreDisplay = ({ 
  totalScore, 
  gameScore, 
  combo, 
  matchedCount, 
  poolSize 
}: ScoreDisplayProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Total Score */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Toplam Puan</p>
        <p className="text-3xl font-bold text-primary">{totalScore}</p>
      </div>
      
      {/* Game Score and Combo Row */}
      <div className="flex items-center justify-center gap-4">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Oyun Puanı</p>
          <p className="text-xl font-semibold text-foreground">{gameScore}</p>
        </div>
        
        {combo > 1 && (
          <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 rounded-full animate-pulse">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">x{combo}</span>
          </div>
        )}
      </div>
      
      {/* Word Pool Counter */}
      <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
        <Target className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          {matchedCount}/{poolSize}
        </span>
      </div>
    </div>
  );
};

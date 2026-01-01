import { X, Zap } from 'lucide-react';

type GameStage = 'image-match' | 'sentence-fill' | 'question-answer' | 'audio-match';

interface GameProgressProps {
  current: number;
  total: number;
  stage: GameStage;
  onClose: () => void;
}

export function GameProgress({ current, total, stage, onClose }: GameProgressProps) {
  const stageProgress = {
    'image-match': 25,
    'sentence-fill': 50,
    'question-answer': 75,
    'audio-match': 100
  };

  const baseProgress = stageProgress[stage] - 25;
  const stageContribution = ((current - 1) / total) * 25;
  const totalProgress = baseProgress + stageContribution;

  return (
    <div className="flex items-center gap-4 p-4">
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
      
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
          style={{ width: `${totalProgress}%` }}
        />
      </div>
      
      <div className="flex items-center gap-1 text-primary">
        <Zap className="w-5 h-5 fill-current" />
        <span className="font-bold">{25 - Math.floor(totalProgress / 4)}</span>
      </div>
    </div>
  );
}

import { Trophy, RotateCcw } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  score: number;
  onNewGame: () => void;
}

export const GameOverModal = ({ isOpen, score, onNewGame }: GameOverModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl overflow-hidden m-4 text-center">
        <div className="p-6 space-y-4">
          <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold">Oyun Bitti!</h2>
          
          <div className="space-y-1">
            <p className="text-muted-foreground">Toplam Puan</p>
            <p className="text-4xl font-bold text-primary">{score}</p>
          </div>

          <button
            onClick={onNewGame}
            className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Yeni Oyun
          </button>
        </div>
      </div>
    </div>
  );
};

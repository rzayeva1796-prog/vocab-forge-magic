import { WordWithStar } from '@/types/game';
import { X, Star } from 'lucide-react';

interface WordListModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordWithStar[];
  packageName: string;
}

export const WordListModal = ({ isOpen, onClose, words, packageName }: WordListModalProps) => {
  if (!isOpen) return null;

  // Group words by star rating
  const groupedWords: Record<number, WordWithStar[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [] };
  words.forEach(word => {
    const rating = word.star_rating || 0;
    if (!groupedWords[rating]) groupedWords[rating] = [];
    groupedWords[rating].push(word);
  });

  const renderStars = (count: number) => {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card w-full max-w-lg max-h-[80vh] rounded-2xl shadow-xl overflow-hidden m-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary">
          <h2 className="font-bold text-lg">{packageName} - Kelimeler</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-60px)] p-4 space-y-4">
          {[5, 4, 3, 2, 1, 0].map(starCount => {
            const starWords = groupedWords[starCount];
            if (starWords.length === 0) return null;

            return (
              <div key={starCount} className="space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  {starCount === 0 ? (
                    <span className="text-sm font-medium text-muted-foreground">Yeni Kelimeler</span>
                  ) : (
                    renderStars(starCount)
                  )}
                  <span className="text-xs text-muted-foreground">({starWords.length})</span>
                </div>
                <div className="space-y-1">
                  {starWords.map(word => (
                    <div
                      key={word.id}
                      className="flex justify-between items-center px-3 py-2 bg-background rounded-lg text-sm"
                    >
                      <span className="font-medium">{word.english}</span>
                      <span className="text-muted-foreground">{word.turkish}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

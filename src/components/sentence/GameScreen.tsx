import { useState } from 'react';
import { Word, GameContent } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, BookOpen, X, Check, Volume2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';

interface GameScreenProps {
  words: Word[];
  gameContent: GameContent[];
  roundIndex: number;
  packageName: string;
  vocabularyWords?: { english: string; turkish: string }[];
  onComplete: () => void;
  onBack: () => void;
}

export function GameScreen({ words, gameContent, roundIndex, packageName, vocabularyWords = [], onComplete, onBack }: GameScreenProps) {
  const [showVocabulary, setShowVocabulary] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const currentWord = words[currentIndex];
  const progress = ((currentIndex) / words.length) * 100;

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      if (currentIndex + 1 >= words.length) {
        setIsComplete(true);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 1000);
  };

  const getOptions = () => {
    if (!currentWord) return [];
    const otherWords = words.filter(w => w.id !== currentWord.id);
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [...shuffled.map(w => w.turkish), currentWord.turkish];
    return options.sort(() => Math.random() - 0.5);
  };

  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
          <Trophy className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Tebrikler!</h2>
        <p className="text-muted-foreground mb-8">
          Tur {roundIndex + 1} tamamlandı!<br />
          {words.length} kelimeyi başarıyla öğrendiniz.
        </p>
        <Button onClick={onComplete} className="w-full max-w-xs h-14 text-lg">
          Devam Et
        </Button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Kelime yükleniyor...</p>
      </div>
    );
  }

  const options = getOptions();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with progress */}
      <div className="relative p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onBack} className="text-muted-foreground">
            <X className="w-6 h-6" />
          </button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {words.length}
          </span>
          {vocabularyWords.length > 0 && (
            <Dialog open={showVocabulary} onOpenChange={setShowVocabulary}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <BookOpen className="w-4 h-4 mr-1" />
                  {vocabularyWords.length}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    Kelime Haznesi
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-2 pr-4">
                    {vocabularyWords.map((word, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <span className="font-medium text-foreground">{word.english}</span>
                        <span className="text-muted-foreground text-sm">{word.turkish}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Word display */}
        <div className="mb-8 text-center">
          {currentWord.image_url && (
            <div className="w-32 h-32 mx-auto mb-4 rounded-xl overflow-hidden bg-muted">
              <img 
                src={currentWord.image_url} 
                alt={currentWord.english}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h2 className="text-3xl font-bold text-foreground mb-2">
            {currentWord.english}
          </h2>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Volume2 className="w-4 h-4 mr-1" />
            Dinle
          </Button>
        </div>

        {/* Options */}
        <div className="w-full max-w-sm space-y-3">
          {options.map((option, index) => {
            const isCorrect = option === currentWord.turkish;
            const isSelected = selectedAnswer === option;
            
            return (
              <button
                key={index}
                onClick={() => !showResult && handleAnswer(option)}
                disabled={showResult}
                className={`w-full p-4 rounded-xl border-2 text-left font-medium transition-all ${
                  showResult
                    ? isCorrect
                      ? 'border-green-500 bg-green-500/20 text-green-700'
                      : isSelected
                      ? 'border-red-500 bg-red-500/20 text-red-700'
                      : 'border-muted bg-card text-foreground'
                    : 'border-border bg-card hover:border-primary hover:bg-primary/5 text-foreground'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && isCorrect && (
                    <Check className="w-5 h-5 text-green-500" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <X className="w-5 h-5 text-red-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

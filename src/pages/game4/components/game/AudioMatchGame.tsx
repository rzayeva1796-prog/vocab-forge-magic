import { useState, useEffect } from 'react';
import { Word } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Volume2, Check } from 'lucide-react';

interface AudioMatchGameProps {
  words: Word[];
  matchedPairs: string[];
  onMatch: (wordId: string) => void;
  onComplete: () => void;
}

export function AudioMatchGame({ words, matchedPairs, onMatch, onComplete }: AudioMatchGameProps) {
  const [selectedEnglish, setSelectedEnglish] = useState<string | null>(null);
  const [selectedTurkish, setSelectedTurkish] = useState<string | null>(null);
  const [shuffledTurkish, setShuffledTurkish] = useState<Word[]>([]);
  const [showError, setShowError] = useState(false);

  // Preload TTS voices on mount
  useEffect(() => {
    const warmUp = () => {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      speechSynthesis.speak(utterance);
    };
    warmUp();
    speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    setShuffledTurkish([...words].sort(() => Math.random() - 0.5));
  }, [words]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (selectedEnglish && selectedTurkish) {
      const englishWord = words.find(w => w.id === selectedEnglish);
      const turkishWord = words.find(w => w.id === selectedTurkish);
      
      if (englishWord && turkishWord && englishWord.id === turkishWord.id) {
        // Correct match
        onMatch(englishWord.id);
        setSelectedEnglish(null);
        setSelectedTurkish(null);
        
        if (matchedPairs.length + 1 >= words.length) {
          setTimeout(onComplete, 500);
        }
      } else {
        // Wrong match
        setShowError(true);
        setTimeout(() => {
          setSelectedEnglish(null);
          setSelectedTurkish(null);
          setShowError(false);
        }, 500);
      }
    }
  }, [selectedEnglish, selectedTurkish, words, matchedPairs, onMatch, onComplete]);

  const handleEnglishClick = (word: Word) => {
    if (matchedPairs.includes(word.id)) return;
    speak(word.english);
    setSelectedEnglish(word.id);
  };

  const handleTurkishClick = (word: Word) => {
    if (matchedPairs.includes(word.id)) return;
    setSelectedTurkish(word.id);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-foreground mb-6">Sesleri eşleştir</h2>
      <p className="text-muted-foreground mb-4">
        Solda sesi dinle, sağda Türkçe karşılığını bul
      </p>

      <div className="flex-1 flex gap-4">
        {/* English column with audio */}
        <div className="flex-1 space-y-3">
          {words.map((word) => {
            const isMatched = matchedPairs.includes(word.id);
            const isSelected = selectedEnglish === word.id;
            
            return (
              <button
                key={word.id}
                onClick={() => handleEnglishClick(word)}
                disabled={isMatched}
                className={`w-full py-4 px-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  isMatched
                    ? 'opacity-30 border-green-500 bg-green-500/10'
                    : isSelected
                    ? showError
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  {isMatched ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-primary" />
                  )}
                </div>
                <span className="sr-only">{word.english}</span>
              </button>
            );
          })}
        </div>

        {/* Turkish column */}
        <div className="flex-1 space-y-3">
          {shuffledTurkish.map((word) => {
            const isMatched = matchedPairs.includes(word.id);
            const isSelected = selectedTurkish === word.id;
            
            return (
              <button
                key={word.id}
                onClick={() => handleTurkishClick(word)}
                disabled={isMatched}
                className={`w-full py-4 px-4 rounded-xl border-2 text-center font-medium transition-all ${
                  isMatched
                    ? 'opacity-30 border-green-500 bg-green-500/10'
                    : isSelected
                    ? showError
                      ? 'border-red-500 bg-red-500/20'
                      : 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
              >
                {word.turkish}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

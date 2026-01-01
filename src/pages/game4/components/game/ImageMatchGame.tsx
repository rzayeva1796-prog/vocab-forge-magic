import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Word {
  id: string;
  english: string;
  turkish: string;
  audio_url?: string;
  image_url?: string;
}

interface ImageMatchGameProps {
  currentWord: Word;
  options: Word[];
  onCorrect: () => void;
  onWrong: () => void;
}

export function ImageMatchGame({ currentWord, options, onCorrect, onWrong }: ImageMatchGameProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [wordImages, setWordImages] = useState<Record<string, string>>({});
  const [shuffledOptions, setShuffledOptions] = useState<Word[]>([]);

  // Preload TTS voices on mount to avoid delay
  useEffect(() => {
    const warmUp = () => {
      const utterance = new SpeechSynthesisUtterance('');
      utterance.volume = 0;
      speechSynthesis.speak(utterance);
    };
    warmUp();
    speechSynthesis.getVoices();
  }, []);

  // Shuffle options only once when currentWord changes
  useEffect(() => {
    const allOptions = [currentWord, ...options];
    setShuffledOptions(allOptions.sort(() => Math.random() - 0.5));
  }, [currentWord.id]);

  const getImageUrl = (word: Word): string | null => {
    return word.image_url || wordImages[word.id] || null;
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const handleSelect = (word: Word) => {
    setSelected(word.id);
  };

  const handleCheck = () => {
    if (!selected) return;
    setShowResult(true);
    
    setTimeout(() => {
      if (selected === currentWord.id) {
        onCorrect();
      } else {
        onWrong();
      }
      setSelected(null);
      setShowResult(false);
    }, 1000);
  };

  const isCorrect = selected === currentWord.id;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-2">
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          YENİ KELİME
        </span>
      </div>
      
      <h2 className="text-xl font-bold text-foreground mb-4">Doğru görseli seç</h2>
      
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => speak(currentWord.english)}
          className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center"
        >
          <Volume2 className="w-6 h-6 text-primary-foreground" />
        </button>
        <span className="text-lg font-semibold text-primary underline decoration-dotted">
          {currentWord.english}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {shuffledOptions.map((word) => {
          const imageUrl = getImageUrl(word);
          return (
            <button
              key={word.id}
              onClick={() => handleSelect(word)}
              className={`rounded-xl p-3 flex flex-col items-center justify-center transition-all border-2 ${
                selected === word.id
                  ? showResult
                    ? word.id === currentWord.id
                      ? 'border-green-500 bg-green-500/20'
                      : 'border-red-500 bg-red-500/20'
                    : 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={word.turkish}
                  className="w-28 h-28 object-cover rounded-lg mb-2"
                />
              ) : (
                <div className="w-28 h-28 bg-muted rounded-lg flex items-center justify-center mb-2 text-5xl">
                  {getEmoji(word.english)}
                </div>
              )}
              <span className="text-sm font-medium text-foreground">{word.turkish}</span>
            </button>
          );
        })}
      </div>

      <Button
        onClick={handleCheck}
        disabled={!selected}
        className="w-full mt-4 h-14 text-lg font-semibold"
      >
        KONTROL ET
      </Button>
    </div>
  );
}

function getEmoji(word: string): string {
  const emojiMap: Record<string, string> = {
    water: '💧', coffee: '☕', tea: '🍵', milk: '🥛',
    apple: '🍎', banana: '🍌', orange: '🍊', bread: '🍞',
    book: '📚', pen: '🖊️', car: '🚗', house: '🏠',
    dog: '🐕', cat: '🐱', bird: '🐦', fish: '🐟',
    sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️',
    tree: '🌳', flower: '🌸', rain: '🌧️', snow: '❄️',
  };
  return emojiMap[word.toLowerCase()] || '📝';
}

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Snail } from 'lucide-react';

interface Word {
  id: string;
  english: string;
  turkish: string;
  audio_url?: string;
  image_url?: string;
}

interface SentenceData {
  id: string;
  english: string;
  sentence: string;
  sentence_turkish: string;
}

interface SentenceFillGameProps {
  currentWord: Word;
  packageName: string;
  currentIndex: number;
  sentenceData: SentenceData | null;
  onCorrect: () => void;
  onWrong: () => void;
}

// Avatar options for variety
const AVATARS = ['👨‍🏫', '👩‍🏫', '🧑‍💼', '👨‍💻', '👩‍🎓', '🧑‍🔬', '👨‍🍳', '👩‍⚕️'];

export function SentenceFillGame({ 
  currentWord, 
  packageName,
  currentIndex,
  sentenceData,
  onCorrect, 
  onWrong 
}: SentenceFillGameProps) {
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);

  // Determine translation direction: even index = EN→TR, odd index = TR→EN
  const isEnglishToTurkish = currentIndex % 2 === 0;

  // Get consistent avatar for this word
  const avatar = useMemo(() => {
    const hash = currentWord.english.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATARS[hash % AVATARS.length];
  }, [currentWord.english]);

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

  // Reset selection when word changes
  useEffect(() => {
    setSelectedWords([]);
    setShowResult(false);
  }, [currentWord.id]);

  // Use sentence data from Supabase if available, otherwise fallback to word pair
  const { sourceText, targetWords, shuffledTargetWords, sourceLang } = useMemo(() => {
    if (sentenceData) {
      // Use sentence from Supabase
      const srcText = isEnglishToTurkish ? sentenceData.sentence : sentenceData.sentence_turkish;
      const tgtText = isEnglishToTurkish ? sentenceData.sentence_turkish : sentenceData.sentence;
      const tgtWords = tgtText.split(' ').filter(w => w.trim().length > 0);
      const shuffled = [...tgtWords].sort(() => Math.random() - 0.5);

      return { 
        sourceText: srcText,
        targetWords: tgtWords,
        shuffledTargetWords: shuffled,
        sourceLang: isEnglishToTurkish ? 'en' : 'tr'
      };
    } else {
      // Fallback to simple word translation
      const srcText = isEnglishToTurkish ? currentWord.english : currentWord.turkish;
      const tgtWords = [isEnglishToTurkish ? currentWord.turkish : currentWord.english];
      const shuffled = [...tgtWords];

      return { 
        sourceText: srcText,
        targetWords: tgtWords,
        shuffledTargetWords: shuffled,
        sourceLang: isEnglishToTurkish ? 'en' : 'tr'
      };
    }
  }, [currentWord, isEnglishToTurkish, sentenceData]);

  const speak = (text: string, slow: boolean = false) => {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = sourceLang === 'en' ? 'en-US' : 'tr-TR';
    if (slow) {
      utterance.rate = 0.5;
    }
    speechSynthesis.speak(utterance);
  };

  const handleWordClick = (word: string, index: number) => {
    const wordKey = `${word}-${index}`;
    if (selectedWords.includes(wordKey)) {
      setSelectedWords(prev => prev.filter(w => w !== wordKey));
    } else {
      setSelectedWords(prev => [...prev, wordKey]);
    }
  };

  const handleCheck = () => {
    setShowResult(true);
    
    const selectedWordsOnly = selectedWords.map(wk => wk.split('-').slice(0, -1).join('-'));
    const isCorrect = selectedWordsOnly.join(' ') === targetWords.join(' ');
    
    setTimeout(() => {
      if (isCorrect) {
        onCorrect();
      } else {
        onWrong();
      }
      setSelectedWords([]);
      setShowResult(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {sentenceData 
          ? (isEnglishToTurkish ? 'Bu cümleyi Türkçeye çevir' : 'Bu cümleyi İngilizceye çevir')
          : (isEnglishToTurkish ? 'Bu kelimeyi Türkçeye çevir' : 'Bu kelimeyi İngilizceye çevir')
        }
      </h2>
      
      {/* Source text with speaker */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-3xl flex-shrink-0">
          {avatar}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => speak(sourceText, false)}
                className="text-primary hover:text-primary/80 transition-colors"
                title="Normal hız"
              >
                <Volume2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => speak(sourceText, true)}
                className="text-orange-500 hover:text-orange-400 transition-colors"
                title="Yavaş seslendir"
              >
                <Snail className="w-5 h-5" />
              </button>
            </div>
            <p className="text-foreground font-medium">
              {sourceText}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Answer area - selected words */}
        <div className="min-h-20 border-2 border-dashed border-border rounded-xl mb-4 p-3 flex flex-wrap gap-2">
          {selectedWords.length === 0 ? (
            <span className="text-muted-foreground text-sm">
              {isEnglishToTurkish ? 'Türkçe çeviriyi seçin...' : 'İngilizce çeviriyi seçin...'}
            </span>
          ) : (
            selectedWords.map((wordKey, i) => {
              const word = wordKey.split('-').slice(0, -1).join('-');
              return (
                <button
                  key={wordKey}
                  onClick={() => setSelectedWords(prev => prev.filter(w => w !== wordKey))}
                  className={`px-3 py-2 rounded-xl border-2 font-medium text-sm ${
                    showResult
                      ? targetWords[i] === word
                        ? 'border-green-500 bg-green-500/20'
                        : 'border-red-500 bg-red-500/20'
                      : 'border-primary bg-primary/10'
                  }`}
                >
                  {word}
                </button>
              );
            })
          )}
        </div>

        {/* Correct answer display when wrong */}
        {showResult && selectedWords.map(wk => wk.split('-').slice(0, -1).join('-')).join(' ') !== targetWords.join(' ') && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
            <span className="text-sm text-muted-foreground">Doğru cevap: </span>
            <span className="text-foreground font-medium">{targetWords.join(' ')}</span>
          </div>
        )}

        {/* Target word options */}
        <div className="flex flex-wrap gap-2 justify-center">
          {shuffledTargetWords.map((word, i) => {
            const wordKey = `${word}-${i}`;
            const isSelected = selectedWords.includes(wordKey);
            
            return (
              <button
                key={wordKey}
                onClick={() => handleWordClick(word, i)}
                disabled={isSelected}
                className={`px-4 py-2 rounded-xl border-2 font-medium transition-all ${
                  isSelected
                    ? 'opacity-30 cursor-not-allowed border-muted'
                    : 'border-border bg-card hover:border-primary'
                }`}
              >
                {word}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleCheck}
        disabled={selectedWords.length === 0}
        className="w-full mt-4 h-14 text-lg font-semibold"
      >
        KONTROL ET
      </Button>
    </div>
  );
}

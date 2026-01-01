import { useState, useEffect } from 'react';
import { Word, GameContent } from '@/types/game';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';

interface QuestionAnswerGameProps {
  currentWord: Word;
  questionContent: GameContent | null;
  onCorrect: () => void;
  onWrong: () => void;
}

export function QuestionAnswerGame({ 
  currentWord, 
  questionContent, 
  onCorrect, 
  onWrong 
}: QuestionAnswerGameProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

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

  const question = questionContent?.content || `What do you call "${currentWord.turkish}" in English?`;
  const wrongAnswer = questionContent?.options?.[0]?.text || "Goodbye!";
  
  const options = [
    { text: currentWord.english, isCorrect: true },
    { text: wrongAnswer, isCorrect: false }
  ].sort(() => Math.random() - 0.5);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  const handleSelect = (option: typeof options[0]) => {
    setSelected(option.text);
    setShowResult(true);
    
    setTimeout(() => {
      if (option.isCorrect) {
        onCorrect();
      } else {
        onWrong();
      }
      setSelected(null);
      setShowResult(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-foreground mb-6">Diyaloğu tamamla</h2>
      
      {/* Question character */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center text-3xl">
          🐻
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-3">
          <button onClick={() => speak(question)} className="text-primary">
            <Volume2 className="w-5 h-5" />
          </button>
          <span className="text-foreground font-medium underline decoration-dotted">
            {question}
          </span>
        </div>
      </div>

      {/* Answer character */}
      <div className="flex items-start gap-4 mb-8 justify-end">
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-6 py-3 min-w-32">
          {selected && (
            <span className="text-foreground font-medium">{selected}</span>
          )}
        </div>
        <div className="w-16 h-16 bg-pink-300 rounded-full flex items-center justify-center text-3xl">
          👧
        </div>
      </div>

      <div className="flex-1" />

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelect(option)}
            disabled={showResult}
            className={`w-full py-4 px-6 rounded-2xl border-2 text-lg font-medium transition-all ${
              showResult && selected === option.text
                ? option.isCorrect
                  ? 'border-green-500 bg-green-500/20'
                  : 'border-red-500 bg-red-500/20'
                : 'border-border bg-card hover:border-primary'
            }`}
          >
            {option.text}
          </button>
        ))}
      </div>
    </div>
  );
}

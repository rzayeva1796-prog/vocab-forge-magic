import { useState } from 'react';
import { Word, GameContent } from '@/pages/game4/types/game';
import { useGameLogic } from '@/pages/game4/hooks/useGameLogic';
import { GameProgress } from './GameProgress';
import { ImageMatchGame } from './ImageMatchGame';
import { SentenceFillGame } from './SentenceFillGame';
import { QuestionAnswerGame } from './QuestionAnswerGame';
import { AudioMatchGame } from './AudioMatchGame';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, BookOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  
  const {
    stage,
    currentWord,
    getOtherWords,
    getSentenceContent,
    getQuestionContent,
    handleCorrectAnswer,
    handleWrongAnswer,
    handleMatchPair,
    matchedPairs,
    isComplete,
    progress
  } = useGameLogic({ words, gameContent });

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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="relative">
        <GameProgress
          current={progress.current}
          total={progress.total}
          stage={progress.stage}
          onClose={onBack}
        />
        
        {/* Kelime Haznesi Button - Sağ üst */}
        {vocabularyWords.length > 0 && (
          <Dialog open={showVocabulary} onOpenChange={setShowVocabulary}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="absolute top-2 right-2 z-10"
              >
                <BookOpen className="w-4 h-4 mr-1" />
                Kelime Haznesi ({vocabularyWords.length})
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

      <div className="flex-1 overflow-auto">
        {stage === 'image-match' && (
          <ImageMatchGame
            currentWord={currentWord}
            options={getOtherWords()}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
          />
        )}

        {stage === 'sentence-fill' && (
          <SentenceFillGame
            currentWord={currentWord}
            packageName={packageName}
            currentIndex={progress.current}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
          />
        )}

        {stage === 'question-answer' && (
          <QuestionAnswerGame
            currentWord={currentWord}
            questionContent={getQuestionContent()}
            onCorrect={handleCorrectAnswer}
            onWrong={handleWrongAnswer}
          />
        )}

        {stage === 'audio-match' && (
          <AudioMatchGame
            words={words}
            matchedPairs={matchedPairs}
            onMatch={handleMatchPair}
            onComplete={handleCorrectAnswer}
          />
        )}
      </div>
    </div>
  );
}

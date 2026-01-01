import { useState, useCallback, useEffect } from 'react';
import { Word, GameStage, GameContent } from '@/types/game';

interface UseGameLogicProps {
  words: Word[];
  gameContent: GameContent[];
}

export function useGameLogic({ words, gameContent }: UseGameLogicProps) {
  const [stage, setStage] = useState<GameStage>('image-match');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Reset game state when words change (new round)
  useEffect(() => {
    setStage('image-match');
    setCurrentWordIndex(0);
    setWrongAnswers([]);
    setMatchedPairs([]);
    setIsComplete(false);
  }, [words]);

  const currentWord = words[currentWordIndex];
  
  const getOtherWords = useCallback(() => {
    return words.filter((_, i) => i !== currentWordIndex).slice(0, 3);
  }, [words, currentWordIndex]);

  const getSentenceContent = useCallback(() => {
    if (!currentWord) return null;
    return gameContent.find(
      gc => gc.word_id === currentWord.id && gc.content_type === 'sentence'
    );
  }, [currentWord, gameContent]);

  const getQuestionContent = useCallback(() => {
    if (!currentWord) return null;
    return gameContent.find(
      gc => gc.word_id === currentWord.id && gc.content_type === 'question'
    );
  }, [currentWord, gameContent]);

  const handleCorrectAnswer = useCallback(() => {
    // Remove from wrong answers if was there
    setWrongAnswers(prev => prev.filter(i => i !== currentWordIndex));
    
    const nextWrong = wrongAnswers.find(i => i !== currentWordIndex);
    
    if (nextWrong !== undefined) {
      setCurrentWordIndex(nextWrong);
    } else if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      // Move to next stage
      if (stage === 'image-match') {
        setStage('sentence-fill');
        setCurrentWordIndex(0);
        setWrongAnswers([]);
      } else if (stage === 'sentence-fill') {
        setStage('question-answer');
        setCurrentWordIndex(0);
        setWrongAnswers([]);
      } else if (stage === 'question-answer') {
        setStage('audio-match');
        setCurrentWordIndex(0);
        setWrongAnswers([]);
      } else {
        setIsComplete(true);
      }
    }
  }, [currentWordIndex, wrongAnswers, words.length, stage]);

  const handleWrongAnswer = useCallback(() => {
    if (!wrongAnswers.includes(currentWordIndex)) {
      setWrongAnswers(prev => [...prev, currentWordIndex]);
    }
    
    // Move to next word or wrong answer
    const nextWrong = wrongAnswers.find(i => i !== currentWordIndex && i > currentWordIndex);
    if (nextWrong !== undefined) {
      setCurrentWordIndex(nextWrong);
    } else if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    }
  }, [currentWordIndex, wrongAnswers, words.length]);

  const handleMatchPair = useCallback((wordId: string) => {
    setMatchedPairs(prev => [...prev, wordId]);
    if (matchedPairs.length + 1 >= words.length) {
      setIsComplete(true);
    }
  }, [matchedPairs.length, words.length]);

  const resetGame = useCallback(() => {
    setStage('image-match');
    setCurrentWordIndex(0);
    setWrongAnswers([]);
    setMatchedPairs([]);
    setIsComplete(false);
  }, []);

  return {
    stage,
    currentWord,
    currentWordIndex,
    getOtherWords,
    getSentenceContent,
    getQuestionContent,
    handleCorrectAnswer,
    handleWrongAnswer,
    handleMatchPair,
    matchedPairs,
    isComplete,
    resetGame,
    progress: {
      current: currentWordIndex + 1,
      total: words.length,
      stage
    }
  };
}

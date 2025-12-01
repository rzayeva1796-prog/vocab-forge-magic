import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Word {
  english: string;
  turkish: string;
}

interface GameWord extends Word {
  id: number;
}

const Game = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [leftWords, setLeftWords] = useState<GameWord[]>([]);
  const [rightWords, setRightWords] = useState<GameWord[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [wrongMatch, setWrongMatch] = useState<{ left: number; right: number } | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);

  useEffect(() => {
    loadGameData();
  }, []);

  const loadGameData = async () => {
    // Load learned words
    const { data: words } = await supabase
      .from("learned_words")
      .select("english, turkish")
      .order("added_at", { ascending: true });

    if (words && words.length > 0) {
      setLearnedWords(words);

      // Load game progress
      const { data: progress } = await supabase
        .from("game_progress")
        .select("*")
        .limit(1)
        .single();

      const position = progress?.current_position || 0;
      setCurrentPosition(position);

      // Initialize first 5 pairs
      initializeWords(words, position);
    } else {
      toast({
        title: "No Words",
        description: "Please learn some words first in the dictionary!",
        variant: "destructive",
      });
    }
  };

  const initializeWords = (words: Word[], startPosition: number) => {
    const wordsToUse: GameWord[] = [];
    const totalWords = words.length;

    for (let i = 0; i < 5; i++) {
      const index = (startPosition + i) % totalWords;
      wordsToUse.push({
        ...words[index],
        id: i,
      });
    }

    setLeftWords([...wordsToUse]);
    
    // Shuffle right words and ensure no word is in the same position
    let shuffled = [...wordsToUse].sort(() => Math.random() - 0.5);
    
    // Keep shuffling positions that match
    let hasMatchingPosition = true;
    let attempts = 0;
    while (hasMatchingPosition && attempts < 50) {
      hasMatchingPosition = false;
      for (let i = 0; i < shuffled.length; i++) {
        if (shuffled[i].id === wordsToUse[i].id) {
          hasMatchingPosition = true;
          // Swap with next position (or first if at end)
          const swapIndex = (i + 1) % shuffled.length;
          [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
        }
      }
      attempts++;
    }
    
    setRightWords(shuffled);
  };

  const handleLeftClick = (id: number) => {
    setWrongMatch(null);
    
    // If clicking the same button, deselect it
    if (selectedLeft === id) {
      setSelectedLeft(null);
      return;
    }
    
    // Clear any previous left selection
    setSelectedLeft(id);
    
    // If right is already selected, check match immediately
    if (selectedRight !== null) {
      checkMatch(id, selectedRight);
    }
  };

  const handleRightClick = (rightId: number) => {
    setWrongMatch(null);
    
    // If clicking the same button, deselect it
    if (selectedRight === rightId) {
      setSelectedRight(null);
      return;
    }
    
    // Clear any previous right selection
    setSelectedRight(rightId);
    
    // If left is already selected, check match immediately
    if (selectedLeft !== null) {
      checkMatch(selectedLeft, rightId);
    }
  };

  const checkMatch = (leftId: number, rightId: number) => {
    const leftWord = leftWords.find(w => w.id === leftId);
    const rightWord = rightWords.find(w => w.id === rightId);

    if (leftWord && rightWord && leftWord.english === rightWord.english) {
      // Correct match
      const newMatchedCount = matchedCount + 1;
      setMatchedCount(newMatchedCount);

      if (newMatchedCount >= 20) {
        // Game complete
        completeGame();
        return;
      }

      // Add new word pair
      const nextIndex = (currentPosition + 5 + (newMatchedCount - 1)) % learnedWords.length;
      const newWord: GameWord = {
        ...learnedWords[nextIndex],
        id: selectedLeft,
      };

      // Update left words
      const newLeftWords = leftWords.map(w => 
        w.id === leftId ? newWord : w
      );
      setLeftWords(newLeftWords);

      // Update right words with same new word but keep position
      const newRightWords = rightWords.map(w =>
        w.id === rightId ? newWord : w
      );
      setRightWords(newRightWords);

      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Wrong match - show red briefly
      setWrongMatch({ left: leftId, right: rightId });
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  };

  const completeGame = async () => {
    setIsGameComplete(true);
    
    // Update game progress
    const newPosition = (currentPosition + 20) % learnedWords.length;
    
    const { data: existingProgress } = await supabase
      .from("game_progress")
      .select("*")
      .limit(1)
      .single();

    if (existingProgress) {
      await supabase
        .from("game_progress")
        .update({
          current_position: newPosition,
          games_played: existingProgress.games_played + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id);
    } else {
      await supabase
        .from("game_progress")
        .insert({
          current_position: newPosition,
          games_played: 1,
        });
    }

    toast({
      title: "Game Complete!",
      description: "You matched 20 words! Great job!",
    });
  };

  const restartGame = () => {
    setMatchedCount(0);
    setSelectedLeft(null);
    setSelectedRight(null);
    setIsGameComplete(false);
    initializeWords(learnedWords, currentPosition);
  };

  if (isGameComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <Trophy className="w-24 h-24 mx-auto text-primary" />
          <h1 className="text-4xl font-bold text-primary">Congratulations!</h1>
          <p className="text-xl text-muted-foreground">You matched 20 words!</p>
          
          <div className="space-y-3">
            <Button onClick={restartGame} className="w-full" size="lg">
              Play Again
            </Button>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4 mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary">Word Matching Game</h1>
            <p className="text-sm text-muted-foreground">Matches: {matchedCount} / 20</p>
          </div>
          <div className="w-20"></div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-2 gap-8">
          {/* Left Column - English */}
          <div className="space-y-3">
            {leftWords.map((word) => (
              <Button
                key={word.id}
                onClick={() => handleLeftClick(word.id)}
                className={`w-full h-16 text-lg ${
                  selectedLeft === word.id
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : wrongMatch?.left === word.id
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : ""
                }`}
                variant={selectedLeft === word.id || wrongMatch?.left === word.id ? "default" : "outline"}
              >
                {word.english}
              </Button>
            ))}
          </div>

          {/* Right Column - Turkish */}
          <div className="space-y-3">
            {rightWords.map((word) => (
              <Button
                key={word.id}
                onClick={() => handleRightClick(word.id)}
                className={`w-full h-16 text-lg ${
                  selectedRight === word.id
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : wrongMatch?.right === word.id
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : ""
                }`}
                variant={selectedRight === word.id || wrongMatch?.right === word.id ? "default" : "outline"}
              >
                {word.turkish}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;

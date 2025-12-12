import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Word {
  id: string;
  english: string;
  turkish: string;
}

interface GameWord extends Word {
  slotId: number;
}

const Game = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [leftWords, setLeftWords] = useState<GameWord[]>([]);
  const [rightWords, setRightWords] = useState<GameWord[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [selectedRight, setSelectedRight] = useState<number | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [usedWordIds, setUsedWordIds] = useState<string[]>([]);
  const [wrongMatch, setWrongMatch] = useState<{ left: number; right: number } | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [availableWords, setAvailableWords] = useState<Word[]>([]);

  useEffect(() => {
    if (!authLoading && user) {
      loadGameData();
    }
  }, [user, authLoading]);

  const loadGameData = async () => {
    if (!user) return;

    // Load all learned words
    const { data: words } = await supabase
      .from("learned_words")
      .select("id, english, turkish")
      .order("added_at", { ascending: true });

    if (!words || words.length === 0) {
      toast({
        title: "No Words",
        description: "Please learn some words first in the dictionary!",
        variant: "destructive",
      });
      return;
    }

    setAllWords(words);

    // Load game progress for this user
    const { data: progress } = await supabase
      .from("game_progress")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    let usedIds: string[] = [];
    if (progress?.current_position) {
      try {
        const parsed = JSON.parse(progress.current_position as any);
        if (Array.isArray(parsed)) {
          usedIds = parsed;
        }
      } catch (e) {
        console.log("No valid progress found, starting fresh");
      }
    }

    setUsedWordIds(usedIds);
    initializeGame(words, usedIds);
  };

  const initializeGame = (words: Word[], usedIds: string[]) => {
    // Get available words (not yet used in current cycle)
    let available = words.filter(w => !usedIds.includes(w.id));
    
    // If less than 20 available, start new cycle
    if (available.length < 20) {
      available = [...words];
      setUsedWordIds([]);
    }

    // Shuffle and take 20 words
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const selectedWords = shuffled.slice(0, Math.min(20, shuffled.length));
    setAvailableWords(selectedWords);

    // Initialize first 5 pairs
    const firstFive = selectedWords.slice(0, 5).map((word, index) => ({
      ...word,
      slotId: index,
    }));

    setLeftWords(firstFive);

    // Shuffle right side ensuring no word is in same position
    let rightShuffled = [...firstFive];
    let attempts = 0;
    let hasMatch = true;

    while (hasMatch && attempts < 50) {
      rightShuffled.sort(() => Math.random() - 0.5);
      hasMatch = rightShuffled.some((word, idx) => word.id === firstFive[idx].id);
      attempts++;
    }

    setRightWords(rightShuffled);
  };

  const handleLeftClick = (slotId: number) => {
    setWrongMatch(null);
    if (selectedLeft === slotId) {
      setSelectedLeft(null);
      return;
    }
    setSelectedLeft(slotId);
    if (selectedRight !== null) {
      checkMatch(slotId, selectedRight);
    }
  };

  const handleRightClick = (slotId: number) => {
    setWrongMatch(null);
    if (selectedRight === slotId) {
      setSelectedRight(null);
      return;
    }
    setSelectedRight(slotId);
    if (selectedLeft !== null) {
      checkMatch(selectedLeft, slotId);
    }
  };

  const checkMatch = (leftSlot: number, rightSlot: number) => {
    const leftWord = leftWords.find(w => w.slotId === leftSlot);
    const rightWord = rightWords.find(w => w.slotId === rightSlot);

    if (leftWord && rightWord && leftWord.id === rightWord.id) {
      // Correct match
      const newMatchedCount = matchedCount + 1;
      setMatchedCount(newMatchedCount);

      if (newMatchedCount >= 20) {
        completeGame();
        return;
      }

      // Add new word from available pool
      const nextWordIndex = 5 + (newMatchedCount - 1);
      if (nextWordIndex < availableWords.length) {
        const newWord = availableWords[nextWordIndex];
        
        const newLeftWord: GameWord = { ...newWord, slotId: leftSlot };
        const newRightWord: GameWord = { ...newWord, slotId: rightSlot };

        setLeftWords(prev => prev.map(w => w.slotId === leftSlot ? newLeftWord : w));
        setRightWords(prev => prev.map(w => w.slotId === rightSlot ? newRightWord : w));
      }

      setSelectedLeft(null);
      setSelectedRight(null);
    } else {
      // Wrong match
      setWrongMatch({ left: leftSlot, right: rightSlot });
      setTimeout(() => {
        setWrongMatch(null);
        setSelectedLeft(null);
        setSelectedRight(null);
      }, 500);
    }
  };

  const completeGame = async () => {
    if (!user) return;
    setIsGameComplete(true);

    // Update used word IDs
    const newUsedIds = [...usedWordIds, ...availableWords.map(w => w.id)];
    
    // If we've used all words, reset the cycle
    const finalUsedIds = newUsedIds.length >= allWords.length ? [] : newUsedIds;

    // Save progress for this user
    const { data: existingProgress } = await supabase
      .from("game_progress")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (existingProgress) {
      await supabase
        .from("game_progress")
        .update({
          current_position: JSON.stringify(finalUsedIds) as any,
          games_played: existingProgress.games_played + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.id);
    } else {
      await supabase
        .from("game_progress")
        .insert({
          current_position: JSON.stringify(finalUsedIds) as any,
          games_played: 1,
          user_id: user.id,
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
    loadGameData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-2xl font-bold text-primary">Giriş Gerekli</h1>
          <p className="text-muted-foreground">
            Oyun ilerlemesini kaydetmek için giriş yapın
          </p>
          <Button onClick={() => navigate("/auth")} size="lg">
            <LogIn className="w-4 h-4 mr-2" />
            Giriş Yap
          </Button>
          <Button variant="ghost" onClick={() => navigate("/game")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </div>
      </div>
    );
  }

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
            <Button onClick={() => navigate("/game")} variant="outline" className="w-full" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game Selection
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
          <Button variant="ghost" onClick={() => navigate("/game")}>
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
                key={word.slotId}
                onClick={() => handleLeftClick(word.slotId)}
                className={`w-full h-16 text-lg ${
                  selectedLeft === word.slotId
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : wrongMatch?.left === word.slotId
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : ""
                }`}
                variant={selectedLeft === word.slotId || wrongMatch?.left === word.slotId ? "default" : "outline"}
              >
                {word.english}
              </Button>
            ))}
          </div>

          {/* Right Column - Turkish */}
          <div className="space-y-3">
            {rightWords.map((word) => (
              <Button
                key={word.slotId}
                onClick={() => handleRightClick(word.slotId)}
                className={`w-full h-16 text-lg ${
                  selectedRight === word.slotId
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : wrongMatch?.right === word.slotId
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : ""
                }`}
                variant={selectedRight === word.slotId || wrongMatch?.right === word.slotId ? "default" : "outline"}
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

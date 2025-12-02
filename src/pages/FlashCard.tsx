import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2, Undo2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface Word {
  id: string;
  english: string;
  turkish: string;
  star_rating: number;
  frequency_group: string;
}

interface RoundWord {
  word: Word;
  uniqueId: string;
}

const FlashCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [roundWords, setRoundWords] = useState<RoundWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showEnglish, setShowEnglish] = useState(true);
  const [undoStack, setUndoStack] = useState<Array<{ wordId: string; prevRating: number; prevIndex: number }>>([]);
  const [nextFreqToAdd, setNextFreqToAdd] = useState({ group: "1k", index: 0 });

  useEffect(() => {
    loadGame();
  }, []);

  useEffect(() => {
    if (roundWords.length > 0 && currentIndex < roundWords.length) {
      speakWord(roundWords[currentIndex].word.english);
    }
  }, [currentIndex, roundWords]);

  const loadGame = async () => {
    const { data: learnedWords } = await supabase
      .from("learned_words")
      .select("*")
      .order("added_at", { ascending: true });

    if (!learnedWords || learnedWords.length === 0) {
      toast({
        title: "No Words",
        description: "Please learn some words first!",
        variant: "destructive",
      });
      return;
    }

    setAllWords(learnedWords);

    // Load saved progress
    const { data: progress } = await supabase
      .from("flashcard_progress")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (progress?.current_round_words && Array.isArray(progress.current_round_words)) {
      const savedRound = progress.current_round_words as any[];
      const savedIndex = progress.current_position || 0;

      if (savedRound.length > 0 && savedIndex < savedRound.length) {
        setRoundWords(savedRound);
        setCurrentIndex(savedIndex);
        return;
      }
    }

    // Generate new round
    await generateNewRound(learnedWords);
  };

  const generateNewRound = async (words: Word[]) => {
    const round: RoundWord[] = [];
    const freqGroups = ["1k", "2k", "3k", "4k", "5k", "6k", "7k", "8k", "9k", "10k", 
                        "11k", "12k", "13k", "14k", "15k", "16k", "17k", "18k", "19k", "20k",
                        "21k", "22k", "23k", "24k", "25k"];

    // Group words by star rating
    const byStars: { [key: number]: Word[] } = {
      0: [], 1: [], 2: [], 3: [], 4: [], 5: []
    };
    
    words.forEach(w => {
      const rating = w.star_rating || 0;
      byStars[rating].push(w);
    });

    // Shuffle each group
    Object.values(byStars).forEach(group => group.sort(() => Math.random() - 0.5));

    // Add words with repetition: 0-star:1x, 5-star:1x, 4-star:2x, 3-star:3x, 2-star:4x, 1-star:5x
    const addWords = (wordList: Word[], count: number) => {
      wordList.forEach(word => {
        for (let i = 0; i < count; i++) {
          round.push({ word, uniqueId: `${word.id}-${Math.random()}` });
        }
      });
    };

    let wordsAdded = 0;
    const addWithBonus = (wordList: Word[], count: number) => {
      wordList.forEach(word => {
        for (let i = 0; i < count; i++) {
          round.push({ word, uniqueId: `${word.id}-${Math.random()}` });
          wordsAdded++;

          // Add bonus word every 20 cards
          if (wordsAdded % 20 === 0) {
            const bonusWord = getNextFrequencyWord(words);
            if (bonusWord) {
              round.push({ word: bonusWord, uniqueId: `${bonusWord.id}-bonus-${Math.random()}` });
            }
          }
        }
      });
    };

    addWithBonus(byStars[0], 1);
    addWithBonus(byStars[5], 1);
    addWithBonus(byStars[4], 2);
    addWithBonus(byStars[3], 3);
    addWithBonus(byStars[2], 4);
    addWithBonus(byStars[1], 5);

    if (round.length === 0) {
      toast({
        title: "No Words",
        description: "Please add more words to continue!",
        variant: "destructive",
      });
      return;
    }

    setRoundWords(round);
    setCurrentIndex(0);
    setUndoStack([]);
    await saveProgress(round, 0);
  };

  const getNextFrequencyWord = (learnedWords: Word[]): Word | null => {
    const freqGroups = ["1k", "2k", "3k", "4k", "5k", "6k", "7k", "8k", "9k", "10k", 
                        "11k", "12k", "13k", "14k", "15k", "16k", "17k", "18k", "19k", "20k",
                        "21k", "22k", "23k", "24k", "25k"];
    
    // For simplicity, just return null for now - can be enhanced later
    return null;
  };

  const saveProgress = async (round: RoundWord[], position: number) => {
    const { data: existing } = await supabase
      .from("flashcard_progress")
      .select("id")
      .limit(1)
      .maybeSingle();

    const progressData = {
      current_round_words: round as any,
      current_position: position,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from("flashcard_progress")
        .update(progressData)
        .eq("id", existing.id);
    } else {
      await supabase
        .from("flashcard_progress")
        .insert(progressData);
    }
  };

  const speakWord = (text: string) => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= roundWords.length) return;

    const currentRoundWord = roundWords[currentIndex];
    const currentWord = currentRoundWord.word;
    const prevRating = currentWord.star_rating || 0;

    // Calculate new rating
    let newRating: number;
    if (direction === "left" || isFlipped) {
      newRating = 1;
    } else if (prevRating === 0) {
      newRating = 5;
    } else {
      newRating = Math.min(prevRating + 1, 5);
    }

    // Save undo state
    setUndoStack(prev => [...prev, { 
      wordId: currentWord.id, 
      prevRating,
      prevIndex: currentIndex 
    }]);

    // Update database
    await supabase
      .from("learned_words")
      .update({ star_rating: newRating })
      .eq("id", currentWord.id);

    // Update local state
    const updatedWords = allWords.map(w => 
      w.id === currentWord.id ? { ...w, star_rating: newRating } : w
    );
    setAllWords(updatedWords);

    // Move to next card
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= roundWords.length) {
      // Round complete - reload and generate new round
      const { data: refreshedWords } = await supabase
        .from("learned_words")
        .select("*")
        .order("added_at", { ascending: true });

      if (refreshedWords && refreshedWords.length > 0) {
        setAllWords(refreshedWords);
        await generateNewRound(refreshedWords);
      }
    } else {
      setCurrentIndex(nextIndex);
      await saveProgress(roundWords, nextIndex);
    }

    setIsFlipped(false);
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    // Restore rating
    await supabase
      .from("learned_words")
      .update({ star_rating: lastAction.prevRating })
      .eq("id", lastAction.wordId);

    // Update local state
    const updatedWords = allWords.map(w => 
      w.id === lastAction.wordId ? { ...w, star_rating: lastAction.prevRating } : w
    );
    setAllWords(updatedWords);

    // Go back one card
    setCurrentIndex(lastAction.prevIndex);
    setIsFlipped(false);
    await saveProgress(roundWords, lastAction.prevIndex);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const calculateProgress = () => {
    if (allWords.length === 0) return 0;
    
    const perfectWords = allWords.filter(w => w.star_rating === 5).length;
    return Math.round((perfectWords / allWords.length) * 100);
  };

  if (roundWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  const currentRoundWord = roundWords[currentIndex];
  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between py-4 mb-4">
          <Button variant="ghost" onClick={() => navigate("/game")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnglish(!showEnglish)}
          >
            {showEnglish ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            {showEnglish ? "Hide Word" : "Show Word"}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">{progress.toFixed(1)}% Mastery</span>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {roundWords.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Flashcard */}
        <div className="mb-8">
          <div
            onClick={handleFlip}
            className="bg-card border-2 border-border rounded-2xl p-12 min-h-[300px] flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-all shadow-lg relative"
          >
            {/* Swipe hints */}
            <div className="absolute top-4 left-4 text-sm text-muted-foreground opacity-50">
              ← Bilmiyorum
            </div>
            <div className="absolute top-4 right-4 text-sm text-muted-foreground opacity-50">
              Biliyorum →
            </div>

            {/* Card content */}
            <div className="text-center">
              {!isFlipped ? (
                <div>
                  {showEnglish && (
                    <h2 className="text-5xl font-bold mb-4">
                      {currentRoundWord.word.english}
                    </h2>
                  )}
                  {!showEnglish && (
                    <div className="text-5xl font-bold mb-4 text-muted-foreground">
                      ???
                    </div>
                  )}
                  <div className="flex justify-center gap-1 mt-4">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`text-2xl ${
                          star <= (currentRoundWord.word.star_rating || 0)
                            ? "text-yellow-500"
                            : "text-gray-300"
                        }`}
                      >
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-5xl font-bold text-primary">
                    {currentRoundWord.word.turkish}
                  </h2>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audio Button */}
        <div className="flex justify-center mb-6">
          <Button
            variant="outline"
            size="lg"
            onClick={() => speakWord(currentRoundWord.word.english)}
          >
            <Volume2 className="w-5 h-5 mr-2" />
            Pronounce
          </Button>
        </div>

        {/* Swipe Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Button
            variant="destructive"
            size="lg"
            onClick={() => handleSwipe("left")}
            className="h-16 text-lg"
          >
            ← Don't Know
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => handleSwipe("right")}
            className="h-16 text-lg bg-green-600 hover:bg-green-700"
          >
            Know →
          </Button>
        </div>

        {/* Undo Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="w-4 h-4 mr-2" />
            Undo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Volume2, Undo2, Eye, EyeOff, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface Word {
  id: string;
  english: string;
  turkish: string;
  star_rating: number;
  frequency_group: string;
}

interface RoundWord extends Word {
  roundId: string;
}

interface HistoryItem {
  word: RoundWord;
  previousRating: number;
}

const FlashCard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [words, setWords] = useState<Word[]>([]);
  const [roundWords, setRoundWords] = useState<RoundWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showEnglish, setShowEnglish] = useState(true);
  const [totalWords, setTotalWords] = useState(0);
  const [wordsByStars, setWordsByStars] = useState<{ new: Word[], 1: Word[], 2: Word[], 3: Word[], 4: Word[], 5: Word[] }>({
    new: [], 1: [], 2: [], 3: [], 4: [], 5: []
  });
  const [nextFreqIndex, setNextFreqIndex] = useState({ freq: "1k", index: 0 });
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    loadGame();
  }, []);

  useEffect(() => {
    if (roundWords.length > 0 && currentIndex < roundWords.length) {
      speakWord(roundWords[currentIndex].english);
    }
  }, [currentIndex, roundWords]);

  const loadGame = async () => {
    // Load all learned words
    const { data: learnedWords } = await supabase
      .from("learned_words")
      .select("*")
      .order("added_at", { ascending: true });

    if (!learnedWords || learnedWords.length === 0) {
      toast({
        title: "No Words",
        description: "Please learn some words first in the dictionary!",
        variant: "destructive",
      });
      return;
    }

    setWords(learnedWords);
    setTotalWords(learnedWords.length);

    // Group words by star rating
    const grouped = {
      new: learnedWords.filter(w => w.star_rating === 0),
      1: learnedWords.filter(w => w.star_rating === 1),
      2: learnedWords.filter(w => w.star_rating === 2),
      3: learnedWords.filter(w => w.star_rating === 3),
      4: learnedWords.filter(w => w.star_rating === 4),
      5: learnedWords.filter(w => w.star_rating === 5),
    };
    setWordsByStars(grouped);

    // Try to load saved progress
    const { data: progress } = await supabase
      .from("flashcard_progress")
      .select("*")
      .limit(1)
      .single();

    if (progress && progress.current_round_words && Array.isArray(progress.current_round_words) && progress.current_round_words.length > 0) {
      setRoundWords(progress.current_round_words as unknown as RoundWord[]);
      setCurrentIndex(progress.current_position || 0);
    } else {
      // Generate new round
      await generateRound(learnedWords);
    }
  };

  const generateRound = async (learnedWords: Word[]) => {
    const round: RoundWord[] = [];
    const usedIds = new Set<string>();
    let lastWord: RoundWord | null = null;
    let wordsAddedSinceBonus = 0;

    // Helper to add a word without consecutive duplicates
    const addWord = (word: Word, count: number) => {
      for (let i = 0; i < count; i++) {
        let wordToAdd: RoundWord;
        do {
          wordToAdd = { ...word, roundId: `${word.id}-${Math.random()}` };
        } while (lastWord && lastWord.id === wordToAdd.id);
        
        round.push(wordToAdd);
        lastWord = wordToAdd;
        usedIds.add(word.id);
        wordsAddedSinceBonus++;

        // Add bonus 1k-25k word every 20 words
        if (wordsAddedSinceBonus >= 20) {
          getNextFrequencyWord(usedIds).then(bonusWord => {
            if (bonusWord) {
              const bonusRoundWord: RoundWord = { ...bonusWord, star_rating: 0, roundId: `${bonusWord.id}-bonus-${Math.random()}` };
              round.push(bonusRoundWord);
              lastWord = bonusRoundWord;
              wordsAddedSinceBonus = 0;
            }
          });
        }
      }
    };

    // Add words based on star rating (5-star: 1x, 4-star: 2x, etc.)
    const grouped = {
      new: learnedWords.filter(w => w.star_rating === 0),
      5: learnedWords.filter(w => w.star_rating === 5),
      4: learnedWords.filter(w => w.star_rating === 4),
      3: learnedWords.filter(w => w.star_rating === 3),
      2: learnedWords.filter(w => w.star_rating === 2),
      1: learnedWords.filter(w => w.star_rating === 1),
    };

    // Shuffle each group
    Object.values(grouped).forEach(group => {
      for (let i = group.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [group[i], group[j]] = [group[j], group[i]];
      }
    });

    // Add words with appropriate repetition
    grouped.new.forEach(w => addWord(w, 1));
    grouped[5].forEach(w => addWord(w, 1));
    grouped[4].forEach(w => addWord(w, 2));
    grouped[3].forEach(w => addWord(w, 3));
    grouped[2].forEach(w => addWord(w, 4));
    grouped[1].forEach(w => addWord(w, 5));

    setRoundWords(round);
    setCurrentIndex(0);

    // Save to database
    await saveProgress(round, 0);
  };

  const getNextFrequencyWord = async (usedIds: Set<string>): Promise<Word | null> => {
    const freqGroups = ["1k", "2k", "3k", "4k", "5k", "6k", "7k", "8k", "9k", "10k", 
                        "11k", "12k", "13k", "14k", "15k", "16k", "17k", "18k", "19k", "20k",
                        "21k", "22k", "23k", "24k", "25k"];
    
    let currentFreqIdx = freqGroups.indexOf(nextFreqIndex.freq);
    let currentWordIdx = nextFreqIndex.index;

    for (let i = 0; i < freqGroups.length; i++) {
      const freq = freqGroups[currentFreqIdx];
      
      const { data: freqWords } = await supabase
        .from("words")
        .select("*")
        .eq("frequency_group", freq)
        .order("english");

      if (freqWords && freqWords.length > 0) {
        // Find next unused word in this frequency group
        for (let j = currentWordIdx; j < freqWords.length; j++) {
          const word = freqWords[j];
          if (!usedIds.has(word.id)) {
            // Check if already in learned_words
            const { data: existing } = await supabase
              .from("learned_words")
              .select("id")
              .eq("english", word.english)
              .single();

            if (!existing) {
              // Add to learned_words
              await supabase
                .from("learned_words")
                .insert({
                  english: word.english,
                  turkish: word.turkish,
                  frequency_group: word.frequency_group,
                  star_rating: 0,
                });
            }

            // Update next index
            setNextFreqIndex({ freq, index: j + 1 });
            return { ...word, star_rating: 0 };
          }
        }
      }

      // Move to next frequency group
      currentFreqIdx = (currentFreqIdx + 1) % freqGroups.length;
      currentWordIdx = 0;
    }

    return null;
  };

  const saveProgress = async (round: RoundWord[], position: number) => {
    const { data: existing } = await supabase
      .from("flashcard_progress")
      .select("id")
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from("flashcard_progress")
        .update({
          current_round_words: round as any,
          current_position: position,
          last_word_id: round[position]?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("flashcard_progress")
        .insert({
          current_round_words: round as any,
          current_position: position,
          last_word_id: round[position]?.id,
        });
    }
  };

  const speakWord = (text: string) => {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("TTS error:", error);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= roundWords.length) return;

    const currentWord = roundWords[currentIndex];
    const previousRating = currentWord.star_rating;

    // Calculate new rating
    let newRating: number;
    if (isFlipped || direction === "left") {
      // If flipped or swiped left, set to 1 star
      newRating = 1;
    } else if (previousRating === 0) {
      // New word swiped right without flipping
      newRating = 5;
    } else {
      // Existing word swiped right
      newRating = direction === "right" ? Math.min(previousRating + 1, 5) : Math.max(previousRating - 1, 1);
    }

    // Save to history
    setHistory(prev => [...prev, { word: currentWord, previousRating }]);

    // Update database
    await supabase
      .from("learned_words")
      .update({ star_rating: newRating, is_flipped: isFlipped })
      .eq("id", currentWord.id);

    // Reload all learned words and regenerate round
    const { data: learnedWords } = await supabase
      .from("learned_words")
      .select("*")
      .order("added_at", { ascending: true });

    if (learnedWords && learnedWords.length > 0) {
      setWords(learnedWords);
      setTotalWords(learnedWords.length);

      // Group words by star rating
      const grouped = {
        new: learnedWords.filter(w => w.star_rating === 0),
        1: learnedWords.filter(w => w.star_rating === 1),
        2: learnedWords.filter(w => w.star_rating === 2),
        3: learnedWords.filter(w => w.star_rating === 3),
        4: learnedWords.filter(w => w.star_rating === 4),
        5: learnedWords.filter(w => w.star_rating === 5),
      };
      setWordsByStars(grouped);

      // Generate new round with updated star ratings
      await generateRound(learnedWords);
    }

    setIsFlipped(false);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      handleSwipe("left");
    }
    if (isRightSwipe) {
      handleSwipe("right");
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));

    // Restore previous rating
    await supabase
      .from("learned_words")
      .update({ star_rating: lastAction.previousRating })
      .eq("id", lastAction.word.id);

    // Go back one card
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setIsFlipped(false);
  };

  const handleFlip = async () => {
    if (!isFlipped) {
      // Mark as flipped and set to 1 star
      const currentWord = roundWords[currentIndex];
      await supabase
        .from("learned_words")
        .update({ star_rating: 1, is_flipped: true })
        .eq("id", currentWord.id);
    }
    setIsFlipped(!isFlipped);
  };

  const calculateProgress = () => {
    if (totalWords === 0) return 0;
    
    // Calculate next round size
    const nextRoundSize = 
      wordsByStars.new.length * 1 +
      wordsByStars[5].length * 1 +
      wordsByStars[4].length * 2 +
      wordsByStars[3].length * 3 +
      wordsByStars[2].length * 4 +
      wordsByStars[1].length * 5;

    // Perfect score is when next round size equals total words (all 5-star)
    const maxPossible = totalWords * 5; // Worst case: all 1-star
    const progress = 100 - ((nextRoundSize / maxPossible) * 100);
    return Math.max(0, Math.min(100, progress));
  };

  if (roundWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  const currentWord = roundWords[currentIndex];
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEnglish(!showEnglish)}
            >
              {showEnglish ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
              {showEnglish ? "Hide Word" : "Show Word"}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Stats
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Word Statistics</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium">New: {wordsByStars.new.length}</p>
                    <p className="text-sm font-medium">⭐: {wordsByStars[1].length}</p>
                    <p className="text-sm font-medium">⭐⭐: {wordsByStars[2].length}</p>
                    <p className="text-sm font-medium">⭐⭐⭐: {wordsByStars[3].length}</p>
                    <p className="text-sm font-medium">⭐⭐⭐⭐: {wordsByStars[4].length}</p>
                    <p className="text-sm font-medium">⭐⭐⭐⭐⭐: {wordsByStars[5].length}</p>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <Progress value={progress} className="h-3" />
          <p className="text-center text-sm mt-2">{progress.toFixed(1)}% Mastery</p>
        </div>

        {/* Progress Counter */}
        <p className="text-center text-sm text-muted-foreground mb-4">
          {currentIndex + 1} / {roundWords.length}
        </p>

        {/* Flash Card */}
        <div
          className="relative h-96 bg-card rounded-lg shadow-lg cursor-pointer mb-6 transition-transform hover:scale-105 select-none"
          onClick={handleFlip}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <p className="text-4xl font-bold text-center">
              {isFlipped ? currentWord.turkish : (showEnglish ? currentWord.english : "???")}
            </p>
          </div>
        </div>

        {/* Speaker Button */}
        <div className="flex justify-center mb-6">
          <Button
            size="lg"
            variant="outline"
            onClick={() => speakWord(currentWord.english)}
          >
            <Volume2 className="w-6 h-6" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <Button
            size="lg"
            variant="destructive"
            onClick={() => handleSwipe("left")}
            className="flex-1 h-14 text-lg font-semibold"
          >
            Don't Know
          </Button>
          <Button
            size="lg"
            onClick={() => handleSwipe("right")}
            className="flex-1 h-14 text-lg font-semibold"
          >
            Know
          </Button>
        </div>

        {/* Undo Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={history.length === 0}
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

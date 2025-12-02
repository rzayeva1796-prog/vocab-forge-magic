import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Word {
  id: string;
  english: string;
  turkish: string;
}

const Twice = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [words, setWords] = useState<Word[]>([]);
  const [currentPair, setCurrentPair] = useState<[Word, Word] | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWords();
  }, []);

  const loadWords = async () => {
    try {
      const { data, error } = await supabase
        .from("learned_words")
        .select("id, english, turkish")
        .order("added_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length < 2) {
        toast({
          title: "Not Enough Words",
          description: "Add at least 2 words to play Twice!",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setWords(data);
      selectNewPair(data);
      setLoading(false);
    } catch (error) {
      console.error("Error loading words:", error);
      toast({
        title: "Error",
        description: "Failed to load words",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const selectNewPair = (wordList: Word[]) => {
    if (wordList.length < 2) return;
    
    const shuffled = [...wordList].sort(() => Math.random() - 0.5);
    setCurrentPair([shuffled[0], shuffled[1]]);
  };

  const handleChoice = (chosenWord: Word) => {
    setScore(score + 1);
    selectNewPair(words);
    
    toast({
      title: "Choice Made!",
      description: `You selected: ${chosenWord.english} - ${chosenWord.turkish}`,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!currentPair) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="text-center space-y-4">
          <p className="text-lg text-muted-foreground">Not enough words to play</p>
          <Button onClick={() => navigate("/game")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/game")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Score: {score}</p>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
            Choose One
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Select the word you want to practice
          </p>
        </div>

        {/* Word Buttons */}
        <div className="grid gap-6 sm:grid-cols-2 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
          {/* First Word */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-xl bg-primary/20 blur-xl transition-all duration-300 group-hover:bg-primary/30 group-hover:blur-2xl" />
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleChoice(currentPair[0])}
              className="relative w-full h-32 flex-col text-lg"
            >
              <span className="text-2xl font-bold">{currentPair[0].english}</span>
              <span className="text-muted-foreground">{currentPair[0].turkish}</span>
            </Button>
          </div>

          {/* Second Word */}
          <div className="group relative">
            <div className="absolute inset-0 rounded-xl bg-secondary/20 blur-xl transition-all duration-300 group-hover:bg-secondary/30 group-hover:blur-2xl" />
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleChoice(currentPair[1])}
              className="relative w-full h-32 flex-col text-lg"
            >
              <span className="text-2xl font-bold">{currentPair[1].english}</span>
              <span className="text-muted-foreground">{currentPair[1].turkish}</span>
            </Button>
          </div>
        </div>

        {/* Info Text */}
        <p className="text-center text-sm text-muted-foreground animate-in fade-in duration-700 delay-500">
          Choose the word you want to focus on - there's no wrong answer!
        </p>
      </div>
    </div>
  );
};

export default Twice;

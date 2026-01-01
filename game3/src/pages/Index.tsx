import { useState, useEffect, useRef } from "react";
import { GameBoard } from "@/components/GameBoard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLearnedWords, shuffleArray, type LearnedWord, type GameState } from "@/hooks/useLearnedWords";
import { PackageSelector } from "@/components/PackageSelector";
import { Star, Trophy, BookOpen } from "lucide-react";

const Index = () => {
  const [gameState, setGameState] = useState<"loading" | "playing" | "gameover">("loading");
  const [gameWords, setGameWords] = useState<LearnedWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [isHardMode, setIsHardMode] = useState(false);
  const [stackedWords, setStackedWords] = useState<string[]>([]);
  const hasAddedXP = useRef(false);
  const hasAutoStarted = useRef(false);
  
  const { 
    words, 
    allWords, 
    unlockedPackages, 
    selectedPackage, 
    setSelectedPackage, 
    loading, 
    error, 
    incrementStar, 
    resetStarToOne,
    totalXP,
    savedGameState,
    addTetrisXP,
    saveGameState,
    clearGameState
  } = useLearnedWords();

  // Auto-start game when words are loaded
  useEffect(() => {
    if (!loading && words.length > 0 && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      startGame();
    }
  }, [loading, words.length, savedGameState]);

  // Save game state periodically
  useEffect(() => {
    if (gameState === "playing" && gameWords.length > 0) {
      const state: GameState = {
        gameWords,
        currentWordIndex,
        score,
        combo,
        isHardMode,
        stackedWords
      };
      saveGameState(state);
    }
  }, [currentWordIndex, score, combo, stackedWords, gameState]);

  // Add XP when game ends
  useEffect(() => {
    if (gameState === "gameover" && score > 0 && !hasAddedXP.current) {
      hasAddedXP.current = true;
      addTetrisXP(score);
      clearGameState();
    }
  }, [gameState, score]);

  const startGame = () => {
    hasAddedXP.current = false;
    
    // Always try to continue from saved state first
    if (savedGameState) {
      setGameWords(savedGameState.gameWords);
      setCurrentWordIndex(savedGameState.currentWordIndex);
      setScore(savedGameState.score);
      setCombo(savedGameState.combo);
      setIsHardMode(savedGameState.isHardMode);
      setStackedWords(savedGameState.stackedWords);
      setGameState("playing");
    } else {
      // Start new game
      if (words.length === 0) return;
      setGameState("playing");
      setScore(0);
      setCombo(1);
      setCurrentWordIndex(0);
      setStackedWords([]);
      setGameWords(shuffleArray(words));
    }
  };

  const startNewGame = () => {
    hasAddedXP.current = false;
    clearGameState();
    if (words.length === 0) return;
    setGameState("playing");
    setScore(0);
    setCombo(1);
    setCurrentWordIndex(0);
    setStackedWords([]);
    setGameWords(shuffleArray(words));
  };

  const calculateXP = (currentCombo: number) => {
    if (isHardMode) {
      return 200 + Math.min((currentCombo - 1) * 10, 100);
    }
    return 100 + Math.min((currentCombo - 1) * 5, 50);
  };

  const handleWordCorrect = async () => {
    const currentWord = gameWords[currentWordIndex];
    const earnedXP = calculateXP(combo);
    setScore(prev => prev + earnedXP);
    setCombo(prev => prev + 1);
    
    if (currentWord) {
      await incrementStar(currentWord.id, currentWord.star_rating || 0);
    }
    
    moveToNextWord();
  };

  const handleWordWrong = async () => {
    const currentWord = gameWords[currentWordIndex];
    setCombo(1);
    
    if (currentWord) {
      await resetStarToOne(currentWord.id);
      setStackedWords(prev => [...prev, currentWord.english]);
    }
    
    moveToNextWord();
  };

  const moveToNextWord = () => {
    if (currentWordIndex < gameWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      setGameState("gameover");
    }
  };

  const handleGameOver = () => {
    setGameState("gameover");
  };

  const getWordsByStars = (starCount: number) => {
    // Filter by selected package for the dialog
    const packageWords = selectedPackage === "all" 
      ? allWords 
      : allWords.filter(w => w.package_id === selectedPackage);
    return packageWords.filter(w => (w.star_rating || 0) === starCount);
  };

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star 
        key={i} 
        className={`w-3 h-3 ${i < count ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
      />
    ));
  };

  if (loading || gameState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground animate-pulse">Kelimeler yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-2xl text-destructive">Hata: {error}</div>
          <p className="text-muted-foreground">Bağlantıyı kontrol edin.</p>
          <p className="text-xs text-muted-foreground">URL: {window.location.href}</p>
        </div>
      </div>
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="text-2xl text-muted-foreground">Henüz kilitsiz kelime yok</div>
          <p className="text-muted-foreground">Diğer projede kelime kilidini açın.</p>
        </div>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col items-center justify-center p-8 gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-destructive">
            GAME OVER
          </h1>
          <div className="text-center space-y-4">
            <div>
              <div className="text-6xl font-bold text-primary animate-glow mb-2">
                {score}
              </div>
              <div className="text-xl text-muted-foreground">BU OYUN XP</div>
            </div>
            <div className="flex items-center justify-center gap-2 bg-primary/10 px-6 py-3 rounded-full">
              <Trophy className="w-6 h-6 text-primary" />
              <span className="text-2xl font-bold text-primary">{totalXP + score}</span>
              <span className="text-muted-foreground">TOTAL XP</span>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={startNewGame}
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-2xl px-12 py-8 rounded-2xl shadow-lg hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all"
        >
          TEKRAR OYNA
        </Button>
      </div>
    );
  }

  if (gameWords.length === 0 || !gameWords[currentWordIndex]) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex items-center justify-center">
        <div className="text-2xl text-muted-foreground animate-pulse">Loading...</div>
      </div>
    );
  }

  // Get current package words for the dialog
  const currentPackageWords = selectedPackage === "all" 
    ? allWords 
    : allWords.filter(w => w.package_id === selectedPackage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container max-w-2xl mx-auto h-screen flex flex-col">
        {/* Top Bar with Package Selector, Total XP, and All Words Button */}
        <div className="flex items-center justify-between p-2 gap-2">
          {/* Left: Package Selector */}
          <div className="flex-1">
            <PackageSelector
              unlockedPackages={unlockedPackages}
              selectedPackage={selectedPackage}
              onSelect={setSelectedPackage}
            />
          </div>
          
          {/* Center: Total XP */}
          <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-primary">{totalXP + score}</span>
          </div>
          
          {/* Right: All Words Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Tüm Kelimeler</span>
                <span className="sm:hidden">{currentPackageWords.length}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tüm Kelimeler ({currentPackageWords.length})</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {[5, 4, 3, 2, 1, 0].map(starCount => {
                  const starWords = getWordsByStars(starCount);
                  if (starWords.length === 0) return null;
                  return (
                    <div key={starCount} className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-border pb-2">
                        {renderStars(starCount)}
                        <span className="text-sm text-muted-foreground">({starWords.length})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {starWords.map(word => (
                          <div key={word.id} className="text-sm p-2 bg-muted rounded">
                            <span className="font-medium">{word.english}</span>
                            <span className="text-muted-foreground"> - {word.turkish}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Game Board */}
        <div className="flex-1">
          <GameBoard 
            currentWord={gameWords[currentWordIndex].english.toLowerCase()}
            currentWordTurkish={gameWords[currentWordIndex].turkish}
            onWordCorrect={handleWordCorrect}
            onWordWrong={handleWordWrong}
            onGameOver={handleGameOver}
            score={score}
            combo={combo}
            isHardMode={isHardMode}
            onToggleHardMode={() => setIsHardMode(!isHardMode)}
            totalXP={totalXP}
          />
        </div>
      </div>
    </div>
  );
};

export default Index;

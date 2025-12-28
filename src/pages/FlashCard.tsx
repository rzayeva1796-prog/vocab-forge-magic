import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, List, RotateCcw, Undo, Volume2, RefreshCw, ArrowLeft, LogIn } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { Word, StarLevel } from "@/types/word";
import { FlashCard } from "@/components/FlashCard";
import { AllWordsModal } from "@/components/AllWordsModal";
import { PackageSelector } from "@/components/PackageSelector";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { updateWordStars, createLearningSession } from "@/utils/wordParser";
import { useUnlockedWords } from "@/hooks/useUnlockedWords";
import {
  addKartXP,
  clearProgressFromSupabase,
  clearSessionState,
  loadProgressFromSupabase,
  loadSessionState,
  saveProgressToSupabase,
  saveSessionState,
  updateWordStarsInSupabase,
} from "@/hooks/useSupabaseProgress";

interface HistoryEntry {
  wordId: string;
  previousStars: Word["stars"];
  index: number;
}

const FlashCardPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  // Other project supports user_id via link; here we also fallback to logged-in user.
  const userIdFromUrl = searchParams.get("user_id");
  const userId = userIdFromUrl || user?.id || null;
  const urlPackageId = searchParams.get("package_id");

  const [selectedPackage, setSelectedPackage] = useState<string>(() => urlPackageId || "all");
  const { words: unlockedWords, packages: unlockedPackages, loading, error, refetch } =
    useUnlockedWords(userId, urlPackageId);

  const filteredPackages = useMemo(() => {
    if (!urlPackageId) return unlockedPackages;
    return unlockedPackages.filter((pkg) => pkg.id === urlPackageId);
  }, [unlockedPackages, urlPackageId]);

  const selectedPackageName = useMemo(() => {
    if (selectedPackage === "all") return null;
    const pkg = unlockedPackages.find((p) => p.id === selectedPackage);
    return pkg?.name || null;
  }, [selectedPackage, unlockedPackages]);

  const [allWords, setAllWords] = useState<Word[]>([]);
  const [sessionWords, setSessionWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllWords, setShowAllWords] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [currentWordAudio, setCurrentWordAudio] = useState<string>("");
  const [showWord, setShowWord] = useState(true);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  useEffect(() => {
    document.title = "FlashCards | Swipe Kart Oyunu";
  }, []);

  // Convert unlocked words to Word type
  useEffect(() => {
    if (unlockedWords.length > 0) {
      const words: Word[] = unlockedWords.map((w) => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        level: w.frequency_group,
        stars: (w.star_rating || 0) as StarLevel,
        packageId: w.package_id ?? null,
        packageName: (w as any).package_name ?? null,
      }));
      setAllWords(words);
    } else {
      setAllWords([]);
    }
  }, [unlockedWords]);

  const filteredWords = useMemo(() => allWords, [allWords]);

  // Load saved session on mount
  useEffect(() => {
    if (filteredWords.length === 0 || sessionInitialized) return;

    const loadSavedSession = async () => {
      let savedState = userId ? await loadProgressFromSupabase(userId) : null;
      if (!savedState) savedState = loadSessionState();

      if (savedState) {
        setSelectedPackage(savedState.selectedPackage ?? "all");

        const wordsMap = new Map(filteredWords.map((w) => [w.id, w]));
        const rebuiltSession = savedState.sessionWordIds
          .map((id) => wordsMap.get(id))
          .filter((w): w is Word => w !== undefined);

        if (rebuiltSession.length > 0 && savedState.currentIndex < rebuiltSession.length) {
          setSessionWords(rebuiltSession);
          setCurrentIndex(savedState.currentIndex);
          setSessionComplete(false);
          setSessionInitialized(true);
          return;
        }
      }

      localStorage.removeItem("flashcard-progress");
      clearSessionState();
      startNewSession(filteredWords);
      setSessionInitialized(true);
    };

    loadSavedSession();
  }, [filteredWords, sessionInitialized, userId]);

  // Save session state whenever it changes
  useEffect(() => {
    const state = {
      selectedPackage,
      currentIndex,
      sessionWordIds: sessionWords.map((w) => w.id),
    };

    if (sessionWords.length > 0 && !sessionComplete && sessionInitialized) {
      saveSessionState(state);
      if (userId) saveProgressToSupabase(userId, state);
    } else if (sessionComplete) {
      clearSessionState();
      if (userId) clearProgressFromSupabase(userId);
    }
  }, [sessionWords, currentIndex, sessionComplete, selectedPackage, sessionInitialized, userId]);

  const startNewSession = (words: Word[]) => {
    if (words.length === 0) {
      toast.error("Bu pakette kelime yok");
      return;
    }

    const session = createLearningSession(words);
    setSessionWords(session);
    setCurrentIndex(0);
    setSessionComplete(false);
    setHistory([]);
    clearSessionState();
  };

  const handlePackageChange = (packageId: string) => {
    setSelectedPackage(packageId);
    refetch(packageId === "all" ? undefined : packageId);
  };

  const speakWord = (word: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.8;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    }
  };

  const handleFlip = async () => {
    if (currentIndex >= sessionWords.length) return;

    const currentWord = sessionWords[currentIndex];

    if (currentWord.stars !== 1) {
      setHistory([
        ...history,
        { wordId: currentWord.id, previousStars: currentWord.stars, index: currentIndex },
      ]);

      updateWordStars(currentWord.id, 1);
      await updateWordStarsInSupabase(currentWord.id, 1, userId);

      const updatedAllWords = allWords.map((w) =>
        w.id === currentWord.id ? { ...w, stars: 1 as Word["stars"] } : w
      );
      setAllWords(updatedAllWords);

      const updatedSessionWords = sessionWords.map((w) =>
        w.id === currentWord.id ? { ...w, stars: 1 as Word["stars"] } : w
      );
      setSessionWords(updatedSessionWords);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= sessionWords.length) return;

    const currentWord = sessionWords[currentIndex];

    setHistory([
      ...history,
      { wordId: currentWord.id, previousStars: currentWord.stars, index: currentIndex },
    ]);

    const newStars: typeof currentWord.stars =
      direction === "right"
        ? (Math.min(currentWord.stars + 1, 5) as typeof currentWord.stars)
        : 1;

    updateWordStars(currentWord.id, newStars);
    await updateWordStarsInSupabase(currentWord.id, newStars, userId);

    if (direction === "right") {
      await addKartXP(10, userId);
    }

    const updatedAllWords = allWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setAllWords(updatedAllWords);

    const updatedSessionWords = sessionWords.map((w) =>
      w.id === currentWord.id ? { ...w, stars: newStars } : w
    );
    setSessionWords(updatedSessionWords);

    toast[direction === "right" ? "success" : "info"](
      direction === "right"
        ? `"${currentWord.english}" → ${newStars} Yıldız! 🌟`
        : `"${currentWord.english}" → 1 Yıldız, tekrar çalışalım 📚`,
      { duration: 2000 }
    );

    if (currentIndex + 1 >= sessionWords.length) {
      setSessionComplete(true);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleUndo = async () => {
    if (history.length === 0) return;

    const lastEntry = history[history.length - 1];

    updateWordStars(lastEntry.wordId, lastEntry.previousStars);
    await updateWordStarsInSupabase(lastEntry.wordId, lastEntry.previousStars, userId);

    const updatedAllWords = allWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setAllWords(updatedAllWords);

    const updatedSessionWords = sessionWords.map((w) =>
      w.id === lastEntry.wordId ? { ...w, stars: lastEntry.previousStars } : w
    );
    setSessionWords(updatedSessionWords);

    setCurrentIndex(lastEntry.index);
    setSessionComplete(false);
    setHistory(history.slice(0, -1));

    toast.info("Geri alındı", { duration: 1500 });
  };

  const handleRestart = () => startNewSession(filteredWords);

  const calculateProgress = () => {
    if (filteredWords.length === 0) return 0;

    let nextSessionSize = 0;
    filteredWords.forEach((word) => {
      const repeatCount = word.stars === 0 ? 1 : 6 - word.stars;
      nextSessionSize += repeatCount;
    });

    const minSize = filteredWords.length;
    const maxSize = filteredWords.length * 5;

    const progress = ((maxSize - nextSessionSize) / (maxSize - minSize)) * 100;
    return Math.max(0, Math.min(100, progress));
  };

  const progressPercentage = calculateProgress();
  const visibleCards = sessionWords.slice(currentIndex, currentIndex + 3);

  useEffect(() => {
    if (visibleCards.length > 0 && !sessionComplete) {
      const word = visibleCards[0].english;
      setCurrentWordAudio(word);
      speakWord(word);
    }
  }, [currentIndex, sessionComplete]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center">
        <p className="text-muted-foreground">Yükleniyor...</p>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex items-center justify-center p-4">
        <section className="max-w-md w-full text-center space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">FlashCards</h1>
            <p className="text-muted-foreground">Devam etmek için giriş yapmalısın.</p>
          </header>
          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate("/auth")} size="lg">
              <LogIn className="w-4 h-4 mr-2" />
              Giriş Yap
            </Button>
            <Button variant="ghost" onClick={() => navigate("/game")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Geri
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary flex flex-col">
      <section className="p-4 pb-2" aria-label="Paket seçimi">
        <div className="max-w-2xl mx-auto">
          <PackageSelector
            unlockedPackages={filteredPackages}
            selectedPackage={selectedPackage}
            onSelect={handlePackageChange}
          />
        </div>
      </section>

      <section className="p-4 pb-0 pt-2" aria-label="İlerleme">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Progress value={progressPercentage} className="flex-1" />
            <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      </section>

      <header className="p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            FlashCards
          </h1>
          <p className="text-sm text-muted-foreground">
            {sessionComplete ? "Tur tamamlandı!" : `${currentIndex + 1} / ${sessionWords.length}`}
          </p>
        </div>

        <nav className="flex gap-2" aria-label="Oyun kontrolleri">
          <Button variant="outline" size="sm" onClick={() => setShowWord(!showWord)} className="gap-2">
            {showWord ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide Word
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Show Word
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={handleUndo}
            disabled={history.length === 0}
            aria-label="Geri al"
          >
            <Undo className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setShowAllWords(true)}
            aria-label="Tüm kelimeler"
          >
            <List className="w-5 h-5" />
          </Button>
        </nav>
      </header>

      <section className="flex-1 relative max-w-2xl w-full mx-auto" aria-label="Flash kartlar">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Kelimeler yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => refetch()}>Tekrar Dene</Button>
          </div>
        ) : sessionComplete ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-6xl mb-4" aria-hidden>
              🎉
            </div>
            <h2 className="text-3xl font-bold mb-2">Tebrikler!</h2>
            <p className="text-muted-foreground mb-6">
              Bu turu tamamladın. Yeni bir tur başlatmak ister misin?
            </p>
            <Button size="lg" onClick={handleRestart} className="gap-2">
              <RotateCcw className="w-5 h-5" />
              Yeni Tur Başlat
            </Button>
          </div>
        ) : (
          <>
            {visibleCards.length === 0 && !sessionComplete && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <p className="text-muted-foreground text-center">Kelime yükleniyor...</p>
              </div>
            )}

            {visibleCards.map((word, index) => (
              <FlashCard
                key={`${word.id}-${currentIndex + index}`}
                word={word}
                style={{
                  zIndex: visibleCards.length - index,
                  transform: `scale(${1 - index * 0.05}) translateY(${index * 10}px)`,
                  opacity: 1 - index * 0.3,
                }}
                onSwipe={index === 0 ? handleSwipe : undefined}
                onFlip={index === 0 ? handleFlip : undefined}
                showWord={showWord}
              />
            ))}
          </>
        )}
      </section>

      {!sessionComplete && visibleCards.length > 0 && (
        <footer className="p-8 flex justify-between items-center text-sm" aria-label="Kaydırma ipuçları">
          <div className="flex items-center gap-2 text-success">
            <div className="text-2xl" aria-hidden>
              →
            </div>
            <span>Biliyorum</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => currentWordAudio && speakWord(currentWordAudio)}
            aria-label="Telaffuz"
          >
            <Volume2 className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2 text-warning">
            <span>Bilmiyorum</span>
            <div className="text-2xl" aria-hidden>
              ←
            </div>
          </div>
        </footer>
      )}

      <AllWordsModal
        words={filteredWords}
        open={showAllWords}
        onOpenChange={setShowAllWords}
        selectedPackage={selectedPackage}
        packageName={selectedPackageName || undefined}
      />
    </main>
  );
};

export default FlashCardPage;

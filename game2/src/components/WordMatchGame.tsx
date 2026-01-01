import { useState, useEffect, useCallback } from 'react';
import { WordButton } from './WordButton';
import { PackageSelector } from './PackageSelector';
import { WordListModal } from './WordListModal';
import { GameOverModal } from './GameOverModal';
import { ScoreDisplay } from './ScoreDisplay';
import { Word, WordWithStar, Package, GameState, UserWordProgress, GameProgress } from '../types/game';
import { externalSupabase } from '../lib/externalSupabase';
import { useUnlockedWords } from '../hooks/useUnlockedWords';
import { List } from 'lucide-react';

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Calculate combo points: x1=50, x2=52, ... x15+=80
const getComboPoints = (combo: number): number => {
  if (combo >= 15) return 80;
  return 50 + (combo - 1) * 2;
};

// Calculate total pool size based on star ratings
const calculatePoolSize = (words: WordWithStar[], round: number): number => {
  if (round === 1) return words.length;
  
  return words.reduce((total, word) => {
    const star = word.star_rating || 0;
    if (star === 0 || star === 1) return total + 5;
    if (star === 2) return total + 4;
    if (star === 3) return total + 3;
    if (star === 4) return total + 2;
    return total + 1;
  }, 0);
};

// Build word pool based on star ratings for round 2+
const buildWordPool = (words: WordWithStar[], round: number): WordWithStar[] => {
  if (round === 1) {
    // Round 1: Each word once
    return shuffleArray([...words]);
  }
  
  // Round 2+: Words repeat based on star rating
  // 1 star = 5x, 2 star = 4x, 3 star = 3x, 4 star = 2x, 5 star = 1x
  const pool: WordWithStar[] = [];
  words.forEach(word => {
    const star = word.star_rating || 0;
    let repeatCount: number;
    if (star === 0 || star === 1) repeatCount = 5;
    else if (star === 2) repeatCount = 4;
    else if (star === 3) repeatCount = 3;
    else if (star === 4) repeatCount = 2;
    else repeatCount = 1;
    
    for (let i = 0; i < repeatCount; i++) {
      pool.push({ ...word });
    }
  });
  
  return shuffleArray(pool);
};

export const WordMatchGame = () => {
  // Get user_id, package_id and is_admin from URL params - read once at mount
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('user_id');
  const initialPackageId = urlParams.get('package_id');
  const isAdmin = urlParams.get('is_admin') === 'true';
  
  console.log('[WordMatchGame] URL params - userId:', userId, 'packageId:', initialPackageId, 'isAdmin:', isAdmin);
  
  // Use unlocked words hook to fetch from edge function - pass initialPackageId
  const { 
    words: unlockedWords, 
    packages: unlockedPackages, 
    loading: unlockedLoading, 
    error: unlockedError,
    refetch: refetchUnlocked 
  } = useUnlockedWords(userId, initialPackageId);
  
  // Filter packages to show only URL package + "all" option
  const filteredPackages = initialPackageId 
    ? unlockedPackages.filter(pkg => pkg.id === initialPackageId)
    : unlockedPackages;
  
  const [selectedPackage, setSelectedPackage] = useState<string>(initialPackageId || "all");
  const [packageWords, setPackageWords] = useState<WordWithStar[]>([]);
  const [wordPool, setWordPool] = useState<WordWithStar[]>([]);
  const [poolIndex, setPoolIndex] = useState(0);
  const [round, setRound] = useState(1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWordList, setShowWordList] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  
  const [totalScore, setTotalScore] = useState(0);
  const [gameScore, setGameScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [matchCount, setMatchCount] = useState(0);
  const [totalMatchCount, setTotalMatchCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    leftWords: [],
    rightWords: [],
    selectedLeft: null,
    selectedRight: null,
    leftStates: Array(5).fill('default'),
    rightStates: Array(5).fill('default'),
  });

  // Load saved XP from profiles on mount
  useEffect(() => {
    const loadSavedXP = async () => {
      if (!userId) return;
      
      try {
        const { data: profile } = await externalSupabase
          .from('profiles')
          .select('eslestirme_xp')
          .eq('user_id', userId)
          .maybeSingle();
        
        if (profile?.eslestirme_xp) {
          setTotalScore(profile.eslestirme_xp);
        }
      } catch (err) {
        console.error('Error loading XP:', err);
      }
    };
    
    loadSavedXP();
  }, [userId]);

  // Load saved game progress
  const loadGameProgress = async (pkgs: Package[], progressMap: Record<string, number>) => {
    if (!userId) return null;
    
    try {
      const { data: savedProgress } = await externalSupabase
        .from('game_progress_eslestirme')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (savedProgress && savedProgress.selected_package) {
        return savedProgress;
      }
    } catch (err) {
      console.error('Error loading game progress:', err);
    }
    return null;
  };

  // Save game progress
  const saveGameProgress = async () => {
    if (!userId || !selectedPackage) return;
    
    const progressData = {
      user_id: userId,
      selected_package: selectedPackage,
      round,
      pool_index: poolIndex,
      word_pool: JSON.stringify(wordPool),
      total_score: totalScore,
      game_score: gameScore,
      combo,
      match_count: matchCount,
      total_match_count: totalMatchCount,
      left_words: JSON.stringify(gameState.leftWords),
      right_words: JSON.stringify(gameState.rightWords),
      updated_at: new Date().toISOString()
    };
    
    try {
      const { data: existing } = await externalSupabase
        .from('game_progress_eslestirme')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existing) {
        await externalSupabase
          .from('game_progress_eslestirme')
          .update(progressData)
          .eq('user_id', userId);
      } else {
        await externalSupabase
          .from('game_progress_eslestirme')
          .insert(progressData);
      }
    } catch (err) {
      console.error('Error saving game progress:', err);
    }
  };

  // Update XP in real-time
  const updateXpRealtime = async (points: number) => {
    if (!userId) return;
    
    try {
      const { data: profile } = await externalSupabase
        .from('profiles')
        .select('eslestirme_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      const newXp = (profile?.eslestirme_xp || 0) + points;
      
      if (!profile) {
        await externalSupabase
          .from('profiles')
          .insert({ user_id: userId, eslestirme_xp: newXp });
      } else {
        await externalSupabase
          .from('profiles')
          .update({ eslestirme_xp: newXp })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error updating XP:', err);
    }
  };

  // Initialize game when unlocked words are loaded
  useEffect(() => {
    const initializeGame = async () => {
      if (unlockedLoading || gameInitialized) return;
      
      // Check if user_id is missing
      if (!userId) {
        setError('Lütfen geçerli bir kullanıcı ile giriş yapın (user_id parametresi gerekli)');
        setIsLoading(false);
        return;
      }
      
      if (unlockedError) {
        setError(unlockedError);
        setIsLoading(false);
        return;
      }
      
      if (!unlockedWords || unlockedWords.length === 0) {
        setError('Henüz kelime eklenmemiş. Edge function yanıtını kontrol edin.');
        setIsLoading(false);
        console.log('userId:', userId, 'unlockedWords:', unlockedWords, 'unlockedError:', unlockedError);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Fetch user progress if userId exists
        let progressMap: Record<string, number> = {};
        if (userId) {
          const { data: progress } = await externalSupabase
            .from('user_word_progress')
            .select('word_id, star_rating')
            .eq('user_id', userId);
          
          if (progress) {
            progress.forEach((p: UserWordProgress) => {
              progressMap[p.word_id] = p.star_rating;
            });
          }
        }
        
        // Convert unlocked words to WordWithStar format
        const wordsWithStars: WordWithStar[] = unlockedWords.map(w => ({
          id: w.id,
          english: w.english,
          turkish: w.turkish,
          level: 'A1',
          package_name: w.package_name,
          star_rating: progressMap[w.id] || 0,
        }));
        
        // If URL has package_id, use it directly (ignore saved progress for package selection)
        if (initialPackageId) {
          console.log('[WordMatchGame] Using URL package_id:', initialPackageId);
          console.log('[WordMatchGame] Sample word package_id:', unlockedWords[0]?.package_id, 'package_name:', unlockedWords[0]?.package_name);
          
          // Edge function already filters by package_id, so use all returned words directly
          // No additional client-side filtering needed since useUnlockedWords passes package_id to API
          const filteredWords = wordsWithStars;
          console.log('[WordMatchGame] Using all returned words for package:', filteredWords.length);
          
          if (filteredWords.length === 0) {
            setError(`Paket için kelime bulunamadı. Lütfen ana uygulamadan tekrar deneyin.`);
            setIsLoading(false);
            return;
          }
          
          setPackageWords(filteredWords);
          setGameScore(0);
          setCombo(1);
          setTotalMatchCount(0);
          startGame(filteredWords, 1, progressMap);
        } else {
          // Try to load saved game progress (only when no URL package)
          const savedProgress = await loadGameProgress([], progressMap);
          
          if (savedProgress && savedProgress.selected_package) {
            // Restore saved game state
            setSelectedPackage(savedProgress.selected_package);
            
            // Filter words based on saved package
            const filteredWords = savedProgress.selected_package === 'all' 
              ? wordsWithStars 
              : wordsWithStars.filter(w => w.package_name === savedProgress.selected_package);
            
            setPackageWords(filteredWords);
            
            // Restore game state
            setRound(savedProgress.round || 1);
            setPoolIndex(savedProgress.pool_index || 0);
            setWordPool(JSON.parse(savedProgress.word_pool || '[]'));
            setGameScore(savedProgress.game_score || 0);
            setCombo(savedProgress.combo || 1);
            setMatchCount(savedProgress.match_count || 0);
            setTotalMatchCount(savedProgress.total_match_count || 0);
            
            const leftWords = JSON.parse(savedProgress.left_words || '[]');
            const rightWords = JSON.parse(savedProgress.right_words || '[]');
            
            if (leftWords.length > 0 && rightWords.length > 0) {
              setGameState({
                leftWords,
                rightWords,
                selectedLeft: null,
                selectedRight: null,
                leftStates: Array(5).fill('default'),
                rightStates: Array(5).fill('default'),
              });
            } else {
              startGame(filteredWords, 1, progressMap);
            }
          } else {
            // Start fresh game with all words
            setPackageWords(wordsWithStars);
            startGame(wordsWithStars, 1, progressMap);
          }
        }
        
        setGameInitialized(true);
      } catch (err) {
        console.error('Error initializing game:', err);
        setError('Kelimeler yüklenemedi');
      } finally {
        setIsLoading(false);
      }
    };

    initializeGame();
  }, [unlockedWords, unlockedLoading, unlockedError, userId, gameInitialized]);

  const startGame = useCallback((words: WordWithStar[], roundNum: number, progressMap?: Record<string, number>) => {
    const pool = buildWordPool(words, roundNum);
    setWordPool(pool);
    setPoolIndex(0);
    setRound(roundNum);
    setMatchCount(0);
    loadNextFiveWords(pool, 0, words);
  }, []);

  const loadNextFiveWords = (pool: WordWithStar[], startIndex: number, allWords: WordWithStar[]) => {
    // Get next 5 unique words from pool
    const usedIds = new Set<string>();
    const leftWords: WordWithStar[] = [];
    let idx = startIndex;
    
    while (leftWords.length < 5 && idx < pool.length) {
      const word = pool[idx];
      if (!usedIds.has(word.id)) {
        usedIds.add(word.id);
        leftWords.push(word);
      }
      idx++;
    }
    
    // If we don't have enough unique words, start new round
    if (leftWords.length < 5) {
      // Refetch progress and start next round
      startNewRound(allWords);
      return;
    }
    
    // Create right words with shuffled positions, ensuring no direct matches
    let rightWords = shuffleArray([...leftWords]);
    
    // Make sure no word is at its matching position
    let attempts = 0;
    while (attempts < 10) {
      let hasDirectMatch = false;
      for (let i = 0; i < leftWords.length; i++) {
        if (leftWords[i].id === rightWords[i].id) {
          hasDirectMatch = true;
          break;
        }
      }
      if (!hasDirectMatch) break;
      rightWords = shuffleArray([...leftWords]);
      attempts++;
    }
    
    setGameState({
      leftWords,
      rightWords,
      selectedLeft: null,
      selectedRight: null,
      leftStates: Array(5).fill('default'),
      rightStates: Array(5).fill('default'),
    });
    setPoolIndex(idx);
  };

  const startNewRound = async (words: WordWithStar[]) => {
    // Refetch latest star ratings
    let updatedWords = [...words];
    
    if (userId) {
      const { data: progress } = await externalSupabase
        .from('user_word_progress')
        .select('word_id, star_rating')
        .eq('user_id', userId);
      
      if (progress) {
        const progressMap: Record<string, number> = {};
        progress.forEach((p: UserWordProgress) => {
          progressMap[p.word_id] = p.star_rating;
        });
        
        updatedWords = words.map(w => ({
          ...w,
          star_rating: progressMap[w.id] || 0,
        }));
        setPackageWords(updatedWords);
      }
    }
    
    startGame(updatedWords, round + 1);
  };

  const handlePackageSelect = async (packageId: string) => {
    setSelectedPackage(packageId);
    
    // Refetch words for the selected package
    await refetchUnlocked(packageId);
    
    // Fetch latest progress
    let progressMap: Record<string, number> = {};
    if (userId) {
      const { data: progress } = await externalSupabase
        .from('user_word_progress')
        .select('word_id, star_rating')
        .eq('user_id', userId);
      
      if (progress) {
        progress.forEach((p: UserWordProgress) => {
          progressMap[p.word_id] = p.star_rating;
        });
      }
    }
    
    // Use unlockedWords which will be updated after refetch
    const wordsWithStars: WordWithStar[] = unlockedWords.map(w => ({
      id: w.id,
      english: w.english,
      turkish: w.turkish,
      level: 'A1',
      package_name: w.package_name,
      star_rating: progressMap[w.id] || 0,
    }));
    
    setPackageWords(wordsWithStars);
    setGameScore(0);
    setCombo(1);
    setTotalMatchCount(0);
    setShowGameOver(false);
    startGame(wordsWithStars, 1, progressMap);
  };

  const updateStarRating = async (wordId: string, isCorrect: boolean, currentStar: number) => {
    if (!userId) return;
    
    const newStar = isCorrect ? Math.min(5, currentStar + 1) : 1;
    
    try {
      await externalSupabase
        .from('user_word_progress')
        .upsert({
          user_id: userId,
          word_id: wordId,
          star_rating: newStar,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,word_id' });
      
      // Update local state
      setPackageWords(prev => prev.map(w => 
        w.id === wordId ? { ...w, star_rating: newStar } : w
      ));
    } catch (err) {
      console.error('Error updating star rating:', err);
    }
  };

  const handleLeftClick = (index: number) => {
    if (gameState.leftStates[index] === 'correct') return;

    // Copy states once
    const newLeftStates = [...gameState.leftStates];
    
    // Deselect if clicking same item
    if (gameState.selectedLeft === index) {
      newLeftStates[index] = 'default';
      setGameState({
        ...gameState,
        selectedLeft: null,
        leftStates: newLeftStates,
      });
      return;
    }

    // Clear previous selection in same column
    if (gameState.selectedLeft !== null && gameState.leftStates[gameState.selectedLeft] !== 'correct') {
      newLeftStates[gameState.selectedLeft] = 'default';
    }

    // Select new item
    newLeftStates[index] = 'selected';

    const newStates: GameState = {
      ...gameState,
      selectedLeft: index,
      leftStates: newLeftStates,
    };

    if (gameState.selectedRight !== null) {
      checkMatch(index, gameState.selectedRight, newStates);
    } else {
      setGameState(newStates);
    }
  };

  const handleRightClick = (index: number) => {
    if (gameState.rightStates[index] === 'correct') return;

    // Copy states once
    const newRightStates = [...gameState.rightStates];
    
    // Deselect if clicking same item
    if (gameState.selectedRight === index) {
      newRightStates[index] = 'default';
      setGameState({
        ...gameState,
        selectedRight: null,
        rightStates: newRightStates,
      });
      return;
    }

    // Clear previous selection in same column
    if (gameState.selectedRight !== null && gameState.rightStates[gameState.selectedRight] !== 'correct') {
      newRightStates[gameState.selectedRight] = 'default';
    }

    // Select new item
    newRightStates[index] = 'selected';

    const newStates: GameState = {
      ...gameState,
      selectedRight: index,
      rightStates: newRightStates,
    };

    if (gameState.selectedLeft !== null) {
      checkMatch(gameState.selectedLeft, index, newStates);
    } else {
      setGameState(newStates);
    }
  };

  const checkMatch = async (leftIndex: number, rightIndex: number, newStates: GameState) => {
    const leftWord = gameState.leftWords[leftIndex];
    const rightWord = gameState.rightWords[rightIndex];

    if (leftWord.id === rightWord.id) {
      // Correct match
      newStates.leftStates = [...newStates.leftStates];
      newStates.rightStates = [...newStates.rightStates];
      newStates.leftStates[leftIndex] = 'correct';
      newStates.rightStates[rightIndex] = 'correct';
      setGameState(newStates);

      // Add score with combo - directly to total score and save to DB
      const points = getComboPoints(combo);
      setTotalScore(prev => prev + points);
      setGameScore(prev => prev + points);
      setCombo(prev => prev + 1);
      setTotalMatchCount(prev => prev + 1);
      
      // Update XP in database in real-time
      updateXpRealtime(points);
      
      // Update star rating
      await updateStarRating(leftWord.id, true, leftWord.star_rating);

      const newMatchCount = matchCount + 1;
      setMatchCount(newMatchCount);

      // Instant removal - no delay
      if (newMatchCount >= 20 && newMatchCount % 20 === 0) {
        setShowGameOver(true);
      } else {
        replaceMatchedPair(leftIndex, rightIndex);
      }
    } else {
      // Wrong match
      newStates.leftStates = [...newStates.leftStates];
      newStates.rightStates = [...newStates.rightStates];
      newStates.leftStates[leftIndex] = 'wrong';
      newStates.rightStates[rightIndex] = 'wrong';
      setGameState(newStates);

      // Reset combo
      setCombo(1);
      
      // Update star rating to 1
      await updateStarRating(leftWord.id, false, leftWord.star_rating);

      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          selectedLeft: null,
          selectedRight: null,
          leftStates: prev.leftStates.map((s, i) => i === leftIndex ? 'default' : s),
          rightStates: prev.rightStates.map((s, i) => i === rightIndex ? 'default' : s),
        }));
      }, 150);
    }
  };

  const replaceMatchedPair = (leftIndex: number, rightIndex: number) => {
    // Find next word from pool that's not already displayed
    const displayedIds = new Set(gameState.leftWords.map(w => w.id));
    displayedIds.delete(gameState.leftWords[leftIndex].id); // This one is being replaced
    
    let newWord: WordWithStar | null = null;
    let newPoolIndex = poolIndex;
    
    while (newPoolIndex < wordPool.length) {
      const candidate = wordPool[newPoolIndex];
      if (!displayedIds.has(candidate.id)) {
        newWord = candidate;
        newPoolIndex++;
        break;
      }
      newPoolIndex++;
    }
    
    if (!newWord) {
      // Pool exhausted, start new round
      startNewRound(packageWords);
      return;
    }
    
    setPoolIndex(newPoolIndex);
    
    const newLeftWords = [...gameState.leftWords];
    const newRightWords = [...gameState.rightWords];
    const newLeftStates = [...gameState.leftStates];
    const newRightStates = [...gameState.rightStates];
    
    // Replace left word at same position
    newLeftWords[leftIndex] = newWord;
    newLeftStates[leftIndex] = 'default';
    
    // Replace right word at same position (no shuffling during game)
    newRightWords[rightIndex] = newWord;
    newRightStates[rightIndex] = 'default';

    const newGameState = {
      leftWords: newLeftWords,
      rightWords: newRightWords,
      selectedLeft: null,
      selectedRight: null,
      leftStates: newLeftStates,
      rightStates: newRightStates,
    };
    
    setGameState(newGameState);
    
    // Save game progress after each match
    setTimeout(() => saveGameProgress(), 100);
  };

  // Add XP to external profiles table
  const addEslestirmeXp = async (xpToAdd: number) => {
    if (!userId) return;
    
    try {
      // Get current XP
      const { data: profile } = await externalSupabase
        .from('profiles')
        .select('eslestirme_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!profile) {
        // Create new profile
        await externalSupabase
          .from('profiles')
          .insert({ user_id: userId, eslestirme_xp: xpToAdd });
      } else {
        // Update existing profile
        await externalSupabase
          .from('profiles')
          .update({ eslestirme_xp: (profile.eslestirme_xp || 0) + xpToAdd })
          .eq('user_id', userId);
      }
    } catch (err) {
      console.error('Error updating XP:', err);
    }
  };

  const handleNewGame = async () => {
    // XP is already saved in real-time, just reset game state
    
    setGameScore(0);
    setCombo(1);
    setMatchCount(0);
    setShowGameOver(false);
    
    // Shuffle right side positions but keep left words
    const leftWords = [...gameState.leftWords];
    let rightWords = shuffleArray([...leftWords]);
    
    // Ensure no direct position matches
    let attempts = 0;
    while (attempts < 10) {
      let hasDirectMatch = false;
      for (let i = 0; i < leftWords.length; i++) {
        if (leftWords[i].id === rightWords[i].id) {
          hasDirectMatch = true;
          break;
        }
      }
      if (!hasDirectMatch) break;
      rightWords = shuffleArray([...leftWords]);
      attempts++;
    }
    
    const newGameState = {
      leftWords,
      rightWords,
      selectedLeft: null,
      selectedRight: null,
      leftStates: Array(5).fill('default') as ('default' | 'selected' | 'correct' | 'wrong')[],
      rightStates: Array(5).fill('default') as ('default' | 'selected' | 'correct' | 'wrong')[],
    };
    
    setGameState(newGameState);
    
    // Save game progress
    setTimeout(() => saveGameProgress(), 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-muted-foreground">Kelimeler yükleniyor...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-xl text-destructive">{error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Header with package selector and word list */}
      <header className="mb-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          {isAdmin && (
            <PackageSelector
              packages={filteredPackages}
              selectedPackage={selectedPackage}
              onSelect={handlePackageSelect}
              loading={unlockedLoading}
            />
          )}
          
          <button
            onClick={() => setShowWordList(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors ${!isAdmin ? 'ml-auto' : ''}`}
          >
            <List className="w-4 h-4" />
            <span>Kelimeler</span>
          </button>
        </div>
        
        <ScoreDisplay 
          totalScore={totalScore} 
          gameScore={gameScore} 
          combo={combo} 
          matchedCount={totalMatchCount}
          poolSize={calculatePoolSize(packageWords, round)}
        />
        
        <div className="text-center mt-2">
          <p className="text-xs text-muted-foreground">
            Tur {round}
          </p>
        </div>
      </header>

      {/* Game area */}
      <div className="flex-1 grid grid-cols-2 gap-3 max-w-4xl mx-auto w-full">
        <div className="space-y-2">
          {gameState.leftWords.map((word, index) => (
            <WordButton
              key={`${word.id}-left-${index}`}
              word={word.english}
              state={gameState.leftStates[index]}
              onClick={() => handleLeftClick(index)}
              disabled={gameState.leftStates[index] === 'correct' || isProcessing}
            />
          ))}
        </div>

        <div className="space-y-2">
          {gameState.rightWords.map((word, index) => (
            <WordButton
              key={`${word.id}-right-${index}`}
              word={word.turkish}
              state={gameState.rightStates[index]}
              onClick={() => handleRightClick(index)}
              disabled={gameState.rightStates[index] === 'correct' || isProcessing}
            />
          ))}
        </div>
      </div>

      {/* Word List Modal */}
      <WordListModal
        isOpen={showWordList}
        onClose={() => setShowWordList(false)}
        words={packageWords}
        packageName={selectedPackage || 'Kelimeler'}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={showGameOver}
        score={gameScore}
        onNewGame={handleNewGame}
      />
    </div>
  );
};

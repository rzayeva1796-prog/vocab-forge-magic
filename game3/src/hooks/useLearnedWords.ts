import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useUnlockedWords, UnlockedWord, UnlockedPackage } from './useUnlockedWords';

export interface LearnedWord {
  id: string;
  english: string;
  turkish: string;
  package_name?: string;
  package_id?: string;
  star_rating?: number;
}

interface UserWordRating {
  word_id: string;
  star_rating: number;
}

export interface GameState {
  gameWords: LearnedWord[];
  currentWordIndex: number;
  score: number;
  combo: number;
  isHardMode: boolean;
  stackedWords: string[];
}

export function useLearnedWords() {
  const [selectedPackage, setSelectedPackage] = useState<string>("all");
  const [userId, setUserId] = useState<string | null>(null);
  const [totalXP, setTotalXP] = useState(0);
  const [savedGameState, setSavedGameState] = useState<GameState | null>(null);
  const [wordsWithRatings, setWordsWithRatings] = useState<LearnedWord[]>([]);

  // Get user_id and package_id from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const uid = urlParams.get('user_id');
    const pkgId = urlParams.get('package_id');
    console.log('URL user_id:', uid, 'package_id:', pkgId);
    setUserId(uid);
    if (pkgId) {
      setSelectedPackage(pkgId);
    }
  }, []);

  // Use the unlocked words hook
  const { 
    words: unlockedWords, 
    packages: unlockedPackages, 
    loading, 
    error, 
    refetch: refetchUnlockedWords 
  } = useUnlockedWords(userId);

  // Fetch user-specific star ratings and merge with words
  const fetchRatingsAndMerge = async () => {
    if (!userId || unlockedWords.length === 0) {
      setWordsWithRatings(unlockedWords.map(w => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        package_name: w.package_name,
        package_id: w.package_id,
        star_rating: 0
      })));
      return;
    }

    try {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('user_word_progress')
        .select('word_id, star_rating')
        .eq('user_id', userId);

      if (ratingsError) throw ratingsError;

      const ratingsMap = new Map<string, number>(
        (ratingsData || []).map((r: UserWordRating) => [r.word_id, r.star_rating])
      );

      const merged = unlockedWords.map(w => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        package_name: w.package_name,
        package_id: w.package_id,
        star_rating: ratingsMap.get(w.id) || 0
      }));

      setWordsWithRatings(merged);
    } catch (err) {
      console.error('Failed to fetch ratings:', err);
      setWordsWithRatings(unlockedWords.map(w => ({
        id: w.id,
        english: w.english,
        turkish: w.turkish,
        package_name: w.package_name,
        package_id: w.package_id,
        star_rating: 0
      })));
    }
  };

  useEffect(() => {
    fetchRatingsAndMerge();
  }, [unlockedWords, userId]);

  // Fetch total XP from profiles table
  const fetchTotalXP = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('tetris_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (!error && data) {
        setTotalXP(data.tetris_xp || 0);
      }
    } catch (err) {
      console.error('Failed to fetch total XP:', err);
    }
  };

  // Add XP to profiles table
  const addTetrisXP = async (xpToAdd: number) => {
    if (!userId || xpToAdd <= 0) return;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tetris_xp')
        .eq('user_id', userId)
        .maybeSingle();
      
      const currentXP = profile?.tetris_xp || 0;
      const newTotalXP = currentXP + xpToAdd;
      
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: userId, tetris_xp: newTotalXP },
          { onConflict: 'user_id' }
        );
      
      if (error) throw error;
      
      setTotalXP(newTotalXP);
      console.log('XP added successfully:', { added: xpToAdd, total: newTotalXP });
    } catch (err) {
      console.error('Failed to add XP:', err);
    }
  };

  // Save game state to localStorage
  const saveGameState = (state: GameState) => {
    if (!userId) return;
    localStorage.setItem(`game_state_${userId}`, JSON.stringify(state));
    setSavedGameState(state);
  };

  // Load game state from localStorage
  const loadGameState = (): GameState | null => {
    if (!userId) return null;
    const saved = localStorage.getItem(`game_state_${userId}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Clear saved game state
  const clearGameState = () => {
    if (!userId) return;
    localStorage.removeItem(`game_state_${userId}`);
    setSavedGameState(null);
  };

  // Check for saved game on mount
  useEffect(() => {
    if (userId) {
      const saved = loadGameState();
      setSavedGameState(saved);
      fetchTotalXP();
    }
  }, [userId]);

  // Update star rating for a word (user-specific)
  const updateStarRating = async (wordId: string, newRating: number) => {
    console.log('updateStarRating called:', { wordId, newRating, userId });
    
    if (!userId) {
      console.warn('No user_id, cannot save star rating');
      return;
    }

    const clampedRating = Math.min(Math.max(newRating, 0), 5);

    try {
      const { data, error } = await supabase
        .from('user_word_progress')
        .upsert(
          { user_id: userId, word_id: wordId, star_rating: clampedRating, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,word_id' }
        )
        .select();

      if (error) throw error;
      
      setWordsWithRatings(prev => prev.map(w => 
        w.id === wordId ? { ...w, star_rating: clampedRating } : w
      ));
      console.log('Star rating updated successfully');
    } catch (err) {
      console.error('Failed to update star rating:', err);
    }
  };

  // Increment star (correct answer)
  const incrementStar = async (wordId: string, currentRating: number = 0) => {
    await updateStarRating(wordId, Math.min(currentRating + 1, 5));
  };

  // Reset star to 1 (wrong answer)
  const resetStarToOne = async (wordId: string) => {
    await updateStarRating(wordId, 1);
  };

  // Handle package selection and refetch
  const handlePackageSelect = (packageId: string) => {
    setSelectedPackage(packageId);
    refetchUnlockedWords(packageId === "all" ? undefined : packageId);
  };

  // Get filtered words based on selected package
  const filteredWords = selectedPackage === "all" 
    ? wordsWithRatings
    : wordsWithRatings.filter(w => w.package_id === selectedPackage);

  // Extract unique package names for display
  const packageNames = [...new Set(wordsWithRatings.map(w => w.package_name).filter(Boolean))] as string[];

  return { 
    words: filteredWords, 
    allWords: wordsWithRatings,
    packages: packageNames,
    unlockedPackages,
    selectedPackage, 
    setSelectedPackage: handlePackageSelect,
    loading, 
    error,
    userId,
    totalXP,
    savedGameState,
    refetch: () => refetchUnlockedWords(selectedPackage === "all" ? undefined : selectedPackage),
    incrementStar,
    resetStarToOne,
    addTetrisXP,
    saveGameState,
    loadGameState,
    clearGameState
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
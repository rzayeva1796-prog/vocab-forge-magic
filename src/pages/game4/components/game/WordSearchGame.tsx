import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, ChevronRight, Lightbulb } from 'lucide-react';
import { externalSupabase } from '@/lib/externalSupabase';
import { toast } from 'sonner';

interface WordSearchGameProps {
  onBack: () => void;
}

interface GameWord {
  word: string;
  turkish: string;
  found: boolean;
  color: string;
  cells: { row: number; col: number }[];
}

interface Cell {
  letter: string;
  row: number;
  col: number;
  wordColors: string[];
  isSelected: boolean;
  isFound: boolean;
  isHinted: boolean;
}

const WORDS_PER_LEVEL = 5;
const MIN_WORD_LENGTH = 3;

const WORD_COLORS = [
  'hsl(280, 80%, 60%)', // Purple
  'hsl(50, 90%, 50%)',  // Yellow
  'hsl(0, 80%, 55%)',   // Red
  'hsl(120, 70%, 45%)', // Green
  'hsl(30, 90%, 55%)',  // Orange
];

type Direction = 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up' | 
                 'horizontal-reverse' | 'vertical-reverse' | 'diagonal-down-reverse' | 'diagonal-up-reverse';

const DIRECTIONS: { [key in Direction]: { dr: number; dc: number } } = {
  'horizontal': { dr: 0, dc: 1 },
  'vertical': { dr: 1, dc: 0 },
  'diagonal-down': { dr: 1, dc: 1 },
  'diagonal-up': { dr: -1, dc: 1 },
  'horizontal-reverse': { dr: 0, dc: -1 },
  'vertical-reverse': { dr: -1, dc: 0 },
  'diagonal-down-reverse': { dr: -1, dc: -1 },
  'diagonal-up-reverse': { dr: 1, dc: -1 },
};

interface WordsByLength {
  [length: number]: WordData[];
}

interface WordData {
  english: string;
  turkish: string;
}

export function WordSearchGame({ onBack }: WordSearchGameProps) {
  const [level, setLevel] = useState(1);
  const [allWords, setAllWords] = useState<WordData[]>([]); // All words in order by length
  const [usedWordIndex, setUsedWordIndex] = useState(0); // Global index for used words
  const [words, setWords] = useState<GameWord[]>([]);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [gridSize, setGridSize] = useState(10);
  const [selectedCells, setSelectedCells] = useState<{ row: number; col: number }[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLevelComplete, setIsLevelComplete] = useState(false);
  const [allLevelsComplete, setAllLevelsComplete] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const MAX_HINTS = 3;

  // Get user_id from URL and load saved progress on mount
  useEffect(() => {
    const loadUserAndProgress = async () => {
      // Get user_id from URL query parameter
      const urlParams = new URLSearchParams(window.location.search);
      const urlUserId = urlParams.get('user_id');
      
      if (urlUserId) {
        setUserId(urlUserId);
        try {
          // Load saved progress
          const { data: progress } = await externalSupabase
            .from('word_search_progress')
            .select('*')
            .eq('user_id', urlUserId)
            .maybeSingle();
          
          if (progress) {
            setLevel(progress.current_level);
            setUsedWordIndex(progress.used_word_index);
          }
        } catch (error) {
          console.error('Error loading progress:', error);
        }
      }
      loadAllWords();
    };
    
    loadUserAndProgress();
  }, []);

  // Load words for current level when level or usedWordIndex changes
  useEffect(() => {
    if (allWords.length > 0) {
      loadWordsForLevel();
    }
  }, [level, allWords, usedWordIndex]);

  const loadAllWords = async () => {
    setIsLoading(true);
    try {
      const { data } = await externalSupabase
        .from('learned_words')
        .select('english, turkish');
      
      if (data) {
        // Get unique words with their Turkish translations
        const wordMap = new Map<string, string>();
        data.forEach(w => {
          const upper = w.english.toUpperCase();
          if (!wordMap.has(upper)) {
            wordMap.set(upper, w.turkish || '');
          }
        });
        
        // Convert to array and filter
        const allWordData: WordData[] = [];
        wordMap.forEach((turkish, english) => {
          if (english.length >= MIN_WORD_LENGTH) {
            allWordData.push({ english, turkish });
          }
        });
        
        // Group by length first
        const grouped: WordsByLength = {};
        allWordData.forEach(wordData => {
          const len = wordData.english.length;
          if (!grouped[len]) {
            grouped[len] = [];
          }
          grouped[len].push(wordData);
        });

        // Shuffle words within each length group
        Object.keys(grouped).forEach(len => {
          grouped[Number(len)] = grouped[Number(len)].sort(() => Math.random() - 0.5);
        });

        // Flatten back to array, sorted by length
        const sortedLengths = Object.keys(grouped).map(Number).sort((a, b) => a - b);
        const sortedWords: WordData[] = [];
        sortedLengths.forEach(len => {
          sortedWords.push(...grouped[len]);
        });
        
        setAllWords(sortedWords);
      }
    } catch (error) {
      console.error('Error loading words:', error);
      toast.error('Kelimeler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWordsForLevel = () => {
    setIsLoading(true);
    setIsLevelComplete(false);
    
    if (usedWordIndex >= allWords.length) {
      setAllLevelsComplete(true);
      setIsLoading(false);
      return;
    }

    // Take next 5 words from current position
    const selectedWordData = allWords.slice(usedWordIndex, usedWordIndex + WORDS_PER_LEVEL);
    
    if (selectedWordData.length === 0) {
      setAllLevelsComplete(true);
      setIsLoading(false);
      return;
    }
    
    const gameWords: GameWord[] = selectedWordData.map((wordData, index) => ({
      word: wordData.english,
      turkish: wordData.turkish,
      found: false,
      color: WORD_COLORS[index % WORD_COLORS.length],
      cells: []
    }));
    
    // Calculate dynamic grid size based on LONGEST word in this level
    const maxWordLength = Math.max(...selectedWordData.map(w => w.english.length));
    const dynamicGridSize = Math.max(maxWordLength + 2, 6); // longest word + 2, minimum 6
    setGridSize(dynamicGridSize);
    
    const newGrid = generateGrid(gameWords, dynamicGridSize);
    setWords(gameWords);
    setGrid(newGrid);
    setIsLoading(false);
  };

  const generateGrid = (gameWords: GameWord[], size: number): Cell[][] => {
    // Initialize empty grid
    const newGrid: Cell[][] = Array(size).fill(null).map((_, row) =>
      Array(size).fill(null).map((_, col) => ({
        letter: '',
        row,
        col,
        wordColors: [],
        isSelected: false,
        isFound: false,
        isHinted: false
      }))
    );

    // Place each word
    const placedWords = [...gameWords];
    const directions: Direction[] = Object.keys(DIRECTIONS) as Direction[];

    for (const gameWord of placedWords) {
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200;

      while (!placed && attempts < maxAttempts) {
        const direction = directions[Math.floor(Math.random() * directions.length)];
        const { dr, dc } = DIRECTIONS[direction];
        const wordLen = gameWord.word.length;

        // Calculate valid starting positions
        let startRow = Math.floor(Math.random() * size);
        let startCol = Math.floor(Math.random() * size);

        // Check if word fits
        const endRow = startRow + dr * (wordLen - 1);
        const endCol = startCol + dc * (wordLen - 1);

        if (endRow >= 0 && endRow < size && endCol >= 0 && endCol < size) {
          // Check if cells are available
          let canPlace = true;
          const cells: { row: number; col: number }[] = [];

          for (let i = 0; i < wordLen; i++) {
            const r = startRow + dr * i;
            const c = startCol + dc * i;
            const existingLetter = newGrid[r][c].letter;
            
            if (existingLetter && existingLetter !== gameWord.word[i]) {
              canPlace = false;
              break;
            }
            cells.push({ row: r, col: c });
          }

          if (canPlace) {
            // Place the word
            for (let i = 0; i < wordLen; i++) {
              const r = startRow + dr * i;
              const c = startCol + dc * i;
              newGrid[r][c].letter = gameWord.word[i];
              newGrid[r][c].wordColors.push(gameWord.color);
            }
            gameWord.cells = cells;
            placed = true;
          }
        }
        attempts++;
      }

      if (!placed) {
        // Force place the word horizontally
        for (let row = 0; row < size; row++) {
          for (let col = 0; col <= size - gameWord.word.length; col++) {
            let canPlace = true;
            const cells: { row: number; col: number }[] = [];
            
            for (let i = 0; i < gameWord.word.length; i++) {
              const existingLetter = newGrid[row][col + i].letter;
              if (existingLetter && existingLetter !== gameWord.word[i]) {
                canPlace = false;
                break;
              }
              cells.push({ row, col: col + i });
            }
            
            if (canPlace) {
              for (let i = 0; i < gameWord.word.length; i++) {
                newGrid[row][col + i].letter = gameWord.word[i];
                newGrid[row][col + i].wordColors.push(gameWord.color);
              }
              gameWord.cells = cells;
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }
    }

    // Fill empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (!newGrid[row][col].letter) {
          newGrid[row][col].letter = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    return newGrid;
  };

  const handleCellPress = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectedCells([{ row, col }]);
    
    setGrid(prev => prev.map((r, ri) => 
      r.map((cell, ci) => ({
        ...cell,
        isSelected: ri === row && ci === col
      }))
    ));
  };

  const handleCellMove = (row: number, col: number) => {
    if (!isSelecting) return;

    const lastCell = selectedCells[selectedCells.length - 1];
    if (!lastCell || (lastCell.row === row && lastCell.col === col)) return;

    // Check if this cell is already selected
    const existingIndex = selectedCells.findIndex(c => c.row === row && c.col === col);
    if (existingIndex !== -1) {
      // If going backwards, remove cells after this one
      if (existingIndex < selectedCells.length - 1) {
        const newSelected = selectedCells.slice(0, existingIndex + 1);
        setSelectedCells(newSelected);
        setGrid(prev => prev.map((r, ri) => 
          r.map((cell, ci) => ({
            ...cell,
            isSelected: newSelected.some(s => s.row === ri && s.col === ci)
          }))
        ));
      }
      return;
    }

    // Check if movement is in a valid direction (straight line from first cell)
    if (selectedCells.length > 0) {
      const firstCell = selectedCells[0];
      const dr = row - firstCell.row;
      const dc = col - firstCell.col;
      
      // Check if it's a valid straight line
      const isHorizontal = dr === 0;
      const isVertical = dc === 0;
      const isDiagonal = Math.abs(dr) === Math.abs(dc);
      
      if (!isHorizontal && !isVertical && !isDiagonal) return;

      // Make sure all cells in between are selected
      const steps = Math.max(Math.abs(dr), Math.abs(dc));
      const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
      const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
      
      const newSelected: { row: number; col: number }[] = [];
      for (let i = 0; i <= steps; i++) {
        newSelected.push({
          row: firstCell.row + stepR * i,
          col: firstCell.col + stepC * i
        });
      }
      
      setSelectedCells(newSelected);
      setGrid(prev => prev.map((r, ri) => 
        r.map((cell, ci) => ({
          ...cell,
          isSelected: newSelected.some(s => s.row === ri && s.col === ci)
        }))
      ));
    }
  };

  const handleSelectionEnd = () => {
    if (!isSelecting) return;
    setIsSelecting(false);

    // Get selected word
    const selectedWord = selectedCells.map(c => grid[c.row][c.col].letter).join('');
    const reversedWord = selectedWord.split('').reverse().join('');

    // Check if it matches any word
    const matchedWordIndex = words.findIndex(w => 
      !w.found && (w.word === selectedWord || w.word === reversedWord)
    );

    if (matchedWordIndex !== -1) {
      const matchedWord = words[matchedWordIndex];
      
      // Mark word as found
      const updatedWords = [...words];
      updatedWords[matchedWordIndex].found = true;
      setWords(updatedWords);

      // Mark cells as found with the word's color
      setGrid(prev => prev.map((r, ri) => 
        r.map((cell, ci) => {
          const isInWord = selectedCells.some(s => s.row === ri && s.col === ci);
          return {
            ...cell,
            isSelected: false,
            isFound: cell.isFound || isInWord,
            wordColors: isInWord ? [...cell.wordColors, matchedWord.color] : cell.wordColors
          };
        })
      ));

      // Save progress after each word found
      saveProgress();

      // Check if all words found
      if (updatedWords.every(w => w.found)) {
        setIsLevelComplete(true);
        toast.success(`Seviye ${level} tamamlandı!`);
      }
    } else {
      // Clear selection
      setGrid(prev => prev.map(r => 
        r.map(cell => ({
          ...cell,
          isSelected: false
        }))
      ));
    }

    setSelectedCells([]);
  };

  const saveProgress = async () => {
    if (!userId) return;
    
    try {
      await externalSupabase
        .from('word_search_progress')
        .upsert({
          user_id: userId,
          current_level: level,
          used_word_index: usedWordIndex,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const handleNextLevel = () => {
    setHintsUsed(0); // Reset hints for new level
    const newUsedWordIndex = usedWordIndex + WORDS_PER_LEVEL;
    const newLevel = level + 1;
    setUsedWordIndex(newUsedWordIndex);
    setLevel(newLevel);
    
    // Save progress for next level
    if (userId) {
      (async () => {
        try {
          await externalSupabase
            .from('word_search_progress')
            .upsert({
              user_id: userId,
              current_level: newLevel,
              used_word_index: newUsedWordIndex,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        } catch (error) {
          console.error('Error saving progress:', error);
        }
      })();
    }
  };

  const handleHint = () => {
    if (hintsUsed >= MAX_HINTS) {
      toast.error('İpucu hakkınız bitti!');
      return;
    }

    // Find an unfound word
    const unfoundWord = words.find(w => !w.found);
    if (!unfoundWord || unfoundWord.cells.length === 0) {
      toast.info('Gösterilecek ipucu yok');
      return;
    }

    // Find a cell that hasn't been hinted yet
    const unhintedCell = unfoundWord.cells.find(c => !grid[c.row][c.col].isHinted);
    if (!unhintedCell) {
      toast.info('Bu kelime için tüm ipuçları gösterildi');
      return;
    }

    // Mark the cell as hinted
    setGrid(prev => prev.map((r, ri) => 
      r.map((cell, ci) => ({
        ...cell,
        isHinted: (ri === unhintedCell.row && ci === unhintedCell.col) ? true : cell.isHinted
      }))
    ));

    setHintsUsed(prev => prev + 1);
    toast.success(`İpucu: "${unfoundWord.word}" kelimesinden bir harf gösterildi`);
  };

  const getCellStyle = (cell: Cell) => {
    if (cell.isSelected) {
      return { backgroundColor: 'hsl(var(--primary))', color: 'white' };
    }
    
    const foundWord = words.find(w => 
      w.found && w.cells.some(c => c.row === cell.row && c.col === cell.col)
    );
    
    if (foundWord) {
      return { backgroundColor: foundWord.color, color: 'white' };
    }

    // Hinted cell - show with a pulsing border
    if (cell.isHinted) {
      const hintWord = words.find(w => 
        !w.found && w.cells.some(c => c.row === cell.row && c.col === cell.col)
      );
      if (hintWord) {
        return { 
          backgroundColor: `${hintWord.color}40`,
          border: `2px solid ${hintWord.color}`,
          color: hintWord.color
        };
      }
    }
    
    return {};
  };


  // Calculate cell size based on grid size
  const getCellSizeClass = () => {
    if (gridSize <= 8) return 'w-9 h-9 sm:w-11 sm:h-11 text-base sm:text-lg';
    if (gridSize <= 10) return 'w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base';
    if (gridSize <= 12) return 'w-7 h-7 sm:w-8 sm:h-8 text-xs sm:text-sm';
    return 'w-6 h-6 sm:w-7 sm:h-7 text-xs';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Yükleniyor...</div>
      </div>
    );
  }

  if (allLevelsComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <Trophy className="w-12 h-12 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tebrikler!</h1>
        <p className="text-muted-foreground mb-8">Tüm seviyeleri tamamladınız!</p>
        <Button onClick={onBack}>Ana Menüye Dön</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Kelime Bulmaca</h1>
          <p className="text-sm text-muted-foreground">
            Level {level}
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleHint}
          disabled={hintsUsed >= MAX_HINTS || isLevelComplete}
          className="flex items-center gap-1"
        >
          <Lightbulb className="w-4 h-4" />
          {MAX_HINTS - hintsUsed}
        </Button>
      </div>

      {/* Word List */}
      <div className="px-4 py-3 bg-card/50 mx-4 rounded-xl">
        <div className="flex flex-wrap gap-3 justify-center">
          {words.map((word, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
            >
              <span
                className={`text-sm font-bold px-2 py-1 rounded transition-all ${
                  word.found ? 'line-through opacity-50' : ''
                }`}
                style={{ color: word.color }}
              >
                {word.word}
              </span>
              {word.found && word.turkish && (
                <span className="text-xs text-muted-foreground mt-0.5">
                  {word.turkish}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div 
          className="bg-card rounded-2xl p-2 sm:p-3 shadow-lg"
          onMouseUp={handleSelectionEnd}
          onMouseLeave={handleSelectionEnd}
          onTouchEnd={handleSelectionEnd}
        >
          <div 
            className="grid gap-0.5 sm:gap-1"
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            }}
          >
            {grid.map((row, ri) =>
              row.map((cell, ci) => (
                <div
                  key={`${ri}-${ci}`}
                  className={`${getCellSizeClass()} rounded flex items-center justify-center font-bold cursor-pointer select-none transition-all duration-150`}
                  style={getCellStyle(cell)}
                  onMouseDown={() => handleCellPress(ri, ci)}
                  onMouseEnter={() => handleCellMove(ri, ci)}
                  onTouchStart={() => handleCellPress(ri, ci)}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (element) {
                      const match = element.getAttribute('data-cell');
                      if (match) {
                        const [r, c] = match.split('-').map(Number);
                        handleCellMove(r, c);
                      }
                    }
                  }}
                  data-cell={`${ri}-${ci}`}
                >
                  {cell.letter}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Level Complete Button */}
      {isLevelComplete && (
        <div className="p-4">
          <Button 
            onClick={handleNextLevel} 
            className="w-full h-14 text-lg bg-primary hover:bg-primary/90"
          >
            Sonraki Seviye
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}

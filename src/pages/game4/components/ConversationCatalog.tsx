import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Mic, MicOff, Volume2, Check, X, ChevronDown, ChevronUp, Book, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { externalSupabase, ExternalBook } from '@/lib/externalSupabase';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import BookViewer from '@/components/BookViewer';

interface ConversationCatalogProps {
  onBack: () => void;
}

interface WordItem {
  english: string;
  turkish: string;
  package_name: string;
}

interface WordPracticeResult {
  word: string;
  correct: boolean | null;
}

interface SavedStory {
  id: string;
  package_name: string;
  story: string;
  transcription: string | null;
  accuracy: number | null;
  incorrect_words: string[];
  word_practice_results: WordPracticeResult[];
  created_at: string;
}

export function ConversationCatalog({ onBack }: ConversationCatalogProps) {
  const [allPackages, setAllPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedPackageWords, setSelectedPackageWords] = useState<WordItem[]>([]);
  const [allVocabularyWords, setAllVocabularyWords] = useState<WordItem[]>([]);
  
  const [books, setBooks] = useState<ExternalBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<ExternalBook | null>(null);
  const [isLoadingBook, setIsLoadingBook] = useState(false);
  const [isDocumentFile, setIsDocumentFile] = useState(false);
  
  const [story, setStory] = useState<string>('');
  const [transcription, setTranscription] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<{ word: string; correct: boolean }[]>([]);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [incorrectWords, setIncorrectWords] = useState<string[]>([]);
  const [wordPracticeResults, setWordPracticeResults] = useState<WordPracticeResult[]>([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  
  const [savedStoriesOpen, setSavedStoriesOpen] = useState(false);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  
  const [practicingWord, setPracticingWord] = useState<string | null>(null);
  const [isPracticeRecording, setIsPracticeRecording] = useState(false);
  const [isPracticeTranscribing, setIsPracticeTranscribing] = useState(false);
  const [vocabularyOpen, setVocabularyOpen] = useState(false);
  const [previousVocabularyWords, setPreviousVocabularyWords] = useState<WordItem[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const practiceMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const practiceAudioChunksRef = useRef<Blob[]>([]);

  // Load all packages and books on mount
  useEffect(() => {
    loadAllPackages();
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      console.log('Fetching books from external DB...');
      const { data, error } = await externalSupabase
        .from('books')
        .select('*')
        .order('display_order');
      
      console.log('Books response:', { data, error });
      
      if (error) {
        console.error('Books fetch error:', error);
        toast.error('Kitaplar yüklenemedi: ' + error.message);
        return;
      }
      if (data && data.length > 0) {
        setBooks(data as ExternalBook[]);
        console.log('Books loaded:', data.length);
      } else {
        console.log('No books found in database');
        toast.info('Veritabanında kitap bulunamadı');
      }
    } catch (error) {
      console.error('Error loading books:', error);
      toast.error('Kitaplar yüklenirken hata oluştu');
    }
  };

  const handleSelectBook = async (book: ExternalBook) => {
    setSelectedBook(book);
    setTranscription('');
    setComparisonResult([]);
    setAccuracy(null);
    setIncorrectWords([]);
    setWordPracticeResults([]);
    setStory('');
    
    // Check if file_url exists
    if (!book.file_url) {
      toast.error('Bu kitabın dosyası henüz yüklenmemiş');
      setIsDocumentFile(false);
      setIsLoadingBook(false);
      return;
    }
    
    setIsLoadingBook(true);
    
    // Detect file type
    const url = book.file_url.toLowerCase();
    const isDocument = url.includes('.pdf') || url.includes('.docx') || url.includes('.doc');
    setIsDocumentFile(isDocument);
    
    if (!isDocument) {
      // Plain text file
      try {
        const response = await fetch(book.file_url);
        if (!response.ok) throw new Error('Failed to fetch book content');
        const content = await response.text();
        setStory(content);
      } catch (error) {
        console.error('Error loading book content:', error);
        toast.error('Kitap içeriği yüklenemedi');
      }
    }
    
    setIsLoadingBook(false);
  };

  const handleTextExtracted = (text: string) => {
    setStory(text);
  };

  const loadAllPackages = async () => {
    try {
      const { data } = await externalSupabase
        .from('learned_words')
        .select('package_name');
      
      if (data) {
        const uniquePackages = [...new Set(data.map(p => p.package_name))].sort((a, b) => {
          const [a1, a2, a3] = a.split('.').map(Number);
          const [b1, b2, b3] = b.split('.').map(Number);
          if (a1 !== b1) return a1 - b1;
          if (a2 !== b2) return a2 - b2;
          return a3 - b3;
        });
        setAllPackages(uniquePackages);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  // Get the 5 packages (selected + 4 previous)
  const getPackageGroup = (packageName: string): string[] => {
    const parts = packageName.split('.');
    if (parts.length !== 3) return [packageName];
    
    const section = `${parts[0]}.${parts[1]}`;
    const roundNum = parseInt(parts[2]);
    
    const packages: string[] = [];
    for (let i = Math.max(1, roundNum - 4); i <= roundNum; i++) {
      packages.push(`${section}.${i}`);
    }
    return packages;
  };

  // Load words for selected package group
  // Get all packages before a given package (across all sections)
  const getAllPreviousPackages = (packageName: string, allPkgs: string[]): string[] => {
    const currentIndex = allPkgs.indexOf(packageName);
    if (currentIndex <= 0) return [];
    return allPkgs.slice(0, currentIndex);
  };

  const loadWordsForPackage = async (packageName: string) => {
    try {
      const packageGroup = getPackageGroup(packageName);
      
      // Load selected 5 packages words (red words)
      const { data: packageWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', packageGroup);
      
      if (packageWords) {
        const uniqueWordsMap = new Map<string, WordItem>();
        for (const w of packageWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, w);
          }
        }
        setSelectedPackageWords(Array.from(uniqueWordsMap.values()));
      }

      // Get ALL packages before the first package in the group (across all sections)
      const firstPackageInGroup = packageGroup[0];
      const allPreviousPackages = getAllPreviousPackages(firstPackageInGroup, allPackages);
      
      // Load all previous vocabulary words (from packages before the selected 5)
      if (allPreviousPackages.length > 0) {
        const { data: prevWords } = await externalSupabase
          .from('learned_words')
          .select('english, turkish, package_name')
          .in('package_name', allPreviousPackages);
        
        if (prevWords) {
          const uniqueMap = new Map<string, WordItem>();
          for (const w of prevWords) {
            if (!uniqueMap.has(w.english)) {
              uniqueMap.set(w.english, w);
            }
          }
          setPreviousVocabularyWords(Array.from(uniqueMap.values()));
        }
      } else {
        setPreviousVocabularyWords([]);
      }
      
      // All vocabulary = selected + previous
      const allPackagesUpToSelected = [...allPreviousPackages, ...packageGroup];
      const { data: allWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', allPackagesUpToSelected);
      
      if (allWords) {
        const uniqueMap = new Map<string, WordItem>();
        for (const w of allWords) {
          if (!uniqueMap.has(w.english)) {
            uniqueMap.set(w.english, w);
          }
        }
        setAllVocabularyWords(Array.from(uniqueMap.values()));
      }
    } catch (error) {
      console.error('Error loading words:', error);
    }
  };

  const handleSelectPackage = async (pkg: string) => {
    setSelectedPackage(pkg);
    setStory('');
    setTranscription('');
    setComparisonResult([]);
    setAccuracy(null);
    setIncorrectWords([]);
    setWordPracticeResults([]);
    setCurrentStoryId(null);
    await loadWordsForPackage(pkg);
  };

  const saveStory = async (autoSave = false) => {
    if (!story || !selectedPackage) return;
    
    setIsSaving(true);
    try {
      const storyData = {
        package_name: selectedPackage,
        story,
        transcription: transcription || null,
        accuracy: accuracy,
        incorrect_words: incorrectWords as unknown as null,
        word_practice_results: wordPracticeResults as unknown as null
      };

      if (currentStoryId) {
        // Update existing
        const { error } = await supabase
          .from('conversation_stories')
          .update(storyData)
          .eq('id', currentStoryId);
        
        if (error) throw error;
        if (!autoSave) toast.success('Kaydedildi!');
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('conversation_stories')
          .insert(storyData)
          .select('id')
          .single();
        
        if (error) throw error;
        setCurrentStoryId(data.id);
        if (!autoSave) toast.success('Kaydedildi!');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Kaydetme hatası');
    } finally {
      setIsSaving(false);
    }
  };

  const getDifficultyLevel = (vocabSize: number): { level: string; description: string } => {
    if (vocabSize <= 1000) return { level: 'very_easy', description: 'Çok Kolay' };
    if (vocabSize <= 3000) return { level: 'easy', description: 'Kolay' };
    if (vocabSize <= 5000) return { level: 'medium', description: 'Orta' };
    if (vocabSize <= 10000) return { level: 'medium_hard', description: 'Orta-Zor' };
    return { level: 'hard', description: 'Zor' };
  };

  const generateStory = async () => {
    if (selectedPackageWords.length === 0) {
      toast.error('Önce paket seçin');
      return;
    }

    setIsGenerating(true);
    setCurrentStoryId(null);
    
    try {
      const totalVocabSize = allVocabularyWords.length;
      const difficulty = getDifficultyLevel(totalVocabSize);
      
      // 70% from selected 5 packages (red words)
      const mainWordCount = Math.ceil(selectedPackageWords.length * 0.7);
      const mainWords = selectedPackageWords
        .sort(() => Math.random() - 0.5)
        .slice(0, mainWordCount);
      
      // 20-30% from previous vocabulary (non-red words)
      const extraWordCount = Math.ceil(mainWordCount * 0.35); // ~25% of main
      const extraWords = previousVocabularyWords
        .sort(() => Math.random() - 0.5)
        .slice(0, extraWordCount);
      
      const allWordsToUse = [...mainWords, ...extraWords];
      
      const mainWordList = mainWords.map(w => `${w.english} (${w.turkish})`).join(', ');
      const extraWordList = extraWords.length > 0 
        ? extraWords.map(w => `${w.english} (${w.turkish})`).join(', ')
        : 'none';
      
      // Calculate extra word allowance based on difficulty
      let extraWordAllowance = '10%';
      let sentenceCount = '10-12';
      let styleInstructions = '';
      
      switch (difficulty.level) {
        case 'very_easy':
          extraWordAllowance = '15%';
          sentenceCount = '10-13';
          styleInstructions = `
- Use VERY simple sentences (5-8 words each)
- Use basic vocabulary and present tense only
- Simple, clear narrative with a beginning, middle, and end
- Use common connecting words like "and", "but", "then", "so"`;
          break;
        case 'easy':
          extraWordAllowance = '15%';
          sentenceCount = '13-16';
          styleInstructions = `
- Use simple sentences (8-12 words each)
- Use basic grammar with mostly present and past tense
- Create a flowing narrative with logical progression
- Use transition words to connect ideas naturally`;
          break;
        case 'medium':
          extraWordAllowance = '20%';
          sentenceCount = '16-20';
          styleInstructions = `
- Use moderate sentences (10-15 words each)
- Include some complex sentences and varied tenses
- Write with narrative depth and character development
- Use descriptive language and natural transitions`;
          break;
        case 'medium_hard':
          extraWordAllowance = '25%';
          sentenceCount = '16-20';
          styleInstructions = `
- Use varied sentence structures (12-18 words)
- Include complex grammar and diverse vocabulary
- Create rich storytelling with vivid descriptions
- Use sophisticated transitions and literary techniques`;
          break;
        case 'hard':
          extraWordAllowance = '30%';
          sentenceCount = '16-20';
          styleInstructions = `
- Use sophisticated sentences with complex structures
- Include advanced vocabulary, idioms, and various grammatical constructions
- Write with literary depth, nuanced characters, and atmospheric descriptions
- Employ advanced narrative techniques and elegant prose`;
          break;
      }
      
      const prompt = `You are a skilled storyteller. Write a cohesive, engaging short story in English that reads like an excerpt from a published book.

CRITICAL REQUIREMENTS (do all):
1) This must be ONE coherent story (not a sentence list).
2) Use REAL HUMAN NAMES for characters (e.g., Sarah, Michael, Emma, David, etc.) - this makes the story feel authentic.
3) Keep the SAME characters, place, and time throughout (no random jumps).
4) Every sentence MUST connect to the previous one through:
   - Cause and effect ("Because of this...", "As a result...")
   - Time progression ("Later that day...", "After finishing...")
   - Character reactions ("She felt...", "This made him...")
   - Continuation of action ("He then...", "She continued to...")
5) Include a clear narrative arc: setup → development/complication → resolution.

SENTENCE CONNECTION RULES:
- Each sentence must refer back to something in the previous sentence (a person, object, action, or emotion).
- Use pronouns naturally to maintain continuity (he, she, they, it, this, that).
- Never start two consecutive sentences the same way.
- Link sentences with conjunctions and transitions: "however", "therefore", "meanwhile", "because", "so", "then", "after that", "as a result", "despite this", "fortunately".

STRUCTURE:
- Write the story in 2–3 paragraphs (NOT one sentence per line).
- First paragraph: introduce character(s) by name and set the scene.
- Middle: develop the situation with connected events.
- End: bring the story to a natural conclusion.

SENTENCE LENGTH:
- Write medium to long sentences (15-25 words each).
- Combine ideas using conjunctions (and, but, because, when, while, although, since).
- Avoid short choppy sentences. Create flowing, natural prose.

WORD USAGE (CRITICAL - MUST FOLLOW):
- PRIORITY WORDS LIST (${selectedPackageWords.length} words total): ${mainWordList}
- You MUST use AT LEAST ${Math.ceil(selectedPackageWords.length * 0.65)}-${Math.ceil(selectedPackageWords.length * 0.75)} of these priority words (65-75%).
- CRITICAL: USE EACH WORD ONLY ONCE! Do NOT repeat the same word multiple times. 
- If you need more vocabulary variety, use synonyms or words from this secondary list: ${extraWordList}
- Prioritize using MORE DIFFERENT words rather than repeating the same words.
- You MAY use additional common words to ensure the story flows naturally.

STYLE GUIDELINES:
${styleInstructions}

LENGTH: Write a story that is 100-150 words total. Use the length to include MORE UNIQUE priority words, not to repeat the same ones.

IMPORTANT:
- Write ONLY the story (no title, no bullet points, no explanations).
- Count carefully: you must include at least ${Math.ceil(selectedPackageWords.length * 0.65)} of the ${selectedPackageWords.length} priority words.
- NO WORD REPETITION: Each priority word should appear exactly ONCE in the story.

Begin the story:`;

      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: {
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile'
        }
      });

      if (error) throw error;
      
      const newStory = data.content || '';
      setStory(newStory);
      setTranscription('');
      setComparisonResult([]);
      setAccuracy(null);
      setIncorrectWords([]);
      setWordPracticeResults([]);
      
      // Auto-save after generating
      setTimeout(async () => {
        const storyData = {
          package_name: selectedPackage,
          story: newStory,
          transcription: null,
          accuracy: null,
          incorrect_words: [],
          word_practice_results: []
        };
        
        const { data: savedData, error: saveError } = await supabase
          .from('conversation_stories')
          .insert(storyData)
          .select('id')
          .single();
        
        if (!saveError && savedData) {
          setCurrentStoryId(savedData.id);
        }
      }, 100);
      
      toast.success('Hikaye oluşturuldu ve kaydedildi!');
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Hikaye oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('Kayıt başladı. Hikayeyi okuyun...');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Mikrofon erişimi sağlanamadı');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    return new Promise<Blob>((resolve) => {
      mediaRecorderRef.current!.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    });
  };

  const handleRecordToggle = async () => {
    if (isRecording) {
      setIsTranscribing(true);
      const audioBlob = await stopRecording();
      
      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { audio: base64Audio }
          });

          if (error) throw error;
          
          const transcribedText = data.text || '';
          setTranscription(transcribedText);
          
          compareTexts(story, transcribedText);
          
          toast.success('Transkripsiyon tamamlandı!');
          
          // Auto-save after transcription
          saveStory(true);
        };
      } catch (error) {
        console.error('Error transcribing:', error);
        toast.error('Transkripsiyon hatası');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      await startRecording();
    }
  };

  const compareTexts = (original: string, transcribed: string) => {
    const originalWords = original.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/);
    const transcribedWords = transcribed.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/);
    
    const results: { word: string; correct: boolean }[] = [];
    const wrongWords: string[] = [];
    
    transcribedWords.forEach((word) => {
      const isCorrect = originalWords.includes(word);
      results.push({ word, correct: isCorrect });
      if (!isCorrect && word.length > 2) {
        wrongWords.push(word);
      }
    });
    
    setComparisonResult(results);
    setIncorrectWords([...new Set(wrongWords)]);
    setWordPracticeResults([...new Set(wrongWords)].map(w => ({ word: w, correct: null })));
    
    const correctCount = results.filter(r => r.correct).length;
    const accuracyPercent = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
    setAccuracy(accuracyPercent);
  };

  const speakWord = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const startWordPractice = async (word: string) => {
    setPracticingWord(word);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      practiceMediaRecorderRef.current = mediaRecorder;
      practiceAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        practiceAudioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsPracticeRecording(true);
      toast.info(`"${word}" kelimesini söyleyin...`);
    } catch (error) {
      console.error('Error starting practice recording:', error);
      toast.error('Mikrofon erişimi sağlanamadı');
      setPracticingWord(null);
    }
  };

  const stopWordPractice = async () => {
    if (!practiceMediaRecorderRef.current || !practicingWord) return;

    setIsPracticeTranscribing(true);
    
    const audioBlob = await new Promise<Blob>((resolve) => {
      practiceMediaRecorderRef.current!.onstop = () => {
        const blob = new Blob(practiceAudioChunksRef.current, { type: 'audio/webm' });
        resolve(blob);
      };
      practiceMediaRecorderRef.current!.stop();
      practiceMediaRecorderRef.current!.stream.getTracks().forEach(track => track.stop());
    });
    
    setIsPracticeRecording(false);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });

        if (error) throw error;
        
        const transcribedWord = (data.text || '').toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
        const targetWord = practicingWord.toLowerCase();
        
        const isCorrect = transcribedWord.includes(targetWord) || targetWord.includes(transcribedWord);
        
        setWordPracticeResults(prev => 
          prev.map(w => w.word === practicingWord ? { ...w, correct: isCorrect } : w)
        );
        
        if (isCorrect) {
          toast.success('Doğru!');
        } else {
          toast.error(`Yanlış. Söylediğiniz: "${transcribedWord}"`);
        }
        
        // Auto-save after practice
        saveStory(true);
      };
    } catch (error) {
      console.error('Error transcribing practice:', error);
      toast.error('Transkripsiyon hatası');
    } finally {
      setIsPracticeTranscribing(false);
      setPracticingWord(null);
    }
  };

  const loadSavedStories = async () => {
    setLoadingSaved(true);
    try {
      const { data, error } = await supabase
        .from('conversation_stories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setSavedStories((data || []).map(s => ({
        ...s,
        incorrect_words: (s.incorrect_words as unknown as string[]) || [],
        word_practice_results: (s.word_practice_results as unknown as WordPracticeResult[]) || []
      })));
    } catch (error) {
      console.error('Error loading saved stories:', error);
      toast.error('Kayıtlı hikayeler yüklenemedi');
    } finally {
      setLoadingSaved(false);
    }
  };

  const loadSavedStory = (saved: SavedStory) => {
    setSelectedPackage(saved.package_name);
    setStory(saved.story);
    setTranscription(saved.transcription || '');
    setAccuracy(saved.accuracy);
    setIncorrectWords(saved.incorrect_words);
    setWordPracticeResults(saved.word_practice_results);
    setCurrentStoryId(saved.id);
    
    if (saved.transcription) {
      compareTexts(saved.story, saved.transcription);
    }
    
    setSavedStoriesOpen(false);
    loadWordsForPackage(saved.package_name);
    toast.success('Hikaye yüklendi');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Konuşma Kataloğu</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Book className="w-4 h-4 mr-1" />
                {selectedBook?.title || 'Kitap Seç'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              {books.map(book => (
                <DropdownMenuItem key={book.id} onClick={() => handleSelectBook(book)}>
                  {book.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Collapsible Vocabulary Section */}
        {selectedPackageWords.length > 0 && (
          <Collapsible open={vocabularyOpen} onOpenChange={setVocabularyOpen}>
            <Card className="bg-muted/50">
              <CollapsibleTrigger asChild>
                <CardContent className="p-3 cursor-pointer hover:bg-muted/70 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Kelime Haznesi</p>
                      <p className="text-xs text-muted-foreground">
                        Seçilen: {selectedPackageWords.length} kelime | Önceki: {previousVocabularyWords.length} kelime | Toplam: {allVocabularyWords.length} kelime
                      </p>
                    </div>
                    {vocabularyOpen ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 pt-0 border-t border-border">
                  <ScrollArea className="h-64">
                    {/* Selected 5 packages words - Red */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-red-500 mb-2">
                        Seçilen 5 Paket ({selectedPackageWords.length} kelime):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPackageWords.map((w, idx) => (
                          <span key={idx} className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded">
                            {w.english}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Previous vocabulary words - Normal */}
                    {previousVocabularyWords.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Önceki Paketler ({previousVocabularyWords.length} kelime):
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {previousVocabularyWords.map((w, idx) => (
                            <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                              {w.english}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Story/Book box */}
        <Card className={isDocumentFile && selectedBook ? "h-96" : ""}>
          <CardContent className={`p-4 ${isDocumentFile && selectedBook ? "h-full flex flex-col" : ""}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isDocumentFile ? <FileText className="w-4 h-4" /> : null}
                <p className="text-sm font-medium">
                  {isDocumentFile ? 'Kitap İçeriği' : 'Hikaye'}
                </p>
              </div>
              {story && !isDocumentFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const utterance = new SpeechSynthesisUtterance(story);
                    utterance.lang = 'en-US';
                    speechSynthesis.speak(utterance);
                  }}
                >
                  <Volume2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {isDocumentFile && selectedBook?.file_url ? (
              <div className="flex-1 min-h-0">
                <BookViewer 
                  fileUrl={selectedBook.file_url}
                  bookId={selectedBook.id}
                  onTextExtracted={handleTextExtracted}
                />
              </div>
            ) : selectedBook && !selectedBook.file_url ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                <p className="text-sm">Bu kitabın dosyası henüz yüklenmemiş</p>
              </div>
            ) : (
              <ScrollArea className="h-48">
                {isLoadingBook ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : story ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {story.split(/(\s+)/).map((segment, idx) => {
                      const cleanWord = segment.toLowerCase().replace(/[.,!?;:'"()]/g, '');
                      const isSelectedWord = selectedPackageWords.some(w => w.english.toLowerCase() === cleanWord);
                      const isPreviousWord = previousVocabularyWords.some(w => w.english.toLowerCase() === cleanWord);
                      
                      if (isSelectedWord) {
                        return <span key={idx} className="text-purple-500 font-medium">{segment}</span>;
                      } else if (isPreviousWord) {
                        return <span key={idx} className="text-green-500">{segment}</span>;
                      }
                      return <span key={idx}>{segment}</span>;
                    })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Kitap seçin
                  </p>
                )}
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Record button */}
        <Button 
          onClick={handleRecordToggle}
          disabled={!story || isTranscribing}
          variant={isRecording ? "destructive" : "default"}
          className="w-full"
        >
          {isTranscribing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Transkripsiyon yapılıyor...
            </>
          ) : isRecording ? (
            <>
              <MicOff className="w-4 h-4 mr-2" />
              Kaydı Durdur
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 mr-2" />
              Konuş
            </>
          )}
        </Button>

        {/* Transcription box */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Transkripsiyon</p>
              {accuracy !== null && (
                <span className={`text-sm font-bold ${accuracy >= 70 ? 'text-green-500' : accuracy >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                  %{accuracy} doğruluk
                </span>
              )}
            </div>
            <ScrollArea className="h-48">
              {comparisonResult.length > 0 ? (
                <p className="text-sm leading-relaxed">
                  {comparisonResult.map((item, idx) => (
                    <span
                      key={idx}
                      className={item.correct ? '' : 'text-red-500 font-medium'}
                    >
                      {item.word}{' '}
                    </span>
                  ))}
                </p>
              ) : transcription ? (
                <p className="text-sm leading-relaxed">{transcription}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Hikayeyi okuyup kaydedin
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Incorrect words practice section */}
        {wordPracticeResults.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium mb-3">Yanlış Kelimeler - Pratik Yap</p>
              <div className="space-y-2">
                {wordPracticeResults.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      {item.correct === true && (
                        <Check className="w-5 h-5 text-green-500" />
                      )}
                      {item.correct === false && (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                      {item.correct === null && (
                        <div className="w-5 h-5" />
                      )}
                      <span className={`font-medium ${
                        item.correct === true ? 'text-green-600' : 
                        item.correct === false ? 'text-red-500' : ''
                      }`}>
                        {item.word}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakWord(item.word)}
                        title="Seslendir"
                      >
                        <Volume2 className="w-4 h-4" />
                      </Button>
                      
                      {practicingWord === item.word ? (
                        <Button
                          variant={isPracticeRecording ? "destructive" : "default"}
                          size="sm"
                          onClick={stopWordPractice}
                          disabled={isPracticeTranscribing}
                        >
                          {isPracticeTranscribing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MicOff className="w-4 h-4" />
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startWordPractice(item.word)}
                          disabled={practicingWord !== null}
                          title="Konuş"
                        >
                          <Mic className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Saved Stories Dialog */}
      <Dialog open={savedStoriesOpen} onOpenChange={setSavedStoriesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kayıtlı Hikayeler</DialogTitle>
          </DialogHeader>
          
          {loadingSaved ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : savedStories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Kayıtlı hikaye yok
            </p>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2">
                {savedStories.map(saved => (
                  <Card 
                    key={saved.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => loadSavedStory(saved)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{saved.package_name}</span>
                        {saved.accuracy !== null && (
                          <span className={`text-xs font-bold ${
                            saved.accuracy >= 70 ? 'text-green-500' : 
                            saved.accuracy >= 50 ? 'text-yellow-500' : 'text-red-500'
                          }`}>
                            %{saved.accuracy}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {saved.story.substring(0, 100)}...
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(saved.created_at).toLocaleDateString('tr-TR')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

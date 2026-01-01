import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, Mic, MicOff, Volume2, Check, X, ChevronDown, ChevronUp, Book, FileText } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
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
import BookViewer from './BookViewer';

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

interface ExternalBook {
  id: string;
  title: string;
  file_url: string | null;
  cover_url?: string;
  category?: string;
  display_order: number;
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
      console.log('Fetching books from DB...');
      const { data, error } = await supabase
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
      const { data } = await supabase
        .from('learned_words')
        .select('package_name');
      
      if (data) {
        const uniquePackages = [...new Set(data.map(p => p.package_name).filter(Boolean))]
          .sort((a, b) => {
            if (!a || !b) return 0;
            const [a1, a2, a3] = a.split('.').map(Number);
            const [b1, b2, b3] = b.split('.').map(Number);
            if (a1 !== b1) return a1 - b1;
            if (a2 !== b2) return a2 - b2;
            return a3 - b3;
          }) as string[];
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
      const { data: packageWords } = await supabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', packageGroup);
      
      if (packageWords) {
        const uniqueWordsMap = new Map<string, WordItem>();
        for (const w of packageWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, w as WordItem);
          }
        }
        setSelectedPackageWords(Array.from(uniqueWordsMap.values()));
      }

      // Get ALL packages before the first package in the group (across all sections)
      const firstPackageInGroup = packageGroup[0];
      const allPreviousPackages = getAllPreviousPackages(firstPackageInGroup, allPackages);
      
      // Load all previous vocabulary words (from packages before the selected 5)
      if (allPreviousPackages.length > 0) {
        const { data: prevWords } = await supabase
          .from('learned_words')
          .select('english, turkish, package_name')
          .in('package_name', allPreviousPackages);
        
        if (prevWords) {
          const uniqueMap = new Map<string, WordItem>();
          for (const w of prevWords) {
            if (!uniqueMap.has(w.english)) {
              uniqueMap.set(w.english, w as WordItem);
            }
          }
          setPreviousVocabularyWords(Array.from(uniqueMap.values()));
        }
      } else {
        setPreviousVocabularyWords([]);
      }
      
      // All vocabulary = selected + previous
      const allPackagesUpToSelected = [...allPreviousPackages, ...packageGroup];
      const { data: allWords } = await supabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', allPackagesUpToSelected);
      
      if (allWords) {
        const uniqueMap = new Map<string, WordItem>();
        for (const w of allWords) {
          if (!uniqueMap.has(w.english)) {
            uniqueMap.set(w.english, w as WordItem);
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
    await loadWordsForPackage(pkg);
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
    
    try {
      const totalVocabSize = allVocabularyWords.length;
      const difficulty = getDifficultyLevel(totalVocabSize);
      
      // 70% from selected 5 packages (red words)
      const mainWordCount = Math.ceil(selectedPackageWords.length * 0.7);
      const mainWords = selectedPackageWords
        .sort(() => Math.random() - 0.5)
        .slice(0, mainWordCount);
      
      // 20-30% from previous vocabulary (non-red words)
      const extraWordCount = Math.ceil(mainWordCount * 0.35);
      const extraWords = previousVocabularyWords
        .sort(() => Math.random() - 0.5)
        .slice(0, extraWordCount);
      
      const mainWordList = mainWords.map(w => `${w.english} (${w.turkish})`).join(', ');
      const extraWordList = extraWords.length > 0 
        ? extraWords.map(w => `${w.english} (${w.turkish})`).join(', ')
        : 'none';
      
      const prompt = `Write a short English story (100-150 words) using these words naturally:
Main words: ${mainWordList}
Additional words: ${extraWordList}

Write ONLY the story, no title or explanation.`;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt }
      });

      if (error) throw error;
      
      setStory(data.response || data.message || 'Hikaye oluşturulamadı');
    } catch (error) {
      console.error('Error generating story:', error);
      toast.error('Hikaye oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error('Tarayıcınız ses sentezini desteklemiyor');
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Mikrofon erişimi sağlanamadı');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            audio: base64Audio,
            mode: 'transcribe'
          }
        });

        if (error) throw error;
        
        const transcribedText = data.text || '';
        setTranscription(transcribedText);
        compareTexts(story, transcribedText);
      };
    } catch (error) {
      console.error('Error transcribing:', error);
      toast.error('Ses dönüştürme hatası');
    } finally {
      setIsTranscribing(false);
    }
  };

  const compareTexts = (original: string, spoken: string) => {
    const originalWords = original.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const spokenWords = spoken.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    const result = originalWords.map((word, index) => ({
      word,
      correct: spokenWords.includes(word)
    }));
    
    setComparisonResult(result);
    
    const correctCount = result.filter(r => r.correct).length;
    const acc = Math.round((correctCount / originalWords.length) * 100);
    setAccuracy(acc);
    
    const incorrect = result.filter(r => !r.correct).map(r => r.word);
    setIncorrectWords([...new Set(incorrect)]);
    
    // Initialize word practice results
    setWordPracticeResults(incorrect.map(word => ({ word, correct: null })));
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(practiceAudioChunksRef.current, { type: 'audio/webm' });
        await checkWordPronunciation(word, audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsPracticeRecording(true);
    } catch (error) {
      console.error('Error starting practice recording:', error);
      toast.error('Mikrofon erişimi sağlanamadı');
      setPracticingWord(null);
    }
  };

  const stopWordPractice = () => {
    if (practiceMediaRecorderRef.current && isPracticeRecording) {
      practiceMediaRecorderRef.current.stop();
      setIsPracticeRecording(false);
    }
  };

  const checkWordPronunciation = async (word: string, audioBlob: Blob) => {
    setIsPracticeTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        
        const { data, error } = await supabase.functions.invoke('text-to-speech', {
          body: { 
            audio: base64Audio,
            mode: 'transcribe'
          }
        });

        if (error) throw error;
        
        const transcribedWord = (data.text || '').toLowerCase().trim();
        const isCorrect = transcribedWord.includes(word.toLowerCase());
        
        setWordPracticeResults(prev => 
          prev.map(r => r.word === word ? { ...r, correct: isCorrect } : r)
        );
        
        if (isCorrect) {
          toast.success(`"${word}" doğru telaffuz edildi!`);
        } else {
          toast.error(`"${word}" yanlış. Söylenen: "${transcribedWord}"`);
        }
        
        setPracticingWord(null);
      };
    } catch (error) {
      console.error('Error checking pronunciation:', error);
      toast.error('Kontrol hatası');
      setPracticingWord(null);
    } finally {
      setIsPracticeTranscribing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Konuşma Pratiği</h1>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Package Selection */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-1">
                  {selectedPackage || 'Paket Seç'}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="max-h-60 overflow-y-auto">
                {allPackages.map(pkg => (
                  <DropdownMenuItem key={pkg} onClick={() => handleSelectPackage(pkg)}>
                    {pkg}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {books.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Book className="w-4 h-4 mr-2" />
                    Kitap
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-60 overflow-y-auto">
                  {books.map(book => (
                    <DropdownMenuItem key={book.id} onClick={() => handleSelectBook(book)}>
                      {book.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Selected Package Words */}
          {selectedPackageWords.length > 0 && (
            <Collapsible open={vocabularyOpen} onOpenChange={setVocabularyOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  Kelimeler ({selectedPackageWords.length})
                  {vocabularyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedPackageWords.map((word, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                        >
                          {word.english}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Generate Story Button */}
          {selectedPackage && !story && (
            <Button 
              onClick={generateStory} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hikaye Oluşturuluyor...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Hikaye Oluştur
                </>
              )}
            </Button>
          )}

          {/* Book Viewer Dialog */}
          {selectedBook && isDocumentFile && (
            <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
              <DialogContent className="max-w-3xl h-[80vh]">
                <DialogHeader>
                  <DialogTitle>{selectedBook.title}</DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                  <BookViewer 
                    fileUrl={selectedBook.file_url || ''} 
                    bookId={selectedBook.id}
                    onTextExtracted={handleTextExtracted}
                  />
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Story Display */}
          {story && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Hikaye</h3>
                  <Button variant="ghost" size="sm" onClick={() => speakText(story)}>
                    <Volume2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{story}</p>
              </CardContent>
            </Card>
          )}

          {/* Recording Controls */}
          {story && (
            <div className="flex gap-2">
              <Button 
                onClick={isRecording ? stopRecording : startRecording}
                variant={isRecording ? "destructive" : "default"}
                className="flex-1"
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Dönüştürülüyor...
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Kaydı Durdur
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Kaydet
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Transcription Result */}
          {transcription && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-2">Söylediğiniz</h3>
                <p className="text-sm text-muted-foreground">{transcription}</p>
              </CardContent>
            </Card>
          )}

          {/* Accuracy Display */}
          {accuracy !== null && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Doğruluk</span>
                  <span className={`text-lg font-bold ${accuracy >= 80 ? 'text-green-500' : accuracy >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                    %{accuracy}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incorrect Words Practice */}
          {wordPracticeResults.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Yanlış Kelimeler</h3>
                <div className="space-y-2">
                  {wordPracticeResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                      <span className="font-medium">{result.word}</span>
                      <div className="flex items-center gap-2">
                        {result.correct === true && <Check className="w-4 h-4 text-green-500" />}
                        {result.correct === false && <X className="w-4 h-4 text-red-500" />}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakText(result.word)}
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={practicingWord === result.word && isPracticeRecording ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => 
                            practicingWord === result.word && isPracticeRecording 
                              ? stopWordPractice() 
                              : startWordPractice(result.word)
                          }
                          disabled={isPracticeTranscribing || (practicingWord !== null && practicingWord !== result.word)}
                        >
                          {isPracticeTranscribing && practicingWord === result.word ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : isPracticeRecording && practicingWord === result.word ? (
                            <MicOff className="w-4 h-4" />
                          ) : (
                            <Mic className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

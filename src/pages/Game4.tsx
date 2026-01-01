import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PackageSelector } from '@/pages/game4/components/PackageSelector';
import { SectionSelector, parseSectionsFromPackages } from '@/pages/game4/components/SectionSelector';
import { SectionRoundSelector } from '@/pages/game4/components/SectionRoundSelector';
import { GameScreen } from '@/pages/game4/components/game/GameScreen';
import { ImageCatalog } from '@/pages/game4/components/ImageCatalog';
import { WordCatalog } from '@/pages/game4/components/WordCatalog';
import { DialogCatalog } from '@/pages/game4/components/DialogCatalog';
import { ConversationCatalog } from '@/pages/game4/components/ConversationCatalog';
import { WordSearchGame } from '@/pages/game4/components/game/WordSearchGame';
import { GroqAIChat } from '@/pages/game4/components/GroqAIChat';
import { supabase } from '@/integrations/supabase/client';
import { Word, GameContent, WordPackage } from '@/pages/game4/types/game';
import { BookOpen, ImageIcon, Loader2, Images, Package, Layers, FileText, MessageCircle, Mic, Grid3X3, Bot } from 'lucide-react';
import { toast } from 'sonner';

interface ExternalPackage {
  id: string;
  name: string;
  created_at: string;
}

interface Section {
  id: string;
  rounds: string[];
}

type Screen = 'home' | 'packages' | 'sections' | 'section-rounds' | 'game' | 'catalog' | 'word-catalog' | 'dialog-catalog' | 'conversation-catalog' | 'word-search' | 'groq-chat';

export default function Game4() {
  // URL parametrelerini başta kontrol et
  const searchParams = new URLSearchParams(window.location.search);
  const urlBolum = searchParams.get('bolum');
  const urlTur = searchParams.get('tur');
  const hasUrlParams = !!(urlBolum && urlTur);

  const [screen, setScreen] = useState<Screen>('home');
  const [currentPackage, setCurrentPackage] = useState<WordPackage | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [gameContent, setGameContent] = useState<GameContent[]>([]);
  const [selectedRound, setSelectedRound] = useState(0);
  const [isDownloadingImages, setIsDownloadingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [isLoadingPackage, setIsLoadingPackage] = useState(false);
  
  // Auto navigation from URL params
  const [isAutoNavigating, setIsAutoNavigating] = useState(hasUrlParams);
  
  // Section/Round system
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [completedPackages, setCompletedPackages] = useState<string[]>([]);
  const [selectedPackageName, setSelectedPackageName] = useState<string>('');
  
  // Vocabulary (kelime haznesi)
  const [vocabularyWords, setVocabularyWords] = useState<{ english: string; turkish: string }[]>([]);

  useEffect(() => {
    // URL parametresi varsa direkt paketi yükle (sections'ı bekleme)
    if (hasUrlParams && urlBolum && urlTur) {
      const packageName = `${urlBolum}.${urlTur}`;
      handleAutoSelectRound(packageName);
      // URL parametrelerini temizle
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      loadExistingPackage();
    }
    loadSections();
  }, []);

  // URL'den gelen otomatik tur seçimi - hızlı yükleme
  const handleAutoSelectRound = async (packageName: string) => {
    setSelectedPackageName(packageName);
    
    // Section'ı packageName'den ayarla (geri dönüş için)
    const parts = packageName.split('.');
    if (parts.length === 3) {
      const sectionId = `${parts[0]}.${parts[1]}`;
      setSelectedSection({ id: sectionId, rounds: [packageName] });
    }
    
    try {
      // learned_words tablosundan kelimeleri al
      const [wordsResult, vocabularyResult] = await Promise.all([
        supabase
          .from('learned_words')
          .select('*')
          .eq('package_name', packageName)
          .order('id'),
        loadVocabularyForPackageAsync(packageName)
      ]);

      const { data: learnedWords, error } = wordsResult;
      
      if (error) throw error;
      if (!learnedWords || learnedWords.length === 0) {
        toast.error('Bu pakette kelime bulunamadı');
        setIsAutoNavigating(false);
        setScreen('home');
        return;
      }

      // Unique kelimeleri al
      const uniqueWordsMap = new Map<string, any>();
      for (const word of learnedWords) {
        if (!uniqueWordsMap.has(word.english)) {
          uniqueWordsMap.set(word.english, word);
        }
      }
      const uniqueWords = Array.from(uniqueWordsMap.values());

      // Word tipine dönüştür
      const formattedWords: Word[] = uniqueWords.map((w: any, index: number) => ({
        id: w.id,
        package_id: w.package_id || '',
        english: w.english,
        turkish: w.turkish,
        image_url: w.image_url || null,
        word_index: index
      }));

      // State'leri güncelle
      setCurrentPackage({ id: '', name: packageName, created_at: new Date().toISOString() });
      setWords(formattedWords);
      setVocabularyWords(vocabularyResult);

      // Direkt oyuna geç
      setIsAutoNavigating(false);
      setScreen('game');
      setSelectedRound(0);
    } catch (error) {
      console.error('Error auto-loading package:', error);
      toast.error('Paket yüklenirken hata oluştu');
      setIsAutoNavigating(false);
      setScreen('home');
    }
  };

  // Async vocabulary loader (Promise döndürür)
  const loadVocabularyForPackageAsync = async (packageName: string): Promise<{ english: string; turkish: string }[]> => {
    try {
      const parts = packageName.split('.');
      if (parts.length !== 3) return [];
      
      const section = `${parts[0]}.${parts[1]}`;
      const roundNum = parseInt(parts[2]);
      
      const packageNames: string[] = [];
      for (let i = 1; i <= roundNum; i++) {
        packageNames.push(`${section}.${i}`);
      }
      
      const { data: allWords } = await supabase
        .from('learned_words')
        .select('english, turkish')
        .in('package_name', packageNames);
      
      if (allWords) {
        const uniqueWordsMap = new Map<string, { english: string; turkish: string }>();
        for (const w of allWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, { english: w.english, turkish: w.turkish });
          }
        }
        return Array.from(uniqueWordsMap.values());
      }
      return [];
    } catch (error) {
      console.error('Error loading vocabulary:', error);
      return [];
    }
  };

  const loadSections = async () => {
    try {
      const { data: packagesData } = await supabase
        .from('learned_words')
        .select('package_name');
      
      if (packagesData) {
        const uniquePackageNames = [...new Set(packagesData.map(p => p.package_name).filter(Boolean))] as string[];
        const parsedSections = parseSectionsFromPackages(uniquePackageNames);
        setSections(parsedSections);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
    }
  };

  const loadExistingPackage = async () => {
    // Son kullanılan paketi bul
    const { data: packages } = await supabase
      .from('learned_words')
      .select('package_name')
      .order('added_at', { ascending: false })
      .limit(1);

    if (packages && packages.length > 0 && packages[0].package_name) {
      const packageName = packages[0].package_name;
      setCurrentPackage({ id: '', name: packageName, created_at: '' });
      await loadPackageData(packageName);
    }
  };

  const loadPackageData = async (packageName: string) => {
    const { data: wordsData } = await supabase
      .from('learned_words')
      .select('*')
      .eq('package_name', packageName)
      .order('id');

    if (wordsData) {
      // Unique kelimeleri al
      const uniqueWordsMap = new Map<string, any>();
      for (const word of wordsData) {
        if (!uniqueWordsMap.has(word.english)) {
          uniqueWordsMap.set(word.english, word);
        }
      }
      const uniqueWords = Array.from(uniqueWordsMap.values());

      const formattedWords: Word[] = uniqueWords.map((w: any, index: number) => ({
        id: w.id,
        package_id: w.package_id || '',
        english: w.english,
        turkish: w.turkish,
        image_url: w.image_url || null,
        word_index: index
      }));

      setWords(formattedWords);
    }
  };

  const handleSelectExternalPackage = async (pkg: ExternalPackage, stayOnScreen = false) => {
    setIsLoadingPackage(true);
    // Eğer stayOnScreen false ise ana menüye dön
    if (!stayOnScreen) {
      setScreen('home');
    }
    
    try {
      // learned_words tablosundan kelimeleri al
      const { data: learnedWords, error } = await supabase
        .from('learned_words')
        .select('*')
        .eq('package_name', pkg.name)
        .order('id');

      if (error) throw error;
      if (!learnedWords || learnedWords.length === 0) {
        toast.error('Bu pakette kelime bulunamadı');
        setIsLoadingPackage(false);
        return;
      }

      // Çift kelimeleri filtrele - her english kelimesinden sadece birini al
      const uniqueWordsMap = new Map<string, any>();
      for (const word of learnedWords) {
        if (!uniqueWordsMap.has(word.english)) {
          uniqueWordsMap.set(word.english, word);
        }
      }
      const uniqueWords = Array.from(uniqueWordsMap.values());

      // Word tipine dönüştür
      const formattedWords: Word[] = uniqueWords.map((w: any, index: number) => ({
        id: w.id,
        package_id: w.package_id || '',
        english: w.english,
        turkish: w.turkish,
        image_url: w.image_url || null,
        word_index: index
      }));

      setCurrentPackage({ id: '', name: pkg.name, created_at: pkg.created_at });
      setWords(formattedWords);
      toast.success(`${pkg.name} paketi yüklendi! (${uniqueWords.length} kelime)`);
    } catch (error) {
      console.error('Error loading external package:', error);
      toast.error('Paket yüklenirken hata oluştu');
    } finally {
      setIsLoadingPackage(false);
    }
  };

  const handleSelectSection = (section: Section) => {
    setSelectedSection(section);
    setScreen('section-rounds');
  };

  const handleSelectSectionRound = async (packageName: string) => {
    // Save the package name for sentence loading
    setSelectedPackageName(packageName);
    
    // Load the specific package for this round
    const pkg = { name: packageName, id: '', created_at: '' } as ExternalPackage;
    await handleSelectExternalPackage(pkg);
    
    // Load vocabulary (kelime haznesi) - bu paketin ve önceki paketlerin kelimeleri
    await loadVocabularyForPackage(packageName);
    
    setScreen('game');
    setSelectedRound(0);
  };

  // Paket adından önceki tüm paketleri bul ve kelime haznesini oluştur
  const loadVocabularyForPackage = async (packageName: string) => {
    try {
      // Parse package name (e.g., "1.2.3" -> section "1.2", round 3)
      const parts = packageName.split('.');
      if (parts.length !== 3) return;
      
      const section = `${parts[0]}.${parts[1]}`;
      const roundNum = parseInt(parts[2]);
      
      // Bu bölümdeki bu tura kadar olan tüm paket isimlerini oluştur
      const packageNames: string[] = [];
      for (let i = 1; i <= roundNum; i++) {
        packageNames.push(`${section}.${i}`);
      }
      
      // Tüm kelimeleri learned_words tablosundan al
      const { data: allWords } = await supabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', packageNames);
      
      if (allWords) {
        // Unique kelimeleri al
        const uniqueWordsMap = new Map<string, { english: string; turkish: string }>();
        for (const w of allWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, { english: w.english, turkish: w.turkish });
          }
        }
        setVocabularyWords(Array.from(uniqueWordsMap.values()));
      }
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    }
  };

  const handleSaveSentences = async (sentences: any[]) => {
    // İleride cümleleri veritabanına kaydetmek için kullanılabilir
    console.log('Saving sentences:', sentences);
  };

  const handleRoundComplete = async () => {
    if (!currentPackage) return;

    // Add to completed packages
    setCompletedPackages(prev => [...prev, currentPackage.name]);

    // Go back to section rounds
    setScreen('section-rounds');
    toast.success(`${currentPackage.name} tamamlandı!`);
  };

  const wordsWithoutImages = words.filter(w => !w.image_url);

  const handleDownloadAllImages = async () => {
    const wordsToFetch = words.filter(w => !w.image_url);
    
    if (wordsToFetch.length === 0) {
      toast.success('Tüm kelimelerin resimleri zaten indirilmiş!');
      return;
    }

    setIsDownloadingImages(true);
    setImageProgress({ current: 0, total: wordsToFetch.length });

    let successCount = 0;
    
    for (let i = 0; i < wordsToFetch.length; i++) {
      const word = wordsToFetch[i];
      setImageProgress({ current: i + 1, total: wordsToFetch.length });
      
      try {
        const { data } = await supabase.functions.invoke('fetch-word-image', {
          body: { 
            wordId: word.id, 
            query: word.english, 
            turkish: word.turkish
          }
        });
        
        if (data?.imageUrl) {
          successCount++;
          setWords(prev => prev.map(w => 
            w.id === word.id ? { ...w, image_url: data.imageUrl } : w
          ));
        }
      } catch (error) {
        console.error('Error fetching image for', word.english, error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsDownloadingImages(false);
    toast.success(`${successCount}/${wordsToFetch.length} resim başarıyla indirildi!`);
  };

  const handleWordsUpdate = async (updatedWords: Word[]) => {
    setWords(updatedWords);
  };

  const handleSaveToExternal = async () => {
    if (!currentPackage) return;
    
    let successCount = 0;
    let errorCount = 0;
    
    // Save all words with images to database
    for (const word of words) {
      if (word.image_url) {
        const { error } = await supabase
          .from('learned_words')
          .update({ image_url: word.image_url })
          .eq('package_name', currentPackage.name)
          .eq('english', word.english);
        
        if (error) {
          console.error('Error saving image for', word.english, error);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }
    
    if (errorCount > 0) {
      toast.error(`${errorCount} resim kaydedilemedi`);
    } else if (successCount > 0) {
      toast.success(`${successCount} resim veritabanına kaydedildi!`);
    } else {
      toast.info('Kaydedilecek resim bulunamadı');
    }
  };

  // URL'den otomatik navigasyon sırasında loading göster
  if (isAutoNavigating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mb-6">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Tur Yükleniyor...</h1>
        <p className="text-muted-foreground">
          {urlBolum}.{urlTur} paketi hazırlanıyor
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {screen === 'home' && (
        <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto">
          <div className="w-16 h-16 sm:w-24 sm:h-24 bg-primary/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 flex-shrink-0">
            <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-primary" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1 sm:mb-2">Kelime Öğren</h1>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-sm text-center">
            İngilizce-Türkçe kelime öğrenme uygulaması
          </p>

          {currentPackage ? (
            <div className="w-full max-w-sm space-y-2 sm:space-y-3 pb-4">
              <div className="p-3 rounded-xl bg-card border border-border">
                <p className="text-xs text-muted-foreground mb-0.5">Aktif Paket</p>
                <p className="font-semibold text-foreground text-sm">{currentPackage.name}</p>
                <p className="text-xs text-muted-foreground">{words.length} kelime</p>
              </div>

              {sections.length > 0 && (
                <Button 
                  onClick={() => setScreen('sections')} 
                  className="w-full h-11 sm:h-12 text-base"
                >
                  <Layers className="w-4 h-4 mr-2" />
                  Bölüm Seç
                </Button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('word-catalog')}
                  className="h-10 text-sm"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Kelimeler
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('dialog-catalog')}
                  className="h-10 text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Diyaloglar
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('conversation-catalog')}
                  className="h-10 text-sm"
                >
                  <Mic className="w-4 h-4 mr-1.5" />
                  Konuşma
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('word-search')}
                  className="h-10 text-sm"
                >
                  <Grid3X3 className="w-4 h-4 mr-1.5" />
                  Krossvord
                </Button>

                <Button 
                  variant="secondary" 
                  onClick={() => setScreen('catalog')}
                  className="h-10 text-sm"
                >
                  <Images className="w-4 h-4 mr-1.5" />
                  Resimler
                </Button>

                <Button 
                  variant="default" 
                  onClick={() => setScreen('groq-chat')}
                  className="h-10 text-sm col-span-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                >
                  <Bot className="w-4 h-4 mr-1.5" />
                  AI Sohbet (Groq)
                </Button>
              </div>

              {wordsWithoutImages.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleDownloadAllImages}
                  disabled={isDownloadingImages}
                  className="w-full h-10 text-sm"
                >
                  {isDownloadingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      İndiriliyor ({imageProgress.current}/{imageProgress.total})
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Resimleri İndir ({wordsWithoutImages.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <Button 
              onClick={() => setScreen('packages')} 
              className="w-full max-w-xs h-12 text-lg"
              disabled={isLoadingPackage}
            >
              {isLoadingPackage ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Package className="w-5 h-5 mr-2" />
              )}
              Paket Seç
            </Button>
          )}
        </div>
      )}

      {screen === 'packages' && (
        <PackageSelector
          onSelectPackage={handleSelectExternalPackage}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'sections' && (
        <SectionSelector
          sections={sections}
          completedPackages={completedPackages}
          onSelectSection={handleSelectSection}
          onBack={() => setScreen('home')}
        />
      )}

      {screen === 'section-rounds' && selectedSection && (
        <SectionRoundSelector
          section={selectedSection}
          completedPackages={completedPackages}
          onSelectRound={handleSelectSectionRound}
          onBack={() => setScreen('sections')}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          words={words}
          gameContent={gameContent}
          roundIndex={selectedRound}
          packageName={selectedPackageName}
          vocabularyWords={vocabularyWords}
          onComplete={handleRoundComplete}
          onBack={() => setScreen('section-rounds')}
        />
      )}

      {screen === 'catalog' && (
        <ImageCatalog
          words={words}
          onUpdate={handleWordsUpdate}
          onBack={() => setScreen('home')}
          onSave={handleSaveToExternal}
          onSelectPackage={async (pkg) => {
            await handleSelectExternalPackage(pkg, true);
          }}
        />
      )}

      {screen === 'word-catalog' && (
        <WordCatalog
          onBack={() => setScreen('home')}
          onSaveSentences={handleSaveSentences}
        />
      )}

      {screen === 'dialog-catalog' && (
        <DialogCatalog onBack={() => setScreen('home')} />
      )}

      {screen === 'conversation-catalog' && (
        <ConversationCatalog onBack={() => setScreen('home')} />
      )}

      {screen === 'word-search' && (
        <WordSearchGame onBack={() => setScreen('home')} />
      )}

      {screen === 'groq-chat' && (
        <GroqAIChat onBack={() => setScreen('home')} />
      )}
    </div>
  );
}

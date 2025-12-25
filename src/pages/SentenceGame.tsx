import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { SectionSelector, parseSectionsFromPackages } from '@/components/sentence/SectionSelector';
import { SectionRoundSelector } from '@/components/sentence/SectionRoundSelector';
import { GameScreen } from '@/components/sentence/GameScreen';
import { supabase } from '@/integrations/supabase/client';
import { Word, GameContent, Section } from '@/types/game';
import { BookOpen, Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Screen = 'home' | 'sections' | 'section-rounds' | 'game';

const SentenceGame = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [screen, setScreen] = useState<Screen>('home');
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [completedPackages, setCompletedPackages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Game state
  const [words, setWords] = useState<Word[]>([]);
  const [gameContent, setGameContent] = useState<GameContent[]>([]);
  const [selectedPackageName, setSelectedPackageName] = useState('');
  const [vocabularyWords, setVocabularyWords] = useState<{ english: string; turkish: string }[]>([]);

  useEffect(() => {
    if (user) {
      loadSections();
    }
  }, [user]);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      // Get unique package names from learned_words
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
      toast.error('Bölümler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSection = (section: Section) => {
    setSelectedSection(section);
    setScreen('section-rounds');
  };

  const handleSelectRound = async (packageName: string) => {
    setSelectedPackageName(packageName);
    setIsLoading(true);
    
    try {
      // Load words for this package
      const { data: wordsData, error } = await supabase
        .from('learned_words')
        .select('*')
        .eq('package_name', packageName)
        .order('id');

      if (error) throw error;
      
      if (!wordsData || wordsData.length === 0) {
        toast.error('Bu pakette kelime bulunamadı');
        setIsLoading(false);
        return;
      }

      // Remove duplicates
      const uniqueWordsMap = new Map<string, any>();
      for (const word of wordsData) {
        if (!uniqueWordsMap.has(word.english)) {
          uniqueWordsMap.set(word.english, word);
        }
      }
      const uniqueWords = Array.from(uniqueWordsMap.values());

      // Convert to game Word format
      const gameWords: Word[] = uniqueWords.map((w, index) => ({
        id: w.id,
        package_id: w.package_id || '',
        english: w.english,
        turkish: w.turkish,
        image_url: w.image_url,
        word_index: index
      }));

      setWords(gameWords);
      
      // Load vocabulary for this and previous rounds
      await loadVocabulary(packageName);
      
      setScreen('game');
    } catch (error) {
      console.error('Error loading package:', error);
      toast.error('Paket yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVocabulary = async (packageName: string) => {
    try {
      const parts = packageName.split('.');
      if (parts.length !== 3) return;
      
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
        setVocabularyWords(Array.from(uniqueWordsMap.values()));
      }
    } catch (error) {
      console.error('Error loading vocabulary:', error);
    }
  };

  const handleRoundComplete = () => {
    setCompletedPackages(prev => [...prev, selectedPackageName]);
    toast.success(`${selectedPackageName} tamamlandı!`);
    setScreen('section-rounds');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (isLoading && screen === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex flex-col items-center justify-center pb-20">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Bölümler yükleniyor...</p>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
      {screen === 'home' && (
        <div className="flex flex-col items-center p-4 pt-8">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold text-foreground mb-2">Cümle Pro</h1>
          <p className="text-muted-foreground mb-8 text-center max-w-sm">
            Kelime paketleriyle İngilizce öğrenin
          </p>

          {sections.length > 0 ? (
            <Button 
              onClick={() => setScreen('sections')} 
              className="w-full max-w-xs h-14 text-lg"
            >
              <Layers className="w-5 h-5 mr-2" />
              Bölüm Seç ({sections.length} bölüm)
            </Button>
          ) : (
            <div className="text-center p-8 bg-card rounded-xl border">
              <p className="text-muted-foreground">
                Henüz paket bulunamadı. learned_words tablosuna veri ekleyin.
              </p>
            </div>
          )}
        </div>
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
          onSelectRound={handleSelectRound}
          onBack={() => setScreen('sections')}
        />
      )}

      {screen === 'game' && (
        <div className="h-screen">
          <GameScreen
            words={words}
            gameContent={gameContent}
            roundIndex={0}
            packageName={selectedPackageName}
            vocabularyWords={vocabularyWords}
            onComplete={handleRoundComplete}
            onBack={() => setScreen('section-rounds')}
          />
        </div>
      )}

      {screen !== 'game' && <BottomNavigation />}
    </div>
  );
};

export default SentenceGame;

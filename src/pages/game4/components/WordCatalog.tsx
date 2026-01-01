import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Volume2, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WordCatalogProps {
  onBack: () => void;
  onSaveSentences: (sentences: any[]) => void;
}

interface WordItem {
  id: string;
  english: string;
  turkish: string;
  package_name: string | null;
  audio_url?: string | null;
  image_url?: string | null;
}

export function WordCatalog({ onBack }: WordCatalogProps) {
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [packages, setPackages] = useState<string[]>([]);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      loadWords(selectedPackage);
    }
  }, [selectedPackage]);

  const loadPackages = async () => {
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
        setPackages(uniquePackages);
        if (uniquePackages.length > 0) {
          setSelectedPackage(uniquePackages[0]);
        }
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Paketler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async (packageName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('learned_words')
        .select('*')
        .eq('package_name', packageName)
        .order('id');

      if (error) throw error;
      
      if (data) {
        // Remove duplicates
        const uniqueMap = new Map<string, WordItem>();
        for (const w of data) {
          if (!uniqueMap.has(w.english)) {
            uniqueMap.set(w.english, w as WordItem);
          }
        }
        setWords(Array.from(uniqueMap.values()));
      }
    } catch (error) {
      console.error('Error loading words:', error);
      toast.error('Kelimeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const speakWord = (word: string) => {
    if ('speechSynthesis' in window) {
      setSpeakingWord(word);
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeakingWord(null);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-2">
          <button 
            onClick={onBack} 
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <h1 className="text-sm font-semibold">Kelime Kataloğu</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Package selector */}
      <div className="p-3 border-b border-border">
        <select
          value={selectedPackage}
          onChange={(e) => setSelectedPackage(e.target.value)}
          className="w-full p-2 rounded-lg border border-border bg-background text-foreground"
        >
          {packages.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : words.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Bu pakette kelime bulunamadı.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {words.map((word, index) => (
              <div 
                key={word.id}
                className="p-3 rounded-lg border border-border bg-card flex items-center gap-3"
              >
                <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{word.english}</p>
                  <p className="text-sm text-muted-foreground">{word.turkish}</p>
                </div>
                {word.image_url && (
                  <img 
                    src={word.image_url} 
                    alt={word.english}
                    className="w-10 h-10 rounded object-cover"
                  />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => speakWord(word.english)}
                  disabled={speakingWord === word.english}
                  className="h-8 w-8"
                >
                  <Volume2 className={`w-4 h-4 ${speakingWord === word.english ? 'text-primary animate-pulse' : ''}`} />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Toplam: {words.length} kelime
        </p>
      </div>
    </div>
  );
}

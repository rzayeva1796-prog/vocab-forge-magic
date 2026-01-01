import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Image, Loader2, Download, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Word } from '../types/game';

interface ImageCatalogProps {
  words: Word[];
  onUpdate: (words: Word[]) => void;
  onBack: () => void;
  onSave?: () => Promise<void>;
  onSelectPackage?: (pkg: any) => Promise<void>;
}

export function ImageCatalog({ words: propWords, onUpdate, onBack, onSave }: ImageCatalogProps) {
  const [packages, setPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [words, setWords] = useState<Word[]>(propWords || []);
  const [loading, setLoading] = useState(true);
  const [downloadingWord, setDownloadingWord] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

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
        const uniqueMap = new Map<string, Word>();
        let index = 0;
        for (const w of data) {
          if (!uniqueMap.has(w.english)) {
            uniqueMap.set(w.english, {
              id: w.id,
              package_id: w.package_id || '',
              english: w.english,
              turkish: w.turkish,
              image_url: w.image_url,
              word_index: index++,
              package_name: w.package_name
            });
          }
        }
        const wordList = Array.from(uniqueMap.values());
        setWords(wordList);
        onUpdate(wordList);
      }
    } catch (error) {
      console.error('Error loading words:', error);
      toast.error('Kelimeler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = async (word: Word) => {
    if (word.image_url) return;
    
    setDownloadingWord(word.id);
    try {
      const { data } = await supabase.functions.invoke('fetch-word-image', {
        body: { 
          wordId: word.id, 
          query: word.english, 
          turkish: word.turkish
        }
      });
      
      if (data?.imageUrl) {
        // Update local state
        const updatedWords = words.map(w => 
          w.id === word.id ? { ...w, image_url: data.imageUrl } : w
        );
        setWords(updatedWords);
        onUpdate(updatedWords);
        
        // Update database
        await supabase
          .from('learned_words')
          .update({ image_url: data.imageUrl })
          .eq('id', word.id);
        
        toast.success(`"${word.english}" için resim indirildi`);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Resim indirilemedi');
    } finally {
      setDownloadingWord(null);
    }
  };

  const downloadAllImages = async () => {
    const wordsWithoutImages = words.filter(w => !w.image_url);
    if (wordsWithoutImages.length === 0) {
      toast.success('Tüm kelimelerin resimleri mevcut');
      return;
    }

    setDownloadingAll(true);
    setProgress({ current: 0, total: wordsWithoutImages.length });

    let successCount = 0;
    for (let i = 0; i < wordsWithoutImages.length; i++) {
      const word = wordsWithoutImages[i];
      setProgress({ current: i + 1, total: wordsWithoutImages.length });
      
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
          
          await supabase
            .from('learned_words')
            .update({ image_url: data.imageUrl })
            .eq('id', word.id);
        }
      } catch (error) {
        console.error('Error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setDownloadingAll(false);
    toast.success(`${successCount}/${wordsWithoutImages.length} resim indirildi`);
  };

  const wordsWithoutImages = words.filter(w => !w.image_url).length;

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
          <h1 className="text-sm font-semibold">Resim Kataloğu</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Package selector and download all */}
      <div className="p-3 border-b border-border space-y-2">
        <select
          value={selectedPackage}
          onChange={(e) => setSelectedPackage(e.target.value)}
          className="w-full p-2 rounded-lg border border-border bg-background text-foreground"
        >
          {packages.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </select>
        
        {wordsWithoutImages > 0 && (
          <Button 
            onClick={downloadAllImages} 
            disabled={downloadingAll}
            className="w-full gap-2"
            variant="outline"
          >
            {downloadingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                İndiriliyor ({progress.current}/{progress.total})
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Tüm Resimleri İndir ({wordsWithoutImages})
              </>
            )}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : words.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Image className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Bu pakette kelime bulunamadı.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 grid grid-cols-2 gap-2">
            {words.map((word) => (
              <div 
                key={word.id}
                className="p-2 rounded-lg border border-border bg-card"
              >
                <div className="aspect-square rounded-lg bg-muted mb-2 overflow-hidden flex items-center justify-center">
                  {word.image_url ? (
                    <img 
                      src={word.image_url} 
                      alt={word.english}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => downloadImage(word)}
                      disabled={downloadingWord === word.id}
                      className="h-12 w-12"
                    >
                      {downloadingWord === word.id ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Download className="w-6 h-6 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-medium text-sm text-foreground truncate">{word.english}</p>
                  <p className="text-xs text-muted-foreground truncate">{word.turkish}</p>
                </div>
                {word.image_url && (
                  <div className="flex justify-center mt-1">
                    <Check className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

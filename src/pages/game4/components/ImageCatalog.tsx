import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Word } from '../types/game';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '../lib/externalSupabase';
import { Trash2, Upload, Loader2, ImageOff, ArrowLeft, Download, Save, Package, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ExternalPackage {
  id: string;
  name: string;
  created_at: string;
}

interface ImageCatalogProps {
  words: Word[];
  onUpdate: (words: Word[]) => void;
  onBack: () => void;
  onSave?: () => Promise<void>;
  onSelectPackage?: (pkg: ExternalPackage) => Promise<void>;
}

export function ImageCatalog({ words, onUpdate, onBack, onSave, onSelectPackage }: ImageCatalogProps) {
  const [loadingWordId, setLoadingWordId] = useState<string | null>(null);
  const [generatingWordId, setGeneratingWordId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPackageSelector, setShowPackageSelector] = useState(false);
  const [packages, setPackages] = useState<ExternalPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [loadingSelectedPackage, setLoadingSelectedPackage] = useState(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const loadPackages = async () => {
    setLoadingPackages(true);
    try {
      const { data, error } = await externalSupabase
        .from('learned_words')
        .select('package_name')
        .order('package_name');

      if (error) throw error;

      const uniquePackages = [...new Set(data?.map(d => d.package_name) || [])];
      const packageList: ExternalPackage[] = uniquePackages.map((name) => ({
        id: name,
        name: name,
        created_at: new Date().toISOString()
      }));

      setPackages(packageList);
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Paketler yüklenirken hata oluştu');
    } finally {
      setLoadingPackages(false);
    }
  };

  const handlePackageSelect = async (pkg: ExternalPackage) => {
    if (!onSelectPackage) return;
    setLoadingSelectedPackage(true);
    try {
      await onSelectPackage(pkg);
      setShowPackageSelector(false);
    } catch (error) {
      console.error('Error selecting package:', error);
      toast.error('Paket yüklenirken hata oluştu');
    } finally {
      setLoadingSelectedPackage(false);
    }
  };

  const handleOpenPackageSelector = () => {
    setShowPackageSelector(true);
    if (packages.length === 0) {
      loadPackages();
    }
  };

  const handleDeleteImage = async (wordId: string) => {
    const word = words.find(w => w.id === wordId);
    if (!word || !word.image_url) return;

    try {
      // Add current image to rejected_images array
      const currentRejected = (word as any).rejected_images || [];
      const newRejected = [...currentRejected, word.image_url];

      const { error } = await supabase
        .from('learned_words')
        .update({ 
          image_url: null
        })
        .eq('id', wordId);

      if (error) throw error;

      onUpdate(words.map(w => w.id === wordId ? { 
        ...w, 
        image_url: null,
        rejected_images: newRejected
      } as Word : w));
      toast.success('Resim silindi ve reddedilenlere eklendi');
    } catch (error) {
      toast.error('Resim silinirken hata oluştu');
    }
  };

  const handleDeleteAllImages = async () => {
    if (!confirm('Tüm resimleri silmek istediğinizden emin misiniz?')) return;

    setIsDeletingAll(true);
    try {
      const wordsWithImages = words.filter(w => w.image_url);
      
      if (wordsWithImages.length === 0) {
        toast.info('Silinecek resim yok');
        return;
      }

      // Update each word with rejected image
      for (const word of wordsWithImages) {
        await supabase
          .from('learned_words')
          .update({ 
            image_url: null
          })
          .eq('id', word.id);
      }

      onUpdate(words.map(w => {
        if (w.image_url) {
          const currentRejected = (w as any).rejected_images || [];
          return { 
            ...w, 
            image_url: null,
            rejected_images: [...currentRejected, w.image_url]
          } as Word;
        }
        return w;
      }));
      toast.success(`${wordsWithImages.length} resim silindi ve reddedilenlere eklendi`);
    } catch (error) {
      toast.error('Resimler silinirken hata oluştu');
    } finally {
      setIsDeletingAll(false);
    }
  };

  const handleUploadImage = async (word: Word, file: File) => {
    setLoadingWordId(word.id);
    try {
      const reader = new FileReader();
      
      reader.onload = async () => {
        const base64Url = reader.result as string;
        
        const { error } = await supabase
          .from('learned_words')
          .update({ image_url: base64Url })
          .eq('id', word.id);

        if (error) throw error;

        onUpdate(words.map(w => w.id === word.id ? { ...w, image_url: base64Url } : w));
        toast.success(`"${word.english}" için resim yüklendi`);
        setLoadingWordId(null);
      };

      reader.onerror = () => {
        toast.error('Resim okunurken hata oluştu');
        setLoadingWordId(null);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Resim yüklenirken hata oluştu');
      setLoadingWordId(null);
    }
  };

  const handleFileSelect = (word: Word) => {
    const input = fileInputRefs.current[word.id];
    if (input) {
      input.click();
    }
  };

  const handleFileChange = (word: Word, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Lütfen bir resim dosyası seçin');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resim 5MB\'dan küçük olmalı');
        return;
      }
      handleUploadImage(word, file);
    }
    event.target.value = '';
  };

  const handleFetchImage = async (word: Word) => {
    setLoadingWordId(word.id);
    try {
      const rejectedImages = (word as any).rejected_images || [];
      
      const { data, error } = await supabase.functions.invoke('fetch-word-image', {
        body: { 
          wordId: word.id, 
          query: word.english,
          turkish: word.turkish,
          rejectedImages
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onUpdate(words.map(w => w.id === word.id ? { ...w, image_url: data.imageUrl } : w));
        toast.success(`"${word.english}" için resim eklendi`);
      } else if (data?.rejected) {
        toast.warning(`"${word.english}" için uygun resim bulunamadı`);
      } else {
        toast.error(`"${word.english}" için resim bulunamadı`);
      }
    } catch (error) {
      toast.error('Resim eklenirken hata oluştu');
    } finally {
      setLoadingWordId(null);
    }
  };

  // AI ile resim üret
  const handleGenerateAIImage = async (word: Word) => {
    setGeneratingWordId(word.id);
    try {
      const rejectedImages = (word as any).rejected_images || [];

      const { data, error } = await supabase.functions.invoke('generate-hf-image', {
        body: {
          wordId: word.id,
          english: word.english,
          turkish: word.turkish,
          rejectedCount: rejectedImages.length,
        },
      });

      if (error) {
        const status = (error as any)?.context?.status ?? (error as any)?.status;
        if (status === 402) {
          toast.error('AI kredisi bitti. Backend → Usage bölümünden kredi ekleyin veya ücretsiz "İndir" seçeneğini kullanın.');
          return;
        }
        if (status === 429) {
          toast.error('Çok fazla istek atıldı. Lütfen biraz bekleyip tekrar deneyin.');
          return;
        }
        throw error;
      }

      if (data?.imageUrl) {
        onUpdate(words.map((w) => (w.id === word.id ? { ...w, image_url: data.imageUrl } : w)));
        toast.success(`"${word.english}" için AI resmi oluşturuldu`);
      } else {
        toast.error('AI resmi oluşturulamadı');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('AI resmi oluşturulurken hata oluştu');
    } finally {
      setGeneratingWordId(null);
    }
  };

  const wordsWithImages = useMemo(() => words.filter((w) => w.image_url).length, [words]);
  const wordsWithoutImages = useMemo(() => words.filter((w) => !w.image_url), [words]);

  const handleBatchGenerateAI = async () => {
    if (wordsWithoutImages.length === 0) {
      toast.info('Tüm kelimelerin zaten resmi var');
      return;
    }

    if (!confirm(`${wordsWithoutImages.length} kelime için AI ile resim üretilecek. Devam etmek istiyor musunuz?`)) {
      return;
    }

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: wordsWithoutImages.length });

    let successCount = 0;
    let stoppedByCredits = false;

    // Tüm güncellemeleri biriktir
    const updatedWords = new Map<string, string>();

    for (let i = 0; i < wordsWithoutImages.length; i++) {
      const word = wordsWithoutImages[i];
      setBatchProgress({ current: i + 1, total: wordsWithoutImages.length });

      try {
        const rejectedImages = (word as any).rejected_images || [];

        const { data, error } = await supabase.functions.invoke('generate-hf-image', {
          body: {
            wordId: word.id,
            english: word.english,
            turkish: word.turkish,
            rejectedCount: rejectedImages.length,
          },
        });

        if (error) {
          const status = (error as any)?.context?.status ?? (error as any)?.status;
          if (status === 402) {
            stoppedByCredits = true;
            break;
          }
          if (status === 429) {
            // 429'da tek kelimeyi atlayıp devam edelim
            await new Promise((resolve) => setTimeout(resolve, 1200));
            continue;
          }
          throw error;
        }

        if (data?.imageUrl) {
          successCount++;
          updatedWords.set(word.id, data.imageUrl);
        }
      } catch (error) {
        console.error('Error generating AI image for', word.english, error);
      }

      // Rate limiting için kısa bekleme
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Tüm güncellemeleri tek seferde uygula
    if (updatedWords.size > 0) {
      onUpdate(
        words.map((w) => {
          const newImageUrl = updatedWords.get(w.id);
          return newImageUrl ? { ...w, image_url: newImageUrl } : w;
        })
      );
    }

    setIsBatchGenerating(false);

    if (stoppedByCredits) {
      toast.error('AI kredisi bitti. Toplu üretim durduruldu.');
    } else {
      toast.success(`${successCount}/${wordsWithoutImages.length} resim AI ile oluşturuldu!`);
    }
  };

  const handleSaveToExternal = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
      toast.success('Resimler harici veritabanına kaydedildi!');
    } catch (error) {
      toast.error('Kaydedilirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  // Paket seçici görünümü
  if (showPackageSelector) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex-shrink-0">
          <div className="flex items-center justify-between max-w-4xl mx-auto gap-2">
            <button 
              onClick={() => setShowPackageSelector(false)} 
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Geri
            </button>
            <h1 className="text-sm font-semibold">Paket Seç</h1>
            <div className="w-12" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingPackages ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-4 space-y-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => handlePackageSelect(pkg)}
                    disabled={loadingSelectedPackage}
                    className="w-full p-3 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground">{pkg.name}</span>
                    {loadingSelectedPackage && (
                      <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border p-3 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto gap-2">
          <button onClick={onBack} className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm">
            <ArrowLeft className="w-4 h-4" />
            Geri
          </button>
          <h1 className="text-sm font-semibold">Resimler ({wordsWithImages}/{words.length})</h1>
          <div className="flex gap-1.5">
            {onSelectPackage && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPackageSelector}
                className="h-8 text-xs px-2"
              >
                <Package className="w-3.5 h-3.5 mr-1" />
                Paket
              </Button>
            )}
            {onSave && (
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveToExternal}
                disabled={isSaving || wordsWithImages === 0}
                className="h-8 text-xs px-2"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Kaydet
                  </>
                )}
              </Button>
            )}
            {wordsWithoutImages.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBatchGenerateAI}
                disabled={isBatchGenerating}
                className="h-8 text-xs px-2"
              >
                {isBatchGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    {batchProgress.current}/{batchProgress.total}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    AI ({wordsWithoutImages.length})
                  </>
                )}
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAllImages}
              disabled={isDeletingAll || wordsWithImages === 0}
              className="h-8 text-xs px-2"
            >
              {isDeletingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Sil
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {words.map((word) => {
              const rejectedCount = ((word as any).rejected_images || []).length;
              return (
                <Card key={word.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted flex items-center justify-center relative">
                    {word.image_url ? (
                      <img 
                        src={word.image_url} 
                        alt={word.english}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageOff className="w-12 h-12" />
                        <span className="text-sm">Resim yok</span>
                        {rejectedCount > 0 && (
                          <span className="text-xs text-destructive">{rejectedCount} resim reddedildi</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-semibold text-foreground">{word.english}</p>
                      <p className="text-sm text-muted-foreground">{word.turkish}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => fileInputRefs.current[word.id] = el}
                        onChange={(e) => handleFileChange(word, e)}
                      />
                      
                      {word.image_url ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDeleteImage(word.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Sil
                        </Button>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleFileSelect(word)}
                            disabled={loadingWordId === word.id || generatingWordId === word.id}
                            title="Galeriden yükle"
                          >
                            {loadingWordId === word.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFetchImage(word)}
                            disabled={loadingWordId === word.id || generatingWordId === word.id}
                            title="İnternetten indir"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleGenerateAIImage(word)}
                            disabled={loadingWordId === word.id || generatingWordId === word.id}
                            title="AI ile üret"
                          >
                            {generatingWordId === word.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

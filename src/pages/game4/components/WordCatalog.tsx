import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Volume2, Loader2, Sparkles, Copy, Check } from 'lucide-react';
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
  sentence?: string;
  sentenceTranslation?: string;
}

export function WordCatalog({ onBack }: WordCatalogProps) {
  const [words, setWords] = useState<WordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [packages, setPackages] = useState<string[]>([]);
  const [speakingWord, setSpeakingWord] = useState<string | null>(null);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [copiedWord, setCopiedWord] = useState<string | null>(null);

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

  const generateSentence = async (word: WordItem) => {
    setGeneratingFor(word.id);
    
    try {
      const prompt = `Create a simple English sentence using the word "${word.english}" (Turkish: ${word.turkish}).
The sentence should be:
- Easy to understand for language learners
- 5-12 words long
- Natural and practical

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"sentence": "Your example sentence here.", "translation": "Türkçe çevirisi burada."}`;

      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: { 
          message: prompt,
          systemPrompt: 'You are a language learning assistant. Always return valid JSON only, no markdown.'
        }
      });

      if (error) throw error;

      const response = data.response || '';
      
      try {
        // Extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setWords(prev => prev.map(w => 
            w.id === word.id 
              ? { ...w, sentence: parsed.sentence, sentenceTranslation: parsed.translation }
              : w
          ));
          toast.success('Cümle oluşturuldu!');
        } else {
          throw new Error('No valid JSON found');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError, response);
        toast.error('Cümle oluşturulamadı');
      }
    } catch (error) {
      console.error('Error generating sentence:', error);
      toast.error('Cümle oluşturulurken hata oluştu');
    } finally {
      setGeneratingFor(null);
    }
  };

  const copySentence = (word: WordItem) => {
    if (word.sentence) {
      navigator.clipboard.writeText(`${word.sentence}\n${word.sentenceTranslation || ''}`);
      setCopiedWord(word.id);
      setTimeout(() => setCopiedWord(null), 2000);
      toast.success('Kopyalandı!');
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
                className="p-3 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => generateSentence(word)}
                    disabled={generatingFor === word.id}
                    className="h-8 w-8"
                    title="AI ile cümle oluştur"
                  >
                    {generatingFor === word.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    )}
                  </Button>
                </div>

                {/* Generated sentence */}
                {word.sentence && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-foreground">{word.sentence}</p>
                        <p className="text-xs text-muted-foreground mt-1">{word.sentenceTranslation}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speakWord(word.sentence!)}
                        className="h-7 w-7"
                      >
                        <Volume2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copySentence(word)}
                        className="h-7 w-7"
                      >
                        {copiedWord === word.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Toplam: {words.length} kelime • <Sparkles className="w-3 h-3 inline" /> Groq AI ile cümle oluştur
        </p>
      </div>
    </div>
  );
}
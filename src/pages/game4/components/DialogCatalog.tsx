import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Volume2, Loader2, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DialogCatalogProps {
  onBack: () => void;
}

interface DialogItem {
  speaker: string;
  text: string;
  translation: string;
}

export function DialogCatalog({ onBack }: DialogCatalogProps) {
  const [packages, setPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [words, setWords] = useState<{ english: string; turkish: string }[]>([]);
  const [dialog, setDialog] = useState<DialogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPackages();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      loadWords(selectedPackage);
      setDialog([]); // Paket değişince dialogu sıfırla
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
    try {
      const { data } = await supabase
        .from('learned_words')
        .select('english, turkish')
        .eq('package_name', packageName);

      if (data) {
        const uniqueMap = new Map<string, { english: string; turkish: string }>();
        for (const w of data) {
          if (!uniqueMap.has(w.english)) {
            uniqueMap.set(w.english, w);
          }
        }
        setWords(Array.from(uniqueMap.values()));
      }
    } catch (error) {
      console.error('Error loading words:', error);
    }
  };

  const generateDialog = async () => {
    if (words.length === 0) {
      toast.error('Önce paket seçin');
      return;
    }

    setGenerating(true);
    setDialog([]);

    try {
      const wordList = words.slice(0, 15).map(w => `${w.english} (${w.turkish})`).join(', ');
      
      const prompt = `Create a natural English dialogue between two people (A and B) using these words: ${wordList}

The dialogue should:
- Be 6-8 exchanges
- Use the words naturally in context
- Be appropriate for language learners

Return ONLY valid JSON in this exact format (no markdown):
[
  {"speaker": "A", "text": "Hello, how are you?", "translation": "Merhaba, nasılsın?"},
  {"speaker": "B", "text": "I'm fine, thank you!", "translation": "İyiyim, teşekkürler!"}
]`;

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { message: prompt }
      });

      if (error) throw error;

      // ai-chat fonksiyonu "reply" döndürüyor
      const response = data?.reply || data?.response || data?.message || '';
      
      console.log('AI Response:', response);
      
      if (!response) {
        throw new Error('Empty response from AI');
      }
      
      // Try to parse JSON from response
      try {
        // Extract JSON from the response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setDialog(parsed);
          toast.success('Diyalog oluşturuldu!');
        } else {
          throw new Error('No valid JSON found');
        }
      } catch (parseError) {
        console.error('Parse error:', parseError);
        console.error('Raw response:', response);
        toast.error('Diyalog oluşturulamadı. Tekrar deneyin.');
      }
    } catch (error) {
      console.error('Error generating dialog:', error);
      toast.error('Diyalog oluşturulurken hata oluştu');
    } finally {
      setGenerating(false);
    }
  };

  const speakText = (text: string, index: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(index);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setSpeakingIndex(null);
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
          <h1 className="text-sm font-semibold">Diyalog Kataloğu</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* Package selector */}
      <div className="p-3 border-b border-border flex gap-2">
        <select
          value={selectedPackage}
          onChange={(e) => setSelectedPackage(e.target.value)}
          className="flex-1 p-2 rounded-lg border border-border bg-background text-foreground"
        >
          {packages.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </select>
        <Button 
          onClick={generateDialog} 
          disabled={generating || words.length === 0}
          className="gap-2"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Oluştur
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : dialog.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Paket seçin ve "Oluştur" butonuna basarak<br />AI ile diyalog oluşturun.
            </p>
            <p className="text-xs text-muted-foreground">
              Seçili paket: {selectedPackage} ({words.length} kelime)
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {dialog.map((item, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border ${
                  item.speaker === 'A' 
                    ? 'bg-primary/10 border-primary/30 ml-0 mr-8' 
                    : 'bg-secondary/50 border-secondary ml-8 mr-0'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    item.speaker === 'A' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}>
                    {item.speaker}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground">{item.text}</p>
                    <p className="text-sm text-muted-foreground mt-1">{item.translation}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => speakText(item.text, index)}
                    className="h-8 w-8 flex-shrink-0"
                  >
                    <Volume2 className={`w-4 h-4 ${speakingIndex === index ? 'text-primary animate-pulse' : ''}`} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

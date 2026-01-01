import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, BookOpen, Loader2, Save, RefreshCw, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { externalSupabase } from '@/lib/externalSupabase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface WordWithSentence {
  english: string;
  turkish: string;
  sentence: string;
  sentenceTurkish: string;
}

interface SimpleWord {
  english: string;
  turkish: string;
}

interface SavedSentence {
  word: string;
  sentence: string;
}

interface WordCatalogProps {
  onBack: () => void;
  onSaveSentences: (sentences: WordWithSentence[]) => void;
}

export function WordCatalog({
  onBack,
  onSaveSentences
}: WordCatalogProps) {
  const [wordSentences, setWordSentences] = useState<WordWithSentence[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [sentenceTrash, setSentenceTrash] = useState<Record<string, string[]>>({}); // word -> eski cümleler
  
  // Tüm paketler ve kelimeler
  const [allPackages, setAllPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  
  // Kelimeler
  const [allVocabularyWords, setAllVocabularyWords] = useState<SimpleWord[]>([]);
  const [currentPackageWords, setCurrentPackageWords] = useState<SimpleWord[]>([]);
  
  // Kaydedilen cümleler (çeşitlilik için)
  const [savedSentences, setSavedSentences] = useState<SavedSentence[]>([]);

  // Cümledeki kelimeleri renklendir
  const highlightSentence = (sentence: string) => {
    const words = sentence.split(/(\s+|[.,!?;:'"()-])/);
    
    return words.map((word, idx) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:'"()-]/g, '');
      if (!cleanWord || /^\s+$/.test(word)) {
        return <span key={idx}>{word}</span>;
      }
      
      // Yeni öğrenilen kelime (kırmızı)
      const isCurrentPackageWord = currentPackageWords.some(
        w => w.english.toLowerCase() === cleanWord
      );
      if (isCurrentPackageWord) {
        return <span key={idx} className="text-red-500 font-semibold">{word}</span>;
      }
      
      // Kelime haznesindeki kelime (yeşil)
      const isVocabWord = allVocabularyWords.some(
        w => w.english.toLowerCase() === cleanWord
      );
      if (isVocabWord) {
        return <span key={idx} className="text-green-500 font-medium">{word}</span>;
      }
      
      return <span key={idx}>{word}</span>;
    });
  };

  // Başlangıçta tüm paketleri ve kaydedilen cümleleri yükle
  useEffect(() => {
    loadAllPackages();
    loadSavedSentences();
  }, []);

  // Paket seçildiğinde kelimeleri ve kayıtlı cümleleri yükle
  useEffect(() => {
    if (selectedPackage) {
      loadWordsForPackage(selectedPackage);
    }
  }, [selectedPackage]);

  // Kelimeler yüklendiğinde kayıtlı cümleleri ve reddedilen cümleleri DB'den yükle
  useEffect(() => {
    if (currentPackageWords.length > 0) {
      loadSentencesFromDB();
    }
  }, [currentPackageWords]);

  const loadSavedSentences = async () => {
    try {
      const { data } = await externalSupabase
        .from('game_content')
        .select('content, word_id')
        .eq('content_type', 'sentence');
      
      if (data) {
        // word_id'den kelimeyi almak için words tablosunu kontrol et
        const sentences: SavedSentence[] = [];
        for (const item of data as any[]) {
          const { data: wordData } = await externalSupabase
            .from('words')
            .select('english')
            .eq('id', item.word_id)
            .single();
          
          if (wordData) {
            sentences.push({ word: (wordData as any).english, sentence: item.content });
          }
        }
        setSavedSentences(sentences);
      }
    } catch (error) {
      console.error('Error loading saved sentences:', error);
    }
  };

  // DB'den kayıtlı cümleleri ve reddedilen cümleleri yükle
  const loadSentencesFromDB = async () => {
    if (!selectedPackage) return;
    
    try {
      // Kayıtlı cümleleri yükle (package_name bazlı)
      const { data: sentencesData } = await externalSupabase
        .from('word_sentences')
        .select('english, sentence, sentence_turkish')
        .eq('package_name', selectedPackage);
      
      // Reddedilen cümleleri yükle
      const { data: rejectedData } = await externalSupabase
        .from('rejected_sentences')
        .select('english, sentence')
        .eq('package_name', selectedPackage);
      
      if (sentencesData && sentencesData.length > 0) {
        // Cümleleri wordSentences formatına dönüştür
        const loadedSentences: WordWithSentence[] = [];
        
        for (const ws of sentencesData) {
          const originalWord = currentPackageWords.find(
            w => w.english.toLowerCase() === ws.english.toLowerCase()
          );
          if (originalWord) {
            loadedSentences.push({
              english: originalWord.english,
              turkish: originalWord.turkish,
              sentence: ws.sentence,
              sentenceTurkish: ws.sentence_turkish
            });
          }
        }
        
        if (loadedSentences.length > 0) {
          setWordSentences(loadedSentences);
        }
      }
      
      // Reddedilen cümleleri sentenceTrash'e yükle
      if (rejectedData && rejectedData.length > 0) {
        const trash: Record<string, string[]> = {};
        
        for (const rs of rejectedData) {
          const wordKey = rs.english.toLowerCase();
          if (!trash[wordKey]) {
            trash[wordKey] = [];
          }
          if (!trash[wordKey].includes(rs.sentence)) {
            trash[wordKey].push(rs.sentence);
          }
        }
        
        setSentenceTrash(prev => ({ ...prev, ...trash }));
      }
    } catch (error) {
      console.error('Error loading sentences from DB:', error);
    }
  };

  const loadAllPackages = async () => {
    setIsLoading(true);
    try {
      const { data: packagesData } = await externalSupabase
        .from('learned_words')
        .select('package_name');
      
      if (packagesData) {
        const uniquePackages = [...new Set(packagesData.map(p => p.package_name))];
        // Paketleri sırala (1.1.1, 1.1.2, ..., 1.1.10, 1.2.1, ...)
        uniquePackages.sort((a, b) => {
          const partsA = a.split('.').map(Number);
          const partsB = b.split('.').map(Number);
          for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
            const numA = partsA[i] || 0;
            const numB = partsB[i] || 0;
            if (numA !== numB) return numA - numB;
          }
          return 0;
        });
        setAllPackages(uniquePackages);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      toast.error('Paketler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const loadWordsForPackage = async (packageName: string) => {
    try {
      // Parse package name (e.g., "1.2.3" -> unit 1, section 2, round 3)
      const parts = packageName.split('.');
      if (parts.length !== 3) return;
      
      const unit = parseInt(parts[0]);
      const section = parseInt(parts[1]);
      const round = parseInt(parts[2]);
      
      // Bu paketten ÖNCE gelen TÜM paketleri bul
      // Örnek: 1.3.10 seçildi -> 1.1.1...1.1.10, 1.2.1...1.2.10, 1.3.1...1.3.10 dahil
      const packageNames: string[] = [];
      
      for (let u = 1; u <= unit; u++) {
        // Aynı unit içinde en fazla hangi section'a kadar gideceğiz
        const maxSection = (u === unit) ? section : 10; // Varsayılan olarak 10 section varsayıyoruz
        
        for (let s = 1; s <= maxSection; s++) {
          // Aynı unit ve section içinde en fazla hangi round'a kadar gideceğiz
          const maxRound = (u === unit && s === section) ? round : 10; // Varsayılan olarak 10 round varsayıyoruz
          
          for (let r = 1; r <= maxRound; r++) {
            packageNames.push(`${u}.${s}.${r}`);
          }
        }
      }
      
      // Sadece gerçekten var olan paketleri filtrele
      const existingPackages = packageNames.filter(p => allPackages.includes(p));
      
      // Tüm kelimeleri al
      const { data: allWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', existingPackages);
      
      // Seçili paketin kelimelerini al
      const { data: currentWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish')
        .eq('package_name', packageName);
      
      if (allWords) {
        // Unique kelimeleri al
        const uniqueWordsMap = new Map<string, SimpleWord>();
        for (const w of allWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, { english: w.english, turkish: w.turkish });
          }
        }
        setAllVocabularyWords(Array.from(uniqueWordsMap.values()));
      }
      
      if (currentWords) {
        // Unique kelimeleri al
        const uniqueCurrentMap = new Map<string, SimpleWord>();
        for (const w of currentWords) {
          if (!uniqueCurrentMap.has(w.english)) {
            uniqueCurrentMap.set(w.english, { english: w.english, turkish: w.turkish });
          }
        }
        setCurrentPackageWords(Array.from(uniqueCurrentMap.values()));
      }
    } catch (error) {
      console.error('Error loading words:', error);
      toast.error('Kelimeler yüklenirken hata oluştu');
    }
  };

  const generateSentences = async () => {
    if (currentPackageWords.length === 0) {
      toast.error('Önce bir paket seçin');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Kelime haznesindeki kelime sayısına göre cümle uzunluğu belirle
      const vocabSize = allVocabularyWords.length;
      let minWords = 3;
      let maxWords = 4;
      
      if (vocabSize <= 100) {
        minWords = 3;
        maxWords = 4;
      } else if (vocabSize <= 500) {
        minWords = 4;
        maxWords = 6;
      } else {
        minWords = 7;
        maxWords = 12;
      }

      const allWords = allVocabularyWords.map(w => w.english).join(', ');
      const currentWords = currentPackageWords.map(w => `${w.english} (${w.turkish})`).join(', ');
      
      // Kaydedilen cümleleri çeşitlilik için ekle
      const existingSentencesInfo = savedSentences.length > 0 
        ? `\n\nDaha önce kaydedilen cümleler (AYNI YAPIYI KULLANMA, farklı cümle yapıları kullan):\n${savedSentences.slice(-20).map(s => `- ${s.word}: "${s.sentence}"`).join('\n')}`
        : '';

      // Kelime listesini oluştur - sadece bu paketteki kelimeler için cümle üretilecek
      const wordsForSentences = currentPackageWords.map(w => w.english).join(', ');
      
      const prompt = `Sen bir İngilizce öğretmenisin. Her kelime için TAM OLARAK 1 cümle yaz.

KELİMELER (her biri için SADECE 1 cümle yaz):
${wordsForSentences}

KELİME HAZNESİ (cümlelerde bu kelimeleri kullanmaya çalış):
${allWords}
${existingSentencesInfo}

KURALLAR:
1. Her kelime için TAM OLARAK 1 tane ${minWords}-${maxWords} kelimelik cümle yaz
2. Toplam ${currentPackageWords.length} kelime var, toplam ${currentPackageWords.length} cümle olmalı
3. Cümlelerde kelime haznesindeki kelimeleri kullan
4. A1-A2 seviyesinde cümleler yaz
5. Her cümlenin Türkçe karşılığını yaz
6. ÇEŞİTLİLİK: Farklı özneler (I, He, She, We, They) ve fiiller (like, have, see, buy, eat, want) kullan
7. Soru ve olumsuz cümleler de ekle

JSON FORMATI (başka bir şey yazma):
[{"english":"kelime","sentence":"cümle","sentenceTurkish":"çeviri"}]`;

      const { data, error } = await externalSupabase.functions.invoke('groq-chat', {
        body: {
          message: prompt
        }
      });

      if (error) throw error;

      // Parse JSON response with better error handling
      let content = data.response || '';
      
      // Extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        throw new Error('JSON bulunamadı');
      }
      
      content = jsonMatch[0];
      
      // Clean up potential issues
      content = content
        .replace(/[\r\n]+/g, ' ')  // Remove newlines
        .replace(/,\s*]/g, ']')     // Remove trailing commas
        .replace(/"\s+"/g, '","');  // Fix spacing between strings

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error('JSON parse error, trying to fix:', content);
        // Try to extract individual objects
        const objectMatches = content.matchAll(/\{[^}]+\}/g);
        parsed = [];
        for (const match of objectMatches) {
          try {
            const obj = JSON.parse(match[0]);
            if (obj.english && obj.sentence) {
              parsed.push(obj);
            }
          } catch {
            // Skip invalid objects
          }
        }
        if (parsed.length === 0) {
          throw new Error('Cümleler oluşturulamadı, tekrar deneyin');
        }
      }
      
      // Her kelime için sadece 1 cümle al (duplicate'leri kaldır)
      const seenWords = new Set<string>();
      const sentences: WordWithSentence[] = [];
      
      for (const item of parsed) {
        const wordLower = item.english?.toLowerCase();
        if (wordLower && !seenWords.has(wordLower)) {
          seenWords.add(wordLower);
          const originalWord = currentPackageWords.find(w => w.english.toLowerCase() === wordLower);
          if (originalWord) {
            sentences.push({
              english: originalWord.english,
              turkish: originalWord.turkish,
              sentence: item.sentence || '',
              sentenceTurkish: item.sentenceTurkish || ''
            });
          }
        }
      }

      setWordSentences(sentences);
      
      // Cümleleri hemen DB'ye kaydet (package_name + english bazlı)
      for (const ws of sentences) {
        await externalSupabase
          .from('word_sentences')
          .upsert({
            package_name: selectedPackage,
            english: ws.english,
            sentence: ws.sentence,
            sentence_turkish: ws.sentenceTurkish
          }, { onConflict: 'package_name,english' });
      }
      
      if (sentences.length < currentPackageWords.length) {
        toast.warning(`${currentPackageWords.length - sentences.length} kelime için cümle oluşturulamadı`);
      } else {
        toast.success('Cümleler oluşturuldu ve kaydedildi!');
      }
    } catch (error) {
      console.error('Error generating sentences:', error);
      toast.error('Cümleler oluşturulurken hata oluştu, tekrar deneyin');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (wordSentences.length === 0 || !selectedPackage) return;
    
    setIsSaving(true);
    try {
      // Her cümle için upsert yap (package_name + english bazlı)
      for (const ws of wordSentences) {
        await externalSupabase
          .from('word_sentences')
          .upsert({
            package_name: selectedPackage,
            english: ws.english,
            sentence: ws.sentence,
            sentence_turkish: ws.sentenceTurkish
          }, { onConflict: 'package_name,english' });
      }
      
      // Çöp kutusundaki cümleleri rejected_sentences tablosuna kaydet
      for (const [wordKey, sentences] of Object.entries(sentenceTrash)) {
        for (const sentence of sentences) {
          // Aynı cümle varsa ekleme
          const { data: existing } = await externalSupabase
            .from('rejected_sentences')
            .select('id')
            .eq('package_name', selectedPackage)
            .eq('english', wordKey)
            .eq('sentence', sentence)
            .maybeSingle();
          
          if (!existing) {
            await externalSupabase
              .from('rejected_sentences')
              .insert({
                package_name: selectedPackage,
                english: wordKey,
                sentence: sentence
              });
          }
        }
      }
      
      // Cümleleri kaydedilen listeye ekle
      const newSavedSentences = wordSentences.map(s => ({
        word: s.english,
        sentence: s.sentence
      }));
      setSavedSentences(prev => [...prev, ...newSavedSentences]);
      
      onSaveSentences(wordSentences);
      toast.success('Cümleler veritabanına kaydedildi!');
    } catch (error) {
      console.error('Error saving sentences:', error);
      toast.error('Kayıt sırasında hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const regenerateSingleSentence = async (index: number) => {
    const wordItem = wordSentences[index];
    if (!wordItem) return;
    
    setRegeneratingIndex(index);
    
    // Mevcut cümleyi çöp kutusuna ekle
    const wordKey = wordItem.english.toLowerCase();
    const currentSentence = wordItem.sentence;
    
    setSentenceTrash(prev => {
      const existing = prev[wordKey] || [];
      // Aynı cümle yoksa ekle
      if (!existing.includes(currentSentence)) {
        return { ...prev, [wordKey]: [...existing, currentSentence] };
      }
      return prev;
    });
    
    try {
      const vocabSize = allVocabularyWords.length;
      let minWords = 3;
      let maxWords = 4;
      
      if (vocabSize <= 100) {
        minWords = 3;
        maxWords = 4;
      } else if (vocabSize <= 500) {
        minWords = 4;
        maxWords = 6;
      } else {
        minWords = 7;
        maxWords = 12;
      }

      const allWords = allVocabularyWords.map(w => w.english).join(', ');
      
      // Çöp kutusundaki tüm eski cümleleri al (güncel olanı da dahil et)
      const trashSentences = sentenceTrash[wordKey] || [];
      const allRejectedSentences = [...new Set([...trashSentences, currentSentence])];
      
      // Kaydedilen cümleleri de ekle
      const savedForWord = savedSentences
        .filter(s => s.word.toLowerCase() === wordKey)
        .map(s => s.sentence);
      
      const allExcludedSentences = [...new Set([...allRejectedSentences, ...savedForWord])];
      
      const excludedInfo = allExcludedSentences.length > 0 
        ? `\n\nBU CÜMLELERİ KULLANMA (reddedilen/eski cümleler - bunlardan FARKLI ve BENZEMİYOR olmalı):\n${allExcludedSentences.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n\nYukarıdaki cümlelerin HİÇBİRİNE benzemeyen, TAMAMEN FARKLI yapıda ve anlamda bir cümle yaz!`
        : '';

      const prompt = `Sen bir İngilizce öğretmenisin. "${wordItem.english}" (${wordItem.turkish}) kelimesi için TAM OLARAK 1 ÖZGÜN cümle yaz.

KELİME HAZNESİ (cümlede bu kelimeleri kullanmaya çalış):
${allWords}
${excludedInfo}

KURALLAR:
1. ${minWords}-${maxWords} kelimelik 1 cümle yaz
2. A1-A2 seviyesinde olsun
3. Türkçe karşılığını yaz
4. TAMAMEN FARKLI bir cümle yapısı ve konu kullan
5. Farklı fiil, farklı özne, farklı bağlam kullan
6. Reddedilen cümlelerle AYNI KELİMELERİ kullanma

JSON FORMATI (başka bir şey yazma):
{"sentence":"cümle","sentenceTurkish":"çeviri"}`;

      const { data, error } = await externalSupabase.functions.invoke('groq-chat', {
        body: {
          message: prompt
        }
      });

      if (error) throw error;

      let content = data.response || '';
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) throw new Error('JSON bulunamadı');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Cümleyi güncelle
      const updatedSentences = wordSentences.map((item, idx) => 
        idx === index 
          ? { ...item, sentence: parsed.sentence, sentenceTurkish: parsed.sentenceTurkish }
          : item
      );
      setWordSentences(updatedSentences);
      
      // Yeni cümleyi hemen DB'ye kaydet (package_name + english bazlı)
      if (selectedPackage) {
        // Yeni cümleyi kaydet
        await externalSupabase
          .from('word_sentences')
          .upsert({
            package_name: selectedPackage,
            english: wordItem.english,
            sentence: parsed.sentence,
            sentence_turkish: parsed.sentenceTurkish
          }, { onConflict: 'package_name,english' });
        
        // Eski cümleyi rejected_sentences'a ekle
        const { data: existing } = await externalSupabase
          .from('rejected_sentences')
          .select('id')
          .eq('package_name', selectedPackage)
          .eq('english', wordItem.english)
          .eq('sentence', currentSentence)
          .maybeSingle();
        
        if (!existing) {
          await externalSupabase
            .from('rejected_sentences')
            .insert({
              package_name: selectedPackage,
              english: wordItem.english,
              sentence: currentSentence
            });
        }
      }
      
      toast.success('Cümle yenilendi ve kaydedildi!');
    } catch (error) {
      console.error('Error regenerating sentence:', error);
      toast.error('Cümle yenilenirken hata oluştu');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleSelectPackage = (pkg: string) => {
    setSelectedPackage(pkg);
    setWordSentences([]); // Cümleleri temizle
    setSentenceTrash({}); // Trash'i temizle
  };

  // Kayıtlı cümleleri yükle butonu için
  const loadSavedSentencesForPackage = async () => {
    if (!selectedPackage) {
      toast.error('Önce bir paket seçin');
      return;
    }
    
    setIsLoadingSaved(true);
    try {
      const { data: sentencesData } = await externalSupabase
        .from('word_sentences')
        .select('english, sentence, sentence_turkish')
        .eq('package_name', selectedPackage);
      
      if (sentencesData && sentencesData.length > 0) {
        const loadedSentences: WordWithSentence[] = [];
        
        for (const ws of sentencesData) {
          const originalWord = currentPackageWords.find(
            w => w.english.toLowerCase() === ws.english.toLowerCase()
          );
          if (originalWord) {
            loadedSentences.push({
              english: originalWord.english,
              turkish: originalWord.turkish,
              sentence: ws.sentence,
              sentenceTurkish: ws.sentence_turkish
            });
          }
        }
        
        if (loadedSentences.length > 0) {
          setWordSentences(loadedSentences);
          toast.success(`${loadedSentences.length} kayıtlı cümle yüklendi`);
        } else {
          toast.info('Bu paket için kayıtlı cümle bulunamadı');
        }
      } else {
        toast.info('Bu paket için kayıtlı cümle bulunamadı');
      }
      
      // Reddedilen cümleleri de yükle
      const { data: rejectedData } = await externalSupabase
        .from('rejected_sentences')
        .select('english, sentence')
        .eq('package_name', selectedPackage);
      
      if (rejectedData && rejectedData.length > 0) {
        const trash: Record<string, string[]> = {};
        
        for (const rs of rejectedData) {
          const wordKey = rs.english.toLowerCase();
          if (!trash[wordKey]) {
            trash[wordKey] = [];
          }
          if (!trash[wordKey].includes(rs.sentence)) {
            trash[wordKey].push(rs.sentence);
          }
        }
        
        setSentenceTrash(prev => ({ ...prev, ...trash }));
      }
    } catch (error) {
      console.error('Error loading saved sentences:', error);
      toast.error('Kayıtlı cümleler yüklenirken hata oluştu');
    } finally {
      setIsLoadingSaved(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground">Kelime Kataloğu</h1>
            <p className="text-xs text-muted-foreground">
              {selectedPackage ? selectedPackage : 'Paket seçin'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadSavedSentencesForPackage}
            disabled={isLoadingSaved || !selectedPackage}
          >
            {isLoadingSaved ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Database className="w-4 h-4 mr-1" />
            )}
            Kayıtlı
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={generateSentences}
            disabled={isGenerating || !selectedPackage}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
            Oluştur
          </Button>
          <Button 
            size="sm"
            onClick={handleSave}
            disabled={isSaving || wordSentences.length === 0}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Kaydet
          </Button>
        </div>
      </header>

      <div className="p-4">
        {/* Paket Seçici */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-4">
              {selectedPackage ? `Paket: ${selectedPackage}` : 'Paket Seç'}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : (
              allPackages.map(pkg => (
                <DropdownMenuItem 
                  key={pkg} 
                  onClick={() => handleSelectPackage(pkg)}
                  className={selectedPackage === pkg ? 'bg-primary/10' : ''}
                >
                  {pkg}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Kelime Haznesi - Açılır Sekme */}
        {selectedPackage && (
          <Collapsible open={isVocabOpen} onOpenChange={setIsVocabOpen}>
            <Card className="mb-4 bg-primary/10 border-primary/20">
              <CollapsibleTrigger asChild>
                <CardContent className="p-3 cursor-pointer hover:bg-primary/15 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-primary" />
                      <span className="font-medium">Kelime Haznesi:</span>
                      <span className="text-muted-foreground">{allVocabularyWords.length} kelime</span>
                    </div>
                    {isVocabOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-3 pt-0">
                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                    {/* Önce seçili paket kelimeleri - kırmızı */}
                    {currentPackageWords.map((word, idx) => (
                      <span 
                        key={`current-${idx}`} 
                        className="px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 rounded text-xs font-medium"
                      >
                        {word.english}
                      </span>
                    ))}
                    {/* Diğer kelimeler */}
                    {allVocabularyWords
                      .filter(w => !currentPackageWords.some(cp => cp.english === w.english))
                      .map((word, idx) => (
                        <span 
                          key={`vocab-${idx}`} 
                          className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                        >
                          {word.english}
                        </span>
                      ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-4">
        {!selectedPackage ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Önce bir paket seçin</p>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cümleler oluşturuluyor...</p>
          </div>
        ) : wordSentences.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">"Oluştur" butonuna basarak cümle üretin</p>
          </div>
        ) : (
          wordSentences.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded text-sm font-medium">
                    {item.english}
                  </div>
                  <span className="text-sm text-muted-foreground">{item.turkish}</span>
                </div>
                <div className="space-y-2 mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-foreground font-medium flex-1">{highlightSentence(item.sentence)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => regenerateSingleSentence(index)}
                      disabled={regeneratingIndex !== null}
                    >
                      <RefreshCw className={`w-4 h-4 ${regeneratingIndex === index ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-sm italic">{item.sentenceTurkish}</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

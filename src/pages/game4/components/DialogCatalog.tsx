import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MessageCircle, Loader2, Save, RefreshCw, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { externalSupabase } from '../lib/externalSupabase';
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

interface DialogItem {
  english: string;
  turkish: string;
  question: string;
  answer: string;
}

interface SimpleWord {
  english: string;
  turkish: string;
}

interface DialogCatalogProps {
  onBack: () => void;
}

export function DialogCatalog({ onBack }: DialogCatalogProps) {
  const [dialogs, setDialogs] = useState<DialogItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isVocabOpen, setIsVocabOpen] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [dialogTrash, setDialogTrash] = useState<Record<string, { question: string; answer: string }[]>>({});
  
  const [allPackages, setAllPackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [allVocabularyWords, setAllVocabularyWords] = useState<SimpleWord[]>([]);
  const [currentPackageWords, setCurrentPackageWords] = useState<SimpleWord[]>([]);

  // Kelime haznesindeki kelimeleri yeşil renkle vurgula
  const highlightVocabularyWords = (text: string) => {
    if (!text || allVocabularyWords.length === 0) return text;
    
    const vocabSet = new Set(allVocabularyWords.map(w => w.english.toLowerCase()));
    const words = text.split(/(\s+)/);
    
    return words.map((word, index) => {
      const cleanWord = word.replace(/[.,!?'"]/g, '').toLowerCase();
      if (vocabSet.has(cleanWord)) {
        return (
          <span key={index} className="text-green-600 dark:text-green-400 font-medium">
            {word}
          </span>
        );
      }
      return word;
    });
  };

  useEffect(() => {
    loadAllPackages();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      loadWordsForPackage(selectedPackage);
    }
  }, [selectedPackage]);

  useEffect(() => {
    if (currentPackageWords.length > 0) {
      loadDialogsFromDB();
    }
  }, [currentPackageWords]);

  const loadDialogsFromDB = async () => {
    if (!selectedPackage) return;
    
    try {
      const { data: dialogsData } = await supabase
        .from('word_dialogs')
        .select('english, question, answer')
        .eq('package_name', selectedPackage);
      
      const { data: rejectedData } = await supabase
        .from('rejected_dialogs')
        .select('english, question, answer')
        .eq('package_name', selectedPackage);
      
      if (dialogsData && dialogsData.length > 0) {
        const loadedDialogs: DialogItem[] = [];
        
        for (const d of dialogsData) {
          const originalWord = currentPackageWords.find(
            w => w.english.toLowerCase() === d.english.toLowerCase()
          );
          if (originalWord) {
            loadedDialogs.push({
              english: originalWord.english,
              turkish: originalWord.turkish,
              question: d.question,
              answer: d.answer
            });
          }
        }
        
        if (loadedDialogs.length > 0) {
          setDialogs(loadedDialogs);
        }
      }
      
      if (rejectedData && rejectedData.length > 0) {
        const trash: Record<string, { question: string; answer: string }[]> = {};
        
        for (const rd of rejectedData) {
          const wordKey = rd.english.toLowerCase();
          if (!trash[wordKey]) {
            trash[wordKey] = [];
          }
          trash[wordKey].push({ question: rd.question, answer: rd.answer });
        }
        
        setDialogTrash(prev => ({ ...prev, ...trash }));
      }
    } catch (error) {
      console.error('Error loading dialogs from DB:', error);
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
      const parts = packageName.split('.');
      if (parts.length !== 3) return;
      
      const unit = parseInt(parts[0]);
      const section = parseInt(parts[1]);
      const round = parseInt(parts[2]);
      
      const packageNames: string[] = [];
      
      for (let u = 1; u <= unit; u++) {
        const maxSection = (u === unit) ? section : 10;
        
        for (let s = 1; s <= maxSection; s++) {
          const maxRound = (u === unit && s === section) ? round : 10;
          
          for (let r = 1; r <= maxRound; r++) {
            packageNames.push(`${u}.${s}.${r}`);
          }
        }
      }
      
      const existingPackages = packageNames.filter(p => allPackages.includes(p));
      
      const { data: allWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish, package_name')
        .in('package_name', existingPackages);
      
      const { data: currentWords } = await externalSupabase
        .from('learned_words')
        .select('english, turkish')
        .eq('package_name', packageName);
      
      if (allWords) {
        const uniqueWordsMap = new Map<string, SimpleWord>();
        for (const w of allWords) {
          if (!uniqueWordsMap.has(w.english)) {
            uniqueWordsMap.set(w.english, { english: w.english, turkish: w.turkish });
          }
        }
        setAllVocabularyWords(Array.from(uniqueWordsMap.values()));
      }
      
      if (currentWords) {
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

  const handleSelectPackage = (pkg: string) => {
    setSelectedPackage(pkg);
    setDialogs([]);
    setDialogTrash({});
  };

  const loadSavedDialogsForPackage = async () => {
    if (!selectedPackage) {
      toast.error('Önce bir paket seçin');
      return;
    }
    
    setIsLoadingSaved(true);
    
    try {
      const { data: dialogsData } = await supabase
        .from('word_dialogs')
        .select('english, question, answer')
        .eq('package_name', selectedPackage);
      
      const { data: rejectedData } = await supabase
        .from('rejected_dialogs')
        .select('english, question, answer')
        .eq('package_name', selectedPackage);
      
      if (!dialogsData || dialogsData.length === 0) {
        toast.info('Bu paket için kayıtlı dialog bulunamadı');
        setIsLoadingSaved(false);
        return;
      }
      
      const loadedDialogs: DialogItem[] = [];
      
      for (const d of dialogsData) {
        const originalWord = currentPackageWords.find(
          w => w.english.toLowerCase() === d.english.toLowerCase()
        );
        if (originalWord) {
          loadedDialogs.push({
            english: originalWord.english,
            turkish: originalWord.turkish,
            question: d.question,
            answer: d.answer
          });
        }
      }
      
      if (loadedDialogs.length > 0) {
        setDialogs(loadedDialogs);
        toast.success(`${loadedDialogs.length} dialog yüklendi`);
      } else {
        toast.info('Kayıtlı dialog bulunamadı');
      }
      
      if (rejectedData && rejectedData.length > 0) {
        const trash: Record<string, { question: string; answer: string }[]> = {};
        
        for (const rd of rejectedData) {
          const wordKey = rd.english.toLowerCase();
          if (!trash[wordKey]) {
            trash[wordKey] = [];
          }
          trash[wordKey].push({ question: rd.question, answer: rd.answer });
        }
        
        setDialogTrash(trash);
      }
    } catch (error) {
      console.error('Error loading saved dialogs:', error);
      toast.error('Dialoglar yüklenirken hata oluştu');
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const generateDialogs = async () => {
    if (currentPackageWords.length === 0) {
      toast.error('Önce bir paket seçin');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const wordsWithTurkish = currentPackageWords.map(w => `${w.english} (${w.turkish})`).join(', ');
      
      // Kelime haznesini prompt'a ekle
      const vocabularyList = allVocabularyWords.map(w => w.english).join(', ');
      
      const prompt = `Sen bir İngilizce öğretmenisin. Her kelime için SORU-CEVAP dialogu yaz.

KELİMELER (her biri için dialog yaz):
${wordsWithTurkish}

KELİME HAZNESİ (cümlelerde ÖNCE bu kelimeleri kullan, gerekirse başka kelimeler ekle):
${vocabularyList}

KURALLAR:
1. Her kelime için bir SORU cümlesi yaz (A1-A2 seviyesi, 4-8 kelime)
2. Cevap o kelime VEYA o kelimeyi içeren 3-4 kelimelik kısa cümle olsun
3. Soru ve cevap cümlelerinde MÜMKÜN OLDUĞUNCA kelime haznesindeki kelimeleri kullan
4. Kelime haznesindeki kelimelerle mantıklı cümle kurulamıyorsa başka kelimeler ekleyebilirsin
5. Soru cümlesi, cevabı doğrudan ima etmeli (Where do you keep milk? -> In the fridge)
6. KRİTİK: Her cevap BENZERSİZ olmalı! Bir kelimenin cevabı başka bir kelimenin sorusuna UYGUN OLMAMALI
7. Cevaplar birbirinden net şekilde farklı olmalı (örn: "In the fridge" vs "At school" vs "My mother")
8. KISA CEVAPLAR: Cevap 1-4 kelime arası olmalı

ÖRNEK:
- milk -> Question: "Where do you keep milk?" Answer: "In the fridge"
- teacher -> Question: "Who helps you learn?" Answer: "My teacher"
- run -> Question: "What do you do to exercise?" Answer: "I run"

JSON FORMATI (başka bir şey yazma):
[{"english":"kelime","question":"soru","answer":"cevap"}]`;

      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: {
          messages: [{ role: 'user', content: prompt }]
        }
      });

      if (error) throw error;

      let content = data.content || '';
      const jsonMatch = content.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) throw new Error('JSON bulunamadı');
      
      content = jsonMatch[0]
        .replace(/[\r\n]+/g, ' ')
        .replace(/,\s*]/g, ']')
        .replace(/"\s+"/g, '","');

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const objectMatches = content.matchAll(/\{[^}]+\}/g);
        parsed = [];
        for (const match of objectMatches) {
          try {
            const obj = JSON.parse(match[0]);
            if (obj.english && obj.question && obj.answer) {
              parsed.push(obj);
            }
          } catch {}
        }
        if (parsed.length === 0) throw new Error('Dialoglar oluşturulamadı');
      }
      
      const seenWords = new Set<string>();
      const newDialogs: DialogItem[] = [];
      
      for (const item of parsed) {
        const wordLower = item.english?.toLowerCase();
        if (wordLower && !seenWords.has(wordLower)) {
          seenWords.add(wordLower);
          const originalWord = currentPackageWords.find(w => w.english.toLowerCase() === wordLower);
          if (originalWord) {
            newDialogs.push({
              english: originalWord.english,
              turkish: originalWord.turkish,
              question: item.question || '',
              answer: item.answer || ''
            });
          }
        }
      }

      setDialogs(newDialogs);
      
      // Hemen DB'ye kaydet
      for (const d of newDialogs) {
        await supabase
          .from('word_dialogs')
          .upsert({
            package_name: selectedPackage,
            english: d.english,
            question: d.question,
            answer: d.answer
          }, { onConflict: 'package_name,english' });
      }
      
      toast.success('Dialoglar oluşturuldu ve kaydedildi!');
    } catch (error) {
      console.error('Error generating dialogs:', error);
      toast.error('Dialoglar oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateSingleDialog = async (index: number) => {
    const dialog = dialogs[index];
    if (!dialog) return;
    
    setRegeneratingIndex(index);
    
    try {
      const wordKey = dialog.english.toLowerCase();
      
      // Mevcut dialogu çöp kutusuna ekle
      setDialogTrash(prev => {
        const existing = prev[wordKey] || [];
        const alreadyExists = existing.some(
          d => d.question === dialog.question && d.answer === dialog.answer
        );
        if (alreadyExists) return prev;
        return { ...prev, [wordKey]: [...existing, { question: dialog.question, answer: dialog.answer }] };
      });
      
      // Mevcut dialogu rejected_dialogs'a kaydet
      await supabase.from('rejected_dialogs').insert({
        package_name: selectedPackage,
        english: dialog.english,
        question: dialog.question,
        answer: dialog.answer
      });
      
      // Diğer kelimelerin cevaplarını topla (yeniden üretilen hariç)
      const otherAnswers = dialogs
        .filter((_, i) => i !== index)
        .map(d => d.answer)
        .filter(a => a);
      
      // Reddedilen dialogları topla
      const rejectedDialogs = dialogTrash[wordKey] || [];
      const rejectedInfo = rejectedDialogs.length > 0
        ? `\n\nREDDEDİLEN DIALOGLAR (bunları KULLANMA):\n${rejectedDialogs.map(d => `Q: "${d.question}" A: "${d.answer}"`).join('\n')}`
        : '';
      
      const otherAnswersInfo = otherAnswers.length > 0
        ? `\n\nDİĞER KELİMELERİN CEVAPLARI (bunlara benzemeyen cevap yaz):\n${otherAnswers.join(', ')}`
        : '';

      // Kelime haznesini prompt'a ekle
      const vocabularyList = allVocabularyWords.map(w => w.english).join(', ');

      const prompt = `Sen bir İngilizce öğretmenisin. Bu kelime için YENİ bir SORU-CEVAP dialogu yaz.

KELİME: ${dialog.english} (${dialog.turkish})

KELİME HAZNESİ (cümlelerde ÖNCE bu kelimeleri kullan, gerekirse başka kelimeler ekle):
${vocabularyList}
${rejectedInfo}
${otherAnswersInfo}

KURALLAR:
1. TAMAMEN FARKLI bir soru ve cevap yaz
2. Soru 4-8 kelime, A1-A2 seviyesi
3. Cevap 1-4 kelime arası (kelime veya kısa cümle)
4. Cevap diğer kelimelerin cevaplarına BENZEMEYECEK
5. Soru, cevabı doğrudan ima etmeli
6. Soru ve cevap cümlelerinde MÜMKÜN OLDUĞUNCA kelime haznesindeki kelimeleri kullan

JSON FORMATI:
{"english":"${dialog.english}","question":"yeni soru","answer":"yeni cevap"}`;

      const { data, error } = await supabase.functions.invoke('groq-chat', {
        body: { messages: [{ role: 'user', content: prompt }] }
      });

      if (error) throw error;

      let content = data.content || '';
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error('JSON bulunamadı');
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const newDialog: DialogItem = {
        english: dialog.english,
        turkish: dialog.turkish,
        question: parsed.question || '',
        answer: parsed.answer || ''
      };
      
      setDialogs(prev => prev.map((d, i) => i === index ? newDialog : d));
      
      // Yeni dialogu DB'ye kaydet
      await supabase
        .from('word_dialogs')
        .upsert({
          package_name: selectedPackage,
          english: newDialog.english,
          question: newDialog.question,
          answer: newDialog.answer
        }, { onConflict: 'package_name,english' });
      
      toast.success('Yeni dialog oluşturuldu!');
    } catch (error) {
      console.error('Error regenerating dialog:', error);
      toast.error('Dialog yenilenemedi');
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleSave = async () => {
    if (dialogs.length === 0 || !selectedPackage) return;
    
    setIsSaving(true);
    try {
      for (const d of dialogs) {
        await supabase
          .from('word_dialogs')
          .upsert({
            package_name: selectedPackage,
            english: d.english,
            question: d.question,
            answer: d.answer
          }, { onConflict: 'package_name,english' });
      }
      
      // Çöp kutusundaki dialogları kaydet
      for (const [wordKey, dialogList] of Object.entries(dialogTrash)) {
        for (const d of dialogList) {
          const { data: existing } = await supabase
            .from('rejected_dialogs')
            .select('id')
            .eq('package_name', selectedPackage)
            .eq('english', wordKey)
            .eq('question', d.question)
            .maybeSingle();
          
          if (!existing) {
            await supabase.from('rejected_dialogs').insert({
              package_name: selectedPackage,
              english: wordKey,
              question: d.question,
              answer: d.answer
            });
          }
        }
      }
      
      toast.success('Dialoglar kaydedildi!');
    } catch (error) {
      console.error('Error saving dialogs:', error);
      toast.error('Dialoglar kaydedilemedi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-4 border-b border-border flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Dialog Kataloğu
        </h1>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        {/* Paket Seçimi */}
        <div className="flex gap-2 items-center flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                {selectedPackage || 'Paket Seç'}
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[300px] overflow-auto">
              {allPackages.map(pkg => (
                <DropdownMenuItem key={pkg} onClick={() => handleSelectPackage(pkg)}>
                  {pkg}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {selectedPackage && (
            <>
              <Button
                variant="outline"
                onClick={loadSavedDialogsForPackage}
                disabled={isLoadingSaved}
              >
                {isLoadingSaved ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                <span className="ml-2">Kayıtlı</span>
              </Button>
              
              <Button onClick={generateDialogs} disabled={isGenerating || currentPackageWords.length === 0}>
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                <span className="ml-2">Oluştur</span>
              </Button>
              
              <Button variant="secondary" onClick={handleSave} disabled={isSaving || dialogs.length === 0}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Kaydet</span>
              </Button>
            </>
          )}
        </div>

        {/* Kelime Haznesi */}
        {selectedPackage && (
          <Collapsible open={isVocabOpen} onOpenChange={setIsVocabOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Kelime Haznesi ({allVocabularyWords.length} kelime)</span>
                {isVocabOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 bg-muted rounded-lg mt-2 text-sm max-h-[200px] overflow-auto">
                <div className="flex flex-wrap gap-2">
                  {allVocabularyWords.map(w => (
                    <span
                      key={w.english}
                      className={`px-2 py-1 rounded ${
                        currentPackageWords.some(cw => cw.english === w.english)
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {w.english}
                    </span>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Dialoglar */}
        {dialogs.length > 0 && (
          <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
            {dialogs.map((dialog, index) => (
              <Card key={`${dialog.english}-${index}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-primary">{dialog.english}</span>
                        <span className="text-muted-foreground text-sm">({dialog.turkish})</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm">
                          <span className="font-medium text-blue-600 dark:text-blue-400">Q: </span>
                          {highlightVocabularyWords(dialog.question)}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-orange-600 dark:text-orange-400">A: </span>
                          {highlightVocabularyWords(dialog.answer)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => regenerateSingleDialog(index)}
                      disabled={regeneratingIndex === index}
                    >
                      {regeneratingIndex === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedPackage && dialogs.length === 0 && !isGenerating && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Bu paket için dialog oluşturmak için "Oluştur" butonuna tıklayın</p>
            <p className="text-sm mt-1">veya "Kayıtlı" butonuyla kaydedilen dialogları yükleyin</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, GraduationCap } from "lucide-react";
import { VocabularyBox } from "@/components/VocabularyBox";
import { UnknownWordsBox } from "@/components/UnknownWordsBox";
import { AllWordsDrawer } from "@/components/AllWordsDrawer";
import { LearnedWordsDrawer } from "@/components/LearnedWordsDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { makeAIRequest } from "@/lib/aiRequest";
import { BottomNavigation } from "@/components/BottomNavigation";

interface Word {
  english: string;
  turkish: string;
  frequency_group: string;
  package_id?: string | null;
}

interface UnknownWord {
  word: string;
  translation: string;
  inDatabase: boolean;
}

const Index = () => {
  const [inputWord, setInputWord] = useState("");
  const [translation, setTranslation] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [sentenceTranslation, setSentenceTranslation] = useState("");
  const [unknownWords, setUnknownWords] = useState<UnknownWord[]>([]);
  const [showUnknown, setShowUnknown] = useState(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  // Load vocabulary from CSV on mount and check admin status
  useEffect(() => {
    loadVocabularyFromCSV();
    loadLearnedWords();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setIsAdmin(!!data);
    }
  };

  const loadVocabularyFromCSV = async () => {
    try {
      const response = await fetch("/data/vocabulary.csv");
      const text = await response.text();
      const lines = text.split("\n").slice(1); // Skip header
      
      const words: Word[] = [];
      lines.forEach((line) => {
        const [english, turkish, frequency_group] = line.split(";");
        if (english && turkish && frequency_group) {
          words.push({
            english: english.replace(/^\ufeff/, "").trim(),
            turkish: turkish.trim(),
            frequency_group: frequency_group.trim(),
          });
        }
      });

      // Insert words into database
      const { error } = await supabase.from("words").upsert(words, { 
        onConflict: "english,turkish",
        ignoreDuplicates: true 
      });

      if (error) throw error;
      setAllWords(words);
      
      toast({
        title: "Vocabulary Loaded",
        description: `${words.length} words loaded successfully!`,
      });
    } catch (error) {
      console.error("Error loading vocabulary:", error);
      toast({
        title: "Error",
        description: "Failed to load vocabulary",
        variant: "destructive",
      });
    }
  };

  const loadLearnedWords = async () => {
    const { data, error } = await supabase
      .from("learned_words")
      .select("english, turkish, frequency_group, package_id")
      .order("added_at", { ascending: false });

    if (!error && data) {
      setLearnedWords(data);
    }
  };

  const handleTranslate = async () => {
    if (!inputWord.trim()) return;
    
    setIsLoading(true);
    setUnknownWords([]);
    
    try {
      // Search in database first
      const searchWord = isSwapped ? inputWord.trim() : inputWord.trim();
      const searchField = isSwapped ? "turkish" : "english";
      const resultField = isSwapped ? "english" : "turkish";
      
      const { data: wordData } = await supabase
        .from("words")
        .select("*")
        .ilike(searchField, searchWord)
        .limit(1)
        .single();

      let translationResult = "";
      let wordInDB = false;

      if (wordData) {
        translationResult = wordData[resultField];
        wordInDB = true;
      } else {
        // Use AI for translation
        const data = await makeAIRequest({
          action: "translate",
          word: searchWord,
          sourceLanguage: isSwapped ? "tr" : "en",
        });
        translationResult = data.result;
        
        // Add to database as 1k word
        await supabase.from("words").insert({
          english: isSwapped ? translationResult : searchWord,
          turkish: isSwapped ? searchWord : translationResult,
          frequency_group: "1k",
        });
      }

      setTranslation(translationResult);
      
      // Generate example sentence
      await generateExampleSentence(isSwapped ? translationResult : searchWord);
      
    } catch (error) {
      console.error("Translation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to translate word";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateExampleSentence = async (englishWord: string) => {
    try {
      const data = await makeAIRequest({
        action: "generateSentence",
        word: englishWord,
        learnedWords: learnedWords.map(w => w.english),
      });
      const sentence = data.result;
      setExampleSentence(sentence);
      
      // Small delay before next request
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Translate sentence to Turkish
      const translateData = await makeAIRequest({
        action: "translate",
        word: sentence,
        sourceLanguage: "en",
      });
      setSentenceTranslation(translateData.result);
      
      // Find unknown words
      await findUnknownWords(sentence);
      
    } catch (error) {
      console.error("Example sentence error:", error);
    }
  };

  const findUnknownWords = async (sentence: string) => {
    const excludedWords = new Set([
      "the", "a", "an", "to", "in", "is", "are", "was", "were", "be", "been",
      "being", "have", "has", "had", "do", "does", "did", "will", "would",
      "should", "could", "can", "may", "might", "must", "shall", "of", "for",
      "with", "at", "by", "from", "on", "as", "but", "or", "and", "if", "then"
    ]);
    
    const words = sentence
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(" ")
      .filter(w => w.length > 2 && !excludedWords.has(w));
    
    const unknownList: UnknownWord[] = [];
    const learnedSet = new Set(learnedWords.map(w => w.english.toLowerCase()));
    
    for (const word of words) {
      if (learnedSet.has(word)) continue;
      
      const { data: wordData } = await supabase
        .from("words")
        .select("*")
        .ilike("english", word)
        .limit(1)
        .single();

      if (wordData) {
        unknownList.push({
          word: wordData.english,
          translation: wordData.turkish,
          inDatabase: true,
        });
      }
    }
    
    setUnknownWords(unknownList);
  };

  const handleAddToLearned = async (word: string) => {
    const { data: wordData } = await supabase
      .from("words")
      .select("*")
      .ilike("english", word)
      .limit(1)
      .single();

    if (wordData) {
      await supabase.from("learned_words").insert({
        english: wordData.english,
        turkish: wordData.turkish,
        frequency_group: wordData.frequency_group,
      });
      
      setUnknownWords(prev => prev.filter(w => w.word !== word));
      await loadLearnedWords();
      
      toast({
        title: "Word Added",
        description: `"${word}" added to learned words!`,
      });
    }
  };

  const handleRemoveLearned = async (word: Word) => {
    const { error } = await supabase
      .from("learned_words")
      .delete()
      .eq("english", word.english)
      .eq("turkish", word.turkish);

    if (!error) {
      await loadLearnedWords();
      toast({
        title: "Word Removed",
        description: `"${word.english}" removed from learned words`,
      });
    }
  };

  const handleAddCurrentWordToLearned = async () => {
    if (!inputWord.trim() || !translation.trim()) {
      toast({
        title: "Error",
        description: "Please translate a word first",
        variant: "destructive",
      });
      return;
    }

    const englishWord = isSwapped ? translation : inputWord;
    const turkishWord = isSwapped ? inputWord : translation;

    // Check if word exists in words table
    const { data: wordData } = await supabase
      .from("words")
      .select("*")
      .ilike("english", englishWord)
      .ilike("turkish", turkishWord)
      .limit(1)
      .maybeSingle();

    let frequencyGroup = "1k";

    // If word doesn't exist in database, add it first
    if (!wordData) {
      const { error: insertError } = await supabase.from("words").insert({
        english: englishWord,
        turkish: turkishWord,
        frequency_group: "1k",
      });

      if (!insertError) {
        // Update allWords state with the new word
        setAllWords(prev => [...prev, {
          english: englishWord,
          turkish: turkishWord,
          frequency_group: "1k",
        }]);
      }
    } else {
      frequencyGroup = wordData.frequency_group;
    }

    // Add to learned words
    const { error } = await supabase.from("learned_words").insert({
      english: englishWord,
      turkish: turkishWord,
      frequency_group: frequencyGroup,
    });

    if (!error) {
      await loadLearnedWords();
      toast({
        title: "Word Added",
        description: `"${englishWord}" added to learned words!`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            Sözlük
          </h1>
          {/* Only show drawer buttons for admin */}
          {isAdmin && (
            <div className="flex gap-2">
              <LearnedWordsDrawer words={learnedWords} onRemove={handleRemoveLearned} onWordsAdded={loadLearnedWords} />
              <AllWordsDrawer words={allWords} />
            </div>
          )}
        </div>

        {/* Input Controls */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsSwapped(!isSwapped)}
            className="shrink-0"
          >
            <ArrowUpDown className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={!inputWord.trim() || isLoading}
            className="flex-1"
          >
            {isLoading ? "Translating..." : "Translate"}
          </Button>
        </div>

        {/* Vocabulary Boxes */}
        <VocabularyBox
          label={isSwapped ? "Turkish Word" : "English Word"}
          value={inputWord}
          onChange={setInputWord}
          placeholder={isSwapped ? "Türkçe kelime girin..." : "Enter English word..."}
        />

        <div className="flex gap-2">
          <VocabularyBox
            label={isSwapped ? "English Translation" : "Turkish Translation"}
            value={translation}
            onChange={setTranslation}
            placeholder="Translation will appear here..."
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddCurrentWordToLearned}
            disabled={!translation.trim()}
            className="mt-8 shrink-0"
            title="Add to learned words"
          >
            +
          </Button>
        </div>

        <VocabularyBox
          label="Example Sentence"
          value={exampleSentence}
          readOnly
          multiline
          placeholder="Example sentence will appear here..."
        />

        <VocabularyBox
          label="Turkish Translation of Sentence"
          value={sentenceTranslation}
          readOnly
          multiline
          placeholder="Turkish translation will appear here..."
        />

        {/* Unknown Words */}
        <UnknownWordsBox
          words={unknownWords}
          isVisible={showUnknown}
          onToggle={() => setShowUnknown(!showUnknown)}
          onAddWord={handleAddToLearned}
        />
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;

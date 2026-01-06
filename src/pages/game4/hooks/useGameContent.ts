import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SentenceData {
  id: string;
  english: string;
  sentence: string;
  sentence_turkish: string;
}

interface DialogData {
  id: string;
  english: string;
  question: string;
  answer: string;
}

interface GameContentData {
  sentences: Map<string, SentenceData>;
  dialogs: DialogData[];
  isLoading: boolean;
}

export function useGameContent(packageName: string, words: { english: string }[]): GameContentData {
  const [sentences, setSentences] = useState<Map<string, SentenceData>>(new Map());
  const [dialogs, setDialogs] = useState<DialogData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!packageName || words.length === 0) return;

    const loadContent = async () => {
      setIsLoading(true);
      
      try {
        // Load sentences and dialogs in parallel
        const [sentencesResult, dialogsResult] = await Promise.all([
          supabase
            .from('word_sentences')
            .select('*')
            .eq('package_name', packageName),
          supabase
            .from('word_dialogs')
            .select('*')
            .eq('package_name', packageName)
        ]);

        // Process sentences
        if (sentencesResult.data) {
          const sentenceMap = new Map<string, SentenceData>();
          for (const s of sentencesResult.data) {
            // Map by lowercase english word for matching
            sentenceMap.set(s.english.toLowerCase(), {
              id: s.id,
              english: s.english,
              sentence: s.sentence,
              sentence_turkish: s.sentence_turkish
            });
          }
          setSentences(sentenceMap);
        }

        // Process dialogs
        if (dialogsResult.data) {
          setDialogs(dialogsResult.data.map(d => ({
            id: d.id,
            english: d.english,
            question: d.question,
            answer: d.answer
          })));
        }
      } catch (error) {
        console.error('Error loading game content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [packageName, words.length]);

  return { sentences, dialogs, isLoading };
}

// Helper to get sentence for a word
export function getSentenceForWord(
  sentences: Map<string, { id: string; english: string; sentence: string; sentence_turkish: string }>,
  english: string
) {
  return sentences.get(english.toLowerCase()) || null;
}

// Helper to get dialog and wrong answer for a word
export function getDialogForWord(
  dialogs: { id: string; english: string; question: string; answer: string }[],
  english: string
) {
  const dialog = dialogs.find(d => d.english.toLowerCase() === english.toLowerCase());
  if (!dialog) return null;

  // Get a random wrong answer from other dialogs in the same package
  const otherDialogs = dialogs.filter(d => d.english.toLowerCase() !== english.toLowerCase());
  const wrongAnswer = otherDialogs.length > 0 
    ? otherDialogs[Math.floor(Math.random() * otherDialogs.length)].answer
    : null;

  return {
    question: dialog.question,
    correctAnswer: dialog.answer,
    wrongAnswer
  };
}

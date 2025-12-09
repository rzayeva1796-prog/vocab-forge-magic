import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

interface Word {
  id: string;
  english: string;
  turkish: string;
  audio_url: string | null;
}

interface WordsPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageName: string;
  onActivate: () => void;
}

export const WordsPreviewModal = ({
  open,
  onOpenChange,
  packageId,
  packageName,
  onActivate,
}: WordsPreviewModalProps) => {
  const { user } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (open && packageId) {
      fetchWords();
    }
  }, [open, packageId]);

  const fetchWords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("learned_words")
        .select("id, english, turkish, audio_url")
        .eq("package_id", packageId)
        .order("english");

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error("Error fetching words:", error);
      toast.error("Kelimeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (word: Word) => {
    setPlayingId(word.id);
    
    try {
      // Use Web Speech API for TTS (free and works offline)
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word.english);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // Find an English voice
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
        
        utterance.onend = () => setPlayingId(null);
        utterance.onerror = () => {
          console.error("Speech synthesis error");
          setPlayingId(null);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        toast.error("Tarayıcınız sesli okumayı desteklemiyor");
        setPlayingId(null);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Ses çalınamadı");
      setPlayingId(null);
    }
  };

  const handleActivate = async () => {
    if (!user) {
      toast.error("Giriş yapmalısınız");
      return;
    }

    setActivating(true);
    try {
      // Set all words in this package to 3 stars (minimum to unlock)
      const wordIds = words.map((w) => w.id);
      
      const upsertData = wordIds.map((wordId) => ({
        user_id: user.id,
        word_id: wordId,
        star_rating: 3,
      }));

      const { error } = await supabase
        .from("user_word_progress")
        .upsert(upsertData, { onConflict: "user_id,word_id" });

      if (error) throw error;

      toast.success("Alt bölüm aktifleştirildi");
      onActivate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error activating:", error);
      toast.error("Aktifleştirilemedi");
    } finally {
      setActivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{packageName} - Kelimeler</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-2">
                {words.map((word) => (
                  <div
                    key={word.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="flex-1 font-medium text-sm">{word.english}</span>
                    <span className="flex-1 text-sm text-muted-foreground">{word.turkish}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => playAudio(word)}
                      disabled={playingId === word.id}
                    >
                      {playingId === word.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button
              onClick={handleActivate}
              disabled={activating || words.length === 0}
              className="w-full mt-4"
            >
              {activating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Aktifleştir
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

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
      let audioUrl = word.audio_url;

      // If no cached audio, generate and cache it
      if (!audioUrl) {
        const { data, error } = await supabase.functions.invoke("text-to-speech", {
          body: { text: word.english, language: "en" },
        });

        if (error) throw error;

        // Convert base64 to blob URL
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
          { type: "audio/mp3" }
        );
        
        // Upload to storage for caching
        const fileName = `audio/${word.id}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, audioBlob, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);
          
          audioUrl = urlData.publicUrl;

          // Update word with cached audio URL
          await supabase
            .from("learned_words")
            .update({ audio_url: audioUrl })
            .eq("id", word.id);

          // Update local state
          setWords((prev) =>
            prev.map((w) => (w.id === word.id ? { ...w, audio_url: audioUrl } : w))
          );
        }

        // Play immediately from base64
        const tempUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(tempUrl);
        audio.onended = () => {
          setPlayingId(null);
          URL.revokeObjectURL(tempUrl);
        };
        audio.play();
        return;
      }

      // Play cached audio
      const audio = new Audio(audioUrl);
      audio.onended = () => setPlayingId(null);
      audio.play();
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

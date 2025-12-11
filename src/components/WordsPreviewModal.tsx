import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2, Check, VolumeX, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

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
  subsectionId: string;
  onActivate: () => void;
  subPackageId?: string | null;
}

export const WordsPreviewModal = ({
  open,
  onOpenChange,
  packageId,
  packageName,
  subsectionId,
  onActivate,
  subPackageId,
}: WordsPreviewModalProps) => {
  const { user } = useAuth();
  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingWord, setEditingWord] = useState<Word | null>(null);
  const [editEnglish, setEditEnglish] = useState("");
  const [editTurkish, setEditTurkish] = useState("");
  const [saving, setSaving] = useState(false);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("is_admin", { _user_id: user.id });
      setIsAdmin(data === true);
    };
    checkAdmin();
  }, [user]);

  // Check TTS support on mount
  useEffect(() => {
    const checkTtsSupport = () => {
      if (!('speechSynthesis' in window)) {
        setTtsSupported(false);
        return;
      }
      
      try {
        window.speechSynthesis.cancel();
        setTtsSupported(true);
      } catch (e) {
        console.warn("TTS initialization error:", e);
        setTtsSupported(false);
      }
    };

    checkTtsSupport();
  }, []);

  useEffect(() => {
    if (open && packageId) {
      fetchWords();
    }
  }, [open, packageId, subPackageId]);

  const fetchWords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("learned_words")
        .select("id, english, turkish, audio_url")
        .eq("package_id", packageId);
      
      // Filter by sub-package if selected
      if (subPackageId) {
        query = query.eq("sub_package_id", subPackageId);
      }
      
      const { data, error } = await query.order("english");

      if (error) throw error;
      setWords(data || []);
    } catch (error) {
      console.error("Error fetching words:", error);
      toast.error("Kelimeler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const playAudio = useCallback(async (word: Word) => {
    if (!ttsSupported) {
      toast.error("Tarayıcınız sesli okumayı desteklemiyor. Lütfen Chrome veya Safari kullanın.");
      return;
    }

    setPlayingId(word.id);
    
    try {
      window.speechSynthesis.cancel();

      const speak = (attempts = 0) => {
        const utterance = new SpeechSynthesisUtterance(word.english);
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const englishVoice = voices.find(v => v.lang.startsWith('en-US')) 
            || voices.find(v => v.lang.startsWith('en'))
            || voices[0];
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
        }
        
        utterance.onend = () => setPlayingId(null);
        utterance.onerror = (e) => {
          console.error("Speech synthesis error:", e);
          if (attempts < 1 && e.error !== 'canceled') {
            setTimeout(() => speak(attempts + 1), 200);
          } else {
            setPlayingId(null);
            if (e.error !== 'canceled') {
              toast.error("Ses çalınamadı. Tarayıcınızı yeniden başlatmayı deneyin.");
            }
          }
        };
        
        window.speechSynthesis.speak(utterance);
      };

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        const handleVoicesChanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          speak();
        };
        
        window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
        
        setTimeout(() => {
          window.speechSynthesis.onvoiceschanged = null;
          const retryVoices = window.speechSynthesis.getVoices();
          if (retryVoices.length === 0) {
            setPlayingId(null);
            toast.error("Sesli okuma bu tarayıcıda desteklenmiyor. Chrome veya Safari kullanın.");
            setTtsSupported(false);
          } else {
            speak();
          }
        }, 500);
      } else {
        speak();
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Ses çalınamadı");
      setPlayingId(null);
    }
  }, [ttsSupported]);

  const handleActivate = async () => {
    if (!user) {
      toast.error("Giriş yapmalısınız");
      return;
    }

    setActivating(true);
    try {
      const { error } = await supabase
        .from("user_subsection_activations")
        .upsert(
          { user_id: user.id, subsection_id: subsectionId },
          { onConflict: "user_id,subsection_id" }
        );

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

  const handleEditClick = (word: Word) => {
    setEditingWord(word);
    setEditEnglish(word.english);
    setEditTurkish(word.turkish);
  };

  const handleSaveEdit = async () => {
    if (!editingWord) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("learned_words")
        .update({
          english: editEnglish.toLowerCase().trim(),
          turkish: editTurkish.toLowerCase().trim(),
        })
        .eq("id", editingWord.id);

      if (error) throw error;

      // Update local state
      setWords(words.map(w => 
        w.id === editingWord.id 
          ? { ...w, english: editEnglish.toLowerCase().trim(), turkish: editTurkish.toLowerCase().trim() }
          : w
      ));
      
      toast.success("Kelime güncellendi");
      setEditingWord(null);
    } catch (error) {
      console.error("Error updating word:", error);
      toast.error("Kelime güncellenemedi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
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
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="flex-1 font-medium text-sm">{word.english}</span>
                      <span className="flex-1 text-sm text-muted-foreground">{word.turkish}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => playAudio(word)}
                        disabled={playingId === word.id || !ttsSupported}
                        title={!ttsSupported ? "Tarayıcınız sesli okumayı desteklemiyor" : "Sesli oku"}
                      >
                        {playingId === word.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : !ttsSupported ? (
                          <VolumeX className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditClick(word)}
                          title="Kelimeyi düzenle"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
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

      {/* Edit Word Dialog */}
      <Dialog open={!!editingWord} onOpenChange={(open) => !open && setEditingWord(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kelimeyi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">İngilizce</label>
              <Input
                value={editEnglish}
                onChange={(e) => setEditEnglish(e.target.value)}
                placeholder="İngilizce kelime"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Türkçe</label>
              <Input
                value={editTurkish}
                onChange={(e) => setEditTurkish(e.target.value)}
                placeholder="Türkçe karşılığı"
              />
            </div>
            <Button
              onClick={handleSaveEdit}
              disabled={saving || !editEnglish.trim() || !editTurkish.trim()}
              className="w-full"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Kaydet
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

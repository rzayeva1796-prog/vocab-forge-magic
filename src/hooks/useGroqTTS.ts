import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseGroqTTSReturn {
  isSpeaking: boolean;
  speak: (text: string, voice?: string) => Promise<void>;
  stop: () => void;
}

function hash32(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickBrowserVoice(voiceKey: string, voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
  const list = english.length ? english : voices;
  if (!list.length) return null;
  const h = hash32(voiceKey);
  return list[h % list.length] ?? list[0];
}

function pickProsody(voiceKey: string) {
  // Make bots sound different even if the device has only 1 voice installed.
  const h = hash32(voiceKey);
  const rate = 0.95 + ((h % 13) - 6) * 0.03; // ~0.77..1.13
  const pitch = 1.0 + (((h >>> 8) % 17) - 8) * 0.04; // ~0.68..1.32
  const volume = 1.0;
  return {
    rate: Math.min(1.15, Math.max(0.8, rate)),
    pitch: Math.min(1.25, Math.max(0.75, pitch)),
    volume,
  };
}

function pickEnglishLocale(voiceKey: string) {
  const locales = ["en-US", "en-GB", "en-AU", "en-CA", "en-IE"] as const;
  const h = hash32(voiceKey);
  return locales[h % locales.length];
}

export function useGroqTTS(): UseGroqTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, voice: string = "Fritz-PlayAI") => {
      if (!text) return;

      stop();

      try {
        setIsSpeaking(true);

        const { data, error } = await supabase.functions.invoke("text-to-speech", {
          body: { text, voice },
        });

        if (error) {
          console.error("TTS error:", error);
          setIsSpeaking(false);
          return;
        }

        if (data?.useWebSpeech) {
          if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = pickEnglishLocale(voice);

            const { rate, pitch, volume } = pickProsody(voice);
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = volume;

            const applyVoice = () => {
              const chosen = pickBrowserVoice(voice, window.speechSynthesis.getVoices());
              if (chosen) utterance.voice = chosen;
            };

            applyVoice();
            if (!window.speechSynthesis.getVoices().length) {
              window.speechSynthesis.onvoiceschanged = () => applyVoice();
            }

            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          } else {
            setIsSpeaking(false);
          }
          return;
        }

        if (data?.audioContent) {
          const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
          };

          audio.onerror = (e) => {
            console.error("Audio playback error:", e);
            setIsSpeaking(false);
            audioRef.current = null;
          };

          await audio.play();
        } else {
          setIsSpeaking(false);
        }
      } catch (error) {
        console.error("TTS error:", error);
        setIsSpeaking(false);
      }
    },
    [stop]
  );

  return {
    isSpeaking,
    speak,
    stop,
  };
}


import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseGroqTTSReturn {
  isSpeaking: boolean;
  speak: (text: string, voice?: string) => Promise<void>;
  stop: () => void;
}

function pickBrowserVoiceId(voiceKey: string, voices: SpeechSynthesisVoice[]) {
  const english = voices.filter((v) => (v.lang || '').toLowerCase().startsWith('en'));
  const list = english.length ? english : voices;
  if (!list.length) return null;

  // stable hash from voiceKey -> pick different browser voice per bot
  let hash = 0;
  for (let i = 0; i < voiceKey.length; i++) hash = (hash * 31 + voiceKey.charCodeAt(i)) >>> 0;
  return list[hash % list.length] ?? list[0];
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

  const speak = useCallback(async (text: string, voice: string = 'Fritz-PlayAI') => {
    if (!text) return;

    stop();

    try {
      setIsSpeaking(true);

      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice }
      });

      if (error) {
        console.error('TTS error:', error);
        setIsSpeaking(false);
        return;
      }

      // If backend asks to use Web Speech, still differentiate voices per bot.
      if (data?.useWebSpeech) {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.9;

          const applyVoice = () => {
            const chosen = pickBrowserVoiceId(voice, window.speechSynthesis.getVoices());
            if (chosen) utterance.voice = chosen;
          };

          // Some browsers load voices async
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
          console.error('Audio playback error:', e);
          setIsSpeaking(false);
          audioRef.current = null;
        };

        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  }, [stop]);

  return {
    isSpeaking,
    speak,
    stop,
  };
}


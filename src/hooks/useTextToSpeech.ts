import { useState, useCallback, useRef } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
  isSupported: boolean;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback((text: string) => {
    if (!isSupported || !text) return;

    // Önceki konuşmayı durdur
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Türkçe veya İngilizce ses bul
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    
    // Metinde İngilizce kelimeler varsa İngilizce, yoksa Türkçe
    const hasEnglishWords = /[a-zA-Z]{3,}/.test(text);
    utterance.voice = hasEnglishWords ? (englishVoice || turkishVoice || null) : (turkishVoice || null);
    
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return {
    isSpeaking,
    speak,
    stop,
    isSupported,
  };
}

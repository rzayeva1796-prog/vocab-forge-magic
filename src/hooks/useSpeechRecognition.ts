import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStop = useRef(false);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.log('Recognition already started');
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Sürekli dinleme modu - otomatik kapanmayı engeller
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'tr-TR';
    // Daha uzun ses tanıma süresi
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(final);
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      // no-speech hatası dışındakilerde durdur
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      // Manuel durdurma değilse ve hala dinleme modundaysak, yeniden başlat
      if (!isManualStop.current && isListening) {
        console.log('Recognition ended, restarting...');
        startRecognition();
      } else {
        setIsListening(false);
        isManualStop.current = false;
      }
    };

    return () => {
      isManualStop.current = true;
      recognitionRef.current?.abort();
    };
  }, [isSupported, isListening, startRecognition]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    
    isManualStop.current = false;
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);
    startRecognition();
  }, [isListening, startRecognition]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return;
    
    isManualStop.current = true;
    recognitionRef.current.stop();
    setIsListening(false);
  }, [isListening]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    isSupported,
  };
}

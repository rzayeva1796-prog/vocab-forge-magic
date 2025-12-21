import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
  error: string | null;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStop = useRef(false);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecognition = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (e) {
      // If start fails (permission / already started), surface as error so UI can react.
      const message = e instanceof Error ? e.message : 'Speech recognition could not start.';
      setError(message);
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onstart = () => {
      setError(null);
    };

    recognitionRef.current.onresult = (event) => {
      let interim = '';
      let final = '';

      // Only process newly-added results (prevents empty/duplicated loops)
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => (prev ? `${prev} ${final}`.trim() : final.trim()));
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim.trim());
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error:', event.error);

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('Microphone permission is blocked. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try speaking louder/closer to the microphone.');
      } else if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`);
      }

      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognitionRef.current.onend = () => {
      if (!isManualStop.current && isListening) {
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

    setError(null);
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
    error,
  };
}


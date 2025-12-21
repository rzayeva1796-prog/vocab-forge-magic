import { useState, useRef, useCallback, useEffect } from "react";

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
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isManualStopRef = useRef(false);
  const isListeningRef = useRef(false);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Keep refs in sync
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    try {
      recognition.start();
    } catch (e) {
      // Common: "recognition has already started" -> ignore
      const msg = e instanceof Error ? e.message : "";
      if (/already started/i.test(msg)) return;

      setError(e instanceof Error ? e.message : "Speech recognition could not start.");
      setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError(null);
    };

    recognition.onresult = (event) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }

      if (final.trim()) {
        setTranscript((prev) => (prev ? `${prev} ${final}`.trim() : final.trim()));
        setInterimTranscript("");
      } else {
        setInterimTranscript(interim.trim());
      }
    };

    recognition.onerror = (event) => {
      // "aborted" is normal when we stop/abort - don't treat as fatal.
      if (event.error === "aborted") return;

      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone permission is blocked. Please allow microphone access.");
      } else if (event.error === "no-speech") {
        // do not stop listening automatically; just inform
        setError("No speech detected. Try speaking closer to the microphone.");
      } else {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If we didn't manually stop and we still want to listen, restart
      if (!isManualStopRef.current && isListeningRef.current) {
        startRecognition();
        return;
      }

      isManualStopRef.current = false;
      setIsListening(false);
    };

    return () => {
      isManualStopRef.current = true;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    };
  }, [isSupported, startRecognition]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListeningRef.current) return;

    setError(null);
    isManualStopRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setIsListening(true);
    startRecognition();
  }, [startRecognition]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isListeningRef.current) return;

    isManualStopRef.current = true;
    try {
      recognition.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

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


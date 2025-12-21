import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userLevel, setUserLevel] = useState<string>('');
  const [wordCount, setWordCount] = useState<number>(0);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported: sttSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop, isSupported: ttsSupported } = useTextToSpeech();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Ses tanıma - hem interim hem final transcript'i göster
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    } else if (interimTranscript) {
      setInput(interimTranscript);
    }
  }, [transcript, interimTranscript]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = 'Merhaba! 👋 Ben Kelime Dostum. İngilizce öğrenme yolculuğunda sana yardımcı olmak için buradayım. Benimle istediğin konuda sohbet edebilir, yeni kelimeler öğrenebilir veya pratik yapabilirsin. Nasıl yardımcı olabilirim?';
      setMessages([{
        role: 'assistant',
        content: welcomeMessage
      }]);
      
      if (autoSpeak && ttsSupported) {
        speak(welcomeMessage);
      }
    }
  }, [isOpen]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: textToSend,
          userId: user?.id,
          conversationHistory
        }
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      const reply = data.reply;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      
      if (data.level) {
        setUserLevel(data.level);
        setWordCount(data.wordCount);
      }

      // Otomatik sesli okuma
      if (autoSpeak && ttsSupported) {
        speak(reply);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 w-[350px] h-[500px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Kelime Dostum</h3>
            {userLevel && (
              <p className="text-xs opacity-80">{userLevel} • {wordCount} kelime</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {ttsSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAutoSpeak(!autoSpeak)}
              className="text-primary-foreground hover:bg-primary-foreground/20"
              title={autoSpeak ? "Otomatik okuma açık" : "Otomatik okuma kapalı"}
            >
              {autoSpeak ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stop();
              setIsOpen(false);
            }}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className="flex flex-col gap-1 max-w-[80%]">
                <div
                  className={`p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'assistant' && ttsSupported && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => speakMessage(message.content)}
                    className="self-start h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {isSpeaking ? <VolumeX className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
                    {isSpeaking ? 'Durdur' : 'Dinle'}
                  </Button>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted p-3 rounded-2xl rounded-bl-md">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border">
        {isListening && (
          <div className="mb-2 flex items-center gap-2 text-sm text-primary">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="font-medium">Dinleniyor...</span>
            {interimTranscript && <span className="text-muted-foreground truncate max-w-[200px]">"{interimTranscript}"</span>}
          </div>
        )}
        <div className="flex gap-2">
          {sttSupported && (
            <Button
              onClick={toggleListening}
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              disabled={isLoading}
              className="flex-shrink-0"
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Konuşun..." : "Mesajınızı yazın..."}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

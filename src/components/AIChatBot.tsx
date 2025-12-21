import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, X, User, Loader2, Mic, MicOff, Volume2, VolumeX, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useGroqTTS } from "@/hooks/useGroqTTS";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// AI Bot personas with their voices and generated avatar descriptions
const BOT_PERSONAS = [
  { id: 'Arista-PlayAI', name: 'Arista', gender: 'female', avatar: '👩‍🏫', description: 'Friendly teacher', color: 'bg-pink-500' },
  { id: 'Celeste-PlayAI', name: 'Celeste', gender: 'female', avatar: '👩‍💼', description: 'Professional mentor', color: 'bg-purple-500' },
  { id: 'Cheyenne-PlayAI', name: 'Cheyenne', gender: 'female', avatar: '🧑‍🎨', description: 'Creative artist', color: 'bg-orange-500' },
  { id: 'Deedee-PlayAI', name: 'Deedee', gender: 'female', avatar: '👧', description: 'Cheerful friend', color: 'bg-yellow-500' },
  { id: 'Gail-PlayAI', name: 'Gail', gender: 'female', avatar: '👵', description: 'Wise grandmother', color: 'bg-amber-600' },
  { id: 'Indigo-PlayAI', name: 'Indigo', gender: 'female', avatar: '🧙‍♀️', description: 'Mystical guide', color: 'bg-indigo-500' },
  { id: 'Quinn-PlayAI', name: 'Quinn', gender: 'female', avatar: '👩‍🔬', description: 'Science enthusiast', color: 'bg-cyan-500' },
  { id: 'Atlas-PlayAI', name: 'Atlas', gender: 'male', avatar: '🧔', description: 'World explorer', color: 'bg-emerald-600' },
  { id: 'Basil-PlayAI', name: 'Basil', gender: 'male', avatar: '👨‍🍳', description: 'Culinary expert', color: 'bg-green-600' },
  { id: 'Briggs-PlayAI', name: 'Briggs', gender: 'male', avatar: '👷', description: 'Practical builder', color: 'bg-stone-600' },
  { id: 'Calum-PlayAI', name: 'Calum', gender: 'male', avatar: '🧑‍💻', description: 'Tech wizard', color: 'bg-blue-600' },
  { id: 'Chip-PlayAI', name: 'Chip', gender: 'male', avatar: '🤖', description: 'AI enthusiast', color: 'bg-slate-600' },
  { id: 'Cillian-PlayAI', name: 'Cillian', gender: 'male', avatar: '🎭', description: 'Drama teacher', color: 'bg-red-600' },
  { id: 'Fritz-PlayAI', name: 'Fritz', gender: 'male', avatar: '👨‍🔧', description: 'Engineer mind', color: 'bg-zinc-600' },
  { id: 'Mason-PlayAI', name: 'Mason', gender: 'male', avatar: '🏋️', description: 'Fitness coach', color: 'bg-rose-600' },
  { id: 'Mikail-PlayAI', name: 'Mikail', gender: 'male', avatar: '📚', description: 'Scholar', color: 'bg-violet-600' },
  { id: 'Mitch-PlayAI', name: 'Mitch', gender: 'male', avatar: '🎸', description: 'Music lover', color: 'bg-fuchsia-600' },
  { id: 'Thunder-PlayAI', name: 'Thunder', gender: 'male', avatar: '⚡', description: 'Energetic coach', color: 'bg-yellow-600' },
];

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
  const [turkishMode, setTurkishMode] = useState(false);
  const [selectedBot, setSelectedBot] = useState(BOT_PERSONAS[1]); // Celeste default
  const [showBotSelector, setShowBotSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const { isListening, transcript, interimTranscript, startListening, stopListening, isSupported: sttSupported } = useSpeechRecognition();
  const { isSpeaking, speak, stop } = useGroqTTS();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Ses tanıma - konuştukça input'a yaz
  useEffect(() => {
    const text = transcript || interimTranscript;
    if (text && isListening) {
      setInput(text);
    }
  }, [transcript, interimTranscript, isListening]);

  // Bot veya mod değiştiğinde hoşgeldin mesajı
  useEffect(() => {
    if (isOpen) {
      const welcomeMessage = turkishMode 
        ? `Merhaba! 👋 Ben ${selectedBot.name}. Seninle Türkçe sohbet edebilirim. Nasıl yardımcı olabilirim?`
        : `Hello! 👋 I am ${selectedBot.name}, your English practice buddy. Let's have a conversation! How can I help you today?`;
      setMessages([{
        role: 'assistant',
        content: welcomeMessage
      }]);
      
      if (autoSpeak && !turkishMode) {
        speak(welcomeMessage, selectedBot.id);
      }
    }
  }, [isOpen, turkishMode, selectedBot.id]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    // Dinlemeyi durdur
    if (isListening) {
      stopListening();
    }

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
          conversationHistory,
          turkishMode,
          botName: selectedBot.name,
          botPersonality: selectedBot.description
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

      // Otomatik sesli okuma (sadece İngilizce modda)
      if (autoSpeak && !turkishMode) {
        speak(reply, selectedBot.id);
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: turkishMode ? 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' : 'Sorry, an error occurred. Please try again.' 
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
      setInput(''); // Önceki metni temizle
      startListening();
    }
  };

  const speakMessage = (text: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(text, selectedBot.id);
    }
  };

  const selectBot = (bot: typeof BOT_PERSONAS[0]) => {
    stop();
    setSelectedBot(bot);
    setShowBotSelector(false);
    setMessages([]); // Mesajları sıfırla, useEffect yeni hoşgeldin mesajı gösterecek
  };

  const toggleTurkishMode = () => {
    stop();
    setTurkishMode(!turkishMode);
    setMessages([]);
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
    <TooltipProvider>
      <div className="fixed bottom-20 right-4 z-50 w-[350px] h-[500px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Bot Avatar - Tıklanabilir */}
            <button
              onClick={() => !turkishMode && setShowBotSelector(true)}
              className={`w-10 h-10 rounded-full ${selectedBot.color} flex items-center justify-center text-xl cursor-pointer hover:opacity-80 transition-opacity`}
              title={turkishMode ? selectedBot.name : "Change tutor"}
            >
              {selectedBot.avatar}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{selectedBot.name}</h3>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTurkishMode}
                      className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{turkishMode ? 'İngilizce moda geç' : 'Türkçe moda geç (yardım)'}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-xs opacity-80">
                {turkishMode ? '🇹🇷 Türkçe Mod' : selectedBot.description}
              </p>
              {userLevel && !turkishMode && (
                <p className="text-xs opacity-60">{userLevel} • {wordCount} words</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!turkishMode && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
                title={autoSpeak ? "Auto-speak on" : "Auto-speak off"}
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
                  <div className={`w-8 h-8 rounded-full ${selectedBot.color} flex items-center justify-center flex-shrink-0 text-sm`}>
                    {selectedBot.avatar}
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
                  {message.role === 'assistant' && !turkishMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => speakMessage(message.content)}
                      className="self-start h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isSpeaking ? <VolumeX className="h-3 w-3 mr-1" /> : <Volume2 className="h-3 w-3 mr-1" />}
                      {isSpeaking ? 'Stop' : 'Listen'}
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
                <div className={`w-8 h-8 rounded-full ${selectedBot.color} flex items-center justify-center text-sm`}>
                  {selectedBot.avatar}
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
            <div className="mb-2 flex items-center gap-2 text-sm text-destructive">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="font-medium">🎤 Recording...</span>
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
              placeholder={isListening ? "Speak now..." : "Type your message..."}
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

      {/* Bot Selector Dialog */}
      <Dialog open={showBotSelector} onOpenChange={setShowBotSelector}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Choose Your English Tutor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 mt-4">
            {BOT_PERSONAS.map((bot) => (
              <button
                key={bot.id}
                onClick={() => selectBot(bot)}
                className={`p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                  selectedBot.id === bot.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`w-12 h-12 mx-auto rounded-full ${bot.color} flex items-center justify-center text-2xl mb-2`}>
                  {bot.avatar}
                </div>
                <p className="font-medium text-sm">{bot.name}</p>
                <p className="text-xs text-muted-foreground">{bot.description}</p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

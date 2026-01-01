import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AIChatBot } from "@/components/AIChatBot";
import Words from "./pages/Words";
import Index from "./pages/Index";
import Game from "./pages/Game";
import GameSelection from "./pages/GameSelection";
import FlashCard from "./pages/FlashCard";
import Twice from "./pages/Twice";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import Fun from "./pages/Fun";
import Movies from "./pages/Movies";
import Music from "./pages/Music";
import Admin from "./pages/Admin";
import Game2 from "./pages/Game2";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/words" replace />} />
            <Route path="/words" element={<Words />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dictionary" element={<Index />} />
            <Route path="/game" element={<GameSelection />} />
            <Route path="/game/pair" element={<Game />} />
            <Route path="/game/flash" element={<FlashCard />} />
            <Route path="/game/twice" element={<Twice />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/fun" element={<Fun />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/music" element={<Music />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/game2" element={<Game2 />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <AIChatBot />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

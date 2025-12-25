import { Button } from "@/components/ui/button";
import { Gamepad2, Zap, GitCompare, LogIn, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useToast } from "@/hooks/use-toast";

const GameSelection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const showNotMigrated = (featureName: string) => {
    toast({
      title: "Henüz taşınmadı",
      description: `${featureName} şu an bu projenin içinde değil. İstersen birlikte bu projeye taşıyalım.`,
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-page-game-bg flex items-center justify-center">
        <p className="font-comic text-lg">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-game-bg pb-20">
      <div className="p-4">
        <header>
          <h1 className="text-3xl font-baloo font-bold text-center mb-6 text-page-game-accent">
            🎮 Oyunlar
          </h1>
        </header>

        {!user && (
          <div className="text-center p-4 bg-secondary/50 rounded-lg mb-6 max-w-md mx-auto">
            <p className="text-sm text-muted-foreground mb-2">
              Oyun ilerlemesi kaydetmek için giriş yapın
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4 mr-1" />
              Giriş Yap
            </Button>
          </div>
        )}

        <main>
          <section className="max-w-md mx-auto space-y-4" aria-label="Oyun listesi">
            <Button
              onClick={() => (user ? showNotMigrated("Tetris") : navigate("/auth"))}
              className="w-full h-20 text-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
              size="lg"
            >
              <Gamepad2 className="w-8 h-8 mr-3" />
              Tetris
            </Button>

            <Button
              onClick={() => (user ? navigate("/game/flash") : navigate("/auth"))}
              className="w-full h-20 text-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
              size="lg"
            >
              <Zap className="w-8 h-8 mr-3" />
              Kart
            </Button>

            <Button
              onClick={() => (user ? navigate("/game/pair") : navigate("/auth"))}
              className="w-full h-20 text-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              size="lg"
            >
              <GitCompare className="w-8 h-8 mr-3" />
              Eşleştirme
            </Button>

            <Button
              onClick={() => (user ? showNotMigrated("Cümle") : navigate("/auth"))}
              className="w-full h-20 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              size="lg"
            >
              <MessageSquareText className="w-8 h-8 mr-3" />
              Cümle
            </Button>

            <Button
              onClick={() => (user ? navigate("/game/sentence") : navigate("/auth"))}
              className="w-full h-20 text-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
              size="lg"
            >
              <MessageSquareText className="w-8 h-8 mr-3" />
              Cümle Pro
            </Button>
          </section>
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default GameSelection;

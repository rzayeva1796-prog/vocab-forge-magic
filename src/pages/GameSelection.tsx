import { Button } from "@/components/ui/button";
import { ArrowLeft, Gamepad2, Zap, GitCompare, LogIn, BookOpen, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const GameSelection = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const handleGameClick = (baseUrl: string) => {
    if (user) {
      // Pass user_id as query parameter to external game
      window.location.href = `${baseUrl}?user_id=${user.id}`;
    } else {
      // Redirect to login if not authenticated
      navigate("/auth");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
          {user && (
            <Button variant="ghost" onClick={() => navigate("/profile")}>
              <User className="w-4 h-4 mr-2" />
              Profil
            </Button>
          )}
        </div>
        
        <h1 className="text-4xl font-bold text-center text-primary mb-8">
          Choose Game
        </h1>

        {!user && (
          <div className="text-center p-4 bg-secondary/50 rounded-lg mb-4">
            <p className="text-sm text-muted-foreground mb-2">
              Oyun ilerlemesi kaydetmek için giriş yapın
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4 mr-1" />
              Giriş Yap
            </Button>
          </div>
        )}
        
        <div className="space-y-4">
          <Button
            onClick={() => handleGameClick("https://wordfall-mix.lovable.app")}
            className="w-full h-20 text-xl"
            size="lg"
          >
            <Gamepad2 className="w-8 h-8 mr-3" />
            Tetris
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://vocab-quest-cards.lovable.app")}
            className="w-full h-20 text-xl"
            size="lg"
            variant="secondary"
          >
            <Zap className="w-8 h-8 mr-3" />
            Kart
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://wordflow-match-up.lovable.app")}
            className="w-full h-20 text-xl"
            size="lg"
            variant="outline"
          >
            <GitCompare className="w-8 h-8 mr-3" />
            Eşleştirme
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://star-reader-sync.lovable.app")}
            className="w-full h-20 text-xl"
            size="lg"
            variant="ghost"
          >
            <BookOpen className="w-8 h-8 mr-3" />
            Kitap
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameSelection;

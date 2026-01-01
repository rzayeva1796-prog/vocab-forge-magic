import { Button } from "@/components/ui/button";
import { Gamepad2, Zap, GitCompare, LogIn, MessageSquareText, BookOpen, Layers } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/BottomNavigation";

const GameSelection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  
  // Get package_id and additional_package_ids from URL if coming from Words page
  const packageId = searchParams.get("package_id");
  const additionalPackageIds = searchParams.get("additional_package_ids");
  // Get sentence game specific params
  const sentencePackage = searchParams.get("sentence_package");
  const sentenceRound = searchParams.get("sentence_round");

  const handleGameClick = (baseUrl: string) => {
    console.log("[GameSelection] handleGameClick", {
      baseUrl,
      userId: user?.id,
      packageId,
      additionalPackageIds,
      sentencePackage,
      sentenceRound,
    });

    if (user) {
      let url = `${baseUrl}?user_id=${user.id}`;
      if (packageId) {
        url += `&package_id=${packageId}`;
      }
      if (additionalPackageIds) {
        url += `&additional_package_ids=${additionalPackageIds}`;
      }
      // Add sentence params for Cümle game
      if (baseUrl.includes("kelime-paketi-egitici") && sentencePackage) {
        url += `&bolum=${sentencePackage}`;
        if (sentenceRound) {
          url += `&tur=${sentenceRound}`;
        }
      }
      window.location.href = url;
    } else {
      navigate("/auth");
    }
  };

  const handleGame2Click = () => {
    if (user) {
      let url = `/game2?user_id=${user.id}`;
      if (packageId) {
        url += `&package_id=${packageId}`;
      }
      if (additionalPackageIds) {
        url += `&additional_package_ids=${additionalPackageIds}`;
      }
      navigate(url);
    } else {
      navigate("/auth");
    }
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
        <h1 className="text-3xl font-baloo font-bold text-center mb-6 text-page-game-accent">
          🎮 Oyunlar
        </h1>

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

        <div className="max-w-md mx-auto space-y-4">
          <Button
            onClick={() => handleGameClick("https://wordfall-mix.lovable.app")}
            className="w-full h-20 text-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            size="lg"
          >
            <Gamepad2 className="w-8 h-8 mr-3" />
            Tetris
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://vocab-quest-cards.lovable.app")}
            className="w-full h-20 text-xl bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
            size="lg"
          >
            <Zap className="w-8 h-8 mr-3" />
            Kart
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://wordflow-match-up.lovable.app")}
            className="w-full h-20 text-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            size="lg"
          >
            <GitCompare className="w-8 h-8 mr-3" />
            Eşleştirme
          </Button>
          
          <Button
            onClick={() => handleGameClick("https://kelime-paketi-egitici.lovable.app")}
            className="w-full h-20 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            size="lg"
          >
            <MessageSquareText className="w-8 h-8 mr-3" />
            Cümle
          </Button>
          
          <Button
            onClick={() => navigate("/game/flash")}
            className="w-full h-20 text-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600"
            size="lg"
          >
            <BookOpen className="w-8 h-8 mr-3" />
            Game 1
          </Button>
          
          <Button
            onClick={handleGame2Click}
            className="w-full h-20 text-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
            size="lg"
          >
            <Layers className="w-8 h-8 mr-3" />
            Game 2
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default GameSelection;

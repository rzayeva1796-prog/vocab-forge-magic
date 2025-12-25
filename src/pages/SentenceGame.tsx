import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNavigation } from "@/components/BottomNavigation";

const SentenceGame = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 pb-20">
      <div className="p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate("/game")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-center mb-6 text-primary">
          🎯 Cümle Pro
        </h1>

        <div className="max-w-md mx-auto text-center p-8 bg-card rounded-lg border">
          <p className="text-muted-foreground mb-4">
            Bu sayfa hazırlanıyor. Cümle projesinin kodunu paylaşın, buraya entegre edeyim.
          </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default SentenceGame;

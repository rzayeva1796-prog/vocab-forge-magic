import { Button } from "@/components/ui/button";
import { ArrowLeft, Gamepad2, Zap, GitCompare } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GameSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-4xl font-bold text-center text-primary mb-8">
          Choose Game
        </h1>
        
        <div className="space-y-4">
          <Button
            onClick={() => window.location.href = "https://wordfall-mix.lovable.app"}
            className="w-full h-20 text-xl"
            size="lg"
          >
            <Gamepad2 className="w-8 h-8 mr-3" />
            Tetris
          </Button>
          
          <Button
            onClick={() => window.location.href = "https://vocab-quest-cards.lovable.app"}
            className="w-full h-20 text-xl"
            size="lg"
            variant="secondary"
          >
            <Zap className="w-8 h-8 mr-3" />
            Kart
          </Button>
          
          <Button
            onClick={() => window.location.href = "https://wordflow-match-up.lovable.app"}
            className="w-full h-20 text-xl"
            size="lg"
            variant="outline"
          >
            <GitCompare className="w-8 h-8 mr-3" />
            Eşleştirme
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameSelection;

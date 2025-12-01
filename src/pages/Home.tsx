import { Button } from "@/components/ui/button";
import { BookOpen, Gamepad2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-4xl font-bold text-center text-primary mb-8">
          Vocabulary Learner
        </h1>
        
        <div className="space-y-4">
          <Button
            onClick={() => navigate("/dictionary")}
            className="w-full h-20 text-xl"
            size="lg"
          >
            <BookOpen className="w-8 h-8 mr-3" />
            Sözlük
          </Button>
          
          <Button
            onClick={() => navigate("/game")}
            className="w-full h-20 text-xl"
            size="lg"
            variant="secondary"
          >
            <Gamepad2 className="w-8 h-8 mr-3" />
            Game
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;

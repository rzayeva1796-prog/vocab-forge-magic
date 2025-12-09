import { Button } from "@/components/ui/button";
import { BookOpen, Film } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Fun = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleBookClick = () => {
    if (user) {
      window.location.href = `https://star-reader-sync.lovable.app?user_id=${user.id}`;
    } else {
      navigate("/auth");
    }
  };

  const handleMoviesClick = () => {
    navigate("/movies");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Eğlence
        </h1>

        <div className="max-w-md mx-auto space-y-4">
          <Button
            onClick={handleBookClick}
            className="w-full h-20 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            size="lg"
          >
            <BookOpen className="w-8 h-8 mr-3" />
            Kitap Oku
          </Button>

          <Button
            onClick={handleMoviesClick}
            className="w-full h-20 text-xl bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
            size="lg"
          >
            <Film className="w-8 h-8 mr-3" />
            Film İzle
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Fun;

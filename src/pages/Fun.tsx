import { Button } from "@/components/ui/button";
import { BookOpen, Film, Music } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Fun = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBookClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    toast({
      title: "Henüz taşınmadı",
      description: "Kitap Oku özelliği şu an bu projenin içinde değil. İstersen birlikte bu projeye taşıyalım.",
      variant: "destructive",
    });
  };

  const handleMoviesClick = () => {
    navigate("/movies");
  };

  const handleMusicClick = () => {
    navigate("/music");
  };

  return (
    <div className="min-h-screen bg-page-fun-bg pb-20">
      <div className="p-4">
        <header>
          <h1 className="text-3xl font-comic font-bold text-center mb-6 text-page-fun-accent">
            ✨ Eğlence
          </h1>
        </header>

        <main>
          <section className="max-w-md mx-auto space-y-4" aria-label="Eğlence içerikleri">
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

            <Button
              onClick={handleMusicClick}
              className="w-full h-20 text-xl bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900"
              size="lg"
            >
              <Music className="w-8 h-8 mr-3" />
              Müzik Dinle
            </Button>
          </section>
        </main>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Fun;

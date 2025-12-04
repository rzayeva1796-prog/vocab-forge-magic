import { Button } from "@/components/ui/button";
import { BookOpen, Gamepad2, LogIn, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Auth status */}
        <div className="flex justify-end">
          {loading ? null : user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-4 h-4" />
                {user.email?.split("@")[0]}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-1" />
                Çıkış
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
              <LogIn className="w-4 h-4 mr-1" />
              Giriş
            </Button>
          )}
        </div>

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
            Oyun
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;

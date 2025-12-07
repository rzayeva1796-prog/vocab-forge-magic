import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Gamepad2, Zap, GitCompare, BookOpen, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  tetris_xp: number;
  kart_xp: number;
  eslestirme_xp: number;
  kitap_xp: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadProfile();
    }
  }, [user, authLoading]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            display_name: user.email,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setProfile(newProfile);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <p>Profil bulunamadı</p>
      </div>
    );
  }

  const totalXP = profile.tetris_xp + profile.kart_xp + profile.eslestirme_xp + profile.kitap_xp;

  const xpItems = [
    { name: "Tetris", xp: profile.tetris_xp, icon: Gamepad2, color: "text-blue-500" },
    { name: "Kart", xp: profile.kart_xp, icon: Zap, color: "text-yellow-500" },
    { name: "Eşleştirme", xp: profile.eslestirme_xp, icon: GitCompare, color: "text-green-500" },
    { name: "Kitap", xp: profile.kitap_xp, icon: BookOpen, color: "text-purple-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <Button variant="ghost" onClick={() => navigate("/game")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {profile.display_name || "Kullanıcı"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Total XP */}
            <div className="text-center p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Toplam XP</span>
              </div>
              <p className="text-4xl font-bold text-primary">{totalXP.toLocaleString()}</p>
            </div>

            {/* XP Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Oyun Detayları</h3>
              {xpItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <span className="text-lg font-semibold">{item.xp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
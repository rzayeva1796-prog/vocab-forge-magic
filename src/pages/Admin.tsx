import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Package, Loader2, Trash2, Crown } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

interface UserWithRole {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
}

interface WordPackage {
  id: string;
  name: string;
  display_order: number;
  word_count: number;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [packages, setPackages] = useState<WordPackage[]>([]);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      checkAdminStatus();
    }
  }, [user, authLoading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error checking admin status:", error);
      }

      if (data) {
        setIsAdmin(true);
        await Promise.all([loadUsers(), loadPackages()]);
      } else {
        toast({
          title: "Erişim Reddedildi",
          description: "Bu sayfaya erişim yetkiniz yok.",
          variant: "destructive",
        });
        navigate("/");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name");

    if (profilesError) {
      console.error("Error loading profiles:", profilesError);
      return;
    }

    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      console.error("Error loading roles:", rolesError);
    }

    // Get emails from auth metadata in profiles display_name (which stores email as fallback)
    const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
      const userRole = (roles || []).find((r) => r.user_id === profile.user_id);
      return {
        id: profile.user_id,
        email: profile.display_name || "Bilinmiyor",
        display_name: profile.display_name,
        role: userRole?.role || null,
      };
    });

    setUsers(usersWithRoles);
  };

  const loadPackages = async () => {
    const { data: packagesData, error: packagesError } = await supabase
      .from("word_packages")
      .select("id, name, display_order")
      .order("display_order", { ascending: true });

    if (packagesError) {
      console.error("Error loading packages:", packagesError);
      return;
    }

    // Get word counts for each package
    const packagesWithCounts = await Promise.all(
      (packagesData || []).map(async (pkg) => {
        const { count } = await supabase
          .from("learned_words")
          .select("*", { count: "exact", head: true })
          .eq("package_id", pkg.id);

        return {
          ...pkg,
          word_count: count || 0,
        };
      })
    );

    setPackages(packagesWithCounts);
  };

  const makeAdmin = async (userId: string) => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

    if (error) {
      toast({
        title: "Hata",
        description: "Admin atama başarısız.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Başarılı",
      description: "Kullanıcı admin yapıldı.",
    });
    loadUsers();
  };

  const removeAdmin = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        title: "Hata",
        description: "Kendinizi admin'den çıkaramazsınız.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (error) {
      toast({
        title: "Hata",
        description: "Admin kaldırma başarısız.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Başarılı",
      description: "Admin yetkisi kaldırıldı.",
    });
    loadUsers();
  };

  const deletePackage = async (packageId: string) => {
    // First delete words in the package
    const { error: wordsError } = await supabase
      .from("learned_words")
      .delete()
      .eq("package_id", packageId);

    if (wordsError) {
      toast({
        title: "Hata",
        description: "Paket kelimeleri silinemedi.",
        variant: "destructive",
      });
      return;
    }

    // Then delete the package
    const { error: packageError } = await supabase
      .from("word_packages")
      .delete()
      .eq("id", packageId);

    if (packageError) {
      toast({
        title: "Hata",
        description: "Paket silinemedi.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Başarılı",
      description: "Paket silindi.",
    });
    loadPackages();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        </div>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Kullanıcılar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Email veya isim ara..."
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {u.role === "admin" && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{u.display_name || u.email}</p>
                      <p className="text-xs text-muted-foreground">{u.role || "user"}</p>
                    </div>
                  </div>
                  <div>
                    {u.role === "admin" ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeAdmin(u.id)}
                        disabled={u.id === user?.id}
                      >
                        Admin Kaldır
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => makeAdmin(u.id)}
                      >
                        Admin Yap
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Packages Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Kelime Paketleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">{pkg.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pkg.word_count} kelime • Sıra: {pkg.display_order}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePackage(pkg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Admin;

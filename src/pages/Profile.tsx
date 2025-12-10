import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Camera, Gamepad2, Zap, GitCompare, BookOpen, Trophy, UserPlus, Users, Check, X, Edit2, Flame, Bell, BellOff, LogOut, Clock, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDailyLogin } from "@/hooks/useDailyLogin";
import { useNotifications } from "@/hooks/useNotifications";
import { Switch } from "@/components/ui/switch";
import { BottomNavigation } from "@/components/BottomNavigation";

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  tetris_xp: number;
  kart_xp: number;
  eslestirme_xp: number;
  kitap_xp: number;
  login_streak?: number;
  last_login_date?: string;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  requester_profile?: Profile;
  addressee_profile?: Profile;
}

// Get 24-hour countdown time remaining
const get24HourTimeRemaining = (dailyPeriodStart: Date): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const periodEnd = new Date(dailyPeriodStart.getTime() + 24 * 60 * 60 * 1000);
  const diff = periodEnd.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { checkAndUpdateDailyLogin } = useDailyLogin();
  const { 
    requestPermission, 
    saveNotificationPreference, 
    getNotificationPreference,
    updateLastActivity 
  } = useNotifications();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [friendSearch, setFriendSearch] = useState("");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [uploading, setUploading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dailyTimeRemaining, setDailyTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [dailyPeriodStart, setDailyPeriodStart] = useState<Date | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (user) {
      loadProfile();
      loadFriendships();
      handleDailyLogin();
      updateLastActivity();
      setNotificationsEnabled(getNotificationPreference());
      checkAdminStatus();
      loadGlobalSettings();
    }
  }, [user, authLoading]);

  // Load global settings for 24h countdown
  const loadGlobalSettings = async () => {
    const { data } = await supabase
      .from('global_settings')
      .select('daily_period_start')
      .eq('id', 'main')
      .single();
    
    if (data) {
      const periodStart = new Date(data.daily_period_start);
      const now = new Date();
      
      // Check if 24 hours have passed
      if (now.getTime() - periodStart.getTime() >= 24 * 60 * 60 * 1000) {
        // Auto-reset the 24h countdown
        await handleAuto24HourReset();
      } else {
        setDailyPeriodStart(periodStart);
      }
    }
  };

  // Auto-reset 24h countdown when it expires
  // IMPORTANT: Add daily XP to period_xp BEFORE resetting daily XP
  const handleAuto24HourReset = async () => {
    const now = new Date();
    
    console.log('[24h Reset] Starting reset process...');
    
    // First, get all profiles with their daily XP and add to period_xp
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, tetris_xp, kart_xp, eslestirme_xp, kitap_xp');
    
    console.log('[24h Reset] Fetched profiles:', allProfiles, 'Error:', profilesError);
    
    if (allProfiles && allProfiles.length > 0) {
      // For each user, add their daily XP to period_xp
      for (const p of allProfiles) {
        const dailyTotal = (p.tetris_xp || 0) + (p.kart_xp || 0) + (p.eslestirme_xp || 0) + (p.kitap_xp || 0);
        console.log(`[24h Reset] User ${p.user_id} daily total: ${dailyTotal}`);
        
        if (dailyTotal > 0) {
          // Get current period_xp
          const { data: leagueData, error: leagueError } = await supabase
            .from('user_leagues')
            .select('period_xp')
            .eq('user_id', p.user_id)
            .maybeSingle();
          
          console.log(`[24h Reset] User ${p.user_id} league data:`, leagueData, 'Error:', leagueError);
          
          if (leagueData) {
            const newPeriodXp = (leagueData.period_xp || 0) + dailyTotal;
            console.log(`[24h Reset] Updating period_xp to ${newPeriodXp} for user ${p.user_id}`);
            
            // Add daily XP to period_xp
            const { error: updateError } = await supabase
              .from('user_leagues')
              .update({ period_xp: newPeriodXp })
              .eq('user_id', p.user_id);
            
            if (updateError) {
              console.error(`[24h Reset] Error updating period_xp for user ${p.user_id}:`, updateError);
            } else {
              console.log(`[24h Reset] Successfully updated period_xp for user ${p.user_id}`);
            }
          }
        }
      }
    }
    
    // Reset global settings
    await supabase
      .from('global_settings')
      .update({ daily_period_start: now.toISOString() })
      .eq('id', 'main');
    
    // Reset all users' daily XP (tetris_xp, kart_xp, eslestirme_xp, kitap_xp)
    // Use .not('id', 'is', null) to update all rows (Supabase requires a filter for update)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        tetris_xp: 0,
        kart_xp: 0,
        eslestirme_xp: 0,
        kitap_xp: 0
      })
      .not('id', 'is', null);
    
    if (updateError) {
      console.error('Error resetting profiles XP:', updateError);
    } else {
      console.log('Successfully reset all profiles XP to 0');
    }
    
    setDailyPeriodStart(now);
    
    // Immediately update local profile state to reflect reset
    if (profile) {
      setProfile({
        ...profile,
        tetris_xp: 0,
        kart_xp: 0,
        eslestirme_xp: 0,
        kitap_xp: 0
      });
    }
    
    // Reload profile to ensure sync
    loadProfile();
  };

  // Update 24h countdown every second
  useEffect(() => {
    if (!dailyPeriodStart) return;
    
    const interval = setInterval(() => {
      const remaining = get24HourTimeRemaining(dailyPeriodStart);
      setDailyTimeRemaining(remaining);
      
      // Auto-reset if countdown reached 0
      if (remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
        handleAuto24HourReset();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [dailyPeriodStart]);

  // Admin reset 24h countdown - also adds daily XP to period_xp first
  const handleReset24Hours = async () => {
    if (!isAdmin) return;
    
    try {
      await handleAuto24HourReset();
      toast.success('24 saat sıfırlandı ve günlük puanlar leaderboard\'a eklendi');
    } catch (error) {
      console.error('Error resetting 24h:', error);
      toast.error('Sıfırlama başarısız');
    }
  };

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    setIsAdmin(!!data);
  };

  const handleDailyLogin = async () => {
    const result = await checkAndUpdateDailyLogin();
    if (result?.isNewDay) {
      toast.success(`🔥 ${result.streak} günlük seri!`);
    }
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      const granted = await requestPermission();
      if (granted) {
        setNotificationsEnabled(true);
        saveNotificationPreference(true);
        toast.success('Bildirimler açıldı');
      } else {
        toast.error('Bildirim izni reddedildi');
      }
    } else {
      setNotificationsEnabled(false);
      saveNotificationPreference(false);
      toast.success('Bildirimler kapatıldı');
    }
  };

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
        setNewDisplayName(newProfile.display_name || "");
      } else {
        setProfile(data);
        setNewDisplayName(data.display_name || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendships = async () => {
    if (!user) return;

    try {
      // Get all friendships where user is involved
      const { data: friendshipsData, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) throw error;

      if (friendshipsData) {
        // Get all user IDs involved
        const userIds = new Set<string>();
        friendshipsData.forEach(f => {
          userIds.add(f.requester_id);
          userIds.add(f.addressee_id);
        });

        // Fetch all profiles
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", Array.from(userIds));

        // Map profiles to friendships
        const enrichedFriendships = friendshipsData.map(f => ({
          ...f,
          requester_profile: profiles?.find(p => p.user_id === f.requester_id),
          addressee_profile: profiles?.find(p => p.user_id === f.addressee_id),
        }));

        // Separate accepted friends from pending requests
        const accepted = enrichedFriendships.filter(f => f.status === 'accepted');
        const pending = enrichedFriendships.filter(f => 
          f.status === 'pending' && f.addressee_id === user.id
        );

        setFriends(accepted);
        setPendingRequests(pending);
      }
    } catch (error) {
      console.error("Error loading friendships:", error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success("Profil resmi güncellendi");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Resim yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  const updateDisplayName = async () => {
    if (!user || !newDisplayName.trim()) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: newDisplayName.trim() })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, display_name: newDisplayName.trim() } : null);
      setEditingName(false);
      toast.success("İsim güncellendi");
    } catch (error) {
      console.error("Error updating display name:", error);
      toast.error("İsim güncellenemedi");
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !friendSearch.trim()) return;

    try {
      // Search by email or display_name
      const { data: foundProfiles, error: searchError } = await supabase
        .from("profiles")
        .select("*")
        .or(`display_name.ilike.%${friendSearch}%`)
        .neq("user_id", user.id)
        .limit(1);

      if (searchError) throw searchError;

      if (!foundProfiles || foundProfiles.length === 0) {
        toast.error("Kullanıcı bulunamadı");
        return;
      }

      const targetProfile = foundProfiles[0];

      // Check if friendship already exists
      const { data: existing } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetProfile.user_id}),and(requester_id.eq.${targetProfile.user_id},addressee_id.eq.${user.id})`)
        .maybeSingle();

      if (existing) {
        toast.error("Arkadaşlık isteği zaten mevcut");
        return;
      }

      // Create friend request
      const { error: insertError } = await supabase
        .from("friendships")
        .insert({
          requester_id: user.id,
          addressee_id: targetProfile.user_id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      setFriendSearch("");
      toast.success("Arkadaşlık isteği gönderildi");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("İstek gönderilemedi");
    }
  };

  const respondToRequest = async (friendshipId: string, accept: boolean) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from("friendships")
          .update({ status: 'accepted' })
          .eq("id", friendshipId);

        if (error) throw error;
        toast.success("Arkadaşlık kabul edildi");
      } else {
        const { error } = await supabase
          .from("friendships")
          .delete()
          .eq("id", friendshipId);

        if (error) throw error;
        toast.success("Arkadaşlık reddedildi");
      }

      loadFriendships();
    } catch (error) {
      console.error("Error responding to request:", error);
      toast.error("İşlem başarısız");
    }
  };

  const getFriendProfile = (friendship: Friendship) => {
    if (!user) return null;
    return friendship.requester_id === user.id 
      ? friendship.addressee_profile 
      : friendship.requester_profile;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-page-profile-bg flex items-center justify-center">
        <p className="font-nunito text-lg">Yükleniyor...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-page-profile-bg flex items-center justify-center">
        <p className="font-nunito text-lg">Profil bulunamadı</p>
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
    <div className="min-h-screen bg-page-profile-bg pb-20 font-nunito">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex justify-end">
          <Button variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate('/auth'); }}>
            <LogOut className="w-4 h-4 mr-2" />
            Çıkış
          </Button>
        </div>

        <Card>
          <CardHeader className="text-center">
            {/* Avatar */}
            <div className="relative mx-auto">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-colors"
              >
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="w-8 h-8 text-primary/50" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Display Name */}
            <div className="mt-4">
              {editingName ? (
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="max-w-[200px]"
                    placeholder="Nickname"
                  />
                  <Button size="sm" onClick={updateDisplayName}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <CardTitle className="text-2xl text-page-profile-accent">
                    👤 {profile.display_name || "Kullanıcı"}
                  </CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setEditingName(true)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* 24-Hour Countdown */}
            <div className="text-center p-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-muted-foreground">Günlük Süre</span>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={handleReset24Hours}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-2xl font-bold text-blue-500">
                {dailyTimeRemaining.hours}s {dailyTimeRemaining.minutes}dk {dailyTimeRemaining.seconds}sn
              </p>
            </div>

            {/* Login Streak & Notifications */}
            <div className="flex gap-3">
              <div className="flex-1 text-center p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">Günlük Seri</span>
                </div>
                <p className="text-2xl font-bold text-orange-500">{profile.login_streak || 0} gün</p>
              </div>
              <div className="flex-1 text-center p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">Bildirim</span>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={toggleNotifications}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Test Notification Button - Only visible to admin */}
            {notificationsEnabled && isAdmin && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  toast.success('10 saniye sonra bildirim gelecek...');
                  setTimeout(() => {
                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                      navigator.serviceWorker.controller.postMessage({
                        type: 'TEST_NOTIFICATION',
                        title: 'Oyuna Geri Dön! 🎮',
                        body: '3 saattir oynamadın, kelimelerini unutma!'
                      });
                    } else {
                      // Fallback to regular notification
                      if (Notification.permission === 'granted') {
                        new Notification('Oyuna Geri Dön! 🎮', {
                          body: '3 saattir oynamadın, kelimelerini unutma!',
                          icon: '/favicon.ico'
                        });
                      }
                    }
                  }, 10000);
                }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Test Bildirimi Gönder (10sn)
              </Button>
            )}

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

        {/* Friends Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Arkadaşlar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="friends">
              <TabsList className="w-full">
                <TabsTrigger value="friends" className="flex-1">Arkadaşlar</TabsTrigger>
                <TabsTrigger value="requests" className="flex-1">
                  İstekler {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                </TabsTrigger>
                <TabsTrigger value="add" className="flex-1">Ekle</TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-3 mt-4">
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Henüz arkadaşınız yok
                  </p>
                ) : (
                  friends.map((friendship) => {
                    const friendProfile = getFriendProfile(friendship);
                    if (!friendProfile) return null;
                    const friendTotalXP = friendProfile.tetris_xp + friendProfile.kart_xp + 
                                         friendProfile.eslestirme_xp + friendProfile.kitap_xp;
                    
                    return (
                      <Dialog key={friendship.id}>
                        <DialogTrigger asChild>
                          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden">
                              {friendProfile.avatar_url ? (
                                <img src={friendProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                                  {friendProfile.display_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{friendProfile.display_name}</p>
                              <p className="text-sm text-muted-foreground">{friendTotalXP.toLocaleString()} XP</p>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-center">
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-20 h-20 rounded-full bg-primary/10 overflow-hidden">
                                  {friendProfile.avatar_url ? (
                                    <img src={friendProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-primary text-2xl font-bold">
                                      {friendProfile.display_name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                  )}
                                </div>
                                {friendProfile.display_name}
                              </div>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {/* Login Streak */}
                            <div className="text-center p-3 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <span className="text-sm text-muted-foreground">Günlük Seri</span>
                              </div>
                              <p className="text-2xl font-bold text-orange-500">{(friendProfile as any).login_streak || 0} gün</p>
                            </div>
                            
                            <div className="text-center p-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-lg">
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <Trophy className="w-5 h-5 text-yellow-500" />
                                <span className="text-sm text-muted-foreground">Toplam XP</span>
                              </div>
                              <p className="text-3xl font-bold text-primary">{friendTotalXP.toLocaleString()}</p>
                            </div>
                            <div className="space-y-2">
                              {[
                                { name: "Tetris", xp: friendProfile.tetris_xp, icon: Gamepad2, color: "text-blue-500" },
                                { name: "Kart", xp: friendProfile.kart_xp, icon: Zap, color: "text-yellow-500" },
                                { name: "Eşleştirme", xp: friendProfile.eslestirme_xp, icon: GitCompare, color: "text-green-500" },
                                { name: "Kitap", xp: friendProfile.kitap_xp, icon: BookOpen, color: "text-purple-500" },
                              ].map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                                  <div className="flex items-center gap-2">
                                    <item.icon className={`w-4 h-4 ${item.color}`} />
                                    <span className="text-sm">{item.name}</span>
                                  </div>
                                  <span className="font-semibold">{item.xp.toLocaleString()} XP</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })
                )}
              </TabsContent>

              <TabsContent value="requests" className="space-y-3 mt-4">
                {pendingRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Bekleyen istek yok
                  </p>
                ) : (
                  pendingRequests.map((request) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden">
                        {request.requester_profile?.avatar_url ? (
                          <img src={request.requester_profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary font-bold">
                            {request.requester_profile?.display_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{request.requester_profile?.display_name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respondToRequest(request.id, true)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => respondToRequest(request.id, false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="add" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Arkadaş eklemek için nickname yazın
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      placeholder="Nickname"
                      onKeyDown={(e) => e.key === 'Enter' && sendFriendRequest()}
                    />
                    <Button onClick={sendFriendRequest}>
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Profile;

import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Crown, Plus, Bell, Users, Flame, Gamepad2, BookOpen, Layers, Zap, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
const LEAGUES = [
  { id: 'bronze', name: 'Bronze League', color: 'from-amber-700 to-amber-900', minXp: 3000, maxXp: 6000 },
  { id: 'silver', name: 'Silver League', color: 'from-gray-400 to-gray-600', minXp: 6000, maxXp: 12000 },
  { id: 'gold', name: 'Gold League', color: 'from-yellow-400 to-yellow-600', minXp: 12000, maxXp: 18000 },
  { id: 'platinum', name: 'Platinum League', color: 'from-cyan-300 to-cyan-500', minXp: 18000, maxXp: 24000 },
  { id: 'emerald', name: 'Emerald League', color: 'from-emerald-400 to-emerald-600', minXp: 24000, maxXp: 30000 },
  { id: 'diamond', name: 'Diamond League', color: 'from-blue-300 to-blue-500', minXp: 30000, maxXp: 36000 },
  { id: 'sapphire', name: 'Sapphire League', color: 'from-indigo-400 to-indigo-600', minXp: 36000, maxXp: 42000 },
  { id: 'ruby', name: 'Ruby League', color: 'from-red-400 to-red-600', minXp: 42000, maxXp: 48000 },
  { id: 'obsidian', name: 'Obsidian League', color: 'from-slate-700 to-slate-900', minXp: 48000, maxXp: 54000 },
  { id: 'titan', name: 'Titan League', color: 'from-purple-500 to-purple-700', minXp: 54000, maxXp: 60000 },
];

// Male names
const MALE_NAMES = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "Emre", "Can", "Burak", "Kaan",
  "Berk", "Emir", "Yusuf", "Ömer", "Mert", "Arda", "Kerem", "Barış", "Cem", "Doruk",
  "Eren", "Furkan", "Gökhan", "Halil", "İlker", "Kaya", "Levent", "Oğuz", "Onur", "Serkan"
];

// Female names
const FEMALE_NAMES = [
  "Ayşe", "Fatma", "Zeynep", "Elif", "Ece", "Selin", "Ceren", "Dilara", "İrem", "Defne",
  "Ada", "Derin", "Asya", "Ela", "Lina", "Mira", "Nisa", "Pelin", "Sude", "Tuana",
  "Yağmur", "Zehra", "Deniz", "Melis", "Beyza", "Büşra", "Damla", "Esra", "Gül", "Hazal"
];

// Male avatar URLs
const MALE_AVATARS = [
  "https://randomuser.me/api/portraits/men/1.jpg",
  "https://randomuser.me/api/portraits/men/2.jpg",
  "https://randomuser.me/api/portraits/men/3.jpg",
  "https://randomuser.me/api/portraits/men/4.jpg",
  "https://randomuser.me/api/portraits/men/5.jpg",
  "https://randomuser.me/api/portraits/men/11.jpg",
  "https://randomuser.me/api/portraits/men/12.jpg",
  "https://randomuser.me/api/portraits/men/13.jpg",
  "https://randomuser.me/api/portraits/men/14.jpg",
  "https://randomuser.me/api/portraits/men/15.jpg",
  "https://randomuser.me/api/portraits/men/21.jpg",
  "https://randomuser.me/api/portraits/men/22.jpg",
  "https://randomuser.me/api/portraits/men/23.jpg",
  "https://randomuser.me/api/portraits/men/24.jpg",
  "https://randomuser.me/api/portraits/men/25.jpg",
  "https://randomuser.me/api/portraits/men/31.jpg",
  "https://randomuser.me/api/portraits/men/32.jpg",
  "https://randomuser.me/api/portraits/men/33.jpg",
  "https://randomuser.me/api/portraits/men/34.jpg",
  "https://randomuser.me/api/portraits/men/35.jpg",
  "https://randomuser.me/api/portraits/men/41.jpg",
  "https://randomuser.me/api/portraits/men/42.jpg",
  "https://randomuser.me/api/portraits/men/43.jpg",
  "https://randomuser.me/api/portraits/men/44.jpg",
  "https://randomuser.me/api/portraits/men/45.jpg",
  "https://randomuser.me/api/portraits/men/51.jpg",
  "https://randomuser.me/api/portraits/men/52.jpg",
  "https://randomuser.me/api/portraits/men/53.jpg",
  "https://randomuser.me/api/portraits/men/54.jpg",
  "https://randomuser.me/api/portraits/men/55.jpg",
];

// Female avatar URLs
const FEMALE_AVATARS = [
  "https://randomuser.me/api/portraits/women/1.jpg",
  "https://randomuser.me/api/portraits/women/2.jpg",
  "https://randomuser.me/api/portraits/women/3.jpg",
  "https://randomuser.me/api/portraits/women/4.jpg",
  "https://randomuser.me/api/portraits/women/5.jpg",
  "https://randomuser.me/api/portraits/women/11.jpg",
  "https://randomuser.me/api/portraits/women/12.jpg",
  "https://randomuser.me/api/portraits/women/13.jpg",
  "https://randomuser.me/api/portraits/women/14.jpg",
  "https://randomuser.me/api/portraits/women/15.jpg",
  "https://randomuser.me/api/portraits/women/21.jpg",
  "https://randomuser.me/api/portraits/women/22.jpg",
  "https://randomuser.me/api/portraits/women/23.jpg",
  "https://randomuser.me/api/portraits/women/24.jpg",
  "https://randomuser.me/api/portraits/women/25.jpg",
  "https://randomuser.me/api/portraits/women/31.jpg",
  "https://randomuser.me/api/portraits/women/32.jpg",
  "https://randomuser.me/api/portraits/women/33.jpg",
  "https://randomuser.me/api/portraits/women/34.jpg",
  "https://randomuser.me/api/portraits/women/35.jpg",
  "https://randomuser.me/api/portraits/women/41.jpg",
  "https://randomuser.me/api/portraits/women/42.jpg",
  "https://randomuser.me/api/portraits/women/43.jpg",
  "https://randomuser.me/api/portraits/women/44.jpg",
  "https://randomuser.me/api/portraits/women/45.jpg",
  "https://randomuser.me/api/portraits/women/51.jpg",
  "https://randomuser.me/api/portraits/women/52.jpg",
  "https://randomuser.me/api/portraits/women/53.jpg",
  "https://randomuser.me/api/portraits/women/54.jpg",
  "https://randomuser.me/api/portraits/women/55.jpg",
];

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  isBot: boolean;
  isCurrentUser: boolean;
  isFriend?: boolean;
  login_streak?: number;
  tetris_xp?: number;
  kart_xp?: number;
  eslestirme_xp?: number;
  kitap_xp?: number;
  friendUserId?: string;
}

// Global seed for consistent bots across all users
const GLOBAL_BOT_SEED = 1733600000000; // Fixed seed for all users

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifyLeaderboardChange, sendNotification, getNotificationPreference } = useNotifications();
  const [userLeague, setUserLeague] = useState<typeof LEAGUES[0]>(LEAGUES[0]);
  const [userPeriodXp, setUserPeriodXp] = useState(0);
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [simulatedHoursOffset, setSimulatedHoursOffset] = useState(0);
  const [leagueUsers, setLeagueUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const previousPositionRef = useRef<number | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    if (user) {
      loadLeaderboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Sync period_xp with total XP from profile
  const syncXpFromProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile) {
      const totalXp = (profile.tetris_xp || 0) + (profile.kart_xp || 0) + 
                      (profile.eslestirme_xp || 0) + (profile.kitap_xp || 0);
      
      // Update period_xp in user_leagues
      await supabase
        .from('user_leagues')
        .update({ period_xp: totalXp })
        .eq('user_id', user.id);
      
      setUserPeriodXp(totalXp);
    }
  };

  useEffect(() => {
    if (user) {
      syncXpFromProfile();
    }
  }, [user]);

  const loadLeaderboardData = async () => {
    if (!user) return;

    try {
      // Get user's league data
      const { data: leagueData } = await supabase
        .from('user_leagues')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (leagueData) {
        const league = LEAGUES.find(l => l.id === leagueData.current_league) || LEAGUES[0];
        setUserLeague(league);
        setUserPeriodXp(leagueData.period_xp || 0);
        setPeriodStart(new Date(leagueData.period_start_date));
        
        // Check if 3 days passed
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - new Date(leagueData.period_start_date).getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysPassed >= 3) {
          // Reset period and handle league changes
          await handlePeriodEnd(leagueData);
        }
      } else {
        // Create initial league entry
        await supabase.from('user_leagues').insert({
          user_id: user.id,
          current_league: 'bronze',
          period_xp: 0,
          period_start_date: new Date().toISOString()
        });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserProfile(profile);

      // Get friends in same league
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (friendships) {
        const friendIds = friendships.map(f => 
          f.requester_id === user.id ? f.addressee_id : f.requester_id
        );

        if (friendIds.length > 0) {
          const { data: friendLeagues } = await supabase
            .from('user_leagues')
            .select('user_id, current_league, period_xp')
            .in('user_id', friendIds);

          const { data: friendProfiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url')
            .in('user_id', friendIds);

          // Get full friend profiles with XP details
          const { data: fullFriendProfiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, avatar_url, login_streak, tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
            .in('user_id', friendIds);

          const friendsInLeague = (friendLeagues || [])
            .filter(fl => fl.current_league === (leagueData?.current_league || 'bronze'))
            .map(fl => {
              const profile = fullFriendProfiles?.find(p => p.user_id === fl.user_id);
              return {
                ...fl,
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url,
                login_streak: profile?.login_streak,
                tetris_xp: profile?.tetris_xp,
                kart_xp: profile?.kart_xp,
                eslestirme_xp: profile?.eslestirme_xp,
                kitap_xp: profile?.kitap_xp
              };
            });

          setFriends(friendsInLeague);
        }
      }

      setLeagueUsers([]);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodEnd = async (leagueData: any) => {
    if (!user) return;
    
    // Reset period XP in user_leagues
    await supabase
      .from('user_leagues')
      .update({
        period_xp: 0,
        period_start_date: new Date().toISOString()
      })
      .eq('user_id', user.id);
    
    // Also reset profile XP values
    await supabase
      .from('profiles')
      .update({
        tetris_xp: 0,
        kart_xp: 0,
        eslestirme_xp: 0,
        kitap_xp: 0
      })
      .eq('user_id', user.id);
    
    setUserPeriodXp(0);
    setPeriodStart(new Date());
    
    toast({
      title: "⏰ Periyot Sıfırlandı",
      description: "3 günlük periyot tamamlandı. XP sıfırlandı!",
    });
  };

  // Simulated time for testing
  const simulatedTime = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() + simulatedHoursOffset);
    return now;
  }, [simulatedHoursOffset]);

  const handleAddHour = () => {
    setSimulatedHoursOffset(prev => prev + 1);
    toast({
      title: "⏰ +1 Saat",
      description: `Simülasyon: ${simulatedHoursOffset + 1} saat ileri`,
    });
  };

  const handleSubtractHour = () => {
    if (simulatedHoursOffset > 0) {
      setSimulatedHoursOffset(prev => prev - 1);
      toast({
        title: "⏰ -1 Saat",
        description: `Simülasyon: ${simulatedHoursOffset - 1} saat ileri`,
      });
    }
  };

  // Generate bots for the league with global seed for consistency across ALL users
  const generateBots = useMemo(() => {
    const league = userLeague;
    const hoursElapsed = Math.min(72, Math.floor((simulatedTime.getTime() - periodStart.getTime()) / (1000 * 60 * 60)));
    
    // Calculate real users count (user + friends in league)
    const realUsersCount = 1 + friends.length;
    const botsNeeded = Math.max(0, 10 - realUsersCount);
    
    // Use GLOBAL seed for consistent bot generation across ALL users
    const seed = GLOBAL_BOT_SEED + (userLeague.id.charCodeAt(0) * 1000); // Same bots per league
    const seededRandom = (index: number, offset: number = 0) => {
      const x = Math.sin(seed + index * 1000 + offset) * 10000;
      return x - Math.floor(x);
    };
    
    const bots: LeaderboardEntry[] = [];
    
    for (let i = 0; i < botsNeeded; i++) {
      // Determine gender based on seed (consistent per bot index)
      const isMale = seededRandom(i, 500) > 0.5;
      
      // Get bot name based on gender
      const names = isMale ? MALE_NAMES : FEMALE_NAMES;
      const nameIndex = Math.floor(seededRandom(i) * names.length);
      const name = names[nameIndex];
      
      // Get bot avatar based on gender (unique per bot)
      const avatars = isMale ? MALE_AVATARS : FEMALE_AVATARS;
      const avatarIndex = i % avatars.length; // Ensures unique avatars
      const avatar = avatars[avatarIndex];
      
      // Calculate bot XP with variations
      const botIndex = i;
      const xpRange = league.maxXp - league.minXp;
      const baseDaily = league.minXp + (xpRange / 10) * (botIndex + 1);
      
      // Daily variation ±10% (seeded)
      const dailyVariation = 1 + (seededRandom(i, 200) * 0.2 - 0.1);
      const adjustedDaily = baseDaily * dailyVariation;
      
      // Calculate hourly with ±20% variation but keep within daily bounds
      const baseHourly = adjustedDaily / 24;
      let totalXp = 0;
      
      for (let h = 0; h < hoursElapsed; h++) {
        const hourlyVariation = 1 + (seededRandom(i * 100 + h, 300) * 0.4 - 0.2);
        totalXp += baseHourly * hourlyVariation;
      }
      
      // Cap at daily max with variation
      const maxDays = hoursElapsed / 24;
      const maxAllowed = adjustedDaily * maxDays;
      totalXp = Math.min(totalXp, maxAllowed);
      
      bots.push({
        id: `bot-${i}`,
        name,
        avatar_url: avatar,
        xp: Math.floor(totalXp),
        isBot: true,
        isCurrentUser: false
      });
    }
    
    return bots;
  }, [userLeague, periodStart, friends.length, simulatedTime]);

  // Build leaderboard entries
  const leaderboardEntries = useMemo(() => {
    const entries: LeaderboardEntry[] = [];
    
    // Add current user
    if (userProfile) {
      entries.push({
        id: user?.id || '',
        name: userProfile.display_name || 'Sen',
        avatar_url: userProfile.avatar_url,
        xp: userPeriodXp,
        isBot: false,
        isCurrentUser: true
      });
    }
    
    // Add friends with full XP details
    friends.forEach(friend => {
      entries.push({
        id: friend.user_id,
        name: friend.display_name || 'Arkadaş',
        avatar_url: friend.avatar_url,
        xp: friend.period_xp || 0,
        isBot: false,
        isCurrentUser: false,
        isFriend: true,
        login_streak: friend.login_streak,
        tetris_xp: friend.tetris_xp,
        kart_xp: friend.kart_xp,
        eslestirme_xp: friend.eslestirme_xp,
        kitap_xp: friend.kitap_xp,
        friendUserId: friend.user_id
      });
    });
    
    // Add bots
    entries.push(...generateBots);
    
    // Sort by XP descending
    entries.sort((a, b) => b.xp - a.xp);
    
    // Check for position change and notify immediately when detected
    const currentPosition = entries.findIndex(e => e.isCurrentUser) + 1;
    if (previousPositionRef.current !== null && currentPosition > previousPositionRef.current) {
      // User dropped in position - someone passed them
      const passer = entries[currentPosition - 2]; // The one who passed
      if (passer && getNotificationPreference()) {
        // Send notification immediately
        sendNotification(
          'Sıralaman değişti! 📊',
          `${passer.name} seni geçti! Gel XP kazan ve sıralamana geri dön!`
        );
      }
    }
    previousPositionRef.current = currentPosition;
    
    return entries;
  }, [userProfile, userPeriodXp, friends, generateBots, user?.id, sendNotification, getNotificationPreference]);

  // Handle friend click for comparison
  const handleFriendClick = (entry: LeaderboardEntry) => {
    if (entry.isFriend) {
      setSelectedFriend(entry);
      setCompareDialogOpen(true);
    }
  };

  // Send notification to friend
  const handleSendFriendNotification = (e: React.MouseEvent, entry: LeaderboardEntry) => {
    e.stopPropagation(); // Prevent dialog opening
    if (entry.friendUserId) {
      // For testing: send a browser notification to show it works
      sendNotification(
        'Arkadaşın seni çağırıyor! 🎮',
        `${userProfile?.display_name || 'Arkadaşın'} diyor: Gel başlayalım!`
      );
      toast({
        title: "Bildirim Gönderildi! 🔔",
        description: `${entry.name}'e bildirim gönderildi: "Gel başlayalım!"`,
      });
    }
  };

  const getPositionIcon = (position: number) => {
    if (position <= 4) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (position <= 8) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getPositionStyle = (position: number) => {
    if (position === 1) return 'bg-yellow-500/20 border-yellow-500';
    if (position <= 4) return 'bg-green-500/10 border-green-500/30';
    if (position <= 8) return 'bg-muted/50 border-border';
    return 'bg-red-500/10 border-red-500/30';
  };

  const timeRemaining = useMemo(() => {
    const endDate = new Date(periodStart);
    endDate.setDate(endDate.getDate() + 3);
    const diff = endDate.getTime() - simulatedTime.getTime();
    
    if (diff <= 0) return '0s 0dk';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}dk`;
  }, [periodStart, simulatedTime]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Geri
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Liderlik tablosunu görmek için giriş yapmalısınız.</p>
            <Button className="mt-4" onClick={() => navigate('/auth')}>
              Giriş Yap
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" /> Geri
      </Button>

      {/* League Header */}
      <Card className={`mb-6 bg-gradient-to-r ${userLeague.color} text-white`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6" />
            {userLeague.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">Kalan Süre</p>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={handleSubtractHour}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <p className="text-xl font-bold">{timeRemaining}</p>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={handleAddHour}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {simulatedHoursOffset > 0 && (
                <p className="text-xs opacity-60">+{simulatedHoursOffset} saat simülasyon</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Senin XP</p>
              <p className="text-xl font-bold">{userPeriodXp.toLocaleString()}</p>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 px-2 text-xs text-white hover:bg-white/20"
                onClick={syncXpFromProfile}
              >
                <Bell className="h-3 w-3 mr-1" /> Senkronize Et
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Position Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">1-4: Yüksel</span>
        </div>
        <div className="flex items-center gap-1">
          <Minus className="h-4 w-4 text-yellow-500" />
          <span className="text-muted-foreground">5-8: Kal</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span className="text-muted-foreground">9-10: Düş</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboardEntries.map((entry, index) => (
          <Card 
            key={entry.id} 
            className={`border ${getPositionStyle(index + 1)} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''} ${entry.isFriend ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
            onClick={() => handleFriendClick(entry)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                {index + 1 === 1 ? (
                  <Crown className="h-5 w-5 text-yellow-500" />
                ) : (
                  index + 1
                )}
              </div>
              
              <Avatar className="h-10 w-10">
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className={entry.isBot ? 'bg-muted' : 'bg-primary/20'}>
                  {entry.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className={`font-medium ${entry.isCurrentUser ? 'text-primary' : ''}`}>
                  {entry.name} {entry.isCurrentUser && '(Sen)'}
                </p>
                {entry.isFriend && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" /> Arkadaş
                  </p>
                )}
              </div>
              
              {/* Friend notification button */}
              {entry.isFriend && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 hover:bg-primary/20"
                  onClick={(e) => handleSendFriendNotification(e, entry)}
                  title="Bildirim gönder"
                >
                  <Send className="h-4 w-4 text-primary" />
                </Button>
              )}
              
              <div className="flex items-center gap-2">
                <span className="font-bold">{entry.xp.toLocaleString()} XP</span>
                {getPositionIcon(index + 1)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Friend Comparison Dialog */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Karşılaştırma
            </DialogTitle>
          </DialogHeader>
          
          {selectedFriend && userProfile && (
            <div className="space-y-4">
              {/* Avatars and Names */}
              <div className="flex justify-around items-center">
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarImage src={userProfile.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20">
                      {(userProfile.display_name || 'Sen').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium text-primary">{userProfile.display_name || 'Sen'}</p>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-2">
                    <AvatarImage src={selectedFriend.avatar_url || undefined} />
                    <AvatarFallback className="bg-secondary/20">
                      {selectedFriend.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{selectedFriend.name}</p>
                </div>
              </div>

              {/* Stats Comparison */}
              <div className="space-y-3">
                {/* Total XP */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userPeriodXp.toLocaleString()}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Toplam XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.xp.toLocaleString()}</span>
                </div>

                {/* Login Streak */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.login_streak || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm">Giriş Serisi</span>
                  </div>
                  <span className="font-bold">{selectedFriend.login_streak || 0}</span>
                </div>

                {/* Game XP Breakdown */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.tetris_xp || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Gamepad2 className="h-4 w-4" />
                    <span className="text-sm">Tetris XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.tetris_xp || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.kart_xp || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Layers className="h-4 w-4" />
                    <span className="text-sm">Kart XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.kart_xp || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.eslestirme_xp || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Eşleştirme XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.eslestirme_xp || 0}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.kitap_xp || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span className="text-sm">Kitap XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.kitap_xp || 0}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leaderboard;

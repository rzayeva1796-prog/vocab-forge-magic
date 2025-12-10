import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Bell, Users, Flame, Gamepad2, BookOpen, Layers, Zap, Send, Clock, Plus, MinusCircle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { BottomNavigation } from "@/components/BottomNavigation";

const LEAGUES = [
  { id: 'bronze', name: 'Bronze League', color: 'from-amber-700 to-amber-900', minXp: 3000, maxXp: 6000, order: 0 },
  { id: 'silver', name: 'Silver League', color: 'from-gray-400 to-gray-600', minXp: 6000, maxXp: 12000, order: 1 },
  { id: 'gold', name: 'Gold League', color: 'from-yellow-400 to-yellow-600', minXp: 12000, maxXp: 18000, order: 2 },
  { id: 'platinum', name: 'Platinum League', color: 'from-cyan-300 to-cyan-500', minXp: 18000, maxXp: 24000, order: 3 },
  { id: 'emerald', name: 'Emerald League', color: 'from-emerald-400 to-emerald-600', minXp: 24000, maxXp: 30000, order: 4 },
  { id: 'diamond', name: 'Diamond League', color: 'from-blue-300 to-blue-500', minXp: 30000, maxXp: 36000, order: 5 },
  { id: 'sapphire', name: 'Sapphire League', color: 'from-indigo-400 to-indigo-600', minXp: 36000, maxXp: 42000, order: 6 },
  { id: 'ruby', name: 'Ruby League', color: 'from-red-400 to-red-600', minXp: 42000, maxXp: 48000, order: 7 },
  { id: 'obsidian', name: 'Obsidian League', color: 'from-slate-700 to-slate-900', minXp: 48000, maxXp: 54000, order: 8 },
  { id: 'titan', name: 'Titan League', color: 'from-purple-500 to-purple-700', minXp: 54000, maxXp: 60000, order: 9 },
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
  daily_xp_rate?: number;
}

interface Bot {
  id: string;
  name: string;
  avatar_url: string | null;
  current_league: string;
  period_xp: number;
  daily_xp_rate: number;
}

// Get the current 3-day period start time in UTC+4
const getGlobalPeriodStart = (simulatedHoursOffset: number = 0): Date => {
  const now = new Date();
  // Apply simulated hours offset
  const adjustedNow = new Date(now.getTime() + simulatedHoursOffset * 60 * 60 * 1000);
  // Convert to UTC+4
  const utc4Offset = 4 * 60 * 60 * 1000;
  const nowUtc4 = new Date(adjustedNow.getTime() + utc4Offset);
  
  // Set to midnight UTC+4
  nowUtc4.setUTCHours(0, 0, 0, 0);
  
  // Find the start of the current 3-day period
  const referenceDate = new Date('2024-01-01T00:00:00+04:00');
  const daysSinceReference = Math.floor((nowUtc4.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const periodNumber = Math.floor(daysSinceReference / 3);
  const periodStartDays = periodNumber * 3;
  
  const periodStart = new Date(referenceDate.getTime() + periodStartDays * 24 * 60 * 60 * 1000);
  return new Date(periodStart.getTime() - utc4Offset);
};

// Get time remaining until next period (at 00:00 UTC+4)
const getTimeRemainingUntilPeriodEnd = (simulatedHoursOffset: number = 0): { hours: number; minutes: number; seconds: number } => {
  const now = new Date();
  const adjustedNow = new Date(now.getTime() + simulatedHoursOffset * 60 * 60 * 1000);
  const periodStart = getGlobalPeriodStart(simulatedHoursOffset);
  const periodEnd = new Date(periodStart.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const diff = periodEnd.getTime() - adjustedNow.getTime();
  
  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { hours, minutes, seconds };
};

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifyLeaderboardChange, sendNotification, getNotificationPreference } = useNotifications();
  const { showPositionLostNotification, isWithinNotificationHours } = useServiceWorker();
  const [userLeague, setUserLeague] = useState<typeof LEAGUES[0]>(LEAGUES[0]);
  const [selectedLeague, setSelectedLeague] = useState<typeof LEAGUES[0]>(LEAGUES[0]);
  const [userPeriodXp, setUserPeriodXp] = useState(0);
  const [simulatedHoursOffset, setSimulatedHoursOffset] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(getTimeRemainingUntilPeriodEnd(0));
  const [leagueUsers, setLeagueUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [allLeagueUsers, setAllLeagueUsers] = useState<{[key: string]: any[]}>({});
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const previousPositionRef = useRef<number | null>(null);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<LeaderboardEntry | null>(null);
  const [sendingNotification, setSendingNotification] = useState<string | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);

  // Check if current user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();
      setCurrentUserIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  // Update time remaining every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemainingUntilPeriodEnd(simulatedHoursOffset));
    }, 1000);
    return () => clearInterval(interval);
  }, [simulatedHoursOffset]);

  // Auto-trigger league transitions on mount and periodically
  useEffect(() => {
    const checkAndTriggerTransitions = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('league-transition', {
          body: { forceTransition: false }
        });
        if (data?.periodEnded) {
          console.log('League transitions processed automatically');
          loadBots();
        }
      } catch (err) {
        console.error('Error checking league transitions:', err);
      }
    };
    
    checkAndTriggerTransitions();
    // Check every 5 minutes
    const interval = setInterval(checkAndTriggerTransitions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      loadLeaderboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Load bots from database
  const loadBots = async () => {
    const { data } = await supabase
      .from('leaderboard_bots')
      .select('*');
    if (data) {
      setBots(data as Bot[]);
    }
  };

  useEffect(() => {
    loadBots();
  }, []);

  // Calculate total XP for leaderboard display
  // period_xp contains cumulative XP from previous days (saved when 24h resets)
  // current daily XP is added on top for real-time display
  const syncXpFromProfile = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const { data: leagueData } = await supabase
      .from('user_leagues')
      .select('period_xp')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (profile) {
      const currentDailyXp = (profile.tetris_xp || 0) + (profile.kart_xp || 0) + 
                             (profile.eslestirme_xp || 0) + (profile.kitap_xp || 0);
      
      // period_xp = XP from previous days within this 72h period
      // currentDailyXp = today's XP (not yet saved to period_xp)
      // Total = period_xp + currentDailyXp (real-time display)
      const savedPeriodXp = leagueData?.period_xp || 0;
      setUserPeriodXp(savedPeriodXp + currentDailyXp);
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
        setSelectedLeague(league);
        setUserPeriodXp(leagueData.period_xp || 0);
        
        const globalPeriodStart = getGlobalPeriodStart(simulatedHoursOffset);
        const lastPeriodStart = new Date(leagueData.period_start_date);
        
        if (globalPeriodStart.getTime() > lastPeriodStart.getTime()) {
          await handlePeriodEnd(leagueData);
        }
      } else {
        await supabase.from('user_leagues').insert({
          user_id: user.id,
          current_league: 'bronze',
          period_xp: 0,
          period_start_date: getGlobalPeriodStart(simulatedHoursOffset).toISOString()
        });
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      setUserProfile(profile);

      // Get all non-admin users in all leagues
      const { data: allUserLeagues } = await supabase
        .from('user_leagues')
        .select('user_id, current_league, period_xp');

      // Get admin user IDs to exclude them
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));
      
      // Filter out admin users
      const nonAdminUserLeagues = (allUserLeagues || []).filter(ul => !adminUserIds.has(ul.user_id));

      // Get all non-admin user profiles
      const nonAdminUserIds = nonAdminUserLeagues.map(ul => ul.user_id);
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, login_streak, tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
        .in('user_id', nonAdminUserIds);

      // Get friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Build league users map
      const usersPerLeague: {[key: string]: any[]} = {};
      LEAGUES.forEach(league => {
        usersPerLeague[league.id] = nonAdminUserLeagues
          .filter(ul => ul.current_league === league.id)
          .map(ul => {
            const profile = (allProfiles || []).find(p => p.user_id === ul.user_id);
            const isFriend = friendIds.includes(ul.user_id);
            return {
              ...ul,
              display_name: profile?.display_name,
              avatar_url: profile?.avatar_url,
              login_streak: profile?.login_streak,
              tetris_xp: profile?.tetris_xp,
              kart_xp: profile?.kart_xp,
              eslestirme_xp: profile?.eslestirme_xp,
              kitap_xp: profile?.kitap_xp,
              isFriend,
              isCurrentUser: ul.user_id === user.id
            };
          });
      });
      
      setAllLeagueUsers(usersPerLeague);

      // Set friends in user's league
      const friendsInLeague = usersPerLeague[leagueData?.current_league || 'bronze']
        ?.filter(u => friendIds.includes(u.user_id) && u.user_id !== user.id) || [];
      setFriends(friendsInLeague);

    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle period end with league promotions/demotions
  const handlePeriodEnd = async (leagueData: any) => {
    if (!user) return;
    
    const globalPeriodStart = getGlobalPeriodStart(simulatedHoursOffset);
    
    // Process league changes based on final standings
    // This is simplified - in production you'd want a scheduled function
    await supabase
      .from('user_leagues')
      .update({
        period_xp: 0,
        period_start_date: globalPeriodStart.toISOString()
      })
      .eq('user_id', user.id);
    
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
    
    toast({
      title: "⏰ Periyot Sıfırlandı",
      description: "3 günlük periyot tamamlandı. XP sıfırlandı!",
    });
  };

  // Calculate bot XP based on elapsed hours
  const calculateBotXp = (bot: Bot, hoursElapsed: number): number => {
    const hourlyRate = bot.daily_xp_rate / 24;
    // Add some variance
    const seed = bot.id.charCodeAt(0) + bot.id.charCodeAt(1);
    const seededRandom = (index: number) => {
      const x = Math.sin(seed + index * 1000) * 10000;
      return x - Math.floor(x);
    };
    
    let totalXp = 0;
    for (let h = 0; h < hoursElapsed; h++) {
      const variation = 1 + (seededRandom(h) * 0.4 - 0.2); // ±20% hourly variation
      totalXp += hourlyRate * variation;
    }
    
    return Math.floor(totalXp);
  };

  // Build leaderboard entries with bots from database - exactly 12 entries
  const leaderboardEntries = useMemo(() => {
    const displayLeague = currentUserIsAdmin ? selectedLeague : userLeague;
    
    // Get hours elapsed in current period
    const periodStart = getGlobalPeriodStart(simulatedHoursOffset);
    const now = new Date();
    const adjustedNow = new Date(now.getTime() + simulatedHoursOffset * 60 * 60 * 1000);
    const hoursElapsed = Math.min(72, Math.floor((adjustedNow.getTime() - periodStart.getTime()) / (1000 * 60 * 60)));

    // Get all 12 bots for this league
    const botsInLeague = bots.filter(b => b.current_league === displayLeague.id);
    const botEntries: LeaderboardEntry[] = botsInLeague.map(bot => ({
      id: bot.id,
      name: bot.name,
      avatar_url: bot.avatar_url,
      xp: calculateBotXp(bot, hoursElapsed),
      isBot: true,
      isCurrentUser: false,
      daily_xp_rate: bot.daily_xp_rate
    }));

    // Get users for the display league (non-admin only)
    // XP = period_xp (saved from previous days) + current daily XP (real-time)
    const usersInLeague = allLeagueUsers[displayLeague.id] || [];
    const userEntries: LeaderboardEntry[] = usersInLeague
      .filter(u => !(u.user_id === user?.id && currentUserIsAdmin))
      .map(u => {
        // Calculate total XP: saved period_xp + current day's XP
        const currentDailyXp = (u.tetris_xp || 0) + (u.kart_xp || 0) + (u.eslestirme_xp || 0) + (u.kitap_xp || 0);
        const totalXp = (u.period_xp || 0) + currentDailyXp;
        
        return {
          id: u.user_id,
          name: u.display_name || (u.isCurrentUser ? 'Sen' : 'Kullanıcı'),
          avatar_url: u.avatar_url,
          xp: totalXp,
          isBot: false,
          isCurrentUser: u.isCurrentUser && !currentUserIsAdmin,
          isFriend: u.isFriend,
          login_streak: u.login_streak,
          tetris_xp: u.tetris_xp,
          kart_xp: u.kart_xp,
          eslestirme_xp: u.eslestirme_xp,
          kitap_xp: u.kitap_xp,
          friendUserId: u.isFriend ? u.user_id : undefined
        };
      });
    
    // Combine all entries and sort by XP descending
    const allEntries = [...botEntries, ...userEntries];
    allEntries.sort((a, b) => b.xp - a.xp);
    
    // Find current user entry before limiting
    let currentUserEntry = allEntries.find(e => e.isCurrentUser);
    
    // If current user is in this league but not in allEntries (e.g., 0 XP after promotion),
    // create their entry from userProfile
    if (!currentUserEntry && !currentUserIsAdmin && userProfile && displayLeague.id === userLeague.id) {
      const currentDailyXp = (userProfile.tetris_xp || 0) + (userProfile.kart_xp || 0) + 
                             (userProfile.eslestirme_xp || 0) + (userProfile.kitap_xp || 0);
      currentUserEntry = {
        id: user?.id || '',
        name: userProfile.display_name || 'Sen',
        avatar_url: userProfile.avatar_url,
        xp: userPeriodXp || currentDailyXp,
        isBot: false,
        isCurrentUser: true,
        isFriend: false,
        login_streak: userProfile.login_streak,
        tetris_xp: userProfile.tetris_xp,
        kart_xp: userProfile.kart_xp,
        eslestirme_xp: userProfile.eslestirme_xp,
        kitap_xp: userProfile.kitap_xp
      };
      // Add user to allEntries for proper ranking
      allEntries.push(currentUserEntry);
      allEntries.sort((a, b) => b.xp - a.xp);
    }
    
    const currentUserRank = currentUserEntry ? allEntries.findIndex(e => e.isCurrentUser) + 1 : -1;
    
    // Take top 12 entries
    let limitedEntries = allEntries.slice(0, 12);
    
    // If current user is not in top 12 but is in this league, add them at the bottom with their actual rank
    if (currentUserEntry && !limitedEntries.some(e => e.isCurrentUser) && displayLeague.id === userLeague.id) {
      // Remove the last bot to make room for current user
      limitedEntries = limitedEntries.slice(0, 11);
      limitedEntries.push({ ...currentUserEntry, rank: currentUserRank } as LeaderboardEntry);
    }
    
    // Check for position change notification
    const currentPosition = limitedEntries.findIndex(e => e.isCurrentUser) + 1;
    if (!currentUserIsAdmin && previousPositionRef.current !== null && currentPosition > previousPositionRef.current && currentPosition > 0) {
      const passer = limitedEntries[currentPosition - 2];
      if (passer && getNotificationPreference() && isWithinNotificationHours()) {
        showPositionLostNotification(passer.name);
      }
    }
    if (currentPosition > 0) {
      previousPositionRef.current = currentPosition;
    }
    
    return limitedEntries;
  }, [userProfile, userPeriodXp, allLeagueUsers, bots, user?.id, currentUserIsAdmin, selectedLeague, userLeague, simulatedHoursOffset, showPositionLostNotification, getNotificationPreference, isWithinNotificationHours]);

  // Reset 72-hour timer for admin
  const handleReset72Hours = async () => {
    if (!currentUserIsAdmin) return;
    
    try {
      // Reset all user leagues period_start_date to now
      const now = new Date().toISOString();
      
      await supabase
        .from('user_leagues')
        .update({ period_start_date: now });
      
      toast({
        title: "72 Saat Sıfırlandı",
        description: "Tüm kullanıcılar için 72 saatlik süre yeniden başladı.",
      });
      
      // Reload data
      await loadLeaderboardData();
      setSimulatedHoursOffset(0);
    } catch (error) {
      console.error('Error resetting 72h:', error);
      toast({
        title: "Hata",
        description: "Sıfırlama başarısız",
        variant: "destructive"
      });
    }
  };

  // Simulate league changes at period end by calling edge function
  const simulateLeagueChanges = async () => {
    if (!currentUserIsAdmin) return;

    toast({
      title: "Simülasyon Başlatıldı",
      description: "Lig değişiklikleri işleniyor...",
    });

    try {
      // Call the edge function with force parameter to trigger transition
      const { data, error } = await supabase.functions.invoke('league-transition', {
        body: { forceTransition: true }
      });

      if (error) {
        console.error('League transition error:', error);
        toast({
          title: "Hata",
          description: "Lig değişiklikleri uygulanamadı",
          variant: "destructive"
        });
        return;
      }

      console.log('League transition result:', data);

      toast({
        title: "Simülasyon Tamamlandı ✓",
        description: data?.message || "Tüm ligler için lig değişiklikleri uygulandı.",
      });

      // Reload data
      await loadBots();
      await loadLeaderboardData();
    } catch (err) {
      console.error('Error calling league-transition:', err);
      toast({
        title: "Hata",
        description: "Bir hata oluştu",
        variant: "destructive"
      });
    }
  };

  // Handle friend click for comparison
  const handleFriendClick = (entry: LeaderboardEntry) => {
    if (entry.isFriend) {
      setSelectedFriend(entry);
      setCompareDialogOpen(true);
    }
  };

  // Send notification to friend
  const handleSendFriendNotification = async (e: React.MouseEvent, entry: LeaderboardEntry) => {
    e.stopPropagation();
    if (entry.friendUserId) {
      setSendingNotification(entry.friendUserId);
      try {
        const { data, error } = await supabase.functions.invoke('send-notification', {
          body: {
            targetUserId: entry.friendUserId,
            title: 'Arkadaşın seni çağırıyor! 🎮',
            body: `${userProfile?.display_name || 'Arkadaşın'} diyor: Gel başlayalım!`,
            senderName: userProfile?.display_name || 'Arkadaş'
          }
        });

        if (error) {
          toast({
            title: "Hata",
            description: "Bildirim gönderilemedi",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Bildirim Gönderildi! 🔔",
            description: `${entry.name}'e bildirim gönderildi: "Gel başlayalım!"`,
          });
        }
      } catch (err) {
        toast({
          title: "Hata",
          description: "Bildirim gönderilemedi",
          variant: "destructive"
        });
      } finally {
        setSendingNotification(null);
      }
    }
  };

  const getPositionIcon = (position: number, totalEntries: number) => {
    if (position <= 4) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (position <= totalEntries - 4) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getPositionStyle = (position: number, totalEntries: number) => {
    if (position === 1) return 'bg-yellow-500/20 border-yellow-500';
    if (position <= 4) return 'bg-green-500/10 border-green-500/30';
    if (position <= totalEntries - 4) return 'bg-muted/50 border-border';
    return 'bg-red-500/10 border-red-500/30';
  };

  const formatTimeRemaining = () => {
    return `${timeRemaining.hours}s ${timeRemaining.minutes}dk`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-page-leaderboard-bg pb-20 p-4 font-poppins">
        <Card>
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Liderlik tablosunu görmek için giriş yapmalısınız.</p>
            <Button className="mt-4" onClick={() => navigate('/auth')}>
              Giriş Yap
            </Button>
          </CardContent>
        </Card>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-page-leaderboard-bg flex items-center justify-center pb-20 font-poppins">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-page-leaderboard-accent"></div>
        <BottomNavigation />
      </div>
    );
  }

  const displayLeague = currentUserIsAdmin ? selectedLeague : userLeague;

  return (
    <div className="min-h-screen bg-page-leaderboard-bg pb-20 p-4 font-poppins">
      {/* Admin Controls */}
      {currentUserIsAdmin && (
        <div className="mb-4 space-y-3">
          {/* League Selector */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Admin: Lig Seç</p>
            <div className="flex flex-wrap gap-2">
              {LEAGUES.map((league) => (
                <Button
                  key={league.id}
                  variant={selectedLeague.id === league.id ? "default" : "outline"}
                  size="sm"
                  className={selectedLeague.id === league.id ? `bg-gradient-to-r ${league.color} text-white` : ''}
                  onClick={() => setSelectedLeague(league)}
                >
                  {league.name.replace(' League', '')}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Simulation Controls */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Zaman Simülasyonu:</span>
                  <span className="font-mono text-sm font-bold">
                    {simulatedHoursOffset > 0 ? '+' : ''}{simulatedHoursOffset}h
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSimulatedHoursOffset(prev => prev - 1)}
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSimulatedHoursOffset(prev => prev + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setSimulatedHoursOffset(0)}
                  >
                    Sıfırla
                  </Button>
                </div>
              </div>
              
              {/* Period End Simulation */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Periyot sonu simülasyonu:</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={simulateLeagueChanges}
                >
                  Lig Değişikliklerini Uygula
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* League Header */}
      <Card className={`mb-6 bg-gradient-to-r ${displayLeague.color} text-white`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-poppins">
            <Trophy className="h-6 w-6" />
            🏆 {displayLeague.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex justify-between items-center">
            <div>
              <p className="text-sm opacity-80">Kalan Süre</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold">{formatTimeRemaining()}</p>
                {currentUserIsAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-white hover:bg-white/20"
                    onClick={handleReset72Hours}
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                )}
              </div>
              {simulatedHoursOffset !== 0 && (
                <p className="text-xs opacity-70">(Simüle: {simulatedHoursOffset > 0 ? '+' : ''}{simulatedHoursOffset}h)</p>
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
          <span className="text-muted-foreground">Ortada: Kal</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <span className="text-muted-foreground">Son 4: Düş</span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-2">
        {leaderboardEntries.map((entry, index) => (
          <Card 
            key={entry.id} 
            className={`border ${getPositionStyle(index + 1, leaderboardEntries.length)} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''} ${entry.isFriend ? 'cursor-pointer hover:bg-muted/50 transition-colors' : ''}`}
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
                {entry.isBot && currentUserIsAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Bot • {entry.daily_xp_rate?.toLocaleString()} XP/gün
                  </p>
                )}
              </div>
              
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
                {getPositionIcon(index + 1, leaderboardEntries.length)}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userPeriodXp.toLocaleString()}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">Toplam XP</span>
                  </div>
                  <span className="font-bold">{selectedFriend.xp.toLocaleString()}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-bold text-primary">{userProfile.login_streak || 0}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm">Giriş Serisi</span>
                  </div>
                  <span className="font-bold">{selectedFriend.login_streak || 0}</span>
                </div>

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

      <BottomNavigation />
    </div>
  );
};

export default Leaderboard;
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Minus, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

const BOT_NAMES = [
  "Ahmet", "Mehmet", "Ayşe", "Fatma", "Mustafa", "Ali", "Zeynep", "Elif", "Hüseyin", "Hasan",
  "Emre", "Can", "Deniz", "Ece", "Selin", "Burak", "Kaan", "Berk", "Ceren", "Dilara",
  "Emir", "Yusuf", "Ömer", "İrem", "Defne", "Ada", "Mert", "Arda", "Kerem", "Derin",
  "Asya", "Ela", "Lina", "Mira", "Nisa", "Pelin", "Sude", "Tuana", "Yağmur", "Zehra",
  "Barış", "Cem", "Doruk", "Eren", "Furkan", "Gökhan", "Halil", "İlker", "Kaya", "Levent"
];

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  isBot: boolean;
  isCurrentUser: boolean;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userLeague, setUserLeague] = useState<typeof LEAGUES[0]>(LEAGUES[0]);
  const [userPeriodXp, setUserPeriodXp] = useState(0);
  const [periodStart, setPeriodStart] = useState<Date>(new Date());
  const [leagueUsers, setLeagueUsers] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadLeaderboardData();
    } else {
      setLoading(false);
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

          const friendsInLeague = (friendLeagues || [])
            .filter(fl => fl.current_league === (leagueData?.current_league || 'bronze'))
            .map(fl => {
              const profile = friendProfiles?.find(p => p.user_id === fl.user_id);
              return {
                ...fl,
                display_name: profile?.display_name,
                avatar_url: profile?.avatar_url
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
    // This would calculate final position and update league
    // For now, just reset the period
    await supabase
      .from('user_leagues')
      .update({
        period_xp: 0,
        period_start_date: new Date().toISOString()
      })
      .eq('user_id', user?.id);
    
    setUserPeriodXp(0);
    setPeriodStart(new Date());
  };

  // Generate bots for the league
  const generateBots = useMemo(() => {
    const league = userLeague;
    const hoursElapsed = Math.min(72, Math.floor((new Date().getTime() - periodStart.getTime()) / (1000 * 60 * 60)));
    
    // Calculate real users count (user + friends in league)
    const realUsersCount = 1 + friends.length;
    const botsNeeded = Math.max(0, 10 - realUsersCount);
    
    const bots: LeaderboardEntry[] = [];
    const usedNames = new Set<string>();
    
    for (let i = 0; i < botsNeeded; i++) {
      // Get unique bot name
      let name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      while (usedNames.has(name)) {
        name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      }
      usedNames.add(name);
      
      // Calculate bot XP with variations
      const botIndex = i;
      const xpRange = league.maxXp - league.minXp;
      const baseDaily = league.minXp + (xpRange / 10) * (botIndex + 1);
      
      // Daily variation ±10%
      const dailyVariation = 1 + (Math.random() * 0.2 - 0.1);
      const adjustedDaily = baseDaily * dailyVariation;
      
      // Calculate hourly with ±20% variation but keep within daily bounds
      const baseHourly = adjustedDaily / 24;
      let totalXp = 0;
      
      for (let h = 0; h < hoursElapsed; h++) {
        const hourlyVariation = 1 + (Math.random() * 0.4 - 0.2);
        totalXp += baseHourly * hourlyVariation;
      }
      
      // Cap at daily max with variation
      const maxDays = hoursElapsed / 24;
      const maxAllowed = adjustedDaily * maxDays;
      totalXp = Math.min(totalXp, maxAllowed);
      
      bots.push({
        id: `bot-${i}`,
        name,
        avatar_url: null,
        xp: Math.floor(totalXp),
        isBot: true,
        isCurrentUser: false
      });
    }
    
    return bots;
  }, [userLeague, periodStart, friends.length]);

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
    
    // Add friends
    friends.forEach(friend => {
      entries.push({
        id: friend.user_id,
        name: friend.display_name || 'Arkadaş',
        avatar_url: friend.avatar_url,
        xp: friend.period_xp || 0,
        isBot: false,
        isCurrentUser: false
      });
    });
    
    // Add bots
    entries.push(...generateBots);
    
    // Sort by XP descending
    entries.sort((a, b) => b.xp - a.xp);
    
    return entries;
  }, [userProfile, userPeriodXp, friends, generateBots, user?.id]);

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
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) return '0s 0dk';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}dk`;
  }, [periodStart]);

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
              <p className="text-xl font-bold">{timeRemaining}</p>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-80">Senin XP</p>
              <p className="text-xl font-bold">{userPeriodXp.toLocaleString()}</p>
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
            className={`border ${getPositionStyle(index + 1)} ${entry.isCurrentUser ? 'ring-2 ring-primary' : ''}`}
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
                {entry.isBot && (
                  <p className="text-xs text-muted-foreground">Bot</p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-bold">{entry.xp.toLocaleString()} XP</span>
                {getPositionIcon(index + 1)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* All Leagues */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Tüm Ligler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {LEAGUES.map((league, index) => (
              <div 
                key={league.id}
                className={`p-3 rounded-lg bg-gradient-to-r ${league.color} text-white text-sm ${
                  league.id === userLeague.id ? 'ring-2 ring-white' : 'opacity-70'
                }`}
              >
                <div className="font-medium">{league.name}</div>
                <div className="text-xs opacity-80">
                  {league.minXp.toLocaleString()} - {league.maxXp.toLocaleString()} XP/gün
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;

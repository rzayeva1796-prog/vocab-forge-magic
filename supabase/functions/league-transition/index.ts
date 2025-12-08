import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LEAGUES = [
  { id: 'bronze', order: 0, minXp: 3000, maxXp: 6000 },
  { id: 'silver', order: 1, minXp: 6000, maxXp: 12000 },
  { id: 'gold', order: 2, minXp: 12000, maxXp: 18000 },
  { id: 'platinum', order: 3, minXp: 18000, maxXp: 24000 },
  { id: 'emerald', order: 4, minXp: 24000, maxXp: 30000 },
  { id: 'diamond', order: 5, minXp: 30000, maxXp: 36000 },
  { id: 'sapphire', order: 6, minXp: 36000, maxXp: 42000 },
  { id: 'ruby', order: 7, minXp: 42000, maxXp: 48000 },
  { id: 'obsidian', order: 8, minXp: 48000, maxXp: 54000 },
  { id: 'titan', order: 9, minXp: 54000, maxXp: 60000 },
];

const BOT_NAMES_MALE = [
  "Ahmet", "Mehmet", "Mustafa", "Ali", "Hüseyin", "Hasan", "Emre", "Can", "Burak", "Kaan",
  "Berk", "Emir", "Yusuf", "Ömer", "Mert", "Arda", "Kerem", "Barış", "Cem", "Doruk"
];

const BOT_NAMES_FEMALE = [
  "Ayşe", "Fatma", "Zeynep", "Elif", "Ece", "Selin", "Ceren", "Dilara", "İrem", "Defne",
  "Ada", "Derin", "Asya", "Ela", "Lina", "Mira", "Nisa", "Pelin", "Sude", "Tuana"
];

// Get the current 3-day period start time in UTC+4
function getGlobalPeriodStart(): Date {
  const now = new Date();
  const utc4Offset = 4 * 60 * 60 * 1000;
  const nowUtc4 = new Date(now.getTime() + utc4Offset);
  nowUtc4.setUTCHours(0, 0, 0, 0);
  
  const referenceDate = new Date('2024-01-01T00:00:00+04:00');
  const daysSinceReference = Math.floor((nowUtc4.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
  const periodNumber = Math.floor(daysSinceReference / 3);
  const periodStartDays = periodNumber * 3;
  
  const periodStart = new Date(referenceDate.getTime() + periodStartDays * 24 * 60 * 60 * 1000);
  return new Date(periodStart.getTime() - utc4Offset);
}

// Calculate bot XP based on elapsed hours
function calculateBotXp(dailyXpRate: number, hoursElapsed: number, seed: number): number {
  const hourlyRate = dailyXpRate / 24;
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index * 1000) * 10000;
    return x - Math.floor(x);
  };
  
  let totalXp = 0;
  for (let h = 0; h < hoursElapsed; h++) {
    const variation = 1 + (seededRandom(h) * 0.4 - 0.2);
    totalXp += hourlyRate * variation;
  }
  
  return Math.floor(totalXp);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting league transition check...');

    const periodStart = getGlobalPeriodStart();
    const now = new Date();
    const hoursElapsed = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60));
    
    console.log(`Period start: ${periodStart.toISOString()}, Hours elapsed: ${hoursElapsed}`);

    // Check if we're at or past the 72-hour mark (period ended)
    const periodEnded = hoursElapsed >= 72;
    
    // Get all admin user IDs to exclude them
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    const adminUserIds = new Set((adminRoles || []).map((r: any) => r.user_id));

    // Get all users and bots
    const { data: allUsers } = await supabase
      .from('user_leagues')
      .select('user_id, current_league, period_xp, period_start_date');
    
    const { data: allBots } = await supabase
      .from('leaderboard_bots')
      .select('*');

    // Filter out admin users
    const nonAdminUsers = (allUsers || []).filter((u: any) => !adminUserIds.has(u.user_id));

    // Process each league
    for (const league of LEAGUES) {
      console.log(`Processing league: ${league.id}`);
      
      // Get users in this league
      const usersInLeague = nonAdminUsers.filter((u: any) => u.current_league === league.id);
      
      // Get bots in this league
      const botsInLeague = (allBots || []).filter((b: any) => b.current_league === league.id);
      
      // Calculate bot XP for sorting
      const botsWithXp = botsInLeague.map((bot: any) => ({
        ...bot,
        xp: calculateBotXp(bot.daily_xp_rate, Math.min(72, hoursElapsed), bot.id.charCodeAt(0) + bot.id.charCodeAt(1)),
        isBot: true
      }));
      
      // Combine users and bots
      const allParticipants = [
        ...usersInLeague.map((u: any) => ({ ...u, xp: u.period_xp || 0, isBot: false })),
        ...botsWithXp
      ];
      
      // Sort by XP descending
      allParticipants.sort((a: any, b: any) => b.xp - a.xp);
      
      const currentCount = allParticipants.length;
      console.log(`League ${league.id}: ${usersInLeague.length} users, ${botsInLeague.length} bots, total: ${currentCount}`);

      // Ensure exactly 12 participants
      if (currentCount < 12) {
        // Add bots to reach 12
        const botsToAdd = 12 - currentCount;
        console.log(`Adding ${botsToAdd} bots to ${league.id}`);
        
        for (let i = 0; i < botsToAdd; i++) {
          const isMale = Math.random() > 0.5;
          const names = isMale ? BOT_NAMES_MALE : BOT_NAMES_FEMALE;
          const name = names[Math.floor(Math.random() * names.length)];
          const avatarNum = Math.floor(Math.random() * 99) + 1;
          const avatarUrl = `https://randomuser.me/api/portraits/${isMale ? 'men' : 'women'}/${avatarNum}.jpg`;
          const dailyXpRate = league.minXp + Math.floor(Math.random() * (league.maxXp - league.minXp));
          
          await supabase.from('leaderboard_bots').insert({
            name,
            avatar_url: avatarUrl,
            current_league: league.id,
            daily_xp_rate: dailyXpRate,
            is_male: isMale,
            period_xp: 0
          });
        }
      } else if (currentCount > 12) {
        // Remove excess bots (never remove users)
        const excessCount = currentCount - 12;
        const botsToRemove = botsInLeague.slice(0, excessCount);
        console.log(`Removing ${excessCount} excess bots from ${league.id}`);
        
        for (const bot of botsToRemove) {
          await supabase.from('leaderboard_bots').delete().eq('id', bot.id);
        }
      }

      // If period ended, process league transitions
      if (periodEnded) {
        console.log(`Period ended, processing transitions for ${league.id}`);
        
        // Re-fetch participants after adding/removing bots
        const { data: updatedBots } = await supabase
          .from('leaderboard_bots')
          .select('*')
          .eq('current_league', league.id);
        
        const updatedBotsWithXp = (updatedBots || []).map((bot: any) => ({
          ...bot,
          xp: calculateBotXp(bot.daily_xp_rate, 72, bot.id.charCodeAt(0) + bot.id.charCodeAt(1)),
          isBot: true
        }));
        
        const participants = [
          ...usersInLeague.map((u: any) => ({ ...u, xp: u.period_xp || 0, isBot: false })),
          ...updatedBotsWithXp
        ];
        
        participants.sort((a: any, b: any) => b.xp - a.xp);
        
        // Process each participant based on position
        for (let i = 0; i < participants.length; i++) {
          const participant = participants[i];
          const position = i + 1;
          
          let newLeague = league.id;
          
          // Top 4 promote (unless Titan)
          if (position <= 4 && league.id !== 'titan') {
            const nextLeague = LEAGUES.find(l => l.order === league.order + 1);
            if (nextLeague) newLeague = nextLeague.id;
          }
          // Bottom 4 demote (unless Bronze)
          else if (position > participants.length - 4 && league.id !== 'bronze') {
            const prevLeague = LEAGUES.find(l => l.order === league.order - 1);
            if (prevLeague) newLeague = prevLeague.id;
          }
          
          if (participant.isBot) {
            // Update bot league and reset XP
            const newDailyXpRate = (() => {
              const targetLeague = LEAGUES.find(l => l.id === newLeague);
              if (targetLeague) {
                return targetLeague.minXp + Math.floor(Math.random() * (targetLeague.maxXp - targetLeague.minXp));
              }
              return participant.daily_xp_rate;
            })();
            
            await supabase
              .from('leaderboard_bots')
              .update({ 
                current_league: newLeague, 
                period_xp: 0,
                daily_xp_rate: newDailyXpRate
              })
              .eq('id', participant.id);
          } else {
            // Update user league and reset XP
            await supabase
              .from('user_leagues')
              .update({ 
                current_league: newLeague, 
                period_xp: 0,
                period_start_date: new Date().toISOString()
              })
              .eq('user_id', participant.user_id);
            
            // Also reset profile XP
            await supabase
              .from('profiles')
              .update({
                tetris_xp: 0,
                kart_xp: 0,
                eslestirme_xp: 0,
                kitap_xp: 0
              })
              .eq('user_id', participant.user_id);
          }
        }
      }
    }

    console.log('League transition check completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        periodEnded,
        hoursElapsed,
        message: periodEnded ? 'League transitions processed' : 'No transitions needed yet'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in league-transition:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
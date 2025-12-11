import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[Reset Daily XP] Starting reset process...');

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all profiles with their daily XP
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, tetris_xp, kart_xp, eslestirme_xp, kitap_xp');

    if (profilesError) {
      console.error('[Reset Daily XP] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`[Reset Daily XP] Fetched ${allProfiles?.length || 0} profiles`);

    let updatedUsers = 0;

    if (allProfiles && allProfiles.length > 0) {
      // For each user, add their daily XP to period_xp
      for (const p of allProfiles) {
        const dailyTotal = (p.tetris_xp || 0) + (p.kart_xp || 0) + (p.eslestirme_xp || 0) + (p.kitap_xp || 0);
        console.log(`[Reset Daily XP] User ${p.user_id} daily total: ${dailyTotal}`);

        if (dailyTotal > 0) {
          // Get current period_xp
          const { data: leagueData, error: leagueError } = await supabase
            .from('user_leagues')
            .select('period_xp')
            .eq('user_id', p.user_id)
            .maybeSingle();

          if (leagueError) {
            console.error(`[Reset Daily XP] Error fetching league for user ${p.user_id}:`, leagueError);
            continue;
          }

          if (leagueData) {
            const newPeriodXp = (leagueData.period_xp || 0) + dailyTotal;
            console.log(`[Reset Daily XP] Updating period_xp from ${leagueData.period_xp} to ${newPeriodXp} for user ${p.user_id}`);

            const { error: updateError } = await supabase
              .from('user_leagues')
              .update({ period_xp: newPeriodXp })
              .eq('user_id', p.user_id);

            if (updateError) {
              console.error(`[Reset Daily XP] Error updating period_xp:`, updateError);
            } else {
              updatedUsers++;
              console.log(`[Reset Daily XP] Successfully updated period_xp for user ${p.user_id}`);
            }
          } else {
            // User doesn't have a league entry yet, create one
            console.log(`[Reset Daily XP] Creating league entry for user ${p.user_id}`);
            const { error: insertError } = await supabase
              .from('user_leagues')
              .insert({ user_id: p.user_id, period_xp: dailyTotal, current_league: 'bronze' });
            
            if (!insertError) {
              updatedUsers++;
            }
          }
        }
      }
    }

    // Reset global settings
    const now = new Date();
    await supabase
      .from('global_settings')
      .update({ daily_period_start: now.toISOString() })
      .eq('id', 'main');

    // Reset all users' daily XP
    const { error: resetError } = await supabase
      .from('profiles')
      .update({
        tetris_xp: 0,
        kart_xp: 0,
        eslestirme_xp: 0,
        kitap_xp: 0
      })
      .not('id', 'is', null);

    if (resetError) {
      console.error('[Reset Daily XP] Error resetting profiles XP:', resetError);
    } else {
      console.log('[Reset Daily XP] Successfully reset all profiles XP to 0');
    }

    console.log(`[Reset Daily XP] Completed. Updated ${updatedUsers} users' period_xp`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        updatedUsers,
        message: `Reset complete. ${updatedUsers} users' XP transferred to leaderboard.`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Reset Daily XP] Error:', errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

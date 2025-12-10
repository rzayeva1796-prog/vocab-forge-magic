import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDailyLogin = () => {
  const { user } = useAuth();

  const checkAndUpdateDailyLogin = useCallback(async () => {
    if (!user) return null;

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('login_streak, last_login_date, tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return null;

      // Get global settings to check the current 24h period
      const { data: globalSettings } = await supabase
        .from('global_settings')
        .select('daily_period_start')
        .eq('id', 'main')
        .single();

      if (!globalSettings) return null;

      const dailyPeriodStart = new Date(globalSettings.daily_period_start);
      const now = new Date();
      
      // Calculate total daily XP
      const totalDailyXp = (profile.tetris_xp || 0) + (profile.kart_xp || 0) + 
                          (profile.eslestirme_xp || 0) + (profile.kitap_xp || 0);

      const lastLoginDate = profile.last_login_date 
        ? new Date(profile.last_login_date) 
        : null;

      // Check how many 24h periods have passed since last login
      let periodsMissed = 0;
      if (lastLoginDate) {
        const msSinceLastLogin = dailyPeriodStart.getTime() - lastLoginDate.getTime();
        periodsMissed = Math.floor(msSinceLastLogin / (24 * 60 * 60 * 1000));
      }

      let newStreak = profile.login_streak || 0;
      let isNewDay = false;

      // User has daily XP > 0 in current period = they're active today
      if (totalDailyXp > 0) {
        // Check if last_login_date is already in the current 24h period
        const lastLoginInCurrentPeriod = lastLoginDate && 
          lastLoginDate.getTime() >= dailyPeriodStart.getTime();
        
        if (!lastLoginInCurrentPeriod) {
          // First activity in this 24h period - increment streak ONLY ONCE
          isNewDay = true;
          
          if (periodsMissed >= 2) {
            // Missed 2+ periods, reset streak to 1
            newStreak = 1;
          } else {
            // Consecutive period or first login ever - increment by 1
            newStreak = (profile.login_streak || 0) + 1;
          }
          
          // Update profile with new streak and login date (marks this period as "done")
          await supabase
            .from('profiles')
            .update({
              login_streak: newStreak,
              last_login_date: now.toISOString().split('T')[0],
              last_activity_at: now.toISOString()
            })
            .eq('user_id', user.id);
        }
        // If lastLoginInCurrentPeriod is true, user already got their +1 for this period
      }

      return { streak: newStreak, isNewDay };
    } catch (error) {
      console.error('Error updating daily login:', error);
      return null;
    }
  }, [user]);

  // Check for streak reset (called when 24h period ends)
  const checkStreakReset = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('login_streak, last_login_date, tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const { data: globalSettings } = await supabase
        .from('global_settings')
        .select('daily_period_start')
        .eq('id', 'main')
        .single();

      if (!globalSettings) return;

      const dailyPeriodStart = new Date(globalSettings.daily_period_start);
      const lastLoginDate = profile.last_login_date 
        ? new Date(profile.last_login_date) 
        : null;

      // Calculate how many 24h periods have passed
      if (lastLoginDate) {
        const msSinceLastLogin = dailyPeriodStart.getTime() - lastLoginDate.getTime();
        const periodsMissed = Math.floor(msSinceLastLogin / (24 * 60 * 60 * 1000));

        // If 2+ periods missed, reset streak
        if (periodsMissed >= 2) {
          await supabase
            .from('profiles')
            .update({ login_streak: 0 })
            .eq('user_id', user.id);
        }
      }
    } catch (error) {
      console.error('Error checking streak reset:', error);
    }
  }, [user]);

  return { checkAndUpdateDailyLogin, checkStreakReset };
};

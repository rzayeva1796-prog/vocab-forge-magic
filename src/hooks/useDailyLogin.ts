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
        .select('login_streak, last_login_date, last_activity_at, tetris_xp, kart_xp, eslestirme_xp, kitap_xp')
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

      // Check if user was already active in THIS current 24h period
      // We use last_activity_at timestamp for precise comparison
      const lastActivityAt = profile.last_activity_at 
        ? new Date(profile.last_activity_at) 
        : null;

      // User already got their +1 for this period if:
      // their last_activity_at is after the current period started
      const alreadyCountedThisPeriod = lastActivityAt && 
        lastActivityAt.getTime() >= dailyPeriodStart.getTime();

      // If already counted, just return current streak without updating
      if (alreadyCountedThisPeriod) {
        return { streak: profile.login_streak || 0, isNewDay: false };
      }

      // User has NOT been counted in this period yet
      // Check if they earned any XP today (are they active?)
      if (totalDailyXp > 0) {
        // Calculate periods missed since last activity
        let periodsMissed = 0;
        if (lastActivityAt) {
          const msSinceLastActivity = dailyPeriodStart.getTime() - lastActivityAt.getTime();
          periodsMissed = Math.floor(msSinceLastActivity / (24 * 60 * 60 * 1000));
        }

        let newStreak: number;
        
        if (periodsMissed >= 2) {
          // Missed 2+ periods, reset streak to 1
          newStreak = 1;
        } else if (!lastActivityAt) {
          // First login ever
          newStreak = 1;
        } else {
          // Consecutive period - increment by 1
          newStreak = (profile.login_streak || 0) + 1;
        }
        
        // Update profile - this marks current period as "done"
        await supabase
          .from('profiles')
          .update({
            login_streak: newStreak,
            last_login_date: now.toISOString().split('T')[0],
            last_activity_at: now.toISOString()
          })
          .eq('user_id', user.id);

        return { streak: newStreak, isNewDay: true };
      }

      // No XP earned yet today, don't increment streak
      return { streak: profile.login_streak || 0, isNewDay: false };
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
        .select('login_streak, last_activity_at')
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
      const lastActivityAt = profile.last_activity_at 
        ? new Date(profile.last_activity_at) 
        : null;

      // Calculate how many 24h periods have passed
      if (lastActivityAt) {
        const msSinceLastActivity = dailyPeriodStart.getTime() - lastActivityAt.getTime();
        const periodsMissed = Math.floor(msSinceLastActivity / (24 * 60 * 60 * 1000));

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

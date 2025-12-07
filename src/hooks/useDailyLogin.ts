import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDailyLogin = () => {
  const { user } = useAuth();

  const checkAndUpdateDailyLogin = useCallback(async () => {
    if (!user) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('login_streak, last_login_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastLogin = profile.last_login_date 
        ? new Date(profile.last_login_date) 
        : null;
      
      if (lastLogin) {
        lastLogin.setHours(0, 0, 0, 0);
      }

      // Calculate days difference
      let daysDiff = 0;
      if (lastLogin) {
        daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      }

      let newStreak = profile.login_streak || 0;

      if (daysDiff === 0) {
        // Already logged in today, no change needed
        return { streak: newStreak, isNewDay: false };
      } else if (daysDiff === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else if (daysDiff >= 2) {
        // Missed 2 or more days, reset streak
        newStreak = 1;
      } else {
        // First login ever
        newStreak = 1;
      }

      // Update profile with new streak and login date
      await supabase
        .from('profiles')
        .update({
          login_streak: newStreak,
          last_login_date: today.toISOString().split('T')[0],
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      return { streak: newStreak, isNewDay: daysDiff > 0 };
    } catch (error) {
      console.error('Error updating daily login:', error);
      return null;
    }
  }, [user]);

  return { checkAndUpdateDailyLogin };
};

import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const NOTIFICATION_SOUND_KEY = 'notification_sound';
const NOTIFICATION_ENABLED_KEY = 'notifications_enabled';

// UTC+4 timezone check (10:00 - 22:00)
const isWithinNotificationHours = () => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utc4Hours = (utcHours + 4) % 24;
  return utc4Hours >= 10 && utc4Hours < 22;
};

export const useNotifications = () => {
  const { user } = useAuth();

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const saveNotificationPreference = async (enabled: boolean) => {
    localStorage.setItem(NOTIFICATION_ENABLED_KEY, JSON.stringify(enabled));
    
    // Also save to database
    if (user) {
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('notification_settings')
          .update({ push_enabled: enabled })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('notification_settings')
          .insert({ user_id: user.id, push_enabled: enabled });
      }
    }
  };

  const getNotificationPreference = () => {
    const stored = localStorage.getItem(NOTIFICATION_ENABLED_KEY);
    return stored ? JSON.parse(stored) : false;
  };

  const saveNotificationSound = (soundUrl: string) => {
    localStorage.setItem(NOTIFICATION_SOUND_KEY, soundUrl);
  };

  const getNotificationSound = () => {
    return localStorage.getItem(NOTIFICATION_SOUND_KEY) || '/notification.mp3';
  };

  const playNotificationSound = () => {
    const soundUrl = getNotificationSound();
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      audio.play().catch(err => console.log('Could not play notification sound:', err));
    } catch (err) {
      console.log('Error playing sound:', err);
    }
  };

  const sendNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if (!isWithinNotificationHours()) {
      console.log('Outside notification hours (UTC+4 10:00-22:00)');
      return;
    }

    if (!getNotificationPreference()) {
      console.log('Notifications disabled by user');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      playNotificationSound();

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, []);

  const updateLastActivity = async () => {
    if (!user) return;

    try {
      await supabase
        .from('profiles')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  };

  // Poll for pending notifications from the database
  const checkPendingNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data: notifications, error } = await supabase
        .from('pending_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending notifications:', error);
        return;
      }

      if (notifications && notifications.length > 0) {
        // Show each notification
        for (const notif of notifications) {
          sendNotification(notif.title, notif.body);
          
          // Mark as read
          await supabase
            .from('pending_notifications')
            .update({ read: true })
            .eq('id', notif.id);
        }
      }
    } catch (error) {
      console.error('Error checking pending notifications:', error);
    }
  }, [user, sendNotification]);

  // Poll for pending notifications every 10 seconds
  useEffect(() => {
    if (!user || !getNotificationPreference()) return;
    
    // Check immediately
    checkPendingNotifications();
    
    // Then poll every 10 seconds
    const interval = setInterval(checkPendingNotifications, 10000);
    
    return () => clearInterval(interval);
  }, [user, checkPendingNotifications]);

  const checkInactivityNotification = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_activity_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.last_activity_at) {
        const lastActivity = new Date(profile.last_activity_at);
        const now = new Date();
        const hoursDiff = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

        if (hoursDiff >= 3) {
          sendNotification(
            'Seni özledik! 🎮',
            '3 saattir oyuna girmedin. Gel XP kazan!'
          );
        }
      }
    } catch (error) {
      console.error('Error checking inactivity:', error);
    }
  }, [user, sendNotification]);

  const checkDailyLoginNotification = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_login_date, login_streak')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.last_login_date) {
        const lastLogin = new Date(profile.last_login_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        lastLogin.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 1) {
          sendNotification(
            'Günlük giriş! 🔥',
            `${profile.login_streak || 0} günlük serin var. Bugün giriş yaparak serisini koru!`
          );
        }
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  }, [user, sendNotification]);

  const notifyLeaderboardChange = useCallback((passerName: string) => {
    sendNotification(
      'Sıralaman değişti! 📊',
      `${passerName} seni geçti! Gel XP kazan ve sıralamana geri dön!`
    );
  }, [sendNotification]);

  return {
    requestPermission,
    sendNotification,
    updateLastActivity,
    checkInactivityNotification,
    checkDailyLoginNotification,
    notifyLeaderboardChange,
    saveNotificationPreference,
    getNotificationPreference,
    saveNotificationSound,
    getNotificationSound,
    playNotificationSound,
    checkPendingNotifications
  };
};

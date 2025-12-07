import { useEffect, useState, useCallback } from 'react';

const LAST_ACTIVITY_KEY = 'last_activity_timestamp';
const LAST_LOGIN_DATE_KEY = 'last_login_date';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export const useServiceWorker = () => {
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[App] Service Worker registered:', registration);
          setSwRegistration(registration);
          
          // Cache notification sound
          if (registration.active) {
            registration.active.postMessage({ type: 'CACHE_SOUND' });
          }
        })
        .catch((error) => {
          console.error('[App] Service Worker registration failed:', error);
        });
    }
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  }, []);

  // Update last login date
  const updateLastLoginDate = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem(LAST_LOGIN_DATE_KEY, today);
  }, []);

  // Check if within notification hours (UTC+4 10:00-22:00)
  const isWithinNotificationHours = useCallback(() => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utc4Hours = (utcHours + 4) % 24;
    return utc4Hours >= 10 && utc4Hours < 22;
  }, []);

  // Check inactivity (3 hours)
  const checkInactivity = useCallback(() => {
    const enabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true';
    if (!enabled || !isWithinNotificationHours()) return false;

    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (!lastActivity) return false;

    const hoursSinceActivity = (Date.now() - parseInt(lastActivity)) / (1000 * 60 * 60);
    return hoursSinceActivity >= 3;
  }, [isWithinNotificationHours]);

  // Check daily login
  const checkDailyLogin = useCallback(() => {
    const enabled = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true';
    if (!enabled || !isWithinNotificationHours()) return false;

    const lastLoginDate = localStorage.getItem(LAST_LOGIN_DATE_KEY);
    if (!lastLoginDate) return true; // Never logged in

    const today = new Date().toISOString().split('T')[0];
    return lastLoginDate !== today;
  }, [isWithinNotificationHours]);

  // Show local notification via service worker
  const showLocalNotification = useCallback((title: string, body: string, tag?: string) => {
    if (!swRegistration?.active) {
      console.log('[App] No active service worker');
      return;
    }

    swRegistration.active.postMessage({
      type: 'SHOW_LOCAL_NOTIFICATION',
      title,
      body,
      tag
    });
  }, [swRegistration]);

  // Check and show pending local notifications
  const checkPendingLocalNotifications = useCallback(() => {
    if (checkInactivity()) {
      showLocalNotification(
        'Seni özledik! 🎮',
        '3 saattir oyuna girmedin. Gel XP kazan!',
        'inactivity'
      );
    }

    if (checkDailyLogin()) {
      const streak = localStorage.getItem('login_streak') || '0';
      showLocalNotification(
        'Günlük giriş! 🔥',
        `${streak} günlük serin var. Bugün giriş yaparak serisini koru!`,
        'daily-login'
      );
    }

    // Update timestamps after checking
    updateLastActivity();
    updateLastLoginDate();
  }, [checkInactivity, checkDailyLogin, showLocalNotification, updateLastActivity, updateLastLoginDate]);

  return {
    swRegistration,
    isSupported,
    updateLastActivity,
    updateLastLoginDate,
    checkPendingLocalNotifications,
    showLocalNotification,
    isWithinNotificationHours
  };
};

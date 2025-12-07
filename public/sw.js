// Service Worker for Push Notifications and Background Sync
const CACHE_NAME = 'vocab-notifications-v2';
const NOTIFICATION_SOUND = '/notification.mp3';

// IndexedDB for offline data storage
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vocab-notifications-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
  });
}

async function getFromDB(key) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => resolve(null);
    });
  } catch (e) {
    console.log('[SW] IndexedDB error:', e);
    return null;
  }
}

async function setInDB(key, value) {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      store.put({ key, value });
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (e) {
    console.log('[SW] IndexedDB error:', e);
    return false;
  }
}

// Install event - cache notification sound
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching notification sound');
      return cache.add(NOTIFICATION_SOUND);
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activated');
  event.waitUntil(self.clients.claim());
});

// Check if within notification hours (UTC+4 10:00-22:00)
function isWithinNotificationHours() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utc4Hours = (utcHours + 4) % 24;
  return utc4Hours >= 10 && utc4Hours < 22;
}

// Show notification
async function showNotification(title, body, tag, data = {}) {
  if (!isWithinNotificationHours()) {
    console.log('[SW] Outside notification hours');
    return;
  }

  const options = {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: tag || 'vocab-notification',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    renotify: true,
    data: {
      url: self.location.origin,
      ...data
    }
  };

  try {
    await self.registration.showNotification(title, options);
    console.log('[SW] Notification shown:', title);
  } catch (error) {
    console.error('[SW] Error showing notification:', error);
  }
}

// Check inactivity and show notification
async function checkInactivityAndNotify() {
  const enabled = await getFromDB('notifications_enabled');
  if (!enabled) return;

  const lastActivity = await getFromDB('last_activity_timestamp');
  if (!lastActivity) return;

  const hoursSinceActivity = (Date.now() - lastActivity) / (1000 * 60 * 60);
  
  if (hoursSinceActivity >= 3) {
    await showNotification(
      'Oyuna Geri Dön! 🎮',
      '3 saattir oynamadın, kelimelerini unutma!',
      'inactivity'
    );
    // Reset timer after notification
    await setInDB('last_activity_timestamp', Date.now());
  }
}

// Check daily login and show notification
async function checkDailyLoginAndNotify() {
  const enabled = await getFromDB('notifications_enabled');
  if (!enabled) return;

  const lastLoginDate = await getFromDB('last_login_date');
  const today = new Date().toISOString().split('T')[0];
  
  if (lastLoginDate !== today) {
    const streak = await getFromDB('login_streak') || '0';
    await showNotification(
      'Seriyi Kaybetme! 🔥',
      `${streak} günlük serin var. Bugün giriş yap, seriyi koru!`,
      'daily-login'
    );
  }
}

// Handle push events (for remote notifications like leaderboard changes)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = {
    title: 'Bildirim',
    body: 'Yeni bir bildiriminiz var!'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    showNotification(data.title, data.body, data.tag, data)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Background Sync for periodic checks
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic sync:', event.tag);
  
  if (event.tag === 'check-inactivity') {
    event.waitUntil(checkInactivityAndNotify());
  } else if (event.tag === 'check-daily-login') {
    event.waitUntil(checkDailyLoginAndNotify());
  }
});

// Regular sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'check-notifications') {
    event.waitUntil(
      Promise.all([
        checkInactivityAndNotify(),
        checkDailyLoginAndNotify()
      ])
    );
  }
});

// Handle messages from main thread
self.addEventListener('message', async (event) => {
  console.log('[SW] Message received:', event.data.type);
  
  const { type } = event.data;

  if (type === 'CACHE_SOUND') {
    const cache = await caches.open(CACHE_NAME);
    await cache.add(NOTIFICATION_SOUND);
    console.log('[SW] Sound cached');
  }

  if (type === 'SHOW_LOCAL_NOTIFICATION') {
    const { title, body, tag } = event.data;
    await showNotification(title, body, tag);
  }

  if (type === 'TEST_NOTIFICATION') {
    const { title, body, delay } = event.data;
    if (delay) {
      setTimeout(async () => {
        await showNotification(title, body, 'test-notification');
      }, delay);
    } else {
      await showNotification(title, body, 'test-notification');
    }
  }

  if (type === 'UPDATE_ACTIVITY') {
    await setInDB('last_activity_timestamp', Date.now());
    console.log('[SW] Activity updated in IndexedDB');
  }

  if (type === 'UPDATE_LOGIN_DATE') {
    const today = new Date().toISOString().split('T')[0];
    await setInDB('last_login_date', today);
    console.log('[SW] Login date updated in IndexedDB');
  }

  if (type === 'UPDATE_SETTINGS') {
    const { enabled, streak } = event.data;
    await setInDB('notifications_enabled', enabled);
    if (streak !== undefined) {
      await setInDB('login_streak', streak);
    }
    console.log('[SW] Settings updated in IndexedDB');
  }

  if (type === 'REGISTER_PERIODIC_SYNC') {
    if ('periodicSync' in self.registration) {
      try {
        await self.registration.periodicSync.register('check-inactivity', {
          minInterval: 60 * 60 * 1000
        });
        await self.registration.periodicSync.register('check-daily-login', {
          minInterval: 60 * 60 * 1000
        });
        console.log('[SW] Periodic sync registered');
      } catch (error) {
        console.log('[SW] Periodic sync not supported:', error);
      }
    }
  }

  if (type === 'CHECK_NOW') {
    await Promise.all([
      checkInactivityAndNotify(),
      checkDailyLoginAndNotify()
    ]);
  }
});

// Periodic check using setInterval as fallback
let checkInterval = null;

function startPeriodicCheck() {
  if (checkInterval) return;
  
  checkInterval = setInterval(async () => {
    console.log('[SW] Periodic check running...');
    await checkInactivityAndNotify();
    await checkDailyLoginAndNotify();
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('[SW] Periodic check started');
}

startPeriodicCheck();

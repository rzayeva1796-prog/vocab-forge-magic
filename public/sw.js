// Service Worker for Push Notifications and Offline Support

const CACHE_NAME = 'vocab-notifications-v1';
const NOTIFICATION_SOUND_URL = '/notification.mp3';

// Cache notification sound on install
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching notification sound');
      return cache.add(NOTIFICATION_SOUND_URL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(self.clients.claim());
});

// Check if within notification hours (UTC+4 10:00-22:00)
function isWithinNotificationHours() {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utc4Hours = (utcHours + 4) % 24;
  return utc4Hours >= 10 && utc4Hours < 22;
}

// Handle push notifications from server (for leaderboard changes)
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  if (!isWithinNotificationHours()) {
    console.log('[SW] Outside notification hours, skipping');
    return;
  }

  let data = {
    title: 'Vocab Game',
    body: 'Yeni bir bildiriminiz var!',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    tag: data.tag || 'vocab-notification',
    renotify: true,
    data: {
      url: data.url || '/',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if not
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Periodic sync for checking inactivity (when supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-inactivity') {
    event.waitUntil(checkInactivityAndNotify());
  }
});

async function checkInactivityAndNotify() {
  if (!isWithinNotificationHours()) return;

  // Get stored data from IndexedDB or use message to main thread
  const clients = await self.clients.matchAll();
  if (clients.length > 0) {
    // App is open, don't send inactivity notification
    return;
  }

  // Request last activity check from any available client
  // This is a fallback - main logic is in the app
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'CACHE_SOUND') {
    caches.open(CACHE_NAME).then((cache) => {
      cache.add(NOTIFICATION_SOUND_URL);
    });
  }
  
  if (event.data.type === 'SHOW_LOCAL_NOTIFICATION') {
    if (!isWithinNotificationHours()) return;
    
    const { title, body, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: tag || 'local-notification',
      renotify: true
    });
  }
});

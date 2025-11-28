// Service Worker for Web Push Notifications

const CACHE_NAME = 'leadsflow-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  let notificationData = {
    title: 'LeadsFlow',
    body: 'You have a new notification.',
    icon: '/logo.png',
    badge: '/logo.png',
    data: {},
    tag: `notification-${Date.now()}`,
  };

  // Parse push data
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Parsed push data:', data);

      // Backend sends: { title, body, data: { url: "..." } }
      // Extract notification data properly
      notificationData = {
        title: data.title || data.notification?.title || notificationData.title,
        body: data.body || data.message || data.notification?.body || notificationData.body,
        icon: data.icon || data.notification?.icon || notificationData.icon,
        badge: data.badge || data.notification?.badge || notificationData.badge,
        // Preserve the data object which contains url and other metadata
        data: data.data || {},
        tag: data.tag || data.data?.leadId || `notification-${Date.now()}`,
        requireInteraction: data.requireInteraction || false,
        silent: data.silent || false,
      };
      
      console.log('[SW] Notification data.url:', notificationData.data?.url);
    } catch (error) {
      // If JSON parsing fails, try to read as text
      try {
        const text = event.data.text();
        console.log('[SW] Push data as text:', text);
        notificationData.body = text || notificationData.body;
      } catch (textError) {
        console.error('[SW] Failed to parse push data:', textError);
      }
    }
  }

  console.log('[SW] Showing notification:', notificationData);

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      data: notificationData.data,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      silent: notificationData.silent,
      vibrate: [200, 100, 200],
      actions: notificationData.data?.actions || [],
    })
  );
});

// Notification click event - handle user clicking on notification
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event);
  console.log('[SW] Notification data:', event.notification.data);

  event.notification.close();

  // Get URL from notification data (backend sends absolute URL in data.url)
  // Fallback to root (/) which routes to Dashboard
  const targetUrl = event.notification.data?.url || '/';
  
  // If URL is relative, make it absolute using current origin
  let url = targetUrl;
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    // Relative URL - make it absolute
    url = new URL(targetUrl, self.location.origin).href;
  }

  console.log('[SW] Opening URL:', url);

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Normalize URLs for comparison
        const targetUrlObj = new URL(url);
        
        // Check if there's already a window/tab open with the same origin and path
        for (const client of windowClients) {
          try {
            const clientUrlObj = new URL(client.url);
            // Match if same origin and pathname
            if (
              clientUrlObj.origin === targetUrlObj.origin &&
              clientUrlObj.pathname === targetUrlObj.pathname &&
              'focus' in client
            ) {
              console.log('[SW] Focusing existing window:', client.url);
              return client.focus();
            }
          } catch (e) {
            console.warn('[SW] Error parsing client URL:', e);
          }
        }

        // If no matching window is open, open a new one
        console.log('[SW] Opening new window:', url);
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .catch((error) => {
        console.error('[SW] Error handling notification click:', error);
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed:', event.notification.tag);
});

// Message event - handle messages from main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});


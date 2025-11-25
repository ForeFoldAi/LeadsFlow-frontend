// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

// Initialize Firebase (will receive config from main app)
let firebaseInitialized = false;
let messaging = null;

// Listen for config from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const firebaseConfig = event.data.config;
    if (firebaseConfig && !firebaseInitialized) {
      try {
        firebase.initializeApp(firebaseConfig);
        messaging = firebase.messaging();
        firebaseInitialized = true;
        
        console.log('[firebase-messaging-sw.js] Firebase initialized in service worker');
        
        // Set background message handler
        messaging.onBackgroundMessage((payload) => {
          console.log('[firebase-messaging-sw.js] Received background message ', payload);
          
          const notificationTitle = payload.notification?.title || payload.data?.title || 'LeadsFlow';
          const notificationOptions = {
            body: payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new notification.',
            icon: payload.notification?.icon || '/logo.png',
            badge: payload.notification?.badge || '/logo.png',
            data: payload.data || {},
            tag: payload.data?.leadId || `notification-${Date.now()}`,
            renotify: false,
            requireInteraction: false,
            silent: false,
          };

          return self.registration.showNotification(notificationTitle, notificationOptions);
        });
      } catch (error) {
        console.error('[firebase-messaging-sw.js] Error initializing Firebase:', error);
      }
    }
  }
});

// Handle push events - Firebase will handle its own messages via onBackgroundMessage
// But we also handle raw push events as fallback
self.addEventListener("push", (event) => {
  console.log('[firebase-messaging-sw.js] Push event received', event);
  console.log('[firebase-messaging-sw.js] Firebase initialized:', firebaseInitialized);
  
  // Try to parse the payload - handle both JSON and plain text
  let payload;
  
  if (!event.data) {
    console.log('[firebase-messaging-sw.js] No data in push event');
    payload = {
      notification: { title: "LeadsFlow", body: "You have a new notification." },
      data: {},
    };
  } else {
    // Safely read the data - handle both text and JSON
    let dataText = '';
    let isJson = false;
    
    try {
      // Try to read as text first (this is safe and won't throw for plain text)
      if (event.data && typeof event.data.text === 'function') {
        dataText = event.data.text();
      } else if (event.data && event.data.toString) {
        dataText = event.data.toString();
      }
    } catch (error) {
      console.warn('[firebase-messaging-sw.js] Could not read data as text, trying alternative method:', error);
      // Try alternative method
      try {
        if (event.data && event.data.arrayBuffer) {
          // For binary data, we'll skip it
          dataText = '';
        }
      } catch (e) {
        console.warn('[firebase-messaging-sw.js] Could not read push data:', e);
      }
    }
    
    // Check if it looks like JSON (starts with { or [)
    if (dataText && (dataText.trim().startsWith('{') || dataText.trim().startsWith('['))) {
      try {
        payload = JSON.parse(dataText);
        isJson = true;
        console.log('[firebase-messaging-sw.js] Parsed JSON payload:', payload);
      } catch (error) {
        // Not valid JSON despite looking like it, treat as plain text
        console.log('[firebase-messaging-sw.js] Data looks like JSON but parse failed, treating as plain text');
        isJson = false;
      }
    }
    
    // If not JSON or parsing failed, treat as plain text
    if (!isJson) {
      console.log('[firebase-messaging-sw.js] Plain text message received:', dataText);
      payload = {
        notification: { title: "LeadsFlow", body: dataText || "You have a new notification." },
        data: {},
      };
    }
  }

  // Extract notification data
  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  const title = notification.title || payload.data?.title || "LeadsFlow";
  const body = notification.body || payload.data?.body || payload.data?.message || payload.message || "You have a new notification.";
  
  const options = {
    body,
    data: data,
    icon: notification.icon || "/logo.png",
    badge: notification.badge || "/logo.png",
    tag: data.leadId || `notification-${Date.now()}`,
    renotify: false,
    requireInteraction: false,
    silent: false,
  };

  console.log('[firebase-messaging-sw.js] Showing notification:', title, options);
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification.data?.url || "/leads";
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            if (client.url.includes(targetUrl)) {
              return client.focus();
            }
            return client.navigate(targetUrl);
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});



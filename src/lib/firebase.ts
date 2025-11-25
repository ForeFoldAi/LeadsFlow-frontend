import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
  type NextFn,
} from "firebase/messaging";

type ForegroundMessageHandler = NextFn<import("firebase/messaging").MessagePayload>;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigValid = Object.values(firebaseConfig).every((value) => Boolean(value));

let firebaseApp: FirebaseApp | null = null;
let messagingPromise: Promise<Messaging | null> | null = null;
let swRegistrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

function ensureFirebaseApp(): FirebaseApp | null {
  if (!isConfigValid) {
    console.warn("[Firebase] Missing configuration. Push notifications disabled.");
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export async function registerFirebaseServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    return null;
  }

  if (!isConfigValid) {
    return null;
  }

  if (!swRegistrationPromise) {
    swRegistrationPromise = navigator.serviceWorker
      .register("/firebase-messaging-sw.js", { scope: "/" })
      .then(async (registration) => {
        // Send Firebase config to service worker
        if (registration.active) {
          registration.active.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig,
          });
        } else if (registration.installing) {
          registration.installing.addEventListener('statechange', () => {
            if (registration.active) {
              registration.active.postMessage({
                type: 'FIREBASE_CONFIG',
                config: firebaseConfig,
              });
            }
          });
        } else if (registration.waiting) {
          registration.waiting.postMessage({
            type: 'FIREBASE_CONFIG',
            config: firebaseConfig,
          });
        }
        return registration;
      })
      .catch((error) => {
        console.error("[Firebase] Failed to register messaging service worker:", error);
        return null;
      });
  }

  return swRegistrationPromise;
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (!isConfigValid) {
    return null;
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn("[Firebase] Messaging not supported in this browser.");
      return null;
    }
  } catch (error) {
    console.error("[Firebase] Failed to determine messaging support:", error);
    return null;
  }

  const app = ensureFirebaseApp();
  if (!app) {
    return null;
  }

  if (!messagingPromise) {
    messagingPromise = Promise.resolve(getMessaging(app));
  }

  return messagingPromise;
}

export async function requestFirebaseToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  const registration = await registerFirebaseServiceWorker();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration ?? undefined,
    });
    return token ?? null;
  } catch (error) {
    console.error("[Firebase] Failed to retrieve messaging token:", error);
    throw error;
  }
}

export async function subscribeToForegroundMessages(
  handler: ForegroundMessageHandler,
): Promise<import("firebase/messaging").Unsubscribe | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  return onMessage(messaging, handler);
}

export function isFirebaseMessagingConfigured() {
  return isConfigValid;
}




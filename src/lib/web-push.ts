import axiosInstance from './apis/axios.config';

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  deviceInfo?: string; // Optional device type: 'mobile' or 'desktop'
}

export interface NotificationStatus {
  subscribed: boolean;
  subscription?: PushSubscription;
}

/**
 * Check if push notifications are supported in the current browser
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'serviceWorker' in navigator;
}

/**
 * Register service worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isServiceWorkerSupported()) {
    console.warn('[WebPush] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('[WebPush] Service worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('[WebPush] Failed to register service worker:', error);
    return null;
  }
}

/**
 * Get VAPID public key from backend
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = await axiosInstance.get<{ publicKey: string }>(
      '/notifications/vapid-public-key'
    );
    return response.data.publicKey;
  } catch (error) {
    console.error('[WebPush] Failed to get VAPID public key:', error);
    return null;
  }
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission was previously denied');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was denied');
  }

  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) {
    throw new Error('Push notifications are not supported in this browser');
  }

  // Request permission first
  await requestNotificationPermission();

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Failed to register service worker');
  }

  // Get VAPID public key
  const vapidPublicKey = await getVapidPublicKey();
  if (!vapidPublicKey) {
    throw new Error('Failed to get VAPID public key');
  }

  // Convert VAPID key to Uint8Array
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // Subscribe to push manager
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  // Detect device type
  const deviceInfo = getDeviceType();

  // Convert subscription to our format
  const pushSubscription: PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
      auth: arrayBufferToBase64(subscription.getKey('auth')!),
    },
    deviceInfo: deviceInfo,
  };

  return pushSubscription;
}

/**
 * Unsubscribe from push notifications
 * @param endpoint - Optional endpoint to unsubscribe. If not provided, unsubscribes current device.
 */
export async function unsubscribeFromPushNotifications(endpoint?: string): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // If endpoint is provided and doesn't match current subscription, 
      // we can't unsubscribe it from this device (it's on another device)
      if (endpoint && subscription.endpoint !== endpoint) {
        console.log('[WebPush] Endpoint mismatch - cannot unsubscribe different device from this browser');
        return false;
      }
      
      await subscription.unsubscribe();
      console.log('[WebPush] Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('[WebPush] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isServiceWorkerSupported()) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return null;
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    };
  } catch (error) {
    console.error('[WebPush] Failed to get current subscription:', error);
    return null;
  }
}

/**
 * Check if user has granted notification permission
 */
export function hasNotificationPermission(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

/**
 * Get notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Convert VAPID key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Detect device type based on user agent
 */
export function getDeviceType(): 'mobile' | 'desktop' {
  if (typeof navigator === 'undefined') {
    return 'desktop';
  }
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}


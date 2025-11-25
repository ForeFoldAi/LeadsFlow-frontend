import axiosInstance from './axios.config';
import type { PushSubscription } from '../web-push';

export interface SubscribeNotificationRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface SubscribeNotificationResponse {
  message: string;
  subscribed: boolean;
}

export interface UnsubscribeNotificationResponse {
  message: string;
  unsubscribed: boolean;
}

export interface TestNotificationResponse {
  message: string;
  sent: boolean;
}

export interface NotificationStatusResponse {
  subscribed: boolean;
  subscription?: PushSubscription;
}

export const notificationsService = {
  /**
   * Get VAPID public key (no auth required)
   * GET /notifications/vapid-public-key
   */
  getVapidPublicKey: async (): Promise<string> => {
    const response = await axiosInstance.get<{ publicKey: string }>(
      '/notifications/vapid-public-key'
    );
    return response.data.publicKey;
  },

  /**
   * Subscribe to push notifications
   * POST /notifications/subscribe
   */
  subscribe: async (subscription: PushSubscription): Promise<SubscribeNotificationResponse> => {
    const response = await axiosInstance.post<SubscribeNotificationResponse>(
      '/notifications/subscribe',
      subscription
    );
    return response.data;
  },

  /**
   * Unsubscribe from push notifications
   * DELETE /notifications/unsubscribe
   */
  unsubscribe: async (): Promise<UnsubscribeNotificationResponse> => {
    const response = await axiosInstance.delete<UnsubscribeNotificationResponse>(
      '/notifications/unsubscribe'
    );
    return response.data;
  },

  /**
   * Test push notification
   * POST /notifications/test
   */
  test: async (): Promise<TestNotificationResponse> => {
    const response = await axiosInstance.post<TestNotificationResponse>(
      '/notifications/test'
    );
    return response.data;
  },

  /**
   * Get notification status
   * GET /notifications/status
   */
  getStatus: async (): Promise<NotificationStatusResponse> => {
    const response = await axiosInstance.get<NotificationStatusResponse>(
      '/notifications/status'
    );
    return response.data;
  },
};

export default notificationsService;


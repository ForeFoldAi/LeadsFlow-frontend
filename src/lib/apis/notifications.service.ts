import axiosInstance from './axios.config';

export interface SubscribeNotificationRequest {
  token: string;
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

export const notificationsService = {
  /**
   * Subscribe to push notifications
   * POST /notifications/subscribe
   */
  subscribe: async (token: string): Promise<SubscribeNotificationResponse> => {
    const response = await axiosInstance.post<SubscribeNotificationResponse>(
      '/notifications/subscribe',
      { token }
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
};

export default notificationsService;


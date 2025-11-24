import axiosInstance from './axios.config';
import { AnalyticsQuery, AnalyticsResponse } from './types';

export const analyticsService = {
  /**
   * Get analytics data
   */
  getAnalytics: async (query?: AnalyticsQuery): Promise<AnalyticsResponse> => {
    const response = await axiosInstance.get<AnalyticsResponse>('/analytics', {
      params: query,
    });
    return response.data;
  },

  /**
   * Get analytics for last 7 days
   */
  getAnalyticsLast7Days: async (): Promise<AnalyticsResponse> => {
    return analyticsService.getAnalytics({ days: 7 });
  },

  /**
   * Get analytics for last 30 days
   */
  getAnalyticsLast30Days: async (): Promise<AnalyticsResponse> => {
    return analyticsService.getAnalytics({ days: 30 });
  },

  /**
   * Get analytics for last 90 days
   */
  getAnalyticsLast90Days: async (): Promise<AnalyticsResponse> => {
    return analyticsService.getAnalytics({ days: 90 });
  },
};

export default analyticsService;


import axiosInstance from './axios.config';
import {
  ProfilePreferencesResponse,
  NotificationSettingsResponse,
  SecuritySettingsResponse,
  UserPreferencesResponse,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  UpdateUserPreferencesDto,
  CreateSubUserDto,
  SubUserResponse,
  UpdateSubUserPermissionsDto,
  UserResponse,
} from './types';

export const profileService = {
  /**
   * Get all profile preferences (notifications, security, app preferences)
   */
  getProfilePreferences: async (): Promise<ProfilePreferencesResponse> => {
    const response = await axiosInstance.get<ProfilePreferencesResponse>(
      '/profile/preferences'
    );
    return response.data;
  },

  /**
   * Update notification settings
   */
  updateNotificationSettings: async (
    data: UpdateNotificationSettingsDto
  ): Promise<NotificationSettingsResponse> => {
    const response = await axiosInstance.put<NotificationSettingsResponse>(
      '/profile/preferences/notifications',
      data
    );
    return response.data;
  },

  /**
   * Update security settings
   */
  updateSecuritySettings: async (
    data: UpdateSecuritySettingsDto
  ): Promise<SecuritySettingsResponse> => {
    const response = await axiosInstance.put<SecuritySettingsResponse>(
      '/profile/preferences/security',
      data
    );
    return response.data;
  },

  /**
   * Update application preferences
   */
  updateUserPreferences: async (
    data: UpdateUserPreferencesDto
  ): Promise<UserPreferencesResponse> => {
    const response = await axiosInstance.put<UserPreferencesResponse>(
      '/profile/preferences/app',
      data
    );
    return response.data;
  },

  /**
   * Get all sub-users (only for Management role)
   */
  getAllSubUsers: async (): Promise<SubUserResponse[]> => {
    const response = await axiosInstance.get<SubUserResponse[]>(
      '/profile/sub-users'
    );
    return response.data;
  },

  /**
   * Create a new sub-user (only for Management role)
   */
  createSubUser: async (data: CreateSubUserDto): Promise<SubUserResponse> => {
    const response = await axiosInstance.post<SubUserResponse>(
      '/profile/sub-users',
      data
    );
    return response.data;
  },

  /**
   * Update sub-user permissions (only for Management role)
   */
  updateSubUserPermissions: async (
    subUserId: number,
    data: UpdateSubUserPermissionsDto
  ): Promise<SubUserResponse> => {
    const response = await axiosInstance.patch<SubUserResponse>(
      `/profile/sub-users/${subUserId}/permissions`,
      data
    );
    return response.data;
  },

  /**
   * Delete a sub-user (only for Management role)
   */
  deleteSubUser: async (subUserId: number): Promise<{ message: string }> => {
    const response = await axiosInstance.delete<{ message: string }>(
      `/profile/sub-users/${subUserId}`
    );
    return response.data;
  },

  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserResponse> => {
    const response = await axiosInstance.get<UserResponse>('/profile');
    return response.data;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: {
    fullName?: string;
    email?: string;
    role?: string;
    customRole?: string;
    companyName?: string;
    companySize?: string;
    industry?: string;
    customIndustry?: string;
    website?: string;
    phoneNumber?: string;
  }): Promise<UserResponse> => {
    const response = await axiosInstance.patch<UserResponse>(
      '/profile',
      data
    );
    return response.data;
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      '/profile/change-password',
      data
    );
    return response.data;
  },
};

export default profileService;


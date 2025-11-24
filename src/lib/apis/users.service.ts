import axiosInstance from './axios.config';
import { UserResponse } from './types';

export const usersService = {
  /**
   * Get all users
   */
  getAllUsers: async (): Promise<UserResponse[]> => {
    const response = await axiosInstance.get<UserResponse[]>('/users');
    return response.data;
  },

  /**
   * Get user by ID
   */
  getUserById: async (id: number): Promise<UserResponse> => {
    const response = await axiosInstance.get<UserResponse>(`/users/${id}`);
    return response.data;
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await axiosInstance.get<UserResponse>('/users/me');
    return response.data;
  },
};

export default usersService;


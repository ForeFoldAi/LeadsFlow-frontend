import axiosInstance from './axios.config';
import {
  LoginDto,
  SignupDto,
  AuthResponse,
  RefreshTokenDto,
  ForgotPasswordDto,
  VerifyOtpDto,
  ResetPasswordDto,
  Send2FAOtpDto,
  Verify2FAOtpDto,
  Verify2FAOtpResponse,
} from './types';
import { setAccessToken, setRefreshToken, clearTokens } from './axios.config';

export const authService = {
  /**
   * User signup
   */
  signup: async (data: SignupDto): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/signup', data);
    const { accessToken, refreshToken } = response.data;
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    return response.data;
  },

  /**
   * User login
   */
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
    
    // Only set tokens if 2FA is not required
    // If 2FA is required, tokens will be set after successful 2FA verification
    // Support both requiresTwoFactor (new) and requires2FA (legacy)
    if (!response.data.requiresTwoFactor && !response.data.requires2FA) {
      const { accessToken, refreshToken } = response.data;
      if (accessToken && refreshToken) {
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
      }
    }
    
    return response.data;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await axiosInstance.post<{ accessToken: string }>(
      '/auth/refresh',
      { refreshToken } as RefreshTokenDto
    );
    setAccessToken(response.data.accessToken);
    return response.data;
  },

  /**
   * User logout
   */
  logout: async (): Promise<{ message: string }> => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
    }
    return { message: 'Logged out successfully' };
  },

  /**
   * Request password reset OTP
   */
  forgotPassword: async (data: ForgotPasswordDto): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      '/auth/forgot-password',
      data
    );
    return response.data;
  },

  /**
   * Verify OTP for password reset
   */
  verifyOtp: async (data: VerifyOtpDto): Promise<{ valid: boolean; message: string }> => {
    const response = await axiosInstance.post<{ valid: boolean; message: string }>(
      '/auth/verify-otp',
      data
    );
    return response.data;
  },

  /**
   * Reset password with OTP
   */
  resetPassword: async (data: ResetPasswordDto): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      '/auth/reset-password',
      data
    );
    return response.data;
  },

  /**
   * Send 2FA OTP
   */
  send2FAOTP: async (data: Send2FAOtpDto): Promise<{ message: string }> => {
    const response = await axiosInstance.post<{ message: string }>(
      '/auth/2fa/send-otp',
      data
    );
    return response.data;
  },

  /**
   * Verify 2FA OTP
   */
  verify2FAOTP: async (data: Verify2FAOtpDto): Promise<Verify2FAOtpResponse> => {
    console.log("Verifying 2FA OTP for:", data.email);
    // Backend endpoint is /auth/login/2fa not /auth/2fa/verify-otp
    const response = await axiosInstance.post<Verify2FAOtpResponse>(
      '/auth/login/2fa',
      data
    );
    
    console.log("========== RAW AXIOS RESPONSE ==========");
    console.log("response.status:", response.status);
    console.log("response.statusText:", response.statusText);
    console.log("response.data (full):", JSON.stringify(response.data, null, 2));
    console.log("typeof response.data:", typeof response.data);
    console.log("response.data keys:", Object.keys(response.data));
    console.log("=======================================");
    
    console.log("2FA OTP verification response.data:", {
      valid: response.data.valid,
      hasAccessToken: !!response.data.accessToken,
      hasRefreshToken: !!response.data.refreshToken,
      hasUser: !!response.data.user,
      message: response.data.message
    });
    
    // Check if tokens might be nested differently
    const responseData: any = response.data;
    const accessToken = responseData.accessToken || responseData.access_token || responseData.token;
    const refreshToken = responseData.refreshToken || responseData.refresh_token;
    
    console.log("Token extraction check:");
    console.log("- accessToken:", accessToken ? "✅ Found" : "❌ Not found");
    console.log("- refreshToken:", refreshToken ? "✅ Found" : "❌ Not found");
    
    // If tokens are provided, store them
    if (accessToken) {
      console.log("✅ Storing access token from 2FA verification");
      setAccessToken(accessToken);
      responseData.accessToken = accessToken; // Normalize
    } else {
      console.warn("⚠️ No access token in 2FA verification response");
      console.warn("Checked properties: accessToken, access_token, token");
    }
    
    if (refreshToken) {
      console.log("✅ Storing refresh token from 2FA verification");
      setRefreshToken(refreshToken);
      responseData.refreshToken = refreshToken; // Normalize
    } else {
      console.warn("⚠️ No refresh token in 2FA verification response");
      console.warn("Checked properties: refreshToken, refresh_token");
    }
    
    return response.data;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('accessToken');
    return !!token;
  },
};

export default authService;


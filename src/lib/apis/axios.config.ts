import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Global error tracking to prevent infinite retries
let globalErrorCount = 0;
let lastErrorTime = 0;
const MAX_GLOBAL_ERRORS = 5;
const ERROR_COOLDOWN_MS = 30000; // 30 seconds cooldown after max errors

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 10000, // Reduced timeout to fail faster
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh and errors
axiosInstance.interceptors.response.use(
  (response) => {
    // Reset global error count on successful response
    globalErrorCount = 0;
    lastErrorTime = 0;
    
    // Debug logging for 2FA endpoints
    if (response.config.url?.includes('2fa')) {
      console.log("🔍 Axios Response Interceptor - 2FA endpoint:", response.config.url);
      console.log("Response status:", response.status);
      console.log("Response data type:", typeof response.data);
      console.log("Response data:", response.data);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Check if it's a network/server error (not found, timeout, etc.)
    const isNetworkError = !error.response || 
                          error.code === 'ECONNABORTED' || 
                          error.code === 'ERR_NETWORK' || 
                          error.code === 'ERR_INTERNET_DISCONNECTED' ||
                          error.message?.includes('Network Error') || 
                          error.message?.includes('timeout') ||
                          error.message?.includes('Failed to fetch');
    
    const isServerNotFound = error.response?.status === 404 || 
                            error.code === 'ERR_NETWORK' ||
                            error.message?.includes('Failed to fetch');

    // Track network/server errors globally
    if (isNetworkError || isServerNotFound) {
      const now = Date.now();
      
      // If we're in cooldown period, reject immediately
      if (globalErrorCount >= MAX_GLOBAL_ERRORS && (now - lastErrorTime) < ERROR_COOLDOWN_MS) {
        const remainingCooldown = Math.ceil((ERROR_COOLDOWN_MS - (now - lastErrorTime)) / 1000);
        console.error(`Too many errors. Cooldown active. Please wait ${remainingCooldown} seconds.`);
        return Promise.reject(new Error(`Server not found. Too many connection attempts. Please wait ${remainingCooldown} seconds before retrying.`));
      }
      
      // Increment error count and update last error time
      globalErrorCount += 1;
      lastErrorTime = now;
      
      // If we've exceeded max errors, reject with a clear message
      if (globalErrorCount >= MAX_GLOBAL_ERRORS) {
        console.error(`Maximum error limit reached (${MAX_GLOBAL_ERRORS}). Stopping API calls.`);
        return Promise.reject(new Error('Server not found. Please check your API URL configuration and try again later.'));
      }
    } else {
      // Reset error count for non-network errors (like 401, 403, etc.)
      globalErrorCount = 0;
    }

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        if (refreshToken) {
          const response = await axios.post(
            `${originalRequest.baseURL}/auth/refresh`,
            { refreshToken }
          );
          const { accessToken } = response.data;
          setAccessToken(accessToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Token management functions
export const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
};

export const setAccessToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
};

export const setRefreshToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('refreshToken', token);
  }
};

export const clearTokens = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export default axiosInstance;


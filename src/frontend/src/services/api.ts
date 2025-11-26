/**
 * API Client - Base Axios Configuration
 *
 * Provides centralized HTTP client for all API requests.
 * Handles:
 * - Base URL configuration from environment variables
 * - Request/response interceptors
 * - Mock authentication headers (POC only)
 * - Error handling and logging
 * - HTTPS certificate acceptance for development
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import { toast } from 'react-toastify';

/**
 * Base API URL from environment variable
 * Default: https://localhost:5001 for local development
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:5001';

/**
 * Mock user context for POC
 * In production, this would come from authentication system
 */
export interface MockUserContext {
  email: string;
  fullName: string;
  position: string;
  isAdmin: boolean;
}

/**
 * Current mock user (POC only)
 * TODO: Replace with real authentication in production
 * Default: Incident Commander to match backend MockUserMiddleware
 */
let currentUser: MockUserContext = {
  email: 'admin@cobra.mil',
  fullName: 'Admin User',
  position: 'Incident Commander',
  isAdmin: true,
};

/**
 * Update the current user context
 * Used for testing different positions/users in POC
 */
export const setMockUser = (user: MockUserContext): void => {
  currentUser = user;
};

/**
 * Get current mock user
 */
export const getCurrentUser = (): MockUserContext => {
  return currentUser;
};

/**
 * Axios instance with base configuration
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

/**
 * Request interceptor
 * Adds mock authentication headers to every request
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add mock user headers (POC only)
    config.headers['X-User-Email'] = currentUser.email;
    config.headers['X-User-Position'] = currentUser.position;
    config.headers['X-User-FullName'] = currentUser.fullName;

    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handles global error responses and logging
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError) => {
    console.error('[API] Response error:', error);

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const message = (error.response.data as any)?.message || error.message;

      switch (status) {
        case 400:
          // Bad request - validation errors
          console.error('[API] Validation error:', error.response.data);
          toast.error(`Validation error: ${message}`);
          break;

        case 401:
          // Unauthorized
          toast.error('Unauthorized. Please log in.');
          break;

        case 403:
          // Forbidden - permission denied
          toast.error(
            'Permission denied. Your position is not authorized for this action.'
          );
          break;

        case 404:
          // Not found
          console.warn('[API] Resource not found:', error.config?.url);
          toast.error('Resource not found');
          break;

        case 500:
          // Server error
          toast.error('Server error. Please try again later.');
          break;

        default:
          toast.error(`Error: ${message}`);
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[API] No response received:', error.request);
      toast.error(
        'Unable to reach server. Please check your connection and ensure the backend is running.'
      );
    } else {
      // Error setting up request
      console.error('[API] Request setup error:', error.message);
      toast.error(`Request error: ${error.message}`);
    }

    return Promise.reject(error);
  }
);

/**
 * Generic API error handler
 * Extracts error message from various error formats
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as any)?.message ||
      error.message ||
      'An unexpected error occurred'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Type guard for API responses
 */
export const isApiError = (error: unknown): error is AxiosError => {
  return axios.isAxiosError(error);
};

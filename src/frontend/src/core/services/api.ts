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
import { getSysAdminStatus } from '../../admin/contexts/SysAdminContext';

/**
 * Base API URL from environment variable
 * - Production: empty string (relative URLs like /api/events)
 * - Development: http://localhost:5000
 * - Fallback: https://localhost:5001 (only if env var is undefined)
 *
 * IMPORTANT: Use ?? instead of || because empty string is valid for production
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://localhost:5001';

/**
 * Permission roles - matches backend PermissionRole enum
 */
export type PermissionRoleType = 'None' | 'Readonly' | 'Contributor' | 'Manage';

/**
 * Mock user context for POC
 * In production, this would come from authentication system
 */
export interface MockUserContext {
  email: string;
  fullName: string;
  position: string; // Primary position (first in positions array)
  positions?: string[]; // All positions for filtering checklists
  isAdmin: boolean;
  role?: PermissionRoleType; // Permission role
}

/**
 * Get stored account from localStorage (matches ProfileMenu storage)
 */
const getStoredAccount = (): { email: string; fullName: string } => {
  try {
    const stored = localStorage.getItem('mockUserAccount');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load stored account:', error);
  }
  return {
    email: 'admin@cobra.mil',
    fullName: 'Admin User',
  };
};

/**
 * Current mock user (POC only)
 * TODO: Replace with real authentication in production
 * Default: Incident Commander to match backend MockUserMiddleware
 * Initializes from localStorage if available
 */
const storedAccount = getStoredAccount();
let currentUser: MockUserContext = {
  email: storedAccount.email,
  fullName: storedAccount.fullName,
  position: 'Incident Commander',
  isAdmin: true,
  role: 'Contributor',
};

/**
 * Update the current user context
 * Used for testing different positions/users in POC
 */
export const setMockUser = (user: MockUserContext): void => {
  console.log('[MockUser] Updating user context:', { old: currentUser.position, new: user.position });
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
 * Get the current role from localStorage (synced with ProfileMenu)
 */
const getCurrentRole = (): PermissionRoleType => {
  try {
    const stored = localStorage.getItem('mockUserProfile');
    if (stored) {
      const profile = JSON.parse(stored);
      return profile.role || 'Contributor';
    }
  } catch (error) {
    console.error('Failed to load user role:', error);
  }
  return currentUser.role || 'Contributor';
};

/**
 * Request interceptor
 * Adds mock authentication headers to every request
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add mock user headers (POC only)
    config.headers['X-User-Email'] = currentUser.email;
    // Send all positions as comma-separated string (backend will parse)
    const positionsHeader = currentUser.positions?.length
      ? currentUser.positions.join(', ')
      : currentUser.position;
    config.headers['X-User-Position'] = positionsHeader;
    config.headers['X-User-FullName'] = currentUser.fullName;

    // Send role header (from localStorage, synced with ProfileMenu)
    const role = getCurrentRole();
    config.headers['X-User-Role'] = role;

    // Send SysAdmin header if authenticated
    const isSysAdmin = getSysAdminStatus();
    config.headers['X-User-IsSysAdmin'] = isSysAdmin.toString();

    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
      positions: positionsHeader,
      role: role,
      isSysAdmin: isSysAdmin,
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
 * API Error Response interface for POC debugging
 */
interface ApiErrorResponse {
  message?: string;
  exceptionType?: string;
  stackTrace?: string;
  innerException?: string;
  innerExceptionType?: string;
  innerStackTrace?: string;
  path?: string;
  method?: string;
  timestamp?: string;
}

/**
 * Format error details for display (POC debugging)
 */
const formatErrorDetails = (data: ApiErrorResponse): string => {
  const parts: string[] = [];

  if (data.message) {
    parts.push(`Message: ${data.message}`);
  }
  if (data.exceptionType) {
    parts.push(`Type: ${data.exceptionType}`);
  }
  if (data.innerException) {
    parts.push(`Inner: ${data.innerException}`);
  }
  if (data.path) {
    parts.push(`Path: ${data.method} ${data.path}`);
  }

  return parts.join('\n');
};

/**
 * Response interceptor
 * Handles global error responses and logging
 * POC: Shows full error details for debugging
 */
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error: AxiosError<ApiErrorResponse>) => {
    // Log full error details to console for debugging
    console.error('[API] Response error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      const message = data?.message || error.message;

      // Log full stack trace to console (POC debugging)
      if (data?.stackTrace) {
        console.error('[API] Server Stack Trace:', data.stackTrace);
      }
      if (data?.innerStackTrace) {
        console.error('[API] Inner Exception Stack Trace:', data.innerStackTrace);
      }

      switch (status) {
        case 400:
          // Bad request - validation errors
          console.error('[API] Validation error:', data);
          toast.error(`Validation error: ${message}`, { autoClose: 10000 });
          break;

        case 401:
          // Unauthorized
          toast.error('Unauthorized. Please log in.');
          break;

        case 403:
          // Forbidden - permission denied
          toast.error(
            `Permission denied: ${message}`,
            { autoClose: 10000 }
          );
          break;

        case 404:
          // Not found
          console.warn('[API] Resource not found:', error.config?.url);
          toast.error(`Not found: ${message}`);
          break;

        case 500:
          // Server error - POC: show full details
          const errorDetails = formatErrorDetails(data);
          console.error('[API] Server error details:\n', errorDetails);
          toast.error(
            `Server Error: ${message}\n\nCheck browser console for full stack trace.`,
            { autoClose: false }  // Don't auto-close so user can see the error
          );
          break;

        default:
          toast.error(`Error ${status}: ${message}`, { autoClose: 10000 });
      }
    } else if (error.request) {
      // Request made but no response
      console.error('[API] No response received:', error.request);
      toast.error(
        'Unable to reach server. Please check your connection and ensure the backend is running.',
        { autoClose: false }
      );
    } else {
      // Error setting up request
      console.error('[API] Request setup error:', error.message);
      toast.error(`Request error: ${error.message}`, { autoClose: 10000 });
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

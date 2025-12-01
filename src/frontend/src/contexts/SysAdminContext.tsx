/**
 * SysAdmin Authentication Context
 *
 * Provides system administrator authentication for customer-level configuration.
 * This is separate from normal user roles (Readonly/Contributor/Manage).
 *
 * For POC: Uses static credentials stored in environment or hardcoded.
 * In production: Would integrate with a proper authentication system.
 *
 * Features:
 * - Login/logout functionality with session persistence
 * - Protected route support via isSysAdmin flag
 * - Automatic session timeout after 30 minutes of inactivity
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// Static credentials for POC (in production, these would be in a secure backend)
const SYSADMIN_CREDENTIALS = {
  username: 'sysadmin',
  password: '2Bornot2B', // POC only - in production, use proper auth
};

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// Storage key for session
const SYSADMIN_SESSION_KEY = 'sysadmin_session';

interface SysAdminSession {
  isAuthenticated: boolean;
  authenticatedAt: number;
  lastActivityAt: number;
}

interface SysAdminContextValue {
  isSysAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkSession: () => boolean;
}

const SysAdminContext = createContext<SysAdminContextValue | undefined>(undefined);

interface SysAdminProviderProps {
  children: ReactNode;
}

export const SysAdminProvider: React.FC<SysAdminProviderProps> = ({ children }) => {
  const [isSysAdmin, setIsSysAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check if session is valid (not expired)
   */
  const isSessionValid = useCallback((session: SysAdminSession): boolean => {
    const now = Date.now();
    const timeSinceLastActivity = now - session.lastActivityAt;
    return session.isAuthenticated && timeSinceLastActivity < SESSION_TIMEOUT_MS;
  }, []);

  /**
   * Update last activity timestamp
   */
  const updateActivity = useCallback(() => {
    try {
      const stored = localStorage.getItem(SYSADMIN_SESSION_KEY);
      if (stored) {
        const session: SysAdminSession = JSON.parse(stored);
        if (session.isAuthenticated) {
          session.lastActivityAt = Date.now();
          localStorage.setItem(SYSADMIN_SESSION_KEY, JSON.stringify(session));
        }
      }
    } catch (error) {
      console.error('Failed to update SysAdmin activity:', error);
    }
  }, []);

  /**
   * Check and restore session from localStorage
   */
  const checkSession = useCallback((): boolean => {
    try {
      const stored = localStorage.getItem(SYSADMIN_SESSION_KEY);
      if (stored) {
        const session: SysAdminSession = JSON.parse(stored);
        if (isSessionValid(session)) {
          updateActivity();
          setIsSysAdmin(true);
          return true;
        } else {
          // Session expired, clear it
          localStorage.removeItem(SYSADMIN_SESSION_KEY);
          setIsSysAdmin(false);
        }
      }
    } catch (error) {
      console.error('Failed to check SysAdmin session:', error);
      localStorage.removeItem(SYSADMIN_SESSION_KEY);
    }
    return false;
  }, [isSessionValid, updateActivity]);

  /**
   * Login with username and password
   */
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // Simulate network delay for realistic feel
    await new Promise(resolve => setTimeout(resolve, 500));

    if (
      username.toLowerCase() === SYSADMIN_CREDENTIALS.username.toLowerCase() &&
      password === SYSADMIN_CREDENTIALS.password
    ) {
      const session: SysAdminSession = {
        isAuthenticated: true,
        authenticatedAt: Date.now(),
        lastActivityAt: Date.now(),
      };
      localStorage.setItem(SYSADMIN_SESSION_KEY, JSON.stringify(session));
      setIsSysAdmin(true);
      console.log('[SysAdmin] Login successful');
      return true;
    }

    console.warn('[SysAdmin] Login failed - invalid credentials');
    return false;
  }, []);

  /**
   * Logout and clear session
   */
  const logout = useCallback(() => {
    localStorage.removeItem(SYSADMIN_SESSION_KEY);
    setIsSysAdmin(false);
    console.log('[SysAdmin] Logged out');
  }, []);

  /**
   * Initialize - check for existing session on mount
   */
  useEffect(() => {
    checkSession();
    setIsLoading(false);
  }, [checkSession]);

  /**
   * Set up activity listener to keep session alive
   */
  useEffect(() => {
    if (isSysAdmin) {
      const handleActivity = () => updateActivity();

      // Update on any user interaction
      window.addEventListener('click', handleActivity);
      window.addEventListener('keydown', handleActivity);
      window.addEventListener('scroll', handleActivity);

      // Also check session validity periodically
      const intervalId = setInterval(() => {
        if (!checkSession()) {
          console.log('[SysAdmin] Session expired');
        }
      }, 60000); // Check every minute

      return () => {
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keydown', handleActivity);
        window.removeEventListener('scroll', handleActivity);
        clearInterval(intervalId);
      };
    }
  }, [isSysAdmin, updateActivity, checkSession]);

  const value: SysAdminContextValue = {
    isSysAdmin,
    isLoading,
    login,
    logout,
    checkSession,
  };

  return (
    <SysAdminContext.Provider value={value}>
      {children}
    </SysAdminContext.Provider>
  );
};

/**
 * Hook to access SysAdmin context
 */
export const useSysAdmin = (): SysAdminContextValue => {
  const context = useContext(SysAdminContext);
  if (context === undefined) {
    throw new Error('useSysAdmin must be used within a SysAdminProvider');
  }
  return context;
};

/**
 * Get SysAdmin status for API headers (used by api.ts)
 */
export const getSysAdminStatus = (): boolean => {
  try {
    const stored = localStorage.getItem(SYSADMIN_SESSION_KEY);
    if (stored) {
      const session: SysAdminSession = JSON.parse(stored);
      const now = Date.now();
      const timeSinceLastActivity = now - session.lastActivityAt;
      return session.isAuthenticated && timeSinceLastActivity < SESSION_TIMEOUT_MS;
    }
  } catch (error) {
    console.error('Failed to get SysAdmin status:', error);
  }
  return false;
};

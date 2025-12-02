/**
 * Feature Flags Context
 *
 * Provides feature flag state to the entire application.
 * Fetches flags from API on mount and caches them.
 * Admin can update flags via the useFeatureFlags hook.
 *
 * Flag states: "Hidden", "ComingSoon", "Active"
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { featureFlagsService } from '../services/featureFlagsService';
import {
  FeatureFlags,
  FeatureFlagState,
  defaultFeatureFlags,
  isActive as checkActive,
  isVisible as checkVisible,
  isComingSoon as checkComingSoon,
} from '../types/featureFlags';

interface FeatureFlagsContextType {
  /** Current feature flags */
  flags: FeatureFlags;
  /** Whether flags are currently loading */
  loading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Whether flags have been loaded at least once */
  initialized: boolean;
  /** Update feature flags (admin only) */
  updateFlags: (flags: FeatureFlags) => Promise<void>;
  /** Reset flags to defaults */
  resetFlags: () => Promise<void>;
  /** Refresh flags from server */
  refreshFlags: () => Promise<void>;
  /** Get the state of a specific flag */
  getState: (flag: keyof FeatureFlags) => FeatureFlagState;
  /** Check if a specific flag is Active */
  isActive: (flag: keyof FeatureFlags) => boolean;
  /** Check if a specific flag is visible (Active or ComingSoon) */
  isVisible: (flag: keyof FeatureFlags) => boolean;
  /** Check if a specific flag is ComingSoon */
  isComingSoon: (flag: keyof FeatureFlags) => boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

interface FeatureFlagsProviderProps {
  children: React.ReactNode;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Fetch flags from API
  const refreshFlags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await featureFlagsService.getFeatureFlags();
      setFlags(data);
      setInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feature flags';
      setError(message);
      console.error('[FeatureFlags] Failed to load:', err);
      // Keep using defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Load flags on mount
  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  // Update flags (admin only)
  const updateFlags = useCallback(async (newFlags: FeatureFlags) => {
    try {
      setLoading(true);
      const updated = await featureFlagsService.updateFeatureFlags(newFlags);
      setFlags(updated);
      toast.success('Feature flags updated');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feature flags';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reset to defaults
  const resetFlags = useCallback(async () => {
    try {
      setLoading(true);
      const defaults = await featureFlagsService.resetFeatureFlags();
      setFlags(defaults);
      toast.success('Feature flags reset to defaults');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset feature flags';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get the state of a specific flag
  const getState = useCallback((flag: keyof FeatureFlags): FeatureFlagState => {
    return flags[flag] ?? 'Hidden';
  }, [flags]);

  // Check if a specific flag is Active
  const isActive = useCallback((flag: keyof FeatureFlags): boolean => {
    return checkActive(flags[flag]);
  }, [flags]);

  // Check if a specific flag is visible (Active or ComingSoon)
  const isVisible = useCallback((flag: keyof FeatureFlags): boolean => {
    return checkVisible(flags[flag]);
  }, [flags]);

  // Check if a specific flag is ComingSoon
  const isComingSoon = useCallback((flag: keyof FeatureFlags): boolean => {
    return checkComingSoon(flags[flag]);
  }, [flags]);

  const value = useMemo<FeatureFlagsContextType>(() => ({
    flags,
    loading,
    error,
    initialized,
    updateFlags,
    resetFlags,
    refreshFlags,
    getState,
    isActive,
    isVisible,
    isComingSoon,
  }), [flags, loading, error, initialized, updateFlags, resetFlags, refreshFlags, getState, isActive, isVisible, isComingSoon]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

/**
 * Hook to access feature flags
 */
export const useFeatureFlags = (): FeatureFlagsContextType => {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

/**
 * Hook to get a single feature flag state
 * Convenience hook for components that only need to check one flag
 */
export const useFeatureFlagState = (flag: keyof FeatureFlags): FeatureFlagState => {
  const { getState } = useFeatureFlags();
  return getState(flag);
};

export default FeatureFlagsContext;

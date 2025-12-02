/**
 * Feature Flags Service
 *
 * API service for fetching and updating feature flags.
 * Flags control which POC tools are visible in the application.
 */

import { apiClient } from '../../services/api';
import type { FeatureFlags } from '../types/featureFlags';

const BASE_URL = '/api/config/featureflags';

/**
 * Get current feature flags (merged defaults + database overrides)
 */
export const getFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiClient.get<FeatureFlags>(BASE_URL);
  return response.data;
};

/**
 * Update feature flags (admin only - persists to database)
 */
export const updateFeatureFlags = async (flags: FeatureFlags): Promise<FeatureFlags> => {
  const response = await apiClient.put<FeatureFlags>(BASE_URL, flags);
  return response.data;
};

/**
 * Reset feature flags to appsettings.json defaults
 */
export const resetFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiClient.delete<FeatureFlags>(BASE_URL);
  return response.data;
};

/**
 * Get default feature flags from appsettings.json (without overrides)
 */
export const getDefaultFeatureFlags = async (): Promise<FeatureFlags> => {
  const response = await apiClient.get<FeatureFlags>(`${BASE_URL}/defaults`);
  return response.data;
};

export const featureFlagsService = {
  getFeatureFlags,
  updateFeatureFlags,
  resetFeatureFlags,
  getDefaultFeatureFlags,
};

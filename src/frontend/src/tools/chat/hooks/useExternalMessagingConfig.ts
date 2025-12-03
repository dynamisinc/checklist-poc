/**
 * useExternalMessagingConfig Hook
 *
 * Checks if external messaging platforms (GroupMe, etc.) are configured
 * by an administrator. This affects whether external channel options
 * are shown in the UI.
 *
 * When no external platforms are configured:
 * - External section is hidden from ChannelList
 * - "Connect GroupMe" menu option is hidden
 */

import { useState, useEffect } from 'react';
import { systemSettingsService } from '../../../admin/services/systemSettingsService';
import type { GroupMeIntegrationStatus } from '../../../admin/types/systemSettings';

interface ExternalMessagingConfig {
  /** Whether any external messaging platform is configured */
  isConfigured: boolean;
  /** Whether GroupMe specifically is configured */
  groupMe: {
    isConfigured: boolean;
    hasAccessToken: boolean;
  };
  /** Loading state while fetching configuration */
  loading: boolean;
  /** Error message if fetch failed */
  error: string | null;
}

/**
 * Hook to check external messaging platform configuration status.
 * Fetches configuration on mount and caches for the component lifetime.
 */
export const useExternalMessagingConfig = (): ExternalMessagingConfig => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupMeStatus, setGroupMeStatus] = useState<GroupMeIntegrationStatus | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = await systemSettingsService.getGroupMeIntegrationStatus();
        setGroupMeStatus(status);
      } catch (err) {
        // If the endpoint fails, assume not configured (fail closed)
        console.error('Failed to fetch external messaging config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
        setGroupMeStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Compute derived state
  const groupMeConfigured = groupMeStatus?.isConfigured ?? false;

  return {
    isConfigured: groupMeConfigured, // Expand to include other platforms in future
    groupMe: {
      isConfigured: groupMeConfigured,
      hasAccessToken: groupMeStatus?.hasAccessToken ?? false,
    },
    loading,
    error,
  };
};

export default useExternalMessagingConfig;

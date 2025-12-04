/**
 * useExternalMessagingConfig Hook
 *
 * Checks if external messaging platforms (GroupMe, Teams, etc.) are configured
 * by an administrator. This affects whether external channel options
 * are shown in the UI.
 *
 * When no external platforms are configured:
 * - External section is hidden from ChannelList
 * - "Connect GroupMe" and "Connect Teams" menu options are hidden
 */

import { useState, useEffect } from 'react';
import { systemSettingsService } from '../../../admin/services/systemSettingsService';
import type {
  GroupMeIntegrationStatus,
  TeamsIntegrationStatus,
} from '../../../admin/types/systemSettings';

export interface ExternalMessagingConfig {
  /** Whether any external messaging platform is configured */
  isConfigured: boolean;
  /** Whether GroupMe specifically is configured */
  groupMe: {
    isConfigured: boolean;
    hasAccessToken: boolean;
  };
  /** Whether Teams specifically is configured */
  teams: {
    isConfigured: boolean;
    isConnected: boolean;
    availableConversations: number;
    statusMessage: string;
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
  const [teamsStatus, setTeamsStatus] = useState<TeamsIntegrationStatus | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both platform statuses in parallel
        const [groupMe, teams] = await Promise.all([
          systemSettingsService.getGroupMeIntegrationStatus().catch(() => null),
          systemSettingsService.getTeamsIntegrationStatus().catch(() => null),
        ]);

        setGroupMeStatus(groupMe);
        setTeamsStatus(teams);
      } catch (err) {
        // If both endpoints fail, assume not configured (fail closed)
        console.error('Failed to fetch external messaging config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load configuration');
        setGroupMeStatus(null);
        setTeamsStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Compute derived state
  const groupMeConfigured = groupMeStatus?.isConfigured ?? false;
  const teamsConfigured = teamsStatus?.isConfigured ?? false;

  return {
    isConfigured: groupMeConfigured || teamsConfigured,
    groupMe: {
      isConfigured: groupMeConfigured,
      hasAccessToken: groupMeStatus?.hasAccessToken ?? false,
    },
    teams: {
      isConfigured: teamsConfigured,
      isConnected: teamsStatus?.isConnected ?? false,
      availableConversations: teamsStatus?.availableConversations ?? 0,
      statusMessage: teamsStatus?.statusMessage ?? '',
    },
    loading,
    error,
  };
};

export default useExternalMessagingConfig;

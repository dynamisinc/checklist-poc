/**
 * System Settings Service
 *
 * API client for managing integration settings.
 */

import { apiClient } from '../../core/services/api';
import type {
  GroupMeIntegrationStatus,
  TeamsIntegrationStatus,
} from '../types/systemSettings';

export const systemSettingsService = {
  /**
   * Update a setting value by key
   */
  updateSettingValue: async (key: string, value: string): Promise<void> => {
    await apiClient.patch(
      `/api/systemsettings/${encodeURIComponent(key)}/value`,
      { value }
    );
  },

  /**
   * Get GroupMe integration status including computed webhook URLs.
   * The webhook base URL comes from server configuration (appsettings),
   * not from database settings.
   */
  getGroupMeIntegrationStatus: async (): Promise<GroupMeIntegrationStatus> => {
    const response = await apiClient.get<GroupMeIntegrationStatus>(
      '/api/systemsettings/integrations/groupme'
    );
    return response.data;
  },

  /**
   * Get Teams Bot integration status.
   * Checks if the TeamsBot service is configured and reachable.
   */
  getTeamsIntegrationStatus: async (): Promise<TeamsIntegrationStatus> => {
    const response = await apiClient.get<TeamsIntegrationStatus>(
      '/api/systemsettings/integrations/teams'
    );
    return response.data;
  },
};

export default systemSettingsService;

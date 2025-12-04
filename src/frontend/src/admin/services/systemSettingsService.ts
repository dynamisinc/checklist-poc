/**
 * System Settings Service
 *
 * API client for managing integration settings.
 */

import { apiClient } from '../../core/services/api';
import type {
  GroupMeIntegrationStatus,
  TeamsIntegrationStatus,
  ListTeamsConnectorsResponse,
  CleanupResponse,
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

  // === Teams Connector Management (UC-TI-030) ===

  /**
   * List all Teams connectors with optional filters.
   */
  listTeamsConnectors: async (params?: {
    isEmulator?: boolean;
    isActive?: boolean;
    staleDays?: number;
  }): Promise<ListTeamsConnectorsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.isEmulator !== undefined) {
      queryParams.set('isEmulator', String(params.isEmulator));
    }
    if (params?.isActive !== undefined) {
      queryParams.set('isActive', String(params.isActive));
    }
    if (params?.staleDays !== undefined) {
      queryParams.set('staleDays', String(params.staleDays));
    }
    const queryString = queryParams.toString();
    const url = `/api/chat/teams/mappings${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<ListTeamsConnectorsResponse>(url);
    return response.data;
  },

  /**
   * Rename a Teams connector.
   */
  renameTeamsConnector: async (mappingId: string, displayName: string): Promise<void> => {
    await apiClient.patch(`/api/chat/teams/mappings/${mappingId}/name`, { displayName });
  },

  /**
   * Deactivate a Teams connector (soft delete).
   */
  deleteTeamsConnector: async (mappingId: string): Promise<void> => {
    await apiClient.delete(`/api/chat/teams/mappings/${mappingId}`);
  },

  /**
   * Reactivate a previously deactivated Teams connector.
   */
  reactivateTeamsConnector: async (mappingId: string): Promise<void> => {
    await apiClient.post(`/api/chat/teams/mappings/${mappingId}/reactivate`);
  },

  /**
   * Bulk delete stale connectors (inactive for N days).
   */
  cleanupStaleConnectors: async (inactiveDays: number = 30): Promise<CleanupResponse> => {
    const response = await apiClient.delete<CleanupResponse>(
      `/api/chat/teams/mappings/stale?inactiveDays=${inactiveDays}`
    );
    return response.data;
  },
};

export default systemSettingsService;

/**
 * System Settings Service
 *
 * API client for managing customer-level configuration settings.
 */

import { apiClient } from '../../core/services/api';
import type {
  SystemSettingDto,
  CreateSystemSettingRequest,
  UpdateSystemSettingRequest,
  UpdateSettingValueRequest,
  SettingCategory,
  GroupMeIntegrationStatus,
} from '../types/systemSettings';

export const systemSettingsService = {
  /**
   * Get all system settings
   */
  getAllSettings: async (category?: SettingCategory): Promise<SystemSettingDto[]> => {
    const params = category !== undefined ? `?category=${category}` : '';
    const response = await apiClient.get<SystemSettingDto[]>(`/api/systemsettings${params}`);
    return response.data;
  },

  /**
   * Get a specific setting by key
   */
  getSetting: async (key: string): Promise<SystemSettingDto> => {
    const response = await apiClient.get<SystemSettingDto>(`/api/systemsettings/${encodeURIComponent(key)}`);
    return response.data;
  },

  /**
   * Create a new system setting
   */
  createSetting: async (request: CreateSystemSettingRequest): Promise<SystemSettingDto> => {
    const response = await apiClient.post<SystemSettingDto>('/api/systemsettings', request);
    return response.data;
  },

  /**
   * Update a system setting
   */
  updateSetting: async (key: string, request: UpdateSystemSettingRequest): Promise<SystemSettingDto> => {
    const response = await apiClient.put<SystemSettingDto>(
      `/api/systemsettings/${encodeURIComponent(key)}`,
      request
    );
    return response.data;
  },

  /**
   * Update just the value of a setting
   */
  updateSettingValue: async (key: string, value: string): Promise<SystemSettingDto> => {
    const request: UpdateSettingValueRequest = { value };
    const response = await apiClient.patch<SystemSettingDto>(
      `/api/systemsettings/${encodeURIComponent(key)}/value`,
      request
    );
    return response.data;
  },

  /**
   * Delete a system setting
   */
  deleteSetting: async (key: string): Promise<void> => {
    await apiClient.delete(`/api/systemsettings/${encodeURIComponent(key)}`);
  },

  /**
   * Toggle a setting's enabled state
   */
  toggleSetting: async (key: string): Promise<SystemSettingDto> => {
    const response = await apiClient.patch<SystemSettingDto>(
      `/api/systemsettings/${encodeURIComponent(key)}/toggle`
    );
    return response.data;
  },

  /**
   * Initialize default settings
   */
  initializeDefaults: async (): Promise<void> => {
    await apiClient.post('/api/systemsettings/initialize');
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
};

export default systemSettingsService;

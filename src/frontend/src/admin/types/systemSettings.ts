/**
 * System Settings Types
 *
 * TypeScript interfaces for system settings API operations.
 */

export enum SettingCategory {
  Integration = 0,
  AI = 1,
  System = 2,
}

export const SettingCategoryNames: Record<SettingCategory, string> = {
  [SettingCategory.Integration]: 'Integrations',
  [SettingCategory.AI]: 'AI Providers',
  [SettingCategory.System]: 'System',
};

export interface SystemSettingDto {
  id: string;
  key: string;
  value: string;
  category: SettingCategory;
  categoryName: string;
  displayName: string;
  description?: string;
  isSecret: boolean;
  isEnabled: boolean;
  sortOrder: number;
  modifiedBy: string;
  modifiedAt: string;
  hasValue: boolean;
}

export interface CreateSystemSettingRequest {
  key: string;
  value: string;
  category: SettingCategory;
  displayName: string;
  description?: string;
  isSecret: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface UpdateSystemSettingRequest {
  value?: string;
  displayName?: string;
  description?: string;
  isEnabled?: boolean;
  sortOrder?: number;
}

export interface UpdateSettingValueRequest {
  value: string;
}

// Predefined setting keys
export const SystemSettingKeys = {
  // Integration settings
  GroupMeAccessToken: 'GroupMe.AccessToken',
  GroupMeBaseUrl: 'GroupMe.BaseUrl',
  GroupMeWebhookBaseUrl: 'GroupMe.WebhookBaseUrl',

  // AI settings (future)
  OpenAiApiKey: 'OpenAI.ApiKey',
  OpenAiOrganizationId: 'OpenAI.OrganizationId',
  AzureOpenAiEndpoint: 'AzureOpenAI.Endpoint',
  AzureOpenAiApiKey: 'AzureOpenAI.ApiKey',
  AzureOpenAiDeploymentName: 'AzureOpenAI.DeploymentName',

  // System settings
  SystemMaintenanceMode: 'System.MaintenanceMode',
} as const;

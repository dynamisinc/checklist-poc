/**
 * Admin Module
 *
 * Customer-level administration features including:
 * - Feature Flags management
 * - System Settings management
 * - SysAdmin authentication
 */

// Components
export { FeatureFlagsAdmin } from './components/FeatureFlagsAdmin';
export { SystemSettingsAdmin } from './components/SystemSettingsAdmin';
export { SysAdminLoginDialog } from './components/SysAdminLoginDialog';

// Contexts
export {
  FeatureFlagsProvider,
  useFeatureFlags,
  useFeatureFlagState,
} from './contexts/FeatureFlagsContext';
export {
  SysAdminProvider,
  useSysAdmin,
  getSysAdminStatus,
} from './contexts/SysAdminContext';

// Pages
export { AdminPage } from './pages/AdminPage';

// Services
export { featureFlagsService } from './services/featureFlagsService';
export { systemSettingsService } from './services/systemSettingsService';

// Types
export type {
  FeatureFlags,
  FeatureFlagState,
} from './types/featureFlags';
export {
  defaultFeatureFlags,
  featureFlagInfo,
  featureFlagStates,
  isActive,
  isVisible,
  isComingSoon,
} from './types/featureFlags';
export type {
  SystemSettingDto,
  CreateSystemSettingRequest,
  UpdateSystemSettingRequest,
  UpdateSettingValueRequest,
  GroupMeIntegrationStatus,
} from './types/systemSettings';
export {
  SettingCategory,
  SettingCategoryNames,
} from './types/systemSettings';

/**
 * Feature Flags Type Definitions
 *
 * Controls which POC tools are enabled/visible in the application.
 * Flags are loaded from the API (appsettings.json defaults + database overrides).
 *
 * States:
 * - "Hidden": Tool is not visible in sidebar
 * - "ComingSoon": Tool is visible but disabled with badge
 * - "Active": Tool is fully functional
 */

/**
 * Valid feature flag states
 */
export type FeatureFlagState = 'Hidden' | 'ComingSoon' | 'Active';

/**
 * Feature flags interface - each flag is a state string
 */
export interface FeatureFlags {
  /** Checklist tool - create and manage operational checklists */
  checklist: FeatureFlagState;
  /** External Chat integration - GroupMe/messaging platform integration */
  chat: FeatureFlagState;
  /** Tasking tool - task assignment and tracking */
  tasking: FeatureFlagState;
  /** COBRA KAI - knowledge and intelligence assistant */
  cobraKai: FeatureFlagState;
  /** Event Summary - event overview and reporting */
  eventSummary: FeatureFlagState;
  /** Status Chart - visual status tracking */
  statusChart: FeatureFlagState;
  /** Event Timeline - chronological event view */
  eventTimeline: FeatureFlagState;
  /** COBRA AI - AI-powered assistance */
  cobraAi: FeatureFlagState;
}

/**
 * Feature flag metadata for admin UI display
 */
export interface FeatureFlagInfo {
  key: keyof FeatureFlags;
  name: string;
  description: string;
  category: 'core' | 'communication' | 'visualization' | 'ai';
}

/**
 * All available feature flags with display metadata
 */
export const featureFlagInfo: FeatureFlagInfo[] = [
  {
    key: 'checklist',
    name: 'Checklist',
    description: 'Create and manage operational checklists from templates',
    category: 'core',
  },
  {
    key: 'chat',
    name: 'External Chat',
    description: 'GroupMe and external messaging platform integration',
    category: 'communication',
  },
  {
    key: 'tasking',
    name: 'Tasking',
    description: 'Task assignment and tracking for team members',
    category: 'core',
  },
  {
    key: 'cobraKai',
    name: 'COBRA KAI',
    description: 'Knowledge and intelligence assistant',
    category: 'ai',
  },
  {
    key: 'eventSummary',
    name: 'Event Summary',
    description: 'Event overview and executive reporting',
    category: 'visualization',
  },
  {
    key: 'statusChart',
    name: 'Status Chart',
    description: 'Visual status tracking dashboard',
    category: 'visualization',
  },
  {
    key: 'eventTimeline',
    name: 'Event Timeline',
    description: 'Chronological view of event activities',
    category: 'visualization',
  },
  {
    key: 'cobraAi',
    name: 'COBRA AI',
    description: 'AI-powered assistance and recommendations',
    category: 'ai',
  },
];

/**
 * All valid states for display in admin UI
 */
export const featureFlagStates: { value: FeatureFlagState; label: string; description: string }[] = [
  { value: 'Active', label: 'Active', description: 'Tool is fully functional' },
  { value: 'ComingSoon', label: 'Coming Soon', description: 'Visible but disabled' },
  { value: 'Hidden', label: 'Hidden', description: 'Not visible in sidebar' },
];

/**
 * Default feature flags (used when API is unavailable)
 */
export const defaultFeatureFlags: FeatureFlags = {
  checklist: 'Active',
  chat: 'ComingSoon',
  tasking: 'ComingSoon',
  cobraKai: 'ComingSoon',
  eventSummary: 'ComingSoon',
  statusChart: 'ComingSoon',
  eventTimeline: 'ComingSoon',
  cobraAi: 'ComingSoon',
};

/**
 * Helper to check if a flag is active
 */
export const isActive = (state: FeatureFlagState): boolean => state === 'Active';

/**
 * Helper to check if a flag should be visible (Active or ComingSoon)
 */
export const isVisible = (state: FeatureFlagState): boolean => state !== 'Hidden';

/**
 * Helper to check if a flag is coming soon
 */
export const isComingSoon = (state: FeatureFlagState): boolean => state === 'ComingSoon';

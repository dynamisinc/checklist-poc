/**
 * Landing Page Experiment Configuration
 *
 * Provides config-based switching between different landing page UX variants.
 * Similar to checklistVariant system but for the main landing/home experience.
 *
 * Variants:
 * - control: Current MyChecklistsPage with card-based layout
 * - taskFirst: Minimal task list - shows incomplete items first
 * - roleAdaptive: Tab-based dashboard adapting to user role
 * - summaryCards: Glanceable summary cards with quick actions
 */

export type LandingPageVariant = 'control' | 'taskFirst' | 'roleAdaptive' | 'summaryCards';

export interface LandingVariantInfo {
  id: LandingPageVariant;
  name: string;
  description: string;
  targetPersona: string;
}

/**
 * Available landing page variants with metadata
 */
export const landingPageVariants: LandingVariantInfo[] = [
  {
    id: 'control',
    name: 'Current (Cards)',
    description: 'Card-based layout grouped by operational period',
    targetPersona: 'General users familiar with current UX',
  },
  {
    id: 'taskFirst',
    name: 'Task-First Minimal',
    description: 'Simple list of incomplete items - what needs attention now',
    targetPersona: 'Operators who need quick task completion',
  },
  {
    id: 'roleAdaptive',
    name: 'Role-Adaptive Dashboard',
    description: 'Tabbed interface: My Tasks, Team Overview, Insights',
    targetPersona: 'Mixed roles - operators, leadership, analysts',
  },
  {
    id: 'summaryCards',
    name: 'Summary Cards',
    description: 'Glanceable stats cards with drill-down capability',
    targetPersona: 'Users who want quick status overview',
  },
];

// Storage key for persisting variant selection
const STORAGE_KEY = 'landingPageVariant';

// URL parameter for override
const URL_PARAM = 'landing';

/**
 * Get the current landing page variant
 * Priority: URL param > localStorage > default (control)
 */
export function getCurrentLandingVariant(): LandingPageVariant {
  // Check URL parameter first (allows sharing specific variant)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVariant = urlParams.get(URL_PARAM);
    if (urlVariant && isValidLandingVariant(urlVariant)) {
      return urlVariant as LandingPageVariant;
    }
  }

  // Check localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidLandingVariant(stored)) {
      return stored as LandingPageVariant;
    }
  }

  // Default to control
  return 'control';
}

/**
 * Set the landing page variant (persists to localStorage)
 */
export function setLandingVariant(variant: LandingPageVariant): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, variant);
    // Dispatch event so components can react
    window.dispatchEvent(new CustomEvent('landingVariantChanged', { detail: variant }));
  }
}

/**
 * Get variant info by ID
 */
export function getLandingVariantInfo(variant: LandingPageVariant): LandingVariantInfo | undefined {
  return landingPageVariants.find((v) => v.id === variant);
}

/**
 * Validate variant string
 */
function isValidLandingVariant(value: string): boolean {
  return landingPageVariants.some((v) => v.id === value);
}

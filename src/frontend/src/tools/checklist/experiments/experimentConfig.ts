/**
 * Experiment Configuration
 *
 * Simple config-based variant selection for small user bases.
 * Instead of probabilistic A/B testing, this allows manual selection
 * of which UX variant to display.
 *
 * Usage:
 * - Admin can set variant in ProfileMenu
 * - Stored in localStorage for persistence
 * - Can be overridden via URL param: ?variant=classic
 */

/**
 * Available checklist detail page variants
 */
export type ChecklistVariant = 'control' | 'classic' | 'compact' | 'progressive';

/**
 * Variant metadata for UI display
 */
export interface VariantInfo {
  id: ChecklistVariant;
  name: string;
  description: string;
  icon: string; // FontAwesome icon name
}

/**
 * All available variants with descriptions
 */
export const checklistVariants: VariantInfo[] = [
  {
    id: 'control',
    name: 'Current (Cards)',
    description: 'Full card layout with all details visible. Rich information display.',
    icon: 'square',
  },
  {
    id: 'classic',
    name: 'Classic Checklist',
    description: 'Simple list like a paper checklist. Minimal, scannable, familiar.',
    icon: 'list-check',
  },
  {
    id: 'compact',
    name: 'Compact Cards',
    description: 'Smaller cards with actions in menu. More items visible per screen.',
    icon: 'table-cells',
  },
  {
    id: 'progressive',
    name: 'Progressive Disclosure',
    description: 'Minimal by default, expand items to see details. Accordion style.',
    icon: 'chevron-down',
  },
];

/**
 * LocalStorage key for storing selected variant
 */
export const VARIANT_STORAGE_KEY = 'checklistUxVariant';

/**
 * URL parameter name for variant override
 */
export const VARIANT_URL_PARAM = 'variant';

/**
 * Get the current variant setting
 * Priority: URL param > localStorage > default ('control')
 */
export function getCurrentVariant(): ChecklistVariant {
  // Check URL parameter first (allows easy testing via link sharing)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlVariant = urlParams.get(VARIANT_URL_PARAM);
    if (urlVariant && isValidVariant(urlVariant)) {
      return urlVariant as ChecklistVariant;
    }
  }

  // Check localStorage
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(VARIANT_STORAGE_KEY);
    if (stored && isValidVariant(stored)) {
      return stored as ChecklistVariant;
    }
  }

  // Default to control (current implementation)
  return 'control';
}

/**
 * Set the variant preference
 */
export function setVariant(variant: ChecklistVariant): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(VARIANT_STORAGE_KEY, variant);
    // Dispatch event so components can react to change
    window.dispatchEvent(new CustomEvent('variantChanged', { detail: variant }));
  }
}

/**
 * Validate that a string is a valid variant ID
 */
export function isValidVariant(value: string): boolean {
  return checklistVariants.some(v => v.id === value);
}

/**
 * Get variant info by ID
 */
export function getVariantInfo(variant: ChecklistVariant): VariantInfo | undefined {
  return checklistVariants.find(v => v.id === variant);
}

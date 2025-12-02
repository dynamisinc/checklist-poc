/**
 * Experiments Module
 *
 * Config-based UX variant selection for testing different
 * UX experiences with a small user base.
 *
 * Includes:
 * - Checklist Detail variants (how individual checklists are displayed)
 * - Landing Page variants (how the main dashboard/home is displayed)
 */

// Checklist Detail Variants
export {
  type ChecklistVariant,
  type VariantInfo,
  checklistVariants,
  getCurrentVariant,
  setVariant,
  isValidVariant,
  getVariantInfo,
  VARIANT_STORAGE_KEY,
  VARIANT_URL_PARAM,
} from './experimentConfig';

export { useChecklistVariant } from './useChecklistVariant';

// Landing Page Variants
export {
  type LandingPageVariant,
  type LandingVariantInfo,
  landingPageVariants,
  getCurrentLandingVariant,
  setLandingVariant,
  getLandingVariantInfo,
} from './landingPageConfig';

export { useLandingVariant } from './useLandingVariant';

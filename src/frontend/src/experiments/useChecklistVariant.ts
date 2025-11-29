/**
 * useChecklistVariant Hook
 *
 * React hook for getting and setting the checklist UX variant.
 * Listens for changes so components re-render when variant switches.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ChecklistVariant,
  getCurrentVariant,
  setVariant as setStoredVariant,
  getVariantInfo,
  checklistVariants,
  type VariantInfo,
} from './experimentConfig';

interface UseChecklistVariantResult {
  /** Current active variant */
  variant: ChecklistVariant;
  /** Info about current variant */
  variantInfo: VariantInfo | undefined;
  /** All available variants */
  allVariants: VariantInfo[];
  /** Set a new variant */
  setVariant: (variant: ChecklistVariant) => void;
  /** Check if current variant matches */
  isVariant: (variant: ChecklistVariant) => boolean;
}

/**
 * Hook to manage checklist UX variant selection
 *
 * @example
 * const { variant, setVariant, isVariant } = useChecklistVariant();
 *
 * if (isVariant('classic')) {
 *   return <ClassicChecklistView />;
 * }
 */
export function useChecklistVariant(): UseChecklistVariantResult {
  const [variant, setVariantState] = useState<ChecklistVariant>(getCurrentVariant);

  // Listen for variant changes (from other tabs or ProfileMenu)
  useEffect(() => {
    const handleVariantChange = (event: CustomEvent<ChecklistVariant>) => {
      setVariantState(event.detail);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'checklistUxVariant' && event.newValue) {
        setVariantState(event.newValue as ChecklistVariant);
      }
    };

    // Listen for custom event (same tab) and storage event (other tabs)
    window.addEventListener('variantChanged', handleVariantChange as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('variantChanged', handleVariantChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Also check URL on mount and navigation
  useEffect(() => {
    const checkUrlParam = () => {
      const currentFromUrl = getCurrentVariant();
      if (currentFromUrl !== variant) {
        setVariantState(currentFromUrl);
      }
    };

    // Check on popstate (back/forward navigation)
    window.addEventListener('popstate', checkUrlParam);
    return () => window.removeEventListener('popstate', checkUrlParam);
  }, [variant]);

  const setVariant = useCallback((newVariant: ChecklistVariant) => {
    setStoredVariant(newVariant);
    setVariantState(newVariant);
  }, []);

  const isVariant = useCallback((checkVariant: ChecklistVariant) => {
    return variant === checkVariant;
  }, [variant]);

  return {
    variant,
    variantInfo: getVariantInfo(variant),
    allVariants: checklistVariants,
    setVariant,
    isVariant,
  };
}

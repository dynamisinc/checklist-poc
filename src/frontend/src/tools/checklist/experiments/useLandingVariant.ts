/**
 * useLandingVariant Hook
 *
 * React hook for managing landing page variant state.
 * Handles localStorage persistence, URL overrides, and cross-tab sync.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  type LandingPageVariant,
  type LandingVariantInfo,
  getCurrentLandingVariant,
  setLandingVariant as setStoredVariant,
  getLandingVariantInfo,
  landingPageVariants,
} from './landingPageConfig';

export interface UseLandingVariantResult {
  /** Current active variant */
  variant: LandingPageVariant;
  /** Info about current variant */
  variantInfo: LandingVariantInfo | undefined;
  /** All available variants */
  allVariants: LandingVariantInfo[];
  /** Set a new variant */
  setVariant: (variant: LandingPageVariant) => void;
  /** Check if current variant matches */
  isVariant: (variant: LandingPageVariant) => boolean;
}

/**
 * Hook for landing page variant management
 */
export function useLandingVariant(): UseLandingVariantResult {
  const [searchParams] = useSearchParams();
  const [variant, setVariantState] = useState<LandingPageVariant>(getCurrentLandingVariant);

  // Update variant and persist
  const setVariant = useCallback((newVariant: LandingPageVariant) => {
    setVariantState(newVariant);
    setStoredVariant(newVariant);
  }, []);

  // Check if current variant matches
  const isVariant = useCallback(
    (checkVariant: LandingPageVariant) => variant === checkVariant,
    [variant]
  );

  // Listen for variant changes (cross-tab sync and custom events)
  useEffect(() => {
    const handleVariantChanged = (event: CustomEvent<LandingPageVariant>) => {
      setVariantState(event.detail);
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'landingPageVariant' && event.newValue) {
        setVariantState(event.newValue as LandingPageVariant);
      }
    };

    window.addEventListener('landingVariantChanged', handleVariantChanged as EventListener);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('landingVariantChanged', handleVariantChanged as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Re-check when URL search params change (e.g., navigating with ?landing=control)
  useEffect(() => {
    const current = getCurrentLandingVariant();
    if (current !== variant) {
      setVariantState(current);
      // Dispatch event so ProfileMenu and other components can sync
      window.dispatchEvent(new CustomEvent('landingVariantChanged', { detail: current }));
    }
  }, [searchParams]);

  return {
    variant,
    variantInfo: getLandingVariantInfo(variant),
    allVariants: landingPageVariants,
    setVariant,
    isVariant,
  };
}

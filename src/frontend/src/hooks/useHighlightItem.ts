/**
 * useHighlightItem Hook
 *
 * Handles highlighting a specific checklist item when navigating from
 * landing pages. Reads ?highlightItem query parameter, scrolls to the
 * item, and manages the highlight animation state.
 *
 * Features:
 * - Reads highlightItem from URL query params
 * - Scrolls item into view with smooth animation
 * - Applies highlight animation that fades after 3 seconds
 * - Clears URL param after highlighting (keeps URL clean)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

interface UseHighlightItemReturn {
  /** The ID of the item currently being highlighted (null if none) */
  highlightedItemId: string | null;
  /** Whether the highlight animation is active */
  isHighlighting: boolean;
  /** Call this to manually clear the highlight */
  clearHighlight: () => void;
  /** Ref callback to attach to item elements - scrolls and highlights when ID matches */
  getItemRef: (itemId: string) => (element: HTMLElement | null) => void;
}

const HIGHLIGHT_DURATION_MS = 3000; // How long to show highlight

export const useHighlightItem = (): UseHighlightItemReturn => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasScrolledRef = useRef(false);

  // Get the highlightItem from URL params
  const highlightParam = searchParams.get('highlightItem');

  // Clear highlight state
  const clearHighlight = useCallback(() => {
    setHighlightedItemId(null);
    setIsHighlighting(false);
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
  }, []);

  // Set up highlight when param changes
  useEffect(() => {
    if (highlightParam) {
      setHighlightedItemId(highlightParam);
      setIsHighlighting(true);
      hasScrolledRef.current = false;

      // Remove the param from URL to keep it clean (after a small delay to allow rendering)
      const cleanupTimeout = setTimeout(() => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('highlightItem');
        setSearchParams(newParams, { replace: true });
      }, 100);

      // Auto-clear highlight after duration
      highlightTimeoutRef.current = setTimeout(() => {
        setIsHighlighting(false);
      }, HIGHLIGHT_DURATION_MS);

      return () => {
        clearTimeout(cleanupTimeout);
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
      };
    }
  }, [highlightParam, searchParams, setSearchParams]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Create ref callback for items
  const getItemRef = useCallback(
    (itemId: string) => (element: HTMLElement | null) => {
      if (
        element &&
        itemId === highlightedItemId &&
        !hasScrolledRef.current
      ) {
        hasScrolledRef.current = true;
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
      }
    },
    [highlightedItemId]
  );

  return {
    highlightedItemId,
    isHighlighting,
    clearHighlight,
    getItemRef,
  };
};

/**
 * CSS keyframes for the highlight animation.
 * Import this and add to your global styles or use with MUI's keyframes.
 */
export const highlightKeyframes = `
@keyframes highlightPulse {
  0% {
    background-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.6);
  }
  50% {
    background-color: rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.3);
  }
  100% {
    background-color: rgba(255, 215, 0, 0.4);
    box-shadow: 0 0 0 2px rgba(255, 215, 0, 0.6);
  }
}
`;

/**
 * MUI sx prop for highlighted items
 */
export const getHighlightSx = (isHighlighted: boolean) =>
  isHighlighted
    ? {
        animation: 'highlightPulse 1s ease-in-out infinite',
        borderRadius: 1,
        transition: 'all 0.3s ease-out',
      }
    : {};

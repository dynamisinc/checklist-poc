/**
 * useChecklistDetail Hook - Single checklist management with real-time updates
 *
 * Provides detailed checklist fetching with items.
 * Handles optimistic updates for item changes and progress tracking.
 * Designed for the Checklist Detail page.
 */

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  checklistService,
  type ChecklistInstanceDto,
  type ChecklistItemDto,
} from '../services/checklistService';

/**
 * Checklist detail hook state
 */
interface UseChecklistDetailState {
  checklist: ChecklistInstanceDto | null;
  loading: boolean;
  error: string | null;
}

/**
 * Checklist detail hook return type
 */
interface UseChecklistDetailReturn extends UseChecklistDetailState {
  // Fetch operations
  fetchChecklist: (checklistId: string) => Promise<void>;
  refreshChecklist: () => Promise<void>;

  // Optimistic item updates (for UI responsiveness)
  updateItemLocally: (itemId: string, updates: Partial<ChecklistItemDto>) => void;

  // State management
  clearError: () => void;
  reset: () => void;
}

/**
 * Custom hook for checklist detail operations
 */
export const useChecklistDetail = (
  checklistId?: string
): UseChecklistDetailReturn => {
  const [state, setState] = useState<UseChecklistDetailState>({
    checklist: null,
    loading: false,
    error: null,
  });

  /**
   * Fetch checklist by ID
   */
  const fetchChecklist = useCallback(
    async (id: string): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const checklist = await checklistService.getChecklistById(id);
        setState({
          checklist,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch checklist ${id}`;
        setState({
          checklist: null,
          loading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
      }
    },
    []
  );

  /**
   * Refresh current checklist
   */
  const refreshChecklist = useCallback(async (): Promise<void> => {
    if (state.checklist) {
      await fetchChecklist(state.checklist.id);
    }
  }, [state.checklist, fetchChecklist]);

  /**
   * Update item locally (optimistic update)
   * Used for immediate UI feedback before server confirmation
   */
  const updateItemLocally = useCallback(
    (itemId: string, updates: Partial<ChecklistItemDto>): void => {
      setState((prev) => {
        if (!prev.checklist) return prev;

        const updatedItems = prev.checklist.items.map((item) =>
          item.id === itemId ? { ...item, ...updates } : item
        );

        // Recalculate progress locally
        const totalItems = updatedItems.length;
        const completedItems = updatedItems.filter(
          (item) => item.isCompleted === true
        ).length;
        const progressPercentage =
          totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

        return {
          ...prev,
          checklist: {
            ...prev.checklist,
            items: updatedItems,
            completedItems,
            progressPercentage: Number(progressPercentage.toFixed(2)),
          },
        };
      });
    },
    []
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState({
      checklist: null,
      loading: false,
      error: null,
    });
  }, []);

  /**
   * Auto-fetch on mount if checklistId provided
   */
  useEffect(() => {
    if (checklistId) {
      fetchChecklist(checklistId);
    }
  }, [checklistId, fetchChecklist]);

  return {
    checklist: state.checklist,
    loading: state.loading,
    error: state.error,
    fetchChecklist,
    refreshChecklist,
    updateItemLocally,
    clearError,
    reset,
  };
};

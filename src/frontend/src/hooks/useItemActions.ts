/**
 * useItemActions Hook - Checklist item operations
 *
 * Provides item-level actions:
 * - Mark complete/incomplete
 * - Update status
 * - Add/update notes
 *
 * Handles optimistic updates and error rollback for responsive UI.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  itemService,
  type UpdateItemCompletionRequest,
  type UpdateItemStatusRequest,
  type UpdateItemNotesRequest,
} from '../services/itemService';
import type { ChecklistItemDto } from '../services/checklistService';

/**
 * Item actions hook state
 */
interface UseItemActionsState {
  loading: boolean;
  error: string | null;
  processingItems: Set<string>; // Track which items are being processed
}

/**
 * Optimistic update callback
 * Called immediately before API request for instant UI feedback
 */
type OptimisticUpdateFn = (
  itemId: string,
  updates: Partial<ChecklistItemDto>
) => void;

/**
 * Item actions hook return type
 */
interface UseItemActionsReturn extends Omit<UseItemActionsState, 'processingItems'> {
  // Completion operations
  markComplete: (
    checklistId: string,
    itemId: string,
    notes?: string,
    onOptimisticUpdate?: OptimisticUpdateFn
  ) => Promise<ChecklistItemDto | null>;

  markIncomplete: (
    checklistId: string,
    itemId: string,
    onOptimisticUpdate?: OptimisticUpdateFn
  ) => Promise<ChecklistItemDto | null>;

  toggleComplete: (
    checklistId: string,
    itemId: string,
    currentStatus: boolean,
    notes?: string,
    onOptimisticUpdate?: OptimisticUpdateFn
  ) => Promise<ChecklistItemDto | null>;

  // Status operations
  updateStatus: (
    checklistId: string,
    itemId: string,
    status: string,
    notes?: string,
    onOptimisticUpdate?: OptimisticUpdateFn
  ) => Promise<ChecklistItemDto | null>;

  // Notes operations
  updateNotes: (
    checklistId: string,
    itemId: string,
    notes: string | undefined,
    onOptimisticUpdate?: OptimisticUpdateFn
  ) => Promise<ChecklistItemDto | null>;

  // State management
  isProcessing: (itemId: string) => boolean;
  clearError: () => void;
}

/**
 * Custom hook for item actions
 */
export const useItemActions = (): UseItemActionsReturn => {
  const [state, setState] = useState<UseItemActionsState>({
    loading: false,
    error: null,
    processingItems: new Set(),
  });

  /**
   * Mark item as complete
   */
  const markComplete = useCallback(
    async (
      checklistId: string,
      itemId: string,
      notes?: string,
      onOptimisticUpdate?: OptimisticUpdateFn
    ): Promise<ChecklistItemDto | null> => {
      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(itemId, {
          isCompleted: true,
          notes,
        });
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        processingItems: new Set([...prev.processingItems, itemId]),
      }));

      try {
        const updatedItem = await itemService.markComplete(
          checklistId,
          itemId,
          notes
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.success('Item marked complete');
        return updatedItem;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to mark item complete';

        // Rollback optimistic update
        if (onOptimisticUpdate) {
          onOptimisticUpdate(itemId, {
            isCompleted: false,
            notes: undefined,
          });
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Mark item as incomplete
   */
  const markIncomplete = useCallback(
    async (
      checklistId: string,
      itemId: string,
      onOptimisticUpdate?: OptimisticUpdateFn
    ): Promise<ChecklistItemDto | null> => {
      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(itemId, {
          isCompleted: false,
        });
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        processingItems: new Set([...prev.processingItems, itemId]),
      }));

      try {
        const updatedItem = await itemService.markIncomplete(checklistId, itemId);
        setState((prev) => ({
          ...prev,
          loading: false,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.success('Item marked incomplete');
        return updatedItem;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to mark item incomplete';

        // Rollback optimistic update
        if (onOptimisticUpdate) {
          onOptimisticUpdate(itemId, {
            isCompleted: true,
          });
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Toggle item completion
   */
  const toggleComplete = useCallback(
    async (
      checklistId: string,
      itemId: string,
      currentStatus: boolean,
      notes?: string,
      onOptimisticUpdate?: OptimisticUpdateFn
    ): Promise<ChecklistItemDto | null> => {
      const newStatus = !currentStatus;

      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(itemId, {
          isCompleted: newStatus,
          notes,
        });
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        processingItems: new Set([...prev.processingItems, itemId]),
      }));

      try {
        const updatedItem = await itemService.toggleComplete(
          checklistId,
          itemId,
          currentStatus,
          notes
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.success(
          newStatus ? 'Item marked complete' : 'Item marked incomplete'
        );
        return updatedItem;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to toggle item';

        // Rollback optimistic update
        if (onOptimisticUpdate) {
          onOptimisticUpdate(itemId, {
            isCompleted: currentStatus,
          });
        }

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Update item status (for status dropdown items)
   */
  const updateStatus = useCallback(
    async (
      checklistId: string,
      itemId: string,
      status: string,
      notes?: string,
      onOptimisticUpdate?: OptimisticUpdateFn
    ): Promise<ChecklistItemDto | null> => {
      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(itemId, {
          currentStatus: status,
          notes,
        });
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        processingItems: new Set([...prev.processingItems, itemId]),
      }));

      try {
        const updatedItem = await itemService.updateItemStatus(
          checklistId,
          itemId,
          { status, notes }
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.success(`Status updated to "${status}"`);
        return updatedItem;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update status';

        // Rollback optimistic update (requires previous status - not available here)
        // In practice, the parent component should handle rollback

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Update item notes
   */
  const updateNotes = useCallback(
    async (
      checklistId: string,
      itemId: string,
      notes: string | undefined,
      onOptimisticUpdate?: OptimisticUpdateFn
    ): Promise<ChecklistItemDto | null> => {
      // Optimistic update
      if (onOptimisticUpdate) {
        onOptimisticUpdate(itemId, {
          notes,
        });
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        processingItems: new Set([...prev.processingItems, itemId]),
      }));

      try {
        const updatedItem = await itemService.updateItemNotes(
          checklistId,
          itemId,
          { notes }
        );
        setState((prev) => ({
          ...prev,
          loading: false,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.success('Notes updated');
        return updatedItem;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update notes';

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          processingItems: new Set(
            [...prev.processingItems].filter((id) => id !== itemId)
          ),
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Check if item is currently being processed
   */
  const isProcessing = useCallback(
    (itemId: string): boolean => {
      return state.processingItems.has(itemId);
    },
    [state.processingItems]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    loading: state.loading,
    error: state.error,
    markComplete,
    markIncomplete,
    toggleComplete,
    updateStatus,
    updateNotes,
    isProcessing,
    clearError,
  };
};

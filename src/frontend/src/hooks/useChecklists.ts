/**
 * useChecklists Hook - Checklist management with state
 *
 * Provides checklist fetching, filtering, and management operations.
 * Handles loading states, errors, and optimistic updates.
 *
 * Note: Uses request deduplication to prevent duplicate API calls
 * that can occur due to React StrictMode double-mounting effects.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  checklistService,
  type ChecklistInstanceDto,
  type CreateFromTemplateRequest,
  type UpdateChecklistRequest,
} from '../services/checklistService';

// Module-level request deduplication to prevent duplicate API calls
// across multiple hook instances (React StrictMode protection)
let fetchMyChecklistsInFlight: Promise<ChecklistInstanceDto[]> | null = null;
let fetchAllChecklistsInFlight: Promise<ChecklistInstanceDto[]> | null = null;
let fetchByEventInFlight: { eventId: string; promise: Promise<ChecklistInstanceDto[]> } | null = null;

/**
 * Checklist hook state
 */
interface UseChecklistsState {
  checklists: ChecklistInstanceDto[];
  allChecklists: ChecklistInstanceDto[];
  loading: boolean;
  error: string | null;
}

/**
 * Checklist hook return type
 */
interface UseChecklistsReturn extends UseChecklistsState {
  // Fetch operations
  fetchMyChecklists: (includeArchived?: boolean) => Promise<void>;
  fetchAllChecklists: (includeArchived?: boolean) => Promise<void>;
  fetchChecklistsByEvent: (
    eventId: string,
    includeArchived?: boolean,
    showAll?: boolean
  ) => Promise<void>;
  fetchChecklistsByPeriod: (
    eventId: string,
    operationalPeriodId: string,
    includeArchived?: boolean
  ) => Promise<void>;

  // Mutation operations
  createFromTemplate: (
    request: CreateFromTemplateRequest
  ) => Promise<ChecklistInstanceDto | null>;
  updateChecklist: (
    checklistId: string,
    request: UpdateChecklistRequest
  ) => Promise<ChecklistInstanceDto | null>;
  cloneChecklist: (
    checklistId: string,
    newName: string
  ) => Promise<ChecklistInstanceDto | null>;
  archiveChecklist: (checklistId: string) => Promise<boolean>;
  restoreChecklist: (checklistId: string) => Promise<boolean>;

  // State management
  clearError: () => void;
  refreshChecklists: () => Promise<void>;
}

/**
 * Custom hook for checklist operations
 */
export const useChecklists = (): UseChecklistsReturn => {
  const [state, setState] = useState<UseChecklistsState>({
    checklists: [],
    allChecklists: [],
    loading: false,
    error: null,
  });


  /**
   * Fetch user's checklists (by position)
   * Deduplicates concurrent requests to prevent double-fetching
   */
  const fetchMyChecklists = useCallback(
    async (includeArchived = false): Promise<void> => {
      // If there's already a request in flight, reuse it
      if (fetchMyChecklistsInFlight) {
        try {
          const checklists = await fetchMyChecklistsInFlight;
          setState((prev) => ({
            ...prev,
            checklists,
            loading: false,
            error: null,
          }));
        } catch {
          // Error already handled by the original request
        }
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        fetchMyChecklistsInFlight = checklistService.getMyChecklists(includeArchived);
        const checklists = await fetchMyChecklistsInFlight;
        setState((prev) => ({
          ...prev,
          checklists,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch checklists';
        setState((prev) => ({
          ...prev,
          checklists: [],
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
      } finally {
        // Clear after a short delay to allow concurrent callers to receive the result
        setTimeout(() => {
          fetchMyChecklistsInFlight = null;
        }, 100);
      }
    },
    []
  );

  /**
   * Fetch all checklists (for team overview / leadership view)
   * Not filtered by position - shows everything
   */
  const fetchAllChecklists = useCallback(
    async (includeArchived = false): Promise<void> => {
      // If there's already a request in flight, reuse it
      if (fetchAllChecklistsInFlight) {
        try {
          const checklists = await fetchAllChecklistsInFlight;
          setState((prev) => ({
            ...prev,
            allChecklists: checklists,
            loading: false,
            error: null,
          }));
        } catch {
          // Error already handled by the original request
        }
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        fetchAllChecklistsInFlight = checklistService.getAllChecklists(includeArchived);
        const checklists = await fetchAllChecklistsInFlight;
        setState((prev) => ({
          ...prev,
          allChecklists: checklists,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch all checklists';
        setState((prev) => ({
          ...prev,
          allChecklists: [],
          loading: false,
          error: errorMessage,
        }));
        // Don't toast for this - might be permission denied
        console.warn('fetchAllChecklists error:', errorMessage);
      } finally {
        setTimeout(() => {
          fetchAllChecklistsInFlight = null;
        }, 100);
      }
    },
    []
  );

  /**
   * Fetch checklists by event
   * @param eventId Event identifier
   * @param includeArchived Include archived checklists
   * @param showAll If true and user has Manage role, shows all checklists regardless of position
   */
  const fetchChecklistsByEvent = useCallback(
    async (eventId: string, includeArchived = false, showAll?: boolean): Promise<void> => {
      // If there's already a request in flight for the same event, reuse it
      if (fetchByEventInFlight && fetchByEventInFlight.eventId === eventId) {
        try {
          const checklists = await fetchByEventInFlight.promise;
          setState((prev) => ({
            ...prev,
            checklists,
            loading: false,
            error: null,
          }));
        } catch {
          // Error already handled by the original request
        }
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const promise = checklistService.getChecklistsByEvent(eventId, includeArchived, showAll);
        fetchByEventInFlight = { eventId, promise };
        const checklists = await promise;
        setState((prev) => ({
          ...prev,
          checklists,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch checklists for event ${eventId}`;
        setState((prev) => ({
          ...prev,
          checklists: [],
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
      } finally {
        setTimeout(() => {
          fetchByEventInFlight = null;
        }, 100);
      }
    },
    []
  );

  /**
   * Fetch checklists by operational period
   */
  const fetchChecklistsByPeriod = useCallback(
    async (
      eventId: string,
      operationalPeriodId: string,
      includeArchived = false
    ): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const checklists =
          await checklistService.getChecklistsByOperationalPeriod(
            eventId,
            operationalPeriodId,
            includeArchived
          );
        setState((prev) => ({
          ...prev,
          checklists,
          loading: false,
          error: null,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch checklists for operational period ${operationalPeriodId}`;
        setState((prev) => ({
          ...prev,
          checklists: [],
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
      }
    },
    []
  );

  /**
   * Create new checklist from template
   */
  const createFromTemplate = useCallback(
    async (
      request: CreateFromTemplateRequest
    ): Promise<ChecklistInstanceDto | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const newChecklist = await checklistService.createFromTemplate(request);
        setState((prev) => ({
          ...prev,
          checklists: [newChecklist, ...prev.checklists],
          loading: false,
        }));
        toast.success(`Checklist "${request.name}" created successfully`);
        return newChecklist;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to create checklist from template';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Update checklist metadata
   */
  const updateChecklist = useCallback(
    async (
      checklistId: string,
      request: UpdateChecklistRequest
    ): Promise<ChecklistInstanceDto | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const updatedChecklist = await checklistService.updateChecklist(
          checklistId,
          request
        );
        setState((prev) => ({
          ...prev,
          checklists: prev.checklists.map((c) =>
            c.id === checklistId ? updatedChecklist : c
          ),
          loading: false,
        }));
        toast.success('Checklist updated successfully');
        return updatedChecklist;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to update checklist';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Clone a checklist
   */
  const cloneChecklist = useCallback(
    async (
      checklistId: string,
      newName: string
    ): Promise<ChecklistInstanceDto | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const clonedChecklist = await checklistService.cloneChecklist(
          checklistId,
          newName
        );
        setState((prev) => ({
          ...prev,
          checklists: [clonedChecklist, ...prev.checklists],
          loading: false,
        }));
        toast.success(`Checklist "${newName}" cloned successfully`);
        return clonedChecklist;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to clone checklist';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        return null;
      }
    },
    []
  );

  /**
   * Archive a checklist
   */
  const archiveChecklist = useCallback(
    async (checklistId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await checklistService.archiveChecklist(checklistId);
        setState((prev) => ({
          ...prev,
          checklists: prev.checklists.filter((c) => c.id !== checklistId),
          loading: false,
        }));
        toast.success('Checklist archived successfully');
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to archive checklist';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        return false;
      }
    },
    []
  );

  /**
   * Restore an archived checklist
   */
  const restoreChecklist = useCallback(
    async (checklistId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await checklistService.restoreChecklist(checklistId);
        setState((prev) => ({ ...prev, loading: false }));
        toast.success('Checklist restored successfully');
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to restore checklist';
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toast.error(errorMessage);
        return false;
      }
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
   * Refresh checklists (re-fetch current list)
   */
  const refreshChecklists = useCallback(async (): Promise<void> => {
    await fetchMyChecklists(false);
  }, [fetchMyChecklists]);

  return {
    checklists: state.checklists,
    allChecklists: state.allChecklists,
    loading: state.loading,
    error: state.error,
    fetchMyChecklists,
    fetchAllChecklists,
    fetchChecklistsByEvent,
    fetchChecklistsByPeriod,
    createFromTemplate,
    updateChecklist,
    cloneChecklist,
    archiveChecklist,
    restoreChecklist,
    clearError,
    refreshChecklists,
  };
};

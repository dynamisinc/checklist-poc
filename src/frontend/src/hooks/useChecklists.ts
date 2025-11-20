/**
 * useChecklists Hook - Checklist management with state
 *
 * Provides checklist fetching, filtering, and management operations.
 * Handles loading states, errors, and optimistic updates.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  checklistService,
  type ChecklistInstanceDto,
  type CreateFromTemplateRequest,
  type UpdateChecklistRequest,
} from '../services/checklistService';

/**
 * Checklist hook state
 */
interface UseChecklistsState {
  checklists: ChecklistInstanceDto[];
  loading: boolean;
  error: string | null;
}

/**
 * Checklist hook return type
 */
interface UseChecklistsReturn extends UseChecklistsState {
  // Fetch operations
  fetchMyChecklists: (includeArchived?: boolean) => Promise<void>;
  fetchChecklistsByEvent: (
    eventId: string,
    includeArchived?: boolean
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
    loading: false,
    error: null,
  });

  /**
   * Fetch user's checklists (by position)
   */
  const fetchMyChecklists = useCallback(
    async (includeArchived = false): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const checklists = await checklistService.getMyChecklists(
          includeArchived
        );
        setState({
          checklists,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch checklists';
        setState({
          checklists: [],
          loading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
      }
    },
    []
  );

  /**
   * Fetch checklists by event
   */
  const fetchChecklistsByEvent = useCallback(
    async (eventId: string, includeArchived = false): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const checklists = await checklistService.getChecklistsByEvent(
          eventId,
          includeArchived
        );
        setState({
          checklists,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch checklists for event ${eventId}`;
        setState({
          checklists: [],
          loading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
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
        setState({
          checklists,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch checklists for operational period ${operationalPeriodId}`;
        setState({
          checklists: [],
          loading: false,
          error: errorMessage,
        });
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
    loading: state.loading,
    error: state.error,
    fetchMyChecklists,
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

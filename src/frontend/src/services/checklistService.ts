/**
 * Checklist Service - API calls for checklist instances
 *
 * Handles all checklist instance operations:
 * - Fetching user's checklists (by position)
 * - Getting single checklist details
 * - Creating checklists from templates
 * - Updating checklist metadata
 * - Cloning checklists
 * - Archiving/restoring checklists
 * - Filtering by event/operational period
 */

import { apiClient, getErrorMessage } from './api';

/**
 * Checklist Instance DTO (matches backend)
 */
export interface ChecklistInstanceDto {
  id: string;
  name: string;
  templateId: string;
  eventId: string;
  eventName: string;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  assignedPositions?: string; // Comma-separated list
  progressPercentage: number;
  totalItems: number;
  completedItems: number;
  requiredItems: number;
  requiredItemsCompleted: number;
  isArchived: boolean;
  archivedBy?: string;
  archivedAt?: string;
  createdBy: string;
  createdByPosition: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedByPosition?: string;
  lastModifiedAt?: string;
  items: ChecklistItemDto[];
}

/**
 * Checklist Item DTO (matches backend)
 */
export interface ChecklistItemDto {
  id: string;
  checklistInstanceId: string;
  templateItemId: string;
  itemText: string;
  itemType: string; // "checkbox" | "status"
  displayOrder: number;
  isRequired: boolean;

  // Checkbox fields
  isCompleted?: boolean;
  completedBy?: string;
  completedByPosition?: string;
  completedAt?: string;

  // Status fields
  currentStatus?: string;
  statusConfiguration?: string; // JSON string of StatusOption[]

  // Common fields
  allowedPositions?: string; // JSON string or comma-separated list
  notes?: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedByPosition?: string;
  lastModifiedAt?: string;
}

/**
 * Request to create checklist from template
 */
export interface CreateFromTemplateRequest {
  templateId: string;
  name: string;
  eventId: string;
  eventName: string;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  assignedPositions?: string; // Comma-separated list
}

/**
 * Request to update checklist metadata
 */
export interface UpdateChecklistRequest {
  name: string;
  eventId: string;
  eventName: string;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  assignedPositions?: string; // Comma-separated list
}

/**
 * Request to clone checklist
 */
export interface CloneChecklistRequest {
  newName: string;
  preserveStatus?: boolean; // If true, preserves completion status and notes (direct copy); if false, resets (clean copy)
}

/**
 * Checklist service interface
 */
export const checklistService = {
  /**
   * Get all checklists for current user's position
   * @param includeArchived Include archived checklists (default: false)
   * @returns Array of checklists visible to user's position
   */
  async getMyChecklists(
    includeArchived = false
  ): Promise<ChecklistInstanceDto[]> {
    try {
      const response = await apiClient.get<ChecklistInstanceDto[]>(
        '/api/checklists/my-checklists',
        {
          params: { includeArchived },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch my checklists:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single checklist by ID
   * @param checklistId Checklist GUID
   * @returns Checklist with items
   */
  async getChecklistById(checklistId: string): Promise<ChecklistInstanceDto> {
    try {
      const response = await apiClient.get<ChecklistInstanceDto>(
        `/api/checklists/${checklistId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch checklist ${checklistId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get checklists by event
   * @param eventId Event identifier
   * @param includeArchived Include archived checklists
   * @returns Array of checklists for event
   */
  async getChecklistsByEvent(
    eventId: string,
    includeArchived = false
  ): Promise<ChecklistInstanceDto[]> {
    try {
      const response = await apiClient.get<ChecklistInstanceDto[]>(
        `/api/checklists/event/${encodeURIComponent(eventId)}`,
        {
          params: { includeArchived },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch checklists for event ${eventId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get checklists by operational period
   * @param eventId Event identifier
   * @param operationalPeriodId Operational period identifier
   * @param includeArchived Include archived checklists
   * @returns Array of checklists for operational period
   */
  async getChecklistsByOperationalPeriod(
    eventId: string,
    operationalPeriodId: string,
    includeArchived = false
  ): Promise<ChecklistInstanceDto[]> {
    try {
      const response = await apiClient.get<ChecklistInstanceDto[]>(
        `/api/checklists/event/${encodeURIComponent(
          eventId
        )}/period/${encodeURIComponent(operationalPeriodId)}`,
        {
          params: { includeArchived },
        }
      );
      return response.data;
    } catch (error) {
      console.error(
        `Failed to fetch checklists for period ${operationalPeriodId}:`,
        error
      );
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create new checklist from template
   * @param request Checklist creation data
   * @returns Newly created checklist
   */
  async createFromTemplate(
    request: CreateFromTemplateRequest
  ): Promise<ChecklistInstanceDto> {
    try {
      const response = await apiClient.post<ChecklistInstanceDto>(
        '/api/checklists',
        request
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create checklist from template:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update checklist metadata
   * @param checklistId Checklist ID to update
   * @param request Updated checklist data
   * @returns Updated checklist
   */
  async updateChecklist(
    checklistId: string,
    request: UpdateChecklistRequest
  ): Promise<ChecklistInstanceDto> {
    try {
      const response = await apiClient.put<ChecklistInstanceDto>(
        `/api/checklists/${checklistId}`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update checklist ${checklistId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Clone an existing checklist
   * @param checklistId Checklist ID to clone
   * @param newName Name for the cloned checklist
   * @param preserveStatus If true, preserves completion status and notes (direct copy); if false, resets (clean copy)
   * @returns Newly created cloned checklist
   */
  async cloneChecklist(
    checklistId: string,
    newName: string,
    preserveStatus = false
  ): Promise<ChecklistInstanceDto> {
    try {
      const response = await apiClient.post<ChecklistInstanceDto>(
        `/api/checklists/${checklistId}/clone`,
        { newName, preserveStatus }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to clone checklist ${checklistId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Archive a checklist (soft delete)
   * @param checklistId Checklist ID to archive
   */
  async archiveChecklist(checklistId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/checklists/${checklistId}`);
    } catch (error) {
      console.error(`Failed to archive checklist ${checklistId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Restore an archived checklist (Admin only)
   * @param checklistId Checklist ID to restore
   */
  async restoreChecklist(checklistId: string): Promise<void> {
    try {
      await apiClient.post(`/api/checklists/${checklistId}/restore`);
    } catch (error) {
      console.error(`Failed to restore checklist ${checklistId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get all archived checklists (Admin only)
   * @returns Array of archived checklists
   */
  async getArchivedChecklists(): Promise<ChecklistInstanceDto[]> {
    try {
      const response = await apiClient.get<ChecklistInstanceDto[]>(
        '/api/checklists/archived'
      );
      return response.data;
    } catch (error) {
      console.error('Failed to fetch archived checklists:', error);
      throw new Error(getErrorMessage(error));
    }
  },
};

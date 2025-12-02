/**
 * Item Service - API calls for checklist item operations
 *
 * Handles all item-level operations:
 * - Getting single item details
 * - Marking items complete/incomplete
 * - Updating status dropdown items
 * - Adding/updating notes
 */

import { apiClient, getErrorMessage } from '../../../core/services/api';
import type { ChecklistItemDto } from './checklistService';

/**
 * Request to update item completion
 */
export interface UpdateItemCompletionRequest {
  isCompleted: boolean;
  notes?: string;
}

/**
 * Request to update item status
 */
export interface UpdateItemStatusRequest {
  status: string;
  notes?: string;
}

/**
 * Request to update item notes
 */
export interface UpdateItemNotesRequest {
  notes?: string;
}

/**
 * Item service interface
 */
export const itemService = {
  /**
   * Get single checklist item
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @returns Item details
   */
  async getItemById(
    checklistId: string,
    itemId: string
  ): Promise<ChecklistItemDto> {
    try {
      const response = await apiClient.get<ChecklistItemDto>(
        `/api/checklists/${checklistId}/items/${itemId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch item ${itemId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update item completion status (checkbox items)
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @param request Completion data
   * @returns Updated item
   */
  async updateItemCompletion(
    checklistId: string,
    itemId: string,
    request: UpdateItemCompletionRequest
  ): Promise<ChecklistItemDto> {
    try {
      const response = await apiClient.patch<ChecklistItemDto>(
        `/api/checklists/${checklistId}/items/${itemId}/completion`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update item completion ${itemId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Mark item as complete
   * Helper method for updateItemCompletion
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @param notes Optional notes
   * @returns Updated item
   */
  async markComplete(
    checklistId: string,
    itemId: string,
    notes?: string
  ): Promise<ChecklistItemDto> {
    return this.updateItemCompletion(checklistId, itemId, {
      isCompleted: true,
      notes,
    });
  },

  /**
   * Mark item as incomplete
   * Helper method for updateItemCompletion
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @returns Updated item
   */
  async markIncomplete(
    checklistId: string,
    itemId: string
  ): Promise<ChecklistItemDto> {
    return this.updateItemCompletion(checklistId, itemId, {
      isCompleted: false,
    });
  },

  /**
   * Toggle item completion
   * Helper method for updateItemCompletion
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @param currentStatus Current completion status
   * @param notes Optional notes
   * @returns Updated item
   */
  async toggleComplete(
    checklistId: string,
    itemId: string,
    currentStatus: boolean,
    notes?: string
  ): Promise<ChecklistItemDto> {
    return this.updateItemCompletion(checklistId, itemId, {
      isCompleted: !currentStatus,
      notes,
    });
  },

  /**
   * Update item status (status dropdown items)
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @param request Status update data
   * @returns Updated item
   */
  async updateItemStatus(
    checklistId: string,
    itemId: string,
    request: UpdateItemStatusRequest
  ): Promise<ChecklistItemDto> {
    try {
      const response = await apiClient.patch<ChecklistItemDto>(
        `/api/checklists/${checklistId}/items/${itemId}/status`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update item status ${itemId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update item notes
   * @param checklistId Checklist GUID
   * @param itemId Item GUID
   * @param request Notes data
   * @returns Updated item
   */
  async updateItemNotes(
    checklistId: string,
    itemId: string,
    request: UpdateItemNotesRequest
  ): Promise<ChecklistItemDto> {
    try {
      const response = await apiClient.patch<ChecklistItemDto>(
        `/api/checklists/${checklistId}/items/${itemId}/notes`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update item notes ${itemId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },
};

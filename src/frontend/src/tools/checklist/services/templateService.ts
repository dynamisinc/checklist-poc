/**
 * Template Service - API calls for checklist templates
 *
 * Handles all template-related operations:
 * - Fetching template list (with filters)
 * - Getting single template details
 * - Creating new templates
 * - Updating existing templates
 * - Duplicating templates
 * - Archiving/restoring templates
 */

import { apiClient, getErrorMessage } from '../../../core/services/api';
import type { Template } from '../../../types';

/**
 * Create Template Request
 * Note: tags must be sent as comma-separated string, not array
 * Note: autoCreateForCategories must be sent as JSON string, not array
 */
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  tags: string; // Comma-separated string like "tag1, tag2, tag3"
  templateType?: number; // 0 = Manual, 1 = AutoCreate, 2 = Recurring
  autoCreateForCategories?: string; // JSON string of incident types array (only for AUTO_CREATE)
  recurrenceConfig?: string; // JSON configuration for recurring templates (future feature)
  items: CreateTemplateItemRequest[];
}

export interface CreateTemplateItemRequest {
  itemText: string;
  itemType: string;
  displayOrder: number;
  isRequired: boolean;
  statusConfiguration: string | null;
  allowedPositions: string | null;
  defaultNotes: string | null;
}

/**
 * Update Template Request
 * Note: tags must be sent as comma-separated string, not array
 * Note: autoCreateForCategories must be sent as JSON string, not array
 */
export interface UpdateTemplateRequest {
  name: string;
  description: string;
  category: string;
  tags: string; // Comma-separated string like "tag1, tag2, tag3"
  templateType?: number; // 0 = Manual, 1 = AutoCreate, 2 = Recurring
  autoCreateForCategories?: string; // JSON string of incident types array (only for AUTO_CREATE)
  recurrenceConfig?: string; // JSON configuration for recurring templates (future feature)
  items: CreateTemplateItemRequest[];
}

/**
 * Template service interface
 */
export const templateService = {
  /**
   * Get all templates
   * @param includeInactive Include inactive templates (default: false)
   * @returns Array of templates
   */
  async getAllTemplates(includeInactive = false): Promise<Template[]> {
    try {
      const response = await apiClient.get<Template[]>('/api/templates', {
        params: { includeInactive },
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get templates by category
   * @param category Template category
   * @param includeInactive Include inactive templates
   * @returns Array of templates in category
   */
  async getTemplatesByCategory(
    category: string,
    includeInactive = false
  ): Promise<Template[]> {
    try {
      const response = await apiClient.get<Template[]>(
        `/api/templates/category/${encodeURIComponent(category)}`,
        {
          params: { includeInactive },
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch templates for category ${category}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get single template by ID
   * @param templateId Template GUID
   * @returns Template with items
   */
  async getTemplateById(templateId: string): Promise<Template> {
    try {
      const response = await apiClient.get<Template>(
        `/api/templates/${templateId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch template ${templateId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Create a new template
   * @param request Template data with items
   * @returns Newly created template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<Template> {
    try {
      const response = await apiClient.post<Template>('/api/templates', request);
      return response.data;
    } catch (error) {
      console.error('Failed to create template:', error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Update an existing template
   * @param templateId Template ID to update
   * @param request Updated template data
   * @returns Updated template
   */
  async updateTemplate(
    templateId: string,
    request: UpdateTemplateRequest
  ): Promise<Template> {
    try {
      const response = await apiClient.put<Template>(
        `/api/templates/${templateId}`,
        request
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to update template ${templateId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Duplicate an existing template
   * @param templateId Template ID to duplicate
   * @param newName Name for the duplicated template
   * @returns Newly created template
   */
  async duplicateTemplate(
    templateId: string,
    newName: string
  ): Promise<Template> {
    try {
      const response = await apiClient.post<Template>(
        `/api/templates/${templateId}/duplicate`,
        { newName }
      );
      return response.data;
    } catch (error) {
      console.error(`Failed to duplicate template ${templateId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Archive a template (soft delete)
   * @param templateId Template ID to archive
   */
  async archiveTemplate(templateId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/templates/${templateId}`);
    } catch (error) {
      console.error(`Failed to archive template ${templateId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Restore an archived template (Admin only)
   * @param templateId Template ID to restore
   */
  async restoreTemplate(templateId: string): Promise<void> {
    try {
      await apiClient.post(`/api/templates/${templateId}/restore`);
    } catch (error) {
      console.error(`Failed to restore template ${templateId}:`, error);
      throw new Error(getErrorMessage(error));
    }
  },

  /**
   * Get all archived templates (Admin only)
   * @returns Array of archived templates
   */
  async getArchivedTemplates(): Promise<Template[]> {
    try {
      const response = await apiClient.get<Template[]>('/api/templates/archived');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch archived templates:', error);
      throw new Error(getErrorMessage(error));
    }
  },
};

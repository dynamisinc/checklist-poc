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

import { apiClient, getErrorMessage } from './api';
import type { Template } from '../types';

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

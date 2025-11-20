/**
 * useTemplates Hook - Template management with state
 *
 * Provides template fetching, filtering, and management operations.
 * Handles loading states, errors, and caching.
 */

import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { templateService } from '../services/templateService';
import type { Template } from '../types';

/**
 * Template hook state
 */
interface UseTemplatesState {
  templates: Template[];
  loading: boolean;
  error: string | null;
}

/**
 * Template hook return type
 */
interface UseTemplatesReturn extends UseTemplatesState {
  // Fetch operations
  fetchTemplates: (includeInactive?: boolean) => Promise<void>;
  fetchTemplatesByCategory: (
    category: string,
    includeInactive?: boolean
  ) => Promise<void>;
  fetchTemplateById: (templateId: string) => Promise<Template | null>;

  // Mutation operations
  duplicateTemplate: (templateId: string, newName: string) => Promise<Template | null>;
  archiveTemplate: (templateId: string) => Promise<boolean>;
  restoreTemplate: (templateId: string) => Promise<boolean>;

  // State management
  clearError: () => void;
  refreshTemplates: () => Promise<void>;
}

/**
 * Custom hook for template operations
 */
export const useTemplates = (): UseTemplatesReturn => {
  const [state, setState] = useState<UseTemplatesState>({
    templates: [],
    loading: false,
    error: null,
  });

  /**
   * Fetch all templates
   */
  const fetchTemplates = useCallback(
    async (includeInactive = false): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const templates = await templateService.getAllTemplates(includeInactive);
        setState({
          templates,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch templates';
        setState({
          templates: [],
          loading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
      }
    },
    []
  );

  /**
   * Fetch templates by category
   */
  const fetchTemplatesByCategory = useCallback(
    async (category: string, includeInactive = false): Promise<void> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const templates = await templateService.getTemplatesByCategory(
          category,
          includeInactive
        );
        setState({
          templates,
          loading: false,
          error: null,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch templates for category ${category}`;
        setState({
          templates: [],
          loading: false,
          error: errorMessage,
        });
        toast.error(errorMessage);
      }
    },
    []
  );

  /**
   * Fetch single template by ID
   */
  const fetchTemplateById = useCallback(
    async (templateId: string): Promise<Template | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const template = await templateService.getTemplateById(templateId);
        setState((prev) => ({ ...prev, loading: false }));
        return template;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : `Failed to fetch template ${templateId}`;
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
   * Duplicate a template
   */
  const duplicateTemplate = useCallback(
    async (templateId: string, newName: string): Promise<Template | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const newTemplate = await templateService.duplicateTemplate(
          templateId,
          newName
        );
        setState((prev) => ({
          ...prev,
          templates: [...prev.templates, newTemplate],
          loading: false,
        }));
        toast.success(`Template "${newName}" created successfully`);
        return newTemplate;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to duplicate template';
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
   * Archive a template
   */
  const archiveTemplate = useCallback(
    async (templateId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await templateService.archiveTemplate(templateId);
        setState((prev) => ({
          ...prev,
          templates: prev.templates.filter((t) => t.id !== templateId),
          loading: false,
        }));
        toast.success('Template archived successfully');
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to archive template';
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
   * Restore an archived template
   */
  const restoreTemplate = useCallback(
    async (templateId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        await templateService.restoreTemplate(templateId);
        setState((prev) => ({ ...prev, loading: false }));
        toast.success('Template restored successfully');
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to restore template';
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
   * Refresh templates (re-fetch current list)
   */
  const refreshTemplates = useCallback(async (): Promise<void> => {
    await fetchTemplates(false);
  }, [fetchTemplates]);

  return {
    templates: state.templates,
    loading: state.loading,
    error: state.error,
    fetchTemplates,
    fetchTemplatesByCategory,
    fetchTemplateById,
    duplicateTemplate,
    archiveTemplate,
    restoreTemplate,
    clearError,
    refreshTemplates,
  };
};

/**
 * Event Service - API client for event management
 *
 * Handles all API calls related to events and event categories.
 * Events represent incidents or planned operations that other POC tools
 * (checklists, operational periods, etc.) are associated with.
 */

import { apiClient } from '../../../core/services/api';
import type {
  Event,
  EventCategory,
  CreateEventRequest,
  UpdateEventRequest,
  EventType,
} from '../types';

/**
 * Event Categories API
 */
export const eventCategoryService = {
  /**
   * Get all event categories with optional filtering
   */
  getCategories: async (eventType?: EventType): Promise<EventCategory[]> => {
    const params = eventType ? { eventType } : {};
    const response = await apiClient.get<EventCategory[]>('/api/eventcategories', { params });
    return response.data;
  },

  /**
   * Get categories grouped by SubGroup for UI display
   */
  getCategoriesGrouped: async (eventType: EventType): Promise<Record<string, EventCategory[]>> => {
    const response = await apiClient.get<Record<string, EventCategory[]>>(
      '/api/eventcategories/grouped',
      { params: { eventType } }
    );
    return response.data;
  },

  /**
   * Get a specific category by ID
   */
  getCategoryById: async (id: string): Promise<EventCategory> => {
    const response = await apiClient.get<EventCategory>(`/api/eventcategories/${id}`);
    return response.data;
  },

  /**
   * Get a specific category by code
   */
  getCategoryByCode: async (code: string): Promise<EventCategory> => {
    const response = await apiClient.get<EventCategory>(`/api/eventcategories/by-code/${code}`);
    return response.data;
  },
};

/**
 * Events API
 */
export const eventService = {
  /**
   * Get all events with optional filtering
   */
  getEvents: async (eventType?: EventType, activeOnly: boolean = true): Promise<Event[]> => {
    const params: Record<string, string | boolean> = { activeOnly };
    if (eventType) {
      params.eventType = eventType;
    }
    const response = await apiClient.get<Event[]>('/api/events', { params });
    return response.data;
  },

  /**
   * Get a specific event by ID
   */
  getEventById: async (id: string): Promise<Event> => {
    const response = await apiClient.get<Event>(`/api/events/${id}`);
    return response.data;
  },

  /**
   * Create a new event
   */
  createEvent: async (request: CreateEventRequest): Promise<Event> => {
    const response = await apiClient.post<Event>('/api/events', request);
    return response.data;
  },

  /**
   * Update an existing event
   */
  updateEvent: async (id: string, request: UpdateEventRequest): Promise<Event> => {
    const response = await apiClient.put<Event>(`/api/events/${id}`, request);
    return response.data;
  },

  /**
   * Archive an event (soft delete)
   */
  archiveEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/events/${id}`);
  },

  /**
   * Restore an archived event
   */
  restoreEvent: async (id: string): Promise<void> => {
    await apiClient.post(`/api/events/${id}/restore`);
  },

  /**
   * Permanently delete an event
   */
  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/events/${id}/permanent`);
  },

  /**
   * Set an event's active status
   */
  setEventActive: async (id: string, isActive: boolean): Promise<void> => {
    await apiClient.patch(`/api/events/${id}/active`, null, { params: { isActive } });
  },
};

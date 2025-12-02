/**
 * Event Types
 *
 * TypeScript interfaces for events - incidents or planned operations
 * that serve as the container for all POC tools.
 */

/**
 * Event type - planned or unplanned
 */
export type EventType = 'Planned' | 'Unplanned';

/**
 * Event category sub-groups (FEMA/ICS/NIMS based)
 */
export type EventCategorySubGroup =
  // Unplanned
  | 'Natural - Weather'
  | 'Natural - Geologic'
  | 'Technological'
  | 'Human-Caused'
  | 'Public Health'
  // Planned
  | 'Special Event'
  | 'Exercise';

/**
 * Event category - FEMA/NIMS standard categories
 */
export interface EventCategory {
  id: string;
  code: string;
  name: string;
  eventType: EventType;
  subGroup: EventCategorySubGroup;
  displayOrder: number;
  isActive: boolean;
  iconName?: string;
}

/**
 * Event - an incident or planned operation
 */
export interface Event {
  id: string;
  name: string;
  description?: string;
  location?: string;
  eventType: EventType;
  primaryCategoryId: string;
  primaryCategory?: EventCategory;
  additionalCategoryIds?: string[];
  isActive: boolean;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

/**
 * Request to create a new event
 */
export interface CreateEventRequest {
  name: string;
  eventType: EventType;
  primaryCategoryId: string;
  additionalCategoryIds?: string[];
}

/**
 * Request to update an existing event
 */
export interface UpdateEventRequest {
  name: string;
  primaryCategoryId: string;
  additionalCategoryIds?: string[];
  isActive: boolean;
}

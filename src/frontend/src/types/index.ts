/**
 * Type Definitions for Checklist POC
 * 
 * These interfaces define the data structures for templates, checklist instances,
 * and checklist items. They align with the backend C# models and provide
 * type safety throughout the React application.
 */

// ============================================================================
// Template Types
// ============================================================================

/**
 * Checklist Template
 * Templates are reusable checklist definitions that can be instantiated
 * for specific events/incidents.
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  isActive: boolean;
  isArchived: boolean;
  items: TemplateItem[];
  createdBy: string;
  createdByPosition: string;
  createdAt: string; // ISO 8601 datetime
  lastModifiedBy?: string;
  lastModifiedByPosition?: string;
  lastModifiedAt?: string; // ISO 8601 datetime
}

/**
 * Template Item Configuration
 * Defines a single item in a template (before instantiation)
 */
export interface TemplateItem {
  id: string;
  templateId: string;
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;
  statusConfiguration?: string; // JSON string of StatusOption[] (only for status type)
  allowedPositions?: string; // JSON string of positions
  defaultNotes?: string;
}

/**
 * Status option for dropdown items
 * Matches backend StatusOption model
 */
export interface StatusOption {
  label: string;
  isCompletion: boolean; // Does this status count toward progress?
  order: number;
}

/**
 * Template categories align with ICS functions
 */
export enum TemplateCategory {
  ICS_FORMS = 'ICS Forms',
  SAFETY = 'Safety',
  OPERATIONS = 'Operations',
  PLANNING = 'Planning',
  LOGISTICS = 'Logistics',
  FINANCE_ADMIN = 'Finance/Admin',
  COMMUNICATIONS = 'Communications',
  GENERAL = 'General',
}

/**
 * Item types supported
 */
export enum ItemType {
  CHECKBOX = 'checkbox',
  STATUS = 'status',
}

// ============================================================================
// Checklist Instance Types
// ============================================================================

/**
 * Checklist Instance
 * An instantiated checklist from a template, associated with a specific event
 */
export interface ChecklistInstance {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  eventId: string;
  eventName: string;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  assignedPositions: string[];
  items: ChecklistItem[];
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
  unreadChangeCount?: number; // Client-side calculated
}

/**
 * Checklist Item (Instance)
 * An item within a checklist instance that can be completed
 */
export interface ChecklistItem {
  id: string;
  checklistInstanceId: string;
  templateItemId: string;
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;

  // Checkbox specific
  isCompleted?: boolean;
  completedBy?: string;
  completedByPosition?: string;
  completedAt?: string;

  // Status dropdown specific
  currentStatus?: string;
  statusConfiguration?: string; // JSON string of StatusOption[] (copied from template)

  // Common
  notes?: string; // Notes field from backend
  allowedPositions?: string; // JSON string of positions
  createdAt: string;
  lastModifiedBy?: string;
  lastModifiedByPosition?: string;
  lastModifiedAt?: string;
}

/**
 * Status change history for dropdown items
 */
export interface ItemStatusHistory {
  id: string;
  checklistItemId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedByPosition: string;
  changedAt: string;
}

/**
 * Note attached to a checklist item
 */
export interface ItemNote {
  id: string;
  checklistItemId: string;
  noteText: string;
  createdBy: string;
  createdByPosition: string;
  createdAt: string;
  editedBy?: string;
  editedAt?: string;
  isEdited: boolean;
}

// ============================================================================
// Request/Response DTOs
// ============================================================================

/**
 * Request to create a new template
 */
export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  items: CreateTemplateItemRequest[];
}

export interface CreateTemplateItemRequest {
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;
  statusOptions?: StatusOption[];
  allowedPositions?: string[];
  defaultNotes?: string;
}

/**
 * Request to update an existing template
 */
export interface UpdateTemplateRequest {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  items: UpdateTemplateItemRequest[];
}

export interface UpdateTemplateItemRequest {
  id?: string; // Null for new items
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;
  statusOptions?: StatusOption[];
  allowedPositions?: string[];
  defaultNotes?: string;
  isDeleted?: boolean; // Mark for deletion
}

/**
 * Request to create a checklist instance from a template
 */
export interface CreateChecklistRequest {
  templateId: string;
  name: string;
  eventId: string;
  operationalPeriodId?: string;
  assignedPositions: string[];
}

/**
 * Request to create checklist from multiple templates
 */
export interface CreateCombinedChecklistRequest {
  templateIds: string[];
  name: string;
  eventId: string;
  operationalPeriodId?: string;
  assignedPositions: string[];
}

/**
 * Request to update item completion status
 */
export interface UpdateItemCompletionRequest {
  isCompleted: boolean;
}

/**
 * Request to update item status (for dropdown items)
 */
export interface UpdateItemStatusRequest {
  status: string;
}

/**
 * Request to add a note to an item
 */
export interface AddItemNoteRequest {
  noteText: string;
}

/**
 * Request to reorder items
 */
export interface ReorderItemsRequest {
  itemIds: string[]; // Array of item IDs in desired order
}

/**
 * Request to bulk update items
 */
export interface BulkUpdateItemsRequest {
  itemIds: string[];
  action: BulkAction;
  targetStatus?: string; // For status changes
}

export enum BulkAction {
  MARK_COMPLETE = 'mark_complete',
  MARK_INCOMPLETE = 'mark_incomplete',
  CHANGE_STATUS = 'change_status',
}

// ============================================================================
// Mock Data / POC Types
// ============================================================================

/**
 * Mock user for POC (replaces actual authentication)
 */
export interface MockUser {
  id: string;
  email: string;
  displayName: string;
  position: string;
  eventId: string;
  eventName: string;
}

/**
 * Mock event for POC
 */
export interface MockEvent {
  id: string;
  name: string;
  incidentType: string;
  isActive: boolean;
  operationalPeriods: MockOperationalPeriod[];
}

/**
 * Mock operational period
 */
export interface MockOperationalPeriod {
  id: string;
  eventId: string;
  name: string;
  startDateTime: string;
  endDateTime: string;
  isActive: boolean;
}

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Filter state for template library
 */
export interface TemplateFilters {
  category?: TemplateCategory;
  tags?: string[];
  search?: string;
  showArchived: boolean;
}

/**
 * Filter state for checklist list
 */
export interface ChecklistFilters {
  eventId?: string;
  operationalPeriodId?: string;
  position?: string;
  showArchived: boolean;
  showCompleted: boolean;
}

/**
 * Sort options for lists
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
}

// ============================================================================
// SignalR Hub Types
// ============================================================================

/**
 * SignalR message types for real-time updates
 */
export interface ItemCompletedMessage {
  checklistId: string;
  itemId: string;
  isCompleted: boolean;
  completedBy: string;
  completedByPosition: string;
  completedAt: string;
}

export interface ItemStatusChangedMessage {
  checklistId: string;
  itemId: string;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  changedByPosition: string;
  changedAt: string;
}

export interface ItemNoteAddedMessage {
  checklistId: string;
  itemId: string;
  note: ItemNote;
}

export interface ChecklistUpdatedMessage {
  checklistId: string;
  updateType: 'item_added' | 'item_removed' | 'metadata_changed';
  updatedBy: string;
  updatedByPosition: string;
  updatedAt: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

/**
 * API Error response
 */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>; // Validation errors
}

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

/**
 * Toast notification type
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number; // milliseconds
}

// ============================================================================
// Form State Types
// ============================================================================

/**
 * Form validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Form state for template editor
 */
export interface TemplateFormState {
  name: string;
  description: string;
  category: TemplateCategory | '';
  tags: string[];
  items: TemplateItemFormState[];
  errors: ValidationError[];
  isDirty: boolean;
}

export interface TemplateItemFormState {
  id?: string;
  itemText: string;
  itemType: ItemType;
  displayOrder: number;
  isRequired: boolean;
  statusOptions: StatusOption[];
  allowedPositions: string[];
  defaultNotes: string;
  isNew: boolean;
  isDeleted: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default status options for new dropdown items
 */
export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { label: 'Not Started', isCompletion: false, order: 1 },
  { label: 'In Progress', isCompletion: false, order: 2 },
  { label: 'Complete', isCompletion: true, order: 3 },
  { label: 'N/A', isCompletion: true, order: 4 },
  { label: 'Blocked', isCompletion: false, order: 5 },
];

/**
 * Available ICS positions (for POC - normally from API)
 */
export const ICS_POSITIONS = [
  'Incident Commander',
  'Operations Section Chief',
  'Planning Section Chief',
  'Logistics Section Chief',
  'Finance/Admin Section Chief',
  'Safety Officer',
  'Public Information Officer',
  'Liaison Officer',
] as const;

export type ICSPosition = typeof ICS_POSITIONS[number];

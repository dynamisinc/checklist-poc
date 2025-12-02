/**
 * Events Module - Shared across all tools
 *
 * Provides event management functionality including:
 * - Event listing and selection
 * - Event creation
 * - Event categories
 *
 * This module is shared because events are the top-level container
 * for all POC tools.
 */

// Components
export { EventSelector } from './components/EventSelector';
export { CreateEventDialog } from './components/CreateEventDialog';

// Hooks
export { useEvents, getCurrentEvent, triggerEventChange } from './hooks/useEvents';

// Services
export { eventService, eventCategoryService } from './services/eventService';

// Pages
export { EventsListPage } from './pages/EventsListPage';
export { EventLandingPage } from './pages/EventLandingPage';

// Types
export type {
  Event,
  EventType,
  EventCategory,
  EventCategorySubGroup,
  CreateEventRequest,
  UpdateEventRequest,
} from './types';

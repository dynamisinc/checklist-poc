/**
 * useEvents Hook
 *
 * Provides event management throughout the application.
 * - Fetches events from API
 * - Manages current selected event (persisted to localStorage)
 * - Provides event switching functionality
 *
 * For POC, the current event is stored in localStorage.
 * In production, this would come from server-side session or URL.
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { eventService, eventCategoryService } from '../services/eventService';
import type { Event, EventCategory, CreateEventRequest, EventType } from '../types';

// Module-level request deduplication to prevent duplicate API calls
// across multiple hook instances (React StrictMode protection)
let fetchEventsInFlight: Promise<Event[]> | null = null;

interface UseEventsResult {
  // State
  events: Event[];
  categories: EventCategory[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchEvents: () => Promise<void>;
  fetchCategories: (eventType?: EventType) => Promise<void>;
  selectEvent: (event: Event) => void;
  createEvent: (request: CreateEventRequest) => Promise<Event>;
  archiveEvent: (eventId: string) => Promise<void>;
  refreshCurrentEvent: () => Promise<void>;
}

const CURRENT_EVENT_KEY = 'currentEvent';
const DEFAULT_EVENT_ID = '00000000-0000-0000-0000-000000000001'; // Default seeded event

/**
 * Get current event from localStorage
 */
const getStoredEvent = (): Event | null => {
  try {
    const stored = localStorage.getItem(CURRENT_EVENT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load current event:', error);
  }
  return null;
};

/**
 * Store current event to localStorage
 */
const storeEvent = (event: Event | null) => {
  try {
    if (event) {
      localStorage.setItem(CURRENT_EVENT_KEY, JSON.stringify(event));
    } else {
      localStorage.removeItem(CURRENT_EVENT_KEY);
    }
    // Dispatch event for cross-component updates
    window.dispatchEvent(new Event('eventChanged'));
  } catch (error) {
    console.error('Failed to store current event:', error);
  }
};

/**
 * useEvents Hook
 */
export const useEvents = (): UseEventsResult => {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(getStoredEvent());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all active events from API
   * Uses module-level deduplication to prevent duplicate API calls
   * when multiple components mount simultaneously
   */
  const fetchEvents = useCallback(async () => {
    // If there's already a request in flight, reuse it
    if (fetchEventsInFlight) {
      try {
        const eventsArray = await fetchEventsInFlight;
        setEvents(eventsArray);

        // Update current event from shared result
        if (!currentEvent && eventsArray.length > 0) {
          const defaultEvent = eventsArray.find(e => e.id === DEFAULT_EVENT_ID) || eventsArray[0];
          setCurrentEvent(defaultEvent);
          storeEvent(defaultEvent);
        } else if (currentEvent) {
          const updatedEvent = eventsArray.find(e => e.id === currentEvent.id);
          if (updatedEvent) {
            setCurrentEvent(updatedEvent);
            storeEvent(updatedEvent);
          }
        }
      } catch {
        // Error already handled by the original request
      }
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create the promise and store it for deduplication
      fetchEventsInFlight = eventService.getEvents(undefined, false);
      const data = await fetchEventsInFlight;

      // Ensure data is an array (defensive programming)
      const eventsArray = Array.isArray(data) ? data : [];
      setEvents(eventsArray);

      // If no current event is set, try to select the default or first event
      if (!currentEvent && eventsArray.length > 0) {
        const defaultEvent = eventsArray.find(e => e.id === DEFAULT_EVENT_ID) || eventsArray[0];
        setCurrentEvent(defaultEvent);
        storeEvent(defaultEvent);
      }

      // If current event is not in the list, update it with fresh data
      if (currentEvent) {
        const updatedEvent = eventsArray.find(e => e.id === currentEvent.id);
        if (updatedEvent) {
          setCurrentEvent(updatedEvent);
          storeEvent(updatedEvent);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
      // Clear the in-flight request after a short delay to allow
      // all concurrent callers to receive the result
      setTimeout(() => {
        fetchEventsInFlight = null;
      }, 100);
    }
  }, [currentEvent]);

  /**
   * Fetch event categories from API
   */
  const fetchCategories = useCallback(async (eventType?: EventType) => {
    try {
      setLoading(true);
      const data = await eventCategoryService.getCategories(eventType);
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error state for categories - it's not critical
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select a different event as current
   */
  const selectEvent = useCallback((event: Event) => {
    console.log('[useEvents] Selecting event:', event.name);
    setCurrentEvent(event);
    storeEvent(event);
    toast.info(`Switched to: ${event.name}`);
  }, []);

  /**
   * Create a new event
   */
  const createEvent = useCallback(async (request: CreateEventRequest): Promise<Event> => {
    try {
      setLoading(true);
      const newEvent = await eventService.createEvent(request);
      setEvents(prev => [newEvent, ...prev]);
      toast.success(`Created event: ${newEvent.name}`);
      // Notify other hook instances to refresh their events list
      window.dispatchEvent(new Event('eventsListChanged'));
      return newEvent;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Archive an event (soft delete)
   */
  const archiveEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      setLoading(true);
      await eventService.archiveEvent(eventId);

      // Remove from local events list
      setEvents(prev => prev.filter(e => e.id !== eventId));

      // If this was the current event, switch to another event or clear
      if (currentEvent?.id === eventId) {
        const remainingEvents = events.filter(e => e.id !== eventId);
        if (remainingEvents.length > 0) {
          setCurrentEvent(remainingEvents[0]);
          storeEvent(remainingEvents[0]);
          toast.info(`Switched to: ${remainingEvents[0].name}`);
        } else {
          setCurrentEvent(null);
          storeEvent(null);
        }
      }

      toast.success('Event archived');
      // Notify other hook instances to refresh their events list
      window.dispatchEvent(new Event('eventsListChanged'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive event';
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentEvent, events]);

  /**
   * Refresh current event data from API
   */
  const refreshCurrentEvent = useCallback(async () => {
    if (!currentEvent) return;

    try {
      const updated = await eventService.getEventById(currentEvent.id);
      setCurrentEvent(updated);
      storeEvent(updated);
    } catch (err) {
      console.error('Error refreshing current event:', err);
    }
  }, [currentEvent]);

  // Load events on mount
  useEffect(() => {
    fetchEvents();
  }, []);

  // Listen for event changes from other components
  useEffect(() => {
    const handleEventChange = () => {
      const storedEvent = getStoredEvent();
      // Always update to ensure all hook instances stay in sync
      setCurrentEvent(storedEvent);
    };

    window.addEventListener('eventChanged', handleEventChange);
    window.addEventListener('storage', handleEventChange);

    return () => {
      window.removeEventListener('eventChanged', handleEventChange);
      window.removeEventListener('storage', handleEventChange);
    };
  }, []);

  // Listen for events list changes (when new event is created from another component)
  useEffect(() => {
    const handleEventsListChange = () => {
      // Refetch events from API to sync all hook instances
      fetchEvents();
    };

    window.addEventListener('eventsListChanged', handleEventsListChange);

    return () => {
      window.removeEventListener('eventsListChanged', handleEventsListChange);
    };
  }, [fetchEvents]);

  return {
    events,
    categories,
    currentEvent,
    loading,
    error,
    fetchEvents,
    fetchCategories,
    selectEvent,
    createEvent,
    archiveEvent,
    refreshCurrentEvent,
  };
};

/**
 * Get current event synchronously (for non-hook contexts)
 */
export const getCurrentEvent = (): Event | null => {
  return getStoredEvent();
};

/**
 * Trigger event change (for same-tab updates)
 */
export const triggerEventChange = () => {
  window.dispatchEvent(new Event('eventChanged'));
};

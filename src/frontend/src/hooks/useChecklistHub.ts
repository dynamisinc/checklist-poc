import { useEffect, useRef, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { toast } from 'react-toastify';

/**
 * Event handlers for real-time checklist updates
 */
export interface ChecklistHubHandlers {
  onItemCompletionChanged?: (data: ItemCompletionChangedEvent) => void;
  onItemStatusChanged?: (data: ItemStatusChangedEvent) => void;
  onItemNotesChanged?: (data: ItemNotesChangedEvent) => void;
  onChecklistUpdated?: (data: ChecklistUpdatedEvent) => void;
}

export interface ItemCompletionChangedEvent {
  checklistId: string;
  itemId: string;
  isCompleted: boolean;
  completedBy: string | null;
  completedByPosition: string | null;
  completedAt: string | null;
}

export interface ItemStatusChangedEvent {
  checklistId: string;
  itemId: string;
  newStatus: string;
  isCompleted: boolean;
  changedBy: string;
  changedByPosition: string;
  changedAt: string;
}

export interface ItemNotesChangedEvent {
  checklistId: string;
  itemId: string;
  notes: string;
  changedBy: string;
  changedByPosition: string;
  changedAt: string;
}

export interface ChecklistUpdatedEvent {
  checklistId: string;
  progressPercentage: number;
}

/**
 * Custom hook to manage SignalR connection for real-time checklist collaboration
 *
 * Features:
 * - Auto-connect to SignalR hub when checklist is loaded
 * - Join checklist-specific group for scoped updates
 * - Auto-reconnect on connection loss
 * - Clean disconnect on unmount
 * - Event handlers for all checklist update types
 *
 * Usage:
 * ```typescript
 * const { connectionState, joinChecklist, leaveChecklist } = useChecklistHub({
 *   onItemCompletionChanged: (data) => {
 *     console.log('Item completed:', data.itemId);
 *     // Update local state
 *   }
 * });
 *
 * useEffect(() => {
 *   if (checklistId) {
 *     joinChecklist(checklistId);
 *   }
 *   return () => {
 *     if (checklistId) {
 *       leaveChecklist(checklistId);
 *     }
 *   };
 * }, [checklistId]);
 * ```
 */
export const useChecklistHub = (handlers: ChecklistHubHandlers = {}) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const handlersRef = useRef(handlers);

  // Update handlers ref when they change (avoid reconnection)
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Initialize SignalR connection
  useEffect(() => {
    const hubUrl = `${import.meta.env.VITE_API_URL}/hubs/checklist`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true, // Support CORS credentials
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 30s thereafter
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        },
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register event handlers
    connection.on('ItemCompletionChanged', (data: ItemCompletionChangedEvent) => {
      console.log('[SignalR] ItemCompletionChanged:', data);
      handlersRef.current.onItemCompletionChanged?.(data);
    });

    connection.on('ItemStatusChanged', (data: ItemStatusChangedEvent) => {
      console.log('[SignalR] ItemStatusChanged:', data);
      handlersRef.current.onItemStatusChanged?.(data);
    });

    connection.on('ItemNotesChanged', (data: ItemNotesChangedEvent) => {
      console.log('[SignalR] ItemNotesChanged:', data);
      handlersRef.current.onItemNotesChanged?.(data);
    });

    connection.on('ChecklistUpdated', (data: ChecklistUpdatedEvent) => {
      console.log('[SignalR] ChecklistUpdated:', data);
      handlersRef.current.onChecklistUpdated?.(data);
    });

    // Connection lifecycle events
    connection.onreconnecting((error) => {
      console.warn('[SignalR] Reconnecting...', error);
      toast.warning('Connection lost. Reconnecting...', { autoClose: 3000 });
    });

    connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected:', connectionId);
      toast.success('Reconnected to real-time updates', { autoClose: 2000 });
    });

    connection.onclose((error) => {
      console.error('[SignalR] Connection closed:', error);
      if (error) {
        toast.error('Real-time connection closed. Please refresh the page.', {
          autoClose: false,
        });
      }
    });

    // Start connection
    connection
      .start()
      .then(() => {
        console.log('[SignalR] Connected to ChecklistHub');
      })
      .catch((error) => {
        console.error('[SignalR] Connection failed:', error);
        toast.error('Failed to connect to real-time updates', { autoClose: 5000 });
      });

    connectionRef.current = connection;

    // Cleanup on unmount
    return () => {
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        connection
          .stop()
          .then(() => console.log('[SignalR] Connection stopped'))
          .catch((error) => console.error('[SignalR] Error stopping connection:', error));
      }
    };
  }, []); // Empty deps - only initialize once

  /**
   * Join a checklist-specific group to receive real-time updates
   */
  const joinChecklist = useCallback(async (checklistId: string) => {
    const connection = connectionRef.current;
    if (!connection) {
      console.warn('[SignalR] Cannot join checklist: connection not initialized');
      return;
    }

    try {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('JoinChecklist', checklistId);
        console.log(`[SignalR] Joined checklist ${checklistId}`);
      } else {
        console.warn(
          `[SignalR] Cannot join checklist: connection state is ${connection.state}`
        );
      }
    } catch (error) {
      console.error('[SignalR] Error joining checklist:', error);
    }
  }, []);

  /**
   * Leave a checklist-specific group to stop receiving updates
   */
  const leaveChecklist = useCallback(async (checklistId: string) => {
    const connection = connectionRef.current;
    if (!connection) {
      return;
    }

    try {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('LeaveChecklist', checklistId);
        console.log(`[SignalR] Left checklist ${checklistId}`);
      }
    } catch (error) {
      console.error('[SignalR] Error leaving checklist:', error);
    }
  }, []);

  return {
    connectionState: connectionRef.current?.state ?? signalR.HubConnectionState.Disconnected,
    joinChecklist,
    leaveChecklist,
  };
};

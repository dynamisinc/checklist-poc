import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { ChatMessageDto, ExternalChannelMappingDto, ChatThreadDto } from '../types/chat';

/**
 * Connection state for UI display
 */
export type ChatConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

/**
 * Event handlers for real-time chat updates
 */
export interface ChatHubHandlers {
  onReceiveChatMessage?: (message: ChatMessageDto) => void;
  onExternalChannelConnected?: (channel: ExternalChannelMappingDto) => void;
  onExternalChannelDisconnected?: (channelId: string) => void;
  /** Called when a channel is created */
  onChannelCreated?: (channel: ChatThreadDto) => void;
  /** Called when a channel is archived */
  onChannelArchived?: (channelId: string) => void;
  /** Called when a channel is restored */
  onChannelRestored?: (channel: ChatThreadDto) => void;
  /** Called when a channel is permanently deleted */
  onChannelDeleted?: (channelId: string) => void;
  /** Called when connection is restored after being lost - use to refresh data */
  onReconnected?: () => void;
}

/**
 * Custom hook to manage SignalR connection for real-time chat
 *
 * Features:
 * - Auto-connect to SignalR ChatHub
 * - Join event-specific group for scoped updates
 * - Auto-reconnect on connection loss
 * - Clean disconnect on unmount
 * - Event handlers for messages and channel updates
 * - Browser offline/online detection for faster UX feedback
 */
export const useChatHub = (handlers: ChatHubHandlers = {}) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const handlersRef = useRef(handlers);
  const hasConnectedOnceRef = useRef(false);
  const isConnectingRef = useRef(false);

  // UI connection state - this is what we show to users
  // It can be set by: SignalR callbacks, browser offline events, or API failures
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('disconnected');

  // Track if we've manually detected offline (browser event or API failure)
  // This prevents SignalR's "still connected" state from overriding our offline UI
  const isManuallyOfflineRef = useRef(false);

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  /**
   * Attempt to restart the SignalR connection
   * Called when browser comes back online or when we want to retry
   */
  const restartConnection = useCallback(async () => {
    const connection = connectionRef.current;
    if (!connection) return;

    // Only restart if disconnected
    if (connection.state === signalR.HubConnectionState.Disconnected) {
      console.log('[ChatHub] Attempting to restart connection...');
      setConnectionState('connecting');
      try {
        await connection.start();
        console.log('[ChatHub] Connection restarted successfully');
        setConnectionState('connected');
        isManuallyOfflineRef.current = false;
        handlersRef.current.onReconnected?.();
      } catch (error) {
        console.error('[ChatHub] Failed to restart connection:', error);
        setConnectionState('disconnected');
      }
    }
  }, []);

  // Initialize SignalR connection
  useEffect(() => {
    if (isConnectingRef.current || connectionRef.current) {
      return;
    }
    isConnectingRef.current = true;

    // Use chat hub URL (defaults to /hubs/chat)
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const hubUrl = `${apiUrl}/hubs/chat`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        withCredentials: true,
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Quick first retry, then back off
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 5000;
          if (retryContext.previousRetryCount < 10) return 10000;
          // After 10 retries, give up and let manual reconnect handle it
          return null;
        },
      })
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Register event handlers
    connection.on('ReceiveChatMessage', (message: ChatMessageDto) => {
      console.log('[ChatHub] ReceiveChatMessage:', message);
      handlersRef.current.onReceiveChatMessage?.(message);
    });

    connection.on('ExternalChannelConnected', (channel: ExternalChannelMappingDto) => {
      console.log('[ChatHub] ExternalChannelConnected:', channel);
      handlersRef.current.onExternalChannelConnected?.(channel);
    });

    connection.on('ExternalChannelDisconnected', (channelId: string) => {
      console.log('[ChatHub] ExternalChannelDisconnected:', channelId);
      handlersRef.current.onExternalChannelDisconnected?.(channelId);
    });

    connection.on('ChannelCreated', (channel: ChatThreadDto) => {
      console.log('[ChatHub] ChannelCreated:', channel);
      handlersRef.current.onChannelCreated?.(channel);
    });

    connection.on('ChannelArchived', (channelId: string) => {
      console.log('[ChatHub] ChannelArchived:', channelId);
      handlersRef.current.onChannelArchived?.(channelId);
    });

    connection.on('ChannelRestored', (channel: ChatThreadDto) => {
      console.log('[ChatHub] ChannelRestored:', channel);
      handlersRef.current.onChannelRestored?.(channel);
    });

    connection.on('ChannelDeleted', (channelId: string) => {
      console.log('[ChatHub] ChannelDeleted:', channelId);
      handlersRef.current.onChannelDeleted?.(channelId);
    });

    // Connection lifecycle events from SignalR
    connection.onreconnecting((error) => {
      console.warn('[ChatHub] SignalR reconnecting...', error);
      // Only show reconnecting if we haven't manually detected offline
      if (!isManuallyOfflineRef.current) {
        setConnectionState('reconnecting');
      }
    });

    connection.onreconnected((connectionId) => {
      console.log('[ChatHub] SignalR reconnected:', connectionId);
      setConnectionState('connected');
      isManuallyOfflineRef.current = false;
      handlersRef.current.onReconnected?.();
    });

    connection.onclose((error) => {
      console.warn('[ChatHub] SignalR connection closed', error);
      setConnectionState('disconnected');
      if (hasConnectedOnceRef.current && error) {
        console.error('[ChatHub] Connection closed with error:', error);
      }
    });

    connectionRef.current = connection;

    // Start initial connection
    setConnectionState('connecting');
    connection
      .start()
      .then(() => {
        console.log('[ChatHub] Connected');
        hasConnectedOnceRef.current = true;
        setConnectionState('connected');
      })
      .catch((error) => {
        setConnectionState('disconnected');
        const isStrictModeError = error?.message?.includes('stopped during negotiation');
        if (!hasConnectedOnceRef.current && isStrictModeError) {
          return;
        }
        console.error('[ChatHub] Connection failed:', error);
      });

    // Browser online/offline event handlers
    const attemptReconnect = () => {
      const conn = connectionRef.current;
      if (conn && conn.state === signalR.HubConnectionState.Disconnected) {
        console.log('[ChatHub] Attempting to reconnect...');
        setConnectionState('connecting');
        conn.start()
          .then(() => {
            console.log('[ChatHub] Reconnected successfully');
            setConnectionState('connected');
            isManuallyOfflineRef.current = false;
            handlersRef.current.onReconnected?.();
          })
          .catch((err) => {
            console.error('[ChatHub] Failed to reconnect:', err);
            setConnectionState('disconnected');
          });
      }
    };

    const handleOnline = () => {
      console.log('[ChatHub] Browser reports online');
      isManuallyOfflineRef.current = false;
      // Small delay to let network stabilize
      setTimeout(attemptReconnect, 500);
    };

    const handleOffline = () => {
      console.log('[ChatHub] Browser reports offline');
      isManuallyOfflineRef.current = true;
      setConnectionState('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic connectivity check when we're in disconnected state
    // This catches cases where the browser 'online' event doesn't fire (e.g., DevTools toggle)
    const connectivityCheckInterval = setInterval(() => {
      const conn = connectionRef.current;
      // Only check if we think we're offline and the connection is disconnected
      if (isManuallyOfflineRef.current && conn?.state === signalR.HubConnectionState.Disconnected) {
        // Check if browser thinks we're online
        if (navigator.onLine) {
          console.log('[ChatHub] Connectivity check: browser is online, attempting reconnect');
          isManuallyOfflineRef.current = false;
          attemptReconnect();
        }
      }
    }, 3000); // Check every 3 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(connectivityCheckInterval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      // Reset refs so React Strict Mode remount can create a new connection
      isConnectingRef.current = false;
      connectionRef.current = null;

      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        connection.stop().catch((error) => {
          if (hasConnectedOnceRef.current) {
            console.error('[ChatHub] Error stopping connection:', error);
          }
        });
      }
    };
  }, []);

  /**
   * Join an event-specific group to receive chat messages
   */
  const joinEventChat = useCallback(async (eventId: string) => {
    const connection = connectionRef.current;
    if (!connection) {
      console.warn('[ChatHub] Cannot join event: connection not initialized');
      return;
    }

    try {
      // Wait for connection if still connecting
      if (connection.state === signalR.HubConnectionState.Connecting) {
        const maxWaitTime = 5000;
        const startTime = Date.now();
        while (
          connection.state === signalR.HubConnectionState.Connecting &&
          Date.now() - startTime < maxWaitTime
        ) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('JoinEventChat', eventId);
        console.log(`[ChatHub] Joined event chat ${eventId}`);
      } else if (hasConnectedOnceRef.current) {
        console.warn(`[ChatHub] Cannot join event: connection state is ${connection.state}`);
      }
    } catch (error) {
      console.error('[ChatHub] Error joining event:', error);
    }
  }, []);

  /**
   * Leave an event-specific group
   */
  const leaveEventChat = useCallback(async (eventId: string) => {
    const connection = connectionRef.current;
    if (!connection) {
      return;
    }

    try {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('LeaveEventChat', eventId);
        console.log(`[ChatHub] Left event chat ${eventId}`);
      }
    } catch (error) {
      console.error('[ChatHub] Error leaving event:', error);
    }
  }, []);

  /**
   * Report that an API call failed due to network issues.
   * This immediately sets the connection state to disconnected.
   */
  const reportConnectionFailure = useCallback(() => {
    console.warn('[ChatHub] API failure reported, setting state to disconnected');
    isManuallyOfflineRef.current = true;
    setConnectionState('disconnected');
  }, []);

  return {
    /** Current connection state for UI display */
    connectionState,
    joinEventChat,
    leaveEventChat,
    /** Call this when an API request fails due to network issues */
    reportConnectionFailure,
    /** Manually attempt to reconnect */
    restartConnection,
  };
};

import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { ChatMessageDto, ExternalChannelMappingDto } from '../types/chat';

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
 */
export const useChatHub = (handlers: ChatHubHandlers = {}) => {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const handlersRef = useRef(handlers);
  const hasConnectedOnceRef = useRef(false);
  const isConnectingRef = useRef(false);
  const [connectionState, setConnectionState] = useState<ChatConnectionState>('disconnected');

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

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
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
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

    // Connection lifecycle events
    connection.onreconnecting((error) => {
      console.warn('[ChatHub] Reconnecting...', error);
      setConnectionState('reconnecting');
    });

    connection.onreconnected((connectionId) => {
      console.log('[ChatHub] Reconnected:', connectionId);
      setConnectionState('connected');
      // Notify handlers so they can refresh data
      handlersRef.current.onReconnected?.();
    });

    connection.onclose((error) => {
      setConnectionState('disconnected');
      if (hasConnectedOnceRef.current && error) {
        console.error('[ChatHub] Connection closed:', error);
      }
    });

    setConnectionState('connecting');

    // Start connection
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

    connectionRef.current = connection;

    // Cleanup on unmount
    return () => {
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

  return {
    /** Current connection state for UI display */
    connectionState,
    joinEventChat,
    leaveEventChat,
  };
};

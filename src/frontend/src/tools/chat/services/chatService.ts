/**
 * Chat Service
 *
 * API client for chat operations.
 * Handles message sending/receiving and external channel management.
 */

import { apiClient } from '../../../core/services/api';
import type {
  ChatMessageDto,
  ChatThreadDto,
  ExternalChannelMappingDto,
  SendMessageRequest,
  CreateExternalChannelRequest,
} from '../types/chat';

/**
 * Chat API service
 */
export const chatService = {
  /**
   * Gets or creates the default chat thread for an event.
   */
  getEventChatThread: async (eventId: string): Promise<ChatThreadDto> => {
    const response = await apiClient.get<ChatThreadDto>(
      `/api/events/${eventId}/chat/thread`
    );
    return response.data;
  },

  /**
   * Gets messages for a chat thread.
   */
  getMessages: async (
    eventId: string,
    threadId: string,
    skip?: number,
    take?: number
  ): Promise<ChatMessageDto[]> => {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (take !== undefined) params.append('take', take.toString());

    const queryString = params.toString();
    const url = `/api/events/${eventId}/chat/thread/${threadId}/messages${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiClient.get<ChatMessageDto[]>(url);
    return response.data;
  },

  /**
   * Sends a new chat message.
   */
  sendMessage: async (
    eventId: string,
    threadId: string,
    message: string
  ): Promise<ChatMessageDto> => {
    const request: SendMessageRequest = { message };
    const response = await apiClient.post<ChatMessageDto>(
      `/api/events/${eventId}/chat/thread/${threadId}/messages`,
      request
    );
    return response.data;
  },

  /**
   * Gets external channel mappings for an event.
   */
  getExternalChannels: async (
    eventId: string
  ): Promise<ExternalChannelMappingDto[]> => {
    const response = await apiClient.get<ExternalChannelMappingDto[]>(
      `/api/events/${eventId}/chat/external-channels`
    );
    return response.data;
  },

  /**
   * Creates a new external channel mapping.
   */
  createExternalChannel: async (
    eventId: string,
    request: CreateExternalChannelRequest
  ): Promise<ExternalChannelMappingDto> => {
    const response = await apiClient.post<ExternalChannelMappingDto>(
      `/api/events/${eventId}/chat/external-channels`,
      request
    );
    return response.data;
  },

  /**
   * Deactivates an external channel mapping.
   */
  deactivateExternalChannel: async (
    eventId: string,
    mappingId: string,
    archiveExternalGroup = false
  ): Promise<void> => {
    await apiClient.delete(
      `/api/events/${eventId}/chat/external-channels/${mappingId}?archiveExternalGroup=${archiveExternalGroup}`
    );
  },
};

export default chatService;

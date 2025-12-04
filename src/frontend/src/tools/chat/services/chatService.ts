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
  CreateChannelRequest,
  UpdateChannelRequest,
} from '../types/chat';

/**
 * Chat API service
 */
export const chatService = {
  // ===== Channel API =====

  /**
   * Gets all channels for an event.
   */
  getChannels: async (eventId: string): Promise<ChatThreadDto[]> => {
    const response = await apiClient.get<ChatThreadDto[]>(
      `/api/events/${eventId}/chat/channels`
    );
    return response.data;
  },

  /**
   * Gets a specific channel by ID.
   */
  getChannel: async (
    eventId: string,
    channelId: string
  ): Promise<ChatThreadDto> => {
    const response = await apiClient.get<ChatThreadDto>(
      `/api/events/${eventId}/chat/channels/${channelId}`
    );
    return response.data;
  },

  /**
   * Creates a new channel in an event.
   */
  createChannel: async (
    eventId: string,
    request: Omit<CreateChannelRequest, 'eventId'>
  ): Promise<ChatThreadDto> => {
    const response = await apiClient.post<ChatThreadDto>(
      `/api/events/${eventId}/chat/channels`,
      request
    );
    return response.data;
  },

  /**
   * Updates a channel's metadata.
   */
  updateChannel: async (
    eventId: string,
    channelId: string,
    request: UpdateChannelRequest
  ): Promise<ChatThreadDto> => {
    const response = await apiClient.patch<ChatThreadDto>(
      `/api/events/${eventId}/chat/channels/${channelId}`,
      request
    );
    return response.data;
  },

  /**
   * Reorders channels within an event.
   */
  reorderChannels: async (
    eventId: string,
    orderedChannelIds: string[]
  ): Promise<void> => {
    await apiClient.put(
      `/api/events/${eventId}/chat/channels/reorder`,
      orderedChannelIds
    );
  },

  /**
   * Deletes a channel (soft delete/archive).
   */
  deleteChannel: async (eventId: string, channelId: string): Promise<void> => {
    await apiClient.delete(`/api/events/${eventId}/chat/channels/${channelId}`);
  },

  /**
   * Gets all channels including archived for administration.
   */
  getAllChannels: async (
    eventId: string,
    includeArchived = true
  ): Promise<ChatThreadDto[]> => {
    const response = await apiClient.get<ChatThreadDto[]>(
      `/api/events/${eventId}/chat/channels/all?includeArchived=${includeArchived}`
    );
    return response.data;
  },

  /**
   * Gets archived channels for an event.
   */
  getArchivedChannels: async (eventId: string): Promise<ChatThreadDto[]> => {
    const response = await apiClient.get<ChatThreadDto[]>(
      `/api/events/${eventId}/chat/channels/archived`
    );
    return response.data;
  },

  /**
   * Restores an archived channel.
   */
  restoreChannel: async (
    eventId: string,
    channelId: string
  ): Promise<ChatThreadDto> => {
    const response = await apiClient.post<ChatThreadDto>(
      `/api/events/${eventId}/chat/channels/${channelId}/restore`
    );
    return response.data;
  },

  /**
   * Permanently deletes a channel (cannot be undone without SQL access).
   */
  permanentDeleteChannel: async (
    eventId: string,
    channelId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/api/events/${eventId}/chat/channels/${channelId}/permanent`
    );
  },

  /**
   * Archives all messages in a channel.
   * @returns Number of messages archived.
   */
  archiveAllMessages: async (
    eventId: string,
    channelId: string
  ): Promise<number> => {
    const response = await apiClient.post<{ archivedCount: number }>(
      `/api/events/${eventId}/chat/channels/${channelId}/archive-messages`
    );
    return response.data.archivedCount;
  },

  /**
   * Archives messages older than specified days in a channel.
   * @returns Number of messages archived.
   */
  archiveMessagesOlderThan: async (
    eventId: string,
    channelId: string,
    days: number
  ): Promise<number> => {
    const response = await apiClient.post<{ archivedCount: number }>(
      `/api/events/${eventId}/chat/channels/${channelId}/archive-messages-older-than?days=${days}`
    );
    return response.data.archivedCount;
  },

  /**
   * Creates position-based channels for an event.
   * Creates one channel for each ICS position (Command, Operations, Planning, etc.).
   * @returns List of created position channels.
   */
  createPositionChannels: async (eventId: string): Promise<ChatThreadDto[]> => {
    const response = await apiClient.post<ChatThreadDto[]>(
      `/api/events/${eventId}/chat/channels/position`
    );
    return response.data;
  },

  /**
   * Gets channels visible to the current user based on their positions.
   * Position channels are only visible to users assigned to that position.
   * Other channel types are visible to all users.
   */
  getUserVisibleChannels: async (eventId: string): Promise<ChatThreadDto[]> => {
    const response = await apiClient.get<ChatThreadDto[]>(
      `/api/events/${eventId}/chat/channels/visible`
    );
    return response.data;
  },

  // ===== Legacy Thread API =====

  /**
   * Gets or creates the default chat thread for an event.
   * @deprecated Use getChannels instead
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

  // ===== Teams Integration =====

  /**
   * Gets available Teams conversations from the TeamsBot service.
   * These are Teams channels where the bot has been installed.
   */
  getTeamsConversations: async (): Promise<TeamsConversation[]> => {
    const response = await apiClient.get<TeamsConversationsResponse>(
      '/api/chat/diagnostics/teams-conversations'
    );
    return response.data.conversations || [];
  },

  /**
   * Creates a Teams channel mapping for a specific event.
   * Links a Teams conversation to a COBRA event.
   * @deprecated Use linkTeamsToChannel instead for linking to existing channels.
   */
  createTeamsChannelMapping: async (
    eventId: string,
    conversationId: string,
    channelName?: string
  ): Promise<ExternalChannelMappingDto> => {
    const response = await apiClient.post<CreateTeamsMappingResponse>(
      '/api/chat/diagnostics/teams-mapping',
      {
        eventId,
        teamsConversationId: conversationId,
        channelName,
      }
    );

    // Map the diagnostics response to ExternalChannelMappingDto format
    return {
      id: response.data.mappingId,
      eventId: response.data.eventId,
      platform: 3, // ExternalPlatform.Teams
      platformName: 'Teams',
      externalGroupId: response.data.teamsConversationId,
      externalGroupName: channelName || 'Teams Channel',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
  },

  /**
   * Links a Teams conversation to an existing COBRA channel.
   * This enables bidirectional message sync between the channel and Teams.
   */
  linkTeamsToChannel: async (
    eventId: string,
    channelId: string,
    teamsConversationId: string
  ): Promise<ChatThreadDto> => {
    const response = await apiClient.post<ChatThreadDto>(
      `/api/events/${eventId}/chat/channels/${channelId}/link-teams`,
      { teamsConversationId }
    );
    return response.data;
  },

  /**
   * Unlinks an external platform from a channel.
   * The channel remains but loses its external sync capability.
   */
  unlinkExternalChannel: async (
    eventId: string,
    channelId: string
  ): Promise<void> => {
    await apiClient.delete(
      `/api/events/${eventId}/chat/channels/${channelId}/external-link`
    );
  },
};

/**
 * Response from Teams conversations endpoint.
 */
interface TeamsConversationsResponse {
  count: number;
  conversations: TeamsConversation[];
}

/**
 * A Teams conversation where the bot is installed.
 */
export interface TeamsConversation {
  conversationId: string;
  serviceUrl: string;
  channelId: string;
  botId?: string;
  botName?: string;
}

/**
 * Response from creating a Teams mapping.
 */
interface CreateTeamsMappingResponse {
  mappingId: string;
  eventId: string;
  teamsConversationId: string;
  webhookUrl: string;
  isExisting: boolean;
}

export default chatService;

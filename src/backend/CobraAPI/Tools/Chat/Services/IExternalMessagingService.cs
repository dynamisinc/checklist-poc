using CobraAPI.Tools.Chat.ExternalPlatforms;

namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Interface for external messaging service operations.
/// </summary>
public interface IExternalMessagingService
{
    /// <summary>
    /// Creates an external channel mapping for an event.
    /// </summary>
    Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request);

    /// <summary>
    /// Gets all external channel mappings for an event.
    /// </summary>
    Task<List<ExternalChannelMappingDto>> GetEventChannelMappingsAsync(Guid eventId);

    /// <summary>
    /// Deactivates an external channel mapping.
    /// </summary>
    Task DeactivateChannelAsync(Guid mappingId, bool archiveExternalGroup = false);

    /// <summary>
    /// Processes an incoming webhook message from GroupMe.
    /// </summary>
    Task ProcessGroupMeWebhookAsync(Guid mappingId, GroupMeWebhookPayload payload);

    /// <summary>
    /// Processes an incoming webhook message from Teams.
    /// </summary>
    Task ProcessTeamsWebhookAsync(Guid mappingId, TeamsWebhookPayload payload);

    /// <summary>
    /// Broadcasts a message to all active external channels for an event.
    /// If chatThreadId is provided, only sends to the external channel linked to that thread.
    /// </summary>
    Task BroadcastToExternalChannelsAsync(Guid eventId, string senderName, string message, Guid? chatThreadId = null);

    /// <summary>
    /// Creates a Teams channel mapping with a linked ChatThread.
    /// Used when connecting an event to a Teams conversation.
    /// </summary>
    Task<ExternalChannelMappingDto> CreateTeamsChannelMappingAsync(
        Guid eventId,
        string teamsConversationId,
        string channelName,
        string createdBy);

    /// <summary>
    /// Links a Teams conversation to an existing ChatThread.
    /// This allows any COBRA channel to become bidirectionally synced with Teams.
    /// </summary>
    /// <param name="channelId">The existing ChatThread ID to link.</param>
    /// <param name="teamsConversationId">The Teams conversation ID.</param>
    /// <returns>The updated ChatThread with the external channel mapping.</returns>
    Task<ChatThreadDto> LinkTeamsToChannelAsync(Guid channelId, string teamsConversationId);

    /// <summary>
    /// Unlinks an external platform from a channel without deleting the channel.
    /// The channel remains but loses its external sync capability.
    /// </summary>
    /// <param name="channelId">The ChatThread ID to unlink.</param>
    Task UnlinkExternalChannelAsync(Guid channelId);

    /// <summary>
    /// Broadcasts an announcement to all active Teams channels for an event.
    /// Unlike regular messages, announcements are sent to ALL Teams channels,
    /// not just the one linked to a specific thread.
    /// </summary>
    /// <param name="eventId">The event ID.</param>
    /// <param name="title">The announcement title.</param>
    /// <param name="message">The announcement message content.</param>
    /// <param name="senderName">The name of the person sending the announcement.</param>
    /// <param name="priority">Optional priority level (normal, high, urgent).</param>
    /// <returns>The number of Teams channels the announcement was sent to.</returns>
    Task<int> BroadcastAnnouncementToTeamsAsync(
        Guid eventId,
        string title,
        string message,
        string senderName,
        string priority = "normal");
}

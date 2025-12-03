namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Interface for channel management operations.
/// Channels represent different conversation spaces within an event.
/// </summary>
public interface IChannelService
{
    /// <summary>
    /// Gets all channels for an event.
    /// </summary>
    Task<List<ChatThreadDto>> GetEventChannelsAsync(Guid eventId);

    /// <summary>
    /// Gets a specific channel by ID.
    /// </summary>
    Task<ChatThreadDto?> GetChannelAsync(Guid channelId);

    /// <summary>
    /// Creates a new channel in an event.
    /// </summary>
    Task<ChatThreadDto> CreateChannelAsync(CreateChannelRequest request);

    /// <summary>
    /// Creates the default channels for a new event.
    /// Called during event creation.
    /// </summary>
    Task CreateDefaultChannelsAsync(Guid eventId, string createdBy);

    /// <summary>
    /// Updates channel metadata (name, description, icon, color).
    /// </summary>
    Task<ChatThreadDto?> UpdateChannelAsync(Guid channelId, UpdateChannelRequest request);

    /// <summary>
    /// Reorders channels within an event.
    /// </summary>
    Task ReorderChannelsAsync(Guid eventId, List<Guid> orderedChannelIds);

    /// <summary>
    /// Deletes a channel (soft delete).
    /// Cannot delete the default event channel or channels with External type.
    /// </summary>
    Task<bool> DeleteChannelAsync(Guid channelId);

    /// <summary>
    /// Gets all channels for an event including archived channels.
    /// Used for administration views.
    /// </summary>
    Task<List<ChatThreadDto>> GetAllEventChannelsAsync(Guid eventId, bool includeArchived = true);

    /// <summary>
    /// Gets only archived channels for an event.
    /// </summary>
    Task<List<ChatThreadDto>> GetArchivedChannelsAsync(Guid eventId);

    /// <summary>
    /// Restores an archived channel.
    /// </summary>
    Task<ChatThreadDto?> RestoreChannelAsync(Guid channelId);

    /// <summary>
    /// Permanently deletes a channel (removes from event, data retained in DB).
    /// Cannot be undone without direct database access.
    /// </summary>
    Task<bool> PermanentDeleteChannelAsync(Guid channelId);

    /// <summary>
    /// Archives all messages in a channel (soft delete).
    /// </summary>
    /// <returns>Number of messages archived.</returns>
    Task<int> ArchiveAllMessagesAsync(Guid channelId);

    /// <summary>
    /// Archives messages older than the specified number of days.
    /// </summary>
    /// <param name="channelId">The channel ID.</param>
    /// <param name="olderThanDays">Archive messages older than this many days.</param>
    /// <returns>Number of messages archived.</returns>
    Task<int> ArchiveMessagesOlderThanAsync(Guid channelId, int olderThanDays);
}

using Microsoft.AspNetCore.SignalR;

namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Service for broadcasting messages via SignalR.
/// Abstracts the hub context for use in services.
/// </summary>
public class ChatHubService : IChatHubService
{
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<ChatHubService> _logger;

    public ChatHubService(
        IHubContext<ChatHub> hubContext,
        ILogger<ChatHubService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Broadcasts a chat message to all clients connected to an event's chat.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="message">The message DTO to broadcast</param>
    public async Task BroadcastMessageToEventAsync(Guid eventId, ChatMessageDto message)
    {
        _logger.LogDebug("Broadcasting message {MessageId} to event {EventId}",
            message.Id, eventId);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ReceiveChatMessage", message);
    }

    /// <summary>
    /// Broadcasts a notification that an external channel was connected.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="channel">The channel mapping details</param>
    public async Task BroadcastChannelConnectedAsync(Guid eventId, ExternalChannelMappingDto channel)
    {
        _logger.LogDebug("Broadcasting channel connected for event {EventId}: {Platform}",
            eventId, channel.PlatformName);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ExternalChannelConnected", channel);
    }

    /// <summary>
    /// Broadcasts a notification that an external channel was disconnected.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="channelId">The channel mapping ID</param>
    public async Task BroadcastChannelDisconnectedAsync(Guid eventId, Guid channelId)
    {
        _logger.LogDebug("Broadcasting channel disconnected for event {EventId}: {ChannelId}",
            eventId, channelId);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ExternalChannelDisconnected", channelId);
    }

    /// <summary>
    /// Broadcasts a notification that a channel was created.
    /// </summary>
    public async Task BroadcastChannelCreatedAsync(Guid eventId, ChatThreadDto channel)
    {
        _logger.LogDebug("Broadcasting channel created for event {EventId}: {ChannelId}",
            eventId, channel.Id);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ChannelCreated", channel);
    }

    /// <summary>
    /// Broadcasts a notification that a channel was archived.
    /// </summary>
    public async Task BroadcastChannelArchivedAsync(Guid eventId, Guid channelId)
    {
        _logger.LogDebug("Broadcasting channel archived for event {EventId}: {ChannelId}",
            eventId, channelId);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ChannelArchived", channelId);
    }

    /// <summary>
    /// Broadcasts a notification that a channel was restored.
    /// </summary>
    public async Task BroadcastChannelRestoredAsync(Guid eventId, ChatThreadDto channel)
    {
        _logger.LogDebug("Broadcasting channel restored for event {EventId}: {ChannelId}",
            eventId, channel.Id);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ChannelRestored", channel);
    }

    /// <summary>
    /// Broadcasts a notification that a channel was permanently deleted.
    /// </summary>
    public async Task BroadcastChannelDeletedAsync(Guid eventId, Guid channelId)
    {
        _logger.LogDebug("Broadcasting channel deleted for event {EventId}: {ChannelId}",
            eventId, channelId);

        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ChannelDeleted", channelId);
    }
}

/// <summary>
/// Interface for SignalR broadcast service.
/// </summary>
public interface IChatHubService
{
    Task BroadcastMessageToEventAsync(Guid eventId, ChatMessageDto message);
    Task BroadcastChannelConnectedAsync(Guid eventId, ExternalChannelMappingDto channel);
    Task BroadcastChannelDisconnectedAsync(Guid eventId, Guid channelId);
    Task BroadcastChannelCreatedAsync(Guid eventId, ChatThreadDto channel);
    Task BroadcastChannelArchivedAsync(Guid eventId, Guid channelId);
    Task BroadcastChannelRestoredAsync(Guid eventId, ChatThreadDto channel);
    Task BroadcastChannelDeletedAsync(Guid eventId, Guid channelId);
}

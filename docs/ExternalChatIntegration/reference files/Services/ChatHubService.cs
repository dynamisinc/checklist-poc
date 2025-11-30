using Microsoft.AspNetCore.SignalR;

namespace Cobra.Poc.Services;

/// <summary>
/// SignalR hub for real-time chat communication.
/// Clients connect to this hub to receive chat messages in real-time.
/// 
/// TODO: Production - this functionality is handled by INotifierService
/// </summary>
public class ChatHub : Hub
{
    /// <summary>
    /// Joins the client to an event-specific group for receiving messages.
    /// Called by clients when they open the chat for an event.
    /// </summary>
    /// <param name="eventId">The event ID to join</param>
    public async Task JoinEventChat(string eventId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"event-{eventId}");
    }

    /// <summary>
    /// Leaves the client from an event-specific group.
    /// Called by clients when they close the chat or navigate away.
    /// </summary>
    /// <param name="eventId">The event ID to leave</param>
    public async Task LeaveEventChat(string eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"event-{eventId}");
    }
}

/// <summary>
/// Service for broadcasting messages via SignalR.
/// Abstracts the hub context for use in services.
/// 
/// TODO: Production - replace with INotifierService.SendMessageToEventUsers()
/// </summary>
public class ChatHubService : IChatHubService
{
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatHubService(IHubContext<ChatHub> hubContext)
    {
        _hubContext = hubContext;
    }

    /// <summary>
    /// Broadcasts a chat message to all clients connected to an event's chat.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="message">The message DTO to broadcast</param>
    public async Task BroadcastMessageToEventAsync(Guid eventId, ChatMessageDto message)
    {
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
        await _hubContext.Clients
            .Group($"event-{eventId}")
            .SendAsync("ExternalChannelConnected", channel);
    }
}

/// <summary>
/// Interface for SignalR broadcast service.
/// </summary>
public interface IChatHubService
{
    Task BroadcastMessageToEventAsync(Guid eventId, ChatMessageDto message);
    Task BroadcastChannelConnectedAsync(Guid eventId, ExternalChannelMappingDto channel);
}

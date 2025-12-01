using Microsoft.AspNetCore.SignalR;

namespace ChecklistAPI.Hubs;

/// <summary>
/// SignalR hub for real-time chat communication.
/// Clients connect to this hub to receive chat messages in real-time.
/// </summary>
public class ChatHub : Hub
{
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(ILogger<ChatHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Joins the client to an event-specific group for receiving messages.
    /// Called by clients when they open the chat for an event.
    /// </summary>
    /// <param name="eventId">The event ID to join</param>
    public async Task JoinEventChat(string eventId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"event-{eventId}");
        _logger.LogDebug("Client {ConnectionId} joined event chat {EventId}",
            Context.ConnectionId, eventId);
    }

    /// <summary>
    /// Leaves the client from an event-specific group.
    /// Called by clients when they close the chat or navigate away.
    /// </summary>
    /// <param name="eventId">The event ID to leave</param>
    public async Task LeaveEventChat(string eventId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"event-{eventId}");
        _logger.LogDebug("Client {ConnectionId} left event chat {EventId}",
            Context.ConnectionId, eventId);
    }

    public override async Task OnConnectedAsync()
    {
        _logger.LogDebug("Client connected: {ConnectionId}", Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        _logger.LogDebug("Client disconnected: {ConnectionId}", Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}

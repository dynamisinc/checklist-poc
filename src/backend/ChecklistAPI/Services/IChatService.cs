using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Services;

/// <summary>
/// Interface for chat service operations.
/// </summary>
public interface IChatService
{
    /// <summary>
    /// Gets or creates the default chat thread for an event.
    /// </summary>
    Task<ChatThreadDto> GetOrCreateEventChatThreadAsync(Guid eventId);

    /// <summary>
    /// Gets messages for a chat thread with pagination.
    /// </summary>
    Task<List<ChatMessageDto>> GetMessagesAsync(Guid chatThreadId, int? skip = null, int? take = null);

    /// <summary>
    /// Sends a new chat message.
    /// </summary>
    Task<ChatMessageDto> SendMessageAsync(Guid eventId, Guid chatThreadId, string message);
}

using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Cobra.Poc.Services;

/// <summary>
/// Extended DTO for chat messages that includes external message metadata.
/// This DTO is used for both API responses and SignalR broadcasts.
/// </summary>
public class ChatMessageDto
{
    public Guid Id { get; set; }
    public DateTime Created { get; set; }
    public string CreatedBy { get; set; } = default!;
    public Guid CreatedById { get; set; }
    public string Message { get; set; } = default!;

    // External message fields
    public bool IsExternalMessage { get; set; }
    public string? ExternalSource { get; set; }
    public string? ExternalSenderName { get; set; }
    public string? ExternalAttachmentUrl { get; set; }

    // Promotion tracking
    public Guid? PromotedToLogbookEntryId { get; set; }
}

/// <summary>
/// Chat thread summary information.
/// </summary>
public class ViewChatThreadDto
{
    public Guid Id { get; set; }
    public int MessageCount { get; set; }
}

/// <summary>
/// Service for managing chat threads and messages within events.
/// Integrates with external messaging platforms for bi-directional communication.
/// 
/// TODO: Production - inherit from BaseService
/// TODO: Production - inject IUserContextService, IFilteredDbContextService
/// </summary>
public class ChatService : IChatService
{
    private readonly PocDbContext _dbContext;
    private readonly IExternalMessagingService _externalMessagingService;
    private readonly IChatHubService _chatHubService;

    private readonly int _defaultChatPageSize = 50;

    // TODO: Production - get from IUserContextService.CurrentUserContext
    private Guid CurrentUserId => Guid.Parse("00000000-0000-0000-0000-000000000001");
    private Guid CurrentEventId { get; set; }

    public ChatService(
        PocDbContext dbContext,
        IExternalMessagingService externalMessagingService,
        IChatHubService chatHubService)
    {
        _dbContext = dbContext;
        _externalMessagingService = externalMessagingService;
        _chatHubService = chatHubService;
    }

    /// <summary>
    /// Sets the current event context. In production, this comes from IUserContextService.
    /// </summary>
    /// <param name="eventId">The event ID to operate within</param>
    public void SetEventContext(Guid eventId)
    {
        CurrentEventId = eventId;
    }

    /// <summary>
    /// Creates a new chat message in the specified thread.
    /// Also broadcasts the message to any connected external messaging platforms.
    /// </summary>
    /// <param name="chatThreadId">The thread to post to</param>
    /// <param name="message">The message content</param>
    /// <param name="senderDisplayName">Display name of the sender (for external broadcast)</param>
    /// <returns>The new message ID</returns>
    public async Task<Guid> CreateChatMessageAsync(Guid chatThreadId, string message, string senderDisplayName)
    {
        var thread = await GetChatThreadAsync(chatThreadId);
        var chatMessageId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        _dbContext.ChatMessages.Add(new ChatMessage
        {
            Id = chatMessageId,
            ChatThreadId = chatThreadId,
            Message = message,
            Created = now,
            CreatedById = CurrentUserId,
            Modified = now,
            ModifiedById = CurrentUserId
            // External* fields left null for native COBRA messages
        });

        // TODO: Production - use SaveChangesAsync(Action.ChatMessageCreated, chatMessageId, null, message)
        await _dbContext.SaveChangesAsync();

        // Get the newly added message with user details
        var newlyAddedMessage = await _dbContext.ChatMessages
            .Where(cm => cm.Id == chatMessageId)
            .Select(SelectAsChatMessageDto())
            .SingleAsync();

        // Broadcast to COBRA users via SignalR
        // TODO: Production - use INotifierService.SendMessageToEventUsers(CurrentEventId, NotifierMessages.ChatMessageCreated, newlyAddedMessage)
        await _chatHubService.BroadcastMessageToEventAsync(thread.EventId, newlyAddedMessage);

        // Also broadcast to external platforms (fire and forget - don't block on external API calls)
        _ = Task.Run(async () =>
        {
            try
            {
                await _externalMessagingService.BroadcastToExternalChannelsAsync(
                    thread.EventId,
                    senderDisplayName,
                    message);
            }
            catch
            {
                // Logged in the service - don't fail the main operation
            }
        });

        return chatMessageId;
    }

    /// <summary>
    /// Retrieves messages for a chat thread with pagination.
    /// Includes both native COBRA messages and external platform messages.
    /// </summary>
    /// <param name="chatThreadId">The thread ID</param>
    /// <param name="skip">Number of messages to skip (optional)</param>
    /// <param name="take">Number of messages to take (optional)</param>
    /// <returns>List of chat messages ordered by creation time</returns>
    public async Task<List<ChatMessageDto>> GetMessagesAsync(Guid chatThreadId, int? skip = null, int? take = null)
    {
        IQueryable<ChatMessage> messageQuery = _dbContext.ChatMessages
            .Where(cm => cm.ChatThreadId == chatThreadId)
            .OrderBy(cm => cm.Created);

        int totalMessages = await _dbContext.ChatMessages
            .CountAsync(cm => cm.ChatThreadId == chatThreadId);

        if (skip != null && take != null)
        {
            messageQuery = messageQuery.Skip(skip.Value).Take(take.Value);
        }
        else
        {
            // Default: get the last N messages
            int skipCount = totalMessages <= _defaultChatPageSize ? 0 : totalMessages - _defaultChatPageSize;
            messageQuery = messageQuery.Skip(skipCount).Take(_defaultChatPageSize);
        }

        return await messageQuery.Select(SelectAsChatMessageDto()).ToListAsync();
    }

    /// <summary>
    /// Gets the default chat thread for an event.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <returns>Chat thread summary</returns>
    public async Task<ViewChatThreadDto> GetEventChatThreadAsync(Guid eventId)
    {
        return await _dbContext.ChatThreads
            .Where(ct => ct.EventId == eventId && ct.IsDefaultEventThread)
            .Select(ct => new ViewChatThreadDto
            {
                Id = ct.Id,
                MessageCount = ct.Messages.Count()
            })
            .SingleAsync();
    }

    /// <summary>
    /// Ensures the default chat thread exists for an event.
    /// Creates one if it doesn't exist.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <returns>The chat thread ID</returns>
    public async Task<Guid> EnsureEventChatThreadExistsAsync(Guid eventId)
    {
        var existingThread = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == eventId && ct.IsDefaultEventThread)
            .Select(ct => ct.Id)
            .FirstOrDefaultAsync();

        if (existingThread != Guid.Empty)
        {
            return existingThread;
        }

        var threadId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        _dbContext.ChatThreads.Add(new ChatThread
        {
            Id = threadId,
            EventId = eventId,
            IsDefaultEventThread = true,
            Name = "Event Chat",
            Created = now,
            CreatedById = CurrentUserId,
            Modified = now,
            ModifiedById = CurrentUserId
        });

        await _dbContext.SaveChangesAsync();
        return threadId;
    }

    /// <summary>
    /// Promotes a chat message to a logbook entry.
    /// Creates a new logbook entry with the message content and links them.
    /// </summary>
    /// <param name="chatMessageId">The chat message to promote</param>
    /// <param name="additionalNotes">Optional notes to add to the logbook entry</param>
    /// <param name="categoryId">Optional category for the logbook entry</param>
    /// <returns>The new logbook entry ID</returns>
    public async Task<Guid> PromoteToLogbookEntryAsync(
        Guid chatMessageId,
        string? additionalNotes = null,
        Guid? categoryId = null)
    {
        // Get the chat message
        var chatMessage = await _dbContext.ChatMessages
            .Include(cm => cm.ChatThread)
            .SingleOrDefaultAsync(cm => cm.Id == chatMessageId);

        if (chatMessage == null)
        {
            throw new KeyNotFoundException("Chat message not found");
        }

        // Build the logbook entry content
        string senderName;
        if (chatMessage.IsExternalMessage)
        {
            senderName = $"{chatMessage.ExternalSenderName} (via {chatMessage.ExternalSource})";
        }
        else
        {
            var user = await _dbContext.Users
                .Where(u => u.Id == chatMessage.CreatedById)
                .Select(u => u.DisplayName)
                .SingleOrDefaultAsync();
            senderName = user ?? "Unknown";
        }

        var entryContent = $"[From Chat - {senderName}]\n{chatMessage.Message}";

        if (!string.IsNullOrWhiteSpace(additionalNotes))
        {
            entryContent += $"\n\n[Additional Notes]\n{additionalNotes}";
        }

        // Create the logbook entry
        // TODO: Adjust to match actual LogbookEntry entity in production
        var logbookEntryId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var logbookEntry = new LogbookEntry
        {
            Id = logbookEntryId,
            EventId = chatMessage.ChatThread.EventId,
            CategoryId = categoryId,
            Content = entryContent,
            Created = now,
            CreatedById = CurrentUserId,
            Modified = now,
            ModifiedById = CurrentUserId
        };

        _dbContext.LogbookEntries.Add(logbookEntry);

        // Update the chat message with promotion tracking
        chatMessage.PromotedToLogbookEntryId = logbookEntryId;
        chatMessage.PromotedToLogbookAt = now;
        chatMessage.PromotedToLogbookById = CurrentUserId;
        chatMessage.Modified = now;
        chatMessage.ModifiedById = CurrentUserId;

        // TODO: Production - use SaveChangesAsync(Action.ChatMessagePromotedToLogbook, logbookEntryId, null, $"Promoted chat message from {senderName} to logbook")
        await _dbContext.SaveChangesAsync();

        return logbookEntryId;
    }

    #region Private Helpers

    private async Task<ChatThread> GetChatThreadAsync(Guid chatThreadId)
    {
        var thread = await _dbContext.ChatThreads
            .SingleOrDefaultAsync(ct => ct.Id == chatThreadId);

        if (thread == null)
        {
            throw new KeyNotFoundException("Chat thread not found");
        }

        return thread;
    }

    /// <summary>
    /// Projection expression for converting ChatMessage to ChatMessageDto.
    /// Handles both native COBRA messages and external platform messages.
    /// </summary>
    private static Expression<Func<ChatMessage, ChatMessageDto>> SelectAsChatMessageDto()
    {
        return cm => new ChatMessageDto
        {
            Id = cm.Id,
            Created = cm.Created,
            // For external messages, use ExternalSenderName; for COBRA messages, use user's display name
            CreatedBy = cm.ExternalSource.HasValue
                ? cm.ExternalSenderName ?? "Unknown"
                : cm.CreatedBy.DisplayName,
            CreatedById = cm.CreatedById,
            Message = cm.Message,

            // External message fields
            IsExternalMessage = cm.ExternalSource.HasValue,
            ExternalSource = cm.ExternalSource.HasValue ? cm.ExternalSource.ToString() : null,
            ExternalSenderName = cm.ExternalSenderName,
            ExternalAttachmentUrl = cm.ExternalAttachmentUrl,

            // Promotion tracking
            PromotedToLogbookEntryId = cm.PromotedToLogbookEntryId
        };
    }

    #endregion
}

/// <summary>
/// Interface for chat service to support dependency injection.
/// </summary>
public interface IChatService
{
    void SetEventContext(Guid eventId);
    Task<Guid> CreateChatMessageAsync(Guid chatThreadId, string message, string senderDisplayName);
    Task<List<ChatMessageDto>> GetMessagesAsync(Guid chatThreadId, int? skip = null, int? take = null);
    Task<ViewChatThreadDto> GetEventChatThreadAsync(Guid eventId);
    Task<Guid> EnsureEventChatThreadExistsAsync(Guid eventId);
    Task<Guid> PromoteToLogbookEntryAsync(Guid chatMessageId, string? additionalNotes = null, Guid? categoryId = null);
}

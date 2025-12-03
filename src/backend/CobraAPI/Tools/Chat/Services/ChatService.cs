using Microsoft.EntityFrameworkCore;
using CobraAPI.Core.Data;
using CobraAPI.Core.Models;

namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Service for managing chat threads and messages within events.
/// Integrates with external messaging platforms for bi-directional communication.
/// </summary>
public class ChatService : IChatService
{
    private readonly CobraDbContext _dbContext;
    private readonly IChatHubService _chatHubService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ChatService> _logger;

    private const int DefaultPageSize = 50;

    public ChatService(
        CobraDbContext dbContext,
        IChatHubService chatHubService,
        IHttpContextAccessor httpContextAccessor,
        IServiceProvider serviceProvider,
        ILogger<ChatService> logger)
    {
        _dbContext = dbContext;
        _chatHubService = chatHubService;
        _httpContextAccessor = httpContextAccessor;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    private UserContext GetUserContext()
    {
        return _httpContextAccessor.HttpContext?.Items["UserContext"] as UserContext
               ?? throw new UnauthorizedAccessException("User context not found");
    }

    /// <summary>
    /// Gets or creates the default chat thread for an event.
    /// </summary>
    public async Task<ChatThreadDto> GetOrCreateEventChatThreadAsync(Guid eventId)
    {
        var thread = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == eventId && ct.IsDefaultEventThread && ct.IsActive)
            .Select(ct => new ChatThreadDto
            {
                Id = ct.Id,
                EventId = ct.EventId,
                Name = ct.Name,
                IsDefaultEventThread = ct.IsDefaultEventThread,
                MessageCount = ct.Messages.Count(m => m.IsActive),
                CreatedAt = ct.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (thread != null)
        {
            return thread;
        }

        // Create default thread
        var userContext = GetUserContext();
        var newThread = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            IsDefaultEventThread = true,
            Name = "Event Chat",
            IsActive = true,
            CreatedBy = userContext.Email,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ChatThreads.Add(newThread);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created default chat thread {ThreadId} for event {EventId}",
            newThread.Id, eventId);

        return new ChatThreadDto
        {
            Id = newThread.Id,
            EventId = newThread.EventId,
            Name = newThread.Name,
            IsDefaultEventThread = newThread.IsDefaultEventThread,
            MessageCount = 0,
            CreatedAt = newThread.CreatedAt
        };
    }

    /// <summary>
    /// Retrieves messages for a chat thread with pagination.
    /// Returns the most recent messages by default.
    /// </summary>
    public async Task<List<ChatMessageDto>> GetMessagesAsync(Guid chatThreadId, int? skip = null, int? take = null)
    {
        IQueryable<ChatMessage> query = _dbContext.ChatMessages
            .Where(cm => cm.ChatThreadId == chatThreadId && cm.IsActive)
            .OrderBy(cm => cm.CreatedAt);

        int totalMessages = await query.CountAsync();
        int skipCount = skip ?? (totalMessages <= DefaultPageSize ? 0 : totalMessages - DefaultPageSize);
        int takeCount = take ?? DefaultPageSize;

        var messages = await query
            .Skip(skipCount)
            .Take(takeCount)
            .Select(cm => new ChatMessageDto
            {
                Id = cm.Id,
                ChatThreadId = cm.ChatThreadId,
                CreatedAt = cm.CreatedAt,
                CreatedBy = cm.CreatedBy,
                SenderDisplayName = cm.SenderDisplayName,
                Message = cm.Message,
                IsExternalMessage = cm.ExternalSource.HasValue,
                ExternalSource = cm.ExternalSource.HasValue ? cm.ExternalSource.ToString() : null,
                ExternalSenderName = cm.ExternalSenderName,
                ExternalAttachmentUrl = cm.ExternalAttachmentUrl
            })
            .ToListAsync();

        return messages;
    }

    /// <summary>
    /// Sends a new chat message and broadcasts to connected clients.
    /// Also forwards the message to any connected external channels.
    /// </summary>
    public async Task<ChatMessageDto> SendMessageAsync(Guid eventId, Guid chatThreadId, string message)
    {
        var userContext = GetUserContext();
        var now = DateTime.UtcNow;

        var chatMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatThreadId = chatThreadId,
            Message = message,
            SenderDisplayName = userContext.FullName,
            IsActive = true,
            CreatedBy = userContext.Email,
            CreatedAt = now
        };

        _dbContext.ChatMessages.Add(chatMessage);
        await _dbContext.SaveChangesAsync();

        var messageDto = new ChatMessageDto
        {
            Id = chatMessage.Id,
            ChatThreadId = chatMessage.ChatThreadId,
            CreatedAt = chatMessage.CreatedAt,
            CreatedBy = chatMessage.CreatedBy,
            SenderDisplayName = chatMessage.SenderDisplayName,
            Message = chatMessage.Message,
            IsExternalMessage = false
        };

        // Broadcast to connected COBRA users via SignalR
        await _chatHubService.BroadcastMessageToEventAsync(eventId, messageDto);

        // Forward to external platforms (fire and forget)
        // Must create a new scope because the request scope will be disposed
        var senderName = userContext.FullName;
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var externalMessagingService = scope.ServiceProvider.GetRequiredService<IExternalMessagingService>();
                await externalMessagingService.BroadcastToExternalChannelsAsync(
                    eventId,
                    senderName,
                    message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to broadcast message to external channels");
            }
        });

        _logger.LogInformation("User {User} sent message {MessageId} in event {EventId}",
            userContext.Email, chatMessage.Id, eventId);

        return messageDto;
    }

    /// <summary>
    /// Creates a chat message from an external source (webhook).
    /// Called by ExternalMessagingService when processing webhooks.
    /// </summary>
    public async Task<ChatMessageDto> CreateExternalMessageAsync(
        Guid chatThreadId,
        Guid eventId,
        ExternalPlatform source,
        string externalMessageId,
        string senderName,
        string? senderId,
        string message,
        string? attachmentUrl,
        DateTime? externalTimestamp,
        Guid channelMappingId)
    {
        var now = DateTime.UtcNow;

        var chatMessage = new ChatMessage
        {
            Id = Guid.NewGuid(),
            ChatThreadId = chatThreadId,
            Message = message,
            SenderDisplayName = senderName,
            IsActive = true,
            CreatedBy = "system",
            CreatedAt = now,

            // External fields
            ExternalSource = source,
            ExternalMessageId = externalMessageId,
            ExternalSenderName = senderName,
            ExternalSenderId = senderId,
            ExternalTimestamp = externalTimestamp,
            ExternalAttachmentUrl = attachmentUrl,
            ExternalChannelMappingId = channelMappingId
        };

        _dbContext.ChatMessages.Add(chatMessage);
        await _dbContext.SaveChangesAsync();

        var messageDto = new ChatMessageDto
        {
            Id = chatMessage.Id,
            ChatThreadId = chatMessage.ChatThreadId,
            CreatedAt = chatMessage.CreatedAt,
            CreatedBy = chatMessage.CreatedBy,
            SenderDisplayName = senderName,
            Message = chatMessage.Message,
            IsExternalMessage = true,
            ExternalSource = source.ToString(),
            ExternalSenderName = senderName,
            ExternalAttachmentUrl = attachmentUrl
        };

        // Broadcast to connected COBRA users
        await _chatHubService.BroadcastMessageToEventAsync(eventId, messageDto);

        _logger.LogInformation("Created external message {MessageId} from {Platform} in event {EventId}",
            chatMessage.Id, source, eventId);

        return messageDto;
    }
}

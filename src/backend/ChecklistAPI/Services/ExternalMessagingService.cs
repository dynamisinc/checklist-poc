using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using ChecklistAPI.Data;
using ChecklistAPI.ExternalMessaging;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Services;

/// <summary>
/// Service for managing external messaging integrations.
/// Handles the lifecycle of external channel mappings and coordinates between
/// COBRA's chat system and external platforms like GroupMe.
/// </summary>
public class ExternalMessagingService : IExternalMessagingService
{
    private readonly ChecklistDbContext _dbContext;
    private readonly IGroupMeApiClient _groupMeClient;
    private readonly IChatHubService _chatHubService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ExternalMessagingService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public ExternalMessagingService(
        ChecklistDbContext dbContext,
        IGroupMeApiClient groupMeClient,
        IChatHubService chatHubService,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ExternalMessagingService> logger,
        IServiceProvider serviceProvider)
    {
        _dbContext = dbContext;
        _groupMeClient = groupMeClient;
        _chatHubService = chatHubService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    private UserContext? GetUserContext()
    {
        return _httpContextAccessor.HttpContext?.Items["UserContext"] as UserContext;
    }

    #region Channel Mapping Lifecycle

    /// <summary>
    /// Creates an external channel mapping for an event.
    /// This creates the group on the external platform and registers a bot for messaging.
    /// </summary>
    public async Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request)
    {
        var userContext = GetUserContext()
                          ?? throw new UnauthorizedAccessException("User context not found");

        _logger.LogInformation("Creating external channel for event {EventId} on {Platform}",
            request.EventId, request.Platform);

        // Get event details for naming
        var eventEntity = await _dbContext.Events
            .Where(e => e.Id == request.EventId)
            .Select(e => new { e.Id, e.Name })
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException($"Event {request.EventId} not found");

        var groupName = request.CustomGroupName ?? $"COBRA: {eventEntity.Name}";
        var mappingId = Guid.NewGuid();
        var webhookSecret = GenerateWebhookSecret();

        string externalGroupId;
        string botId;
        string? shareUrl;

        switch (request.Platform)
        {
            case ExternalPlatform.GroupMe:
                var group = await _groupMeClient.CreateGroupAsync(groupName);
                externalGroupId = group.GroupId;
                shareUrl = group.ShareUrl;

                var bot = await _groupMeClient.CreateBotAsync(group.GroupId, "COBRA", mappingId);
                botId = bot.BotId;
                break;

            default:
                throw new NotSupportedException($"Platform {request.Platform} is not yet supported");
        }

        var mapping = new ExternalChannelMapping
        {
            Id = mappingId,
            EventId = request.EventId,
            Platform = request.Platform,
            ExternalGroupId = externalGroupId,
            ExternalGroupName = groupName,
            BotId = botId,
            WebhookSecret = webhookSecret,
            ShareUrl = shareUrl,
            IsActive = true,
            CreatedBy = userContext.Email,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ExternalChannelMappings.Add(mapping);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created external channel mapping {MappingId} for event {EventId}",
            mappingId, request.EventId);

        var dto = MapToDto(mapping);
        await _chatHubService.BroadcastChannelConnectedAsync(request.EventId, dto);

        return dto;
    }

    /// <summary>
    /// Retrieves all external channel mappings for an event.
    /// </summary>
    public async Task<List<ExternalChannelMappingDto>> GetEventChannelMappingsAsync(Guid eventId)
    {
        return await _dbContext.ExternalChannelMappings
            .Where(m => m.EventId == eventId && m.IsActive)
            .Select(m => new ExternalChannelMappingDto
            {
                Id = m.Id,
                EventId = m.EventId,
                Platform = m.Platform,
                PlatformName = m.Platform.ToString(),
                ExternalGroupId = m.ExternalGroupId,
                ExternalGroupName = m.ExternalGroupName,
                ShareUrl = m.ShareUrl,
                IsActive = m.IsActive,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    /// <summary>
    /// Deactivates an external channel mapping.
    /// Optionally archives the group on the external platform.
    /// </summary>
    public async Task DeactivateChannelAsync(Guid mappingId, bool archiveExternalGroup = false)
    {
        var userContext = GetUserContext()
                          ?? throw new UnauthorizedAccessException("User context not found");

        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId)
            ?? throw new KeyNotFoundException($"Channel mapping {mappingId} not found");

        var eventId = mapping.EventId;
        mapping.IsActive = false;
        mapping.LastModifiedBy = userContext.Email;
        mapping.LastModifiedAt = DateTime.UtcNow;

        if (archiveExternalGroup)
        {
            try
            {
                switch (mapping.Platform)
                {
                    case ExternalPlatform.GroupMe:
                        await _groupMeClient.DestroyBotAsync(mapping.BotId);
                        await _groupMeClient.ArchiveGroupAsync(mapping.ExternalGroupId);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to archive external group for mapping {MappingId}", mappingId);
            }
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deactivated external channel mapping {MappingId}", mappingId);
        await _chatHubService.BroadcastChannelDisconnectedAsync(eventId, mappingId);
    }

    #endregion

    #region Inbound Message Processing

    /// <summary>
    /// Processes an incoming webhook message from GroupMe.
    /// Creates a ChatMessage record and broadcasts via SignalR.
    /// </summary>
    public async Task ProcessGroupMeWebhookAsync(Guid mappingId, GroupMeWebhookPayload payload)
    {
        // Ignore bot messages to prevent loops
        if (payload.SenderType == "bot")
        {
            _logger.LogDebug("Ignoring bot message from GroupMe");
            return;
        }

        _logger.LogInformation("Processing GroupMe webhook for mapping {MappingId}, message {MessageId}",
            mappingId, payload.MessageId);

        // Get the channel mapping
        var mapping = await _dbContext.ExternalChannelMappings
            .Where(m => m.Id == mappingId && m.IsActive)
            .Select(m => new { m.EventId, m.ExternalGroupId })
            .FirstOrDefaultAsync();

        if (mapping == null)
        {
            _logger.LogWarning("No active channel mapping found for {MappingId}", mappingId);
            return;
        }

        // Verify the message is for the correct group
        if (mapping.ExternalGroupId != payload.GroupId)
        {
            _logger.LogWarning("Group ID mismatch: expected {Expected}, got {Actual}",
                mapping.ExternalGroupId, payload.GroupId);
            return;
        }

        // Check for duplicate message (webhook retry)
        var isDuplicate = await _dbContext.ChatMessages
            .AnyAsync(m => m.ExternalMessageId == payload.MessageId);

        if (isDuplicate)
        {
            _logger.LogDebug("Ignoring duplicate message {MessageId}", payload.MessageId);
            return;
        }

        // Get the event's default chat thread
        var chatThread = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == mapping.EventId && ct.IsDefaultEventThread && ct.IsActive)
            .FirstOrDefaultAsync();

        if (chatThread == null)
        {
            _logger.LogWarning("No default chat thread found for event {EventId}", mapping.EventId);
            return;
        }

        // Extract image attachment if present
        var imageAttachment = payload.Attachments?.FirstOrDefault(a => a.Type == "image");

        // Create a scope for the ChatService to avoid circular dependency
        using var scope = _serviceProvider.CreateScope();
        var chatService = scope.ServiceProvider.GetRequiredService<ChatService>();

        await chatService.CreateExternalMessageAsync(
            chatThread.Id,
            mapping.EventId,
            ExternalPlatform.GroupMe,
            payload.MessageId,
            payload.SenderName,
            payload.UserId,
            payload.Text ?? "[Image]",
            imageAttachment?.Url,
            payload.GetCreatedAtUtc(),
            mappingId);

        _logger.LogInformation("Processed GroupMe message {MessageId} for event {EventId}",
            payload.MessageId, mapping.EventId);
    }

    #endregion

    #region Outbound Message Sending

    /// <summary>
    /// Sends a COBRA chat message to all active external channels for the event.
    /// Called from ChatService after a COBRA user sends a message.
    /// </summary>
    public async Task BroadcastToExternalChannelsAsync(Guid eventId, string senderName, string message)
    {
        var activeChannels = await _dbContext.ExternalChannelMappings
            .Where(m => m.EventId == eventId && m.IsActive)
            .ToListAsync();

        foreach (var channel in activeChannels)
        {
            try
            {
                var formattedMessage = $"[{senderName}] {message}";

                switch (channel.Platform)
                {
                    case ExternalPlatform.GroupMe:
                        await _groupMeClient.PostBotMessageAsync(channel.BotId, formattedMessage);
                        break;

                    default:
                        _logger.LogWarning("Unsupported platform {Platform} for outbound message",
                            channel.Platform);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send message to {Platform} channel {ChannelId}",
                    channel.Platform, channel.Id);
            }
        }
    }

    #endregion

    #region Helpers

    private static ExternalChannelMappingDto MapToDto(ExternalChannelMapping mapping)
    {
        return new ExternalChannelMappingDto
        {
            Id = mapping.Id,
            EventId = mapping.EventId,
            Platform = mapping.Platform,
            PlatformName = mapping.Platform.ToString(),
            ExternalGroupId = mapping.ExternalGroupId,
            ExternalGroupName = mapping.ExternalGroupName,
            ShareUrl = mapping.ShareUrl,
            IsActive = mapping.IsActive,
            CreatedAt = mapping.CreatedAt
        };
    }

    private static string GenerateWebhookSecret()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    #endregion
}

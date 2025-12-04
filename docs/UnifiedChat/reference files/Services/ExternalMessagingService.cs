using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Security.Cryptography;

namespace Cobra.Poc.Services;

/// <summary>
/// DTO for creating an external channel mapping.
/// </summary>
public class CreateExternalChannelRequest
{
    public required Guid EventId { get; set; }
    public required ExternalPlatform Platform { get; set; }
    public string? CustomGroupName { get; set; }
}

/// <summary>
/// DTO for external channel mapping details.
/// </summary>
public class ExternalChannelMappingDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public ExternalPlatform Platform { get; set; }
    public string ExternalGroupId { get; set; } = default!;
    public string ExternalGroupName { get; set; } = default!;
    public string? ShareUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime Created { get; set; }
}

/// <summary>
/// Service for managing external messaging integrations.
/// Handles the lifecycle of external channel mappings and coordinates between
/// COBRA's chat system and external platforms like GroupMe.
/// 
/// TODO: Production - inherit from BaseService
/// TODO: Production - inject IUserContextService, IFilteredDbContextService
/// </summary>
public class ExternalMessagingService : IExternalMessagingService
{
    private readonly PocDbContext _dbContext;
    private readonly IGroupMeApiClient _groupMeClient;
    private readonly IChatHubService _chatHubService;
    private readonly ILogger<ExternalMessagingService> _logger;

    // TODO: Production - get from IUserContextService.CurrentUserContext
    private Guid CurrentUserId => Guid.Parse("00000000-0000-0000-0000-000000000001");
    private Guid CurrentOrganizationId => Guid.Parse("00000000-0000-0000-0000-000000000001");

    public ExternalMessagingService(
        PocDbContext dbContext,
        IGroupMeApiClient groupMeClient,
        IChatHubService chatHubService,
        ILogger<ExternalMessagingService> logger)
    {
        _dbContext = dbContext;
        _groupMeClient = groupMeClient;
        _chatHubService = chatHubService;
        _logger = logger;
    }

    #region Channel Mapping Lifecycle

    /// <summary>
    /// Creates an external channel mapping for an event.
    /// This creates the group on the external platform and registers a bot for messaging.
    /// Typically called automatically when a named event is created.
    /// </summary>
    /// <param name="request">Channel creation request</param>
    /// <returns>The created channel mapping details</returns>
    public async Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request)
    {
        _logger.LogInformation("Creating external channel for event {EventId} on {Platform}",
            request.EventId, request.Platform);

        // Get event details for naming
        var eventEntity = await _dbContext.Events
            .Where(e => e.Id == request.EventId)
            .Select(e => new { e.Id, e.Name })
            .SingleAsync();

        var groupName = request.CustomGroupName ?? $"COBRA: {eventEntity.Name}";
        var mappingId = Guid.NewGuid();
        var webhookSecret = GenerateWebhookSecret();

        // Create group and bot on external platform
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

        // Create the mapping record
        var mapping = new ExternalChannelMapping
        {
            Id = mappingId,
            EventId = request.EventId,
            OrganizationId = CurrentOrganizationId,
            Platform = request.Platform,
            ExternalGroupId = externalGroupId,
            ExternalGroupName = groupName,
            BotId = botId,
            WebhookSecret = webhookSecret,
            ShareUrl = shareUrl,
            IsActive = true,
            Created = DateTime.UtcNow,
            CreatedById = CurrentUserId,
            Modified = DateTime.UtcNow,
            ModifiedById = CurrentUserId
        };

        _dbContext.ExternalChannelMappings.Add(mapping);

        // TODO: Production - use SaveChangesAsync(Action.ExternalChannelCreated, mappingId, null, $"Created {request.Platform} group: {groupName}")
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created external channel mapping {MappingId} for event {EventId}",
            mappingId, request.EventId);

        return new ExternalChannelMappingDto
        {
            Id = mapping.Id,
            EventId = mapping.EventId,
            Platform = mapping.Platform,
            ExternalGroupId = mapping.ExternalGroupId,
            ExternalGroupName = mapping.ExternalGroupName,
            ShareUrl = mapping.ShareUrl,
            IsActive = mapping.IsActive,
            Created = mapping.Created
        };
    }

    /// <summary>
    /// Retrieves all external channel mappings for an event.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <returns>List of channel mappings</returns>
    public async Task<List<ExternalChannelMappingDto>> GetEventChannelMappingsAsync(Guid eventId)
    {
        return await _dbContext.ExternalChannelMappings
            .Where(m => m.EventId == eventId && m.IsActive)
            .Select(m => new ExternalChannelMappingDto
            {
                Id = m.Id,
                EventId = m.EventId,
                Platform = m.Platform,
                ExternalGroupId = m.ExternalGroupId,
                ExternalGroupName = m.ExternalGroupName,
                ShareUrl = m.ShareUrl,
                IsActive = m.IsActive,
                Created = m.Created
            })
            .ToListAsync();
    }

    /// <summary>
    /// Deactivates an external channel mapping.
    /// Optionally archives the group on the external platform.
    /// </summary>
    /// <param name="mappingId">The mapping ID</param>
    /// <param name="archiveExternalGroup">Whether to archive the group on the external platform</param>
    public async Task DeactivateChannelAsync(Guid mappingId, bool archiveExternalGroup = false)
    {
        var mapping = await _dbContext.ExternalChannelMappings
            .SingleAsync(m => m.Id == mappingId);

        mapping.IsActive = false;
        mapping.Modified = DateTime.UtcNow;
        mapping.ModifiedById = CurrentUserId;

        if (archiveExternalGroup)
        {
            switch (mapping.Platform)
            {
                case ExternalPlatform.GroupMe:
                    await _groupMeClient.DestroyBotAsync(mapping.BotId);
                    await _groupMeClient.ArchiveGroupAsync(mapping.ExternalGroupId);
                    break;
            }
        }

        // TODO: Production - use SaveChangesAsync(Action.ExternalChannelDeactivated, mappingId, null, $"Deactivated {mapping.Platform} channel")
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deactivated external channel mapping {MappingId}", mappingId);
    }

    #endregion

    #region Inbound Message Processing

    /// <summary>
    /// Processes an incoming webhook message from GroupMe.
    /// Creates a ChatMessage record and broadcasts via SignalR.
    /// </summary>
    /// <param name="mappingId">The channel mapping ID (from webhook URL)</param>
    /// <param name="payload">The GroupMe webhook payload</param>
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
            .SingleOrDefaultAsync();

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
            .Where(ct => ct.EventId == mapping.EventId && ct.IsDefaultEventThread)
            .SingleAsync();

        // Extract image attachment if present
        var imageAttachment = payload.Attachments?
            .FirstOrDefault(a => a.Type == "image");

        // Create the chat message
        var messageId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var chatMessage = new ChatMessage
        {
            Id = messageId,
            ChatThreadId = chatThread.Id,
            Message = payload.Text ?? "[Image]",

            // External message fields
            ExternalSource = ExternalPlatform.GroupMe,
            ExternalMessageId = payload.MessageId,
            ExternalSenderName = payload.SenderName,
            ExternalSenderId = payload.UserId,
            ExternalTimestamp = payload.GetCreatedAtUtc(),
            ExternalAttachmentUrl = imageAttachment?.Url,
            ExternalChannelMappingId = mappingId,

            // Audit fields - use system user for external messages
            Created = now,
            CreatedById = CurrentUserId,
            Modified = now,
            ModifiedById = CurrentUserId
        };

        _dbContext.ChatMessages.Add(chatMessage);

        // TODO: Production - use SaveChangesAsync(Action.ExternalChatMessageReceived, messageId, null, $"GroupMe message from {payload.SenderName}: {TruncateForAudit(payload.Text)}")
        await _dbContext.SaveChangesAsync();

        // Broadcast to connected COBRA users via SignalR
        var messageDto = new ChatMessageDto
        {
            Id = messageId,
            Created = chatMessage.Created,
            CreatedBy = payload.SenderName,
            CreatedById = CurrentUserId,
            Message = chatMessage.Message,
            IsExternalMessage = true,
            ExternalSource = ExternalPlatform.GroupMe.ToString(),
            ExternalSenderName = payload.SenderName,
            ExternalAttachmentUrl = imageAttachment?.Url
        };

        // TODO: Production - use INotifierService.SendMessageToEventUsers(eventId, NotifierMessages.ChatMessageCreated, messageDto)
        await _chatHubService.BroadcastMessageToEventAsync(mapping.EventId, messageDto);

        _logger.LogInformation("Processed GroupMe message {MessageId} for event {EventId}",
            payload.MessageId, mapping.EventId);
    }

    #endregion

    #region Outbound Message Sending

    /// <summary>
    /// Sends a COBRA chat message to all active external channels for the event.
    /// Called from ChatService after a COBRA user sends a message.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="senderName">Display name of the COBRA user</param>
    /// <param name="message">Message content</param>
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
                // Continue with other channels - don't fail the whole operation
            }
        }
    }

    #endregion

    #region Helpers

    /// <summary>
    /// Generates a cryptographically secure webhook secret.
    /// Used to validate incoming webhook requests.
    /// </summary>
    private static string GenerateWebhookSecret()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    #endregion
}

/// <summary>
/// Interface for external messaging service to support dependency injection.
/// </summary>
public interface IExternalMessagingService
{
    Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request);
    Task<List<ExternalChannelMappingDto>> GetEventChannelMappingsAsync(Guid eventId);
    Task DeactivateChannelAsync(Guid mappingId, bool archiveExternalGroup = false);
    Task ProcessGroupMeWebhookAsync(Guid mappingId, GroupMeWebhookPayload payload);
    Task BroadcastToExternalChannelsAsync(Guid eventId, string senderName, string message);
}

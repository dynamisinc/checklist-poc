using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using CobraAPI.Core.Data;
using CobraAPI.Tools.Chat.ExternalPlatforms;
using CobraAPI.Core.Models;

namespace CobraAPI.Tools.Chat.Services;

/// <summary>
/// Service for managing external messaging integrations.
/// Handles the lifecycle of external channel mappings and coordinates between
/// COBRA's chat system and external platforms like GroupMe.
/// </summary>
public class ExternalMessagingService : IExternalMessagingService
{
    private readonly CobraDbContext _dbContext;
    private readonly IGroupMeApiClient _groupMeClient;
    private readonly IChatHubService _chatHubService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<ExternalMessagingService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TeamsBotSettings _teamsBotSettings;
    private readonly IHttpClientFactory _httpClientFactory;

    public ExternalMessagingService(
        CobraDbContext dbContext,
        IGroupMeApiClient groupMeClient,
        IChatHubService chatHubService,
        IHttpContextAccessor httpContextAccessor,
        ILogger<ExternalMessagingService> logger,
        IServiceProvider serviceProvider,
        IOptions<TeamsBotSettings> teamsBotSettings,
        IHttpClientFactory httpClientFactory)
    {
        _dbContext = dbContext;
        _groupMeClient = groupMeClient;
        _chatHubService = chatHubService;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
        _serviceProvider = serviceProvider;
        _teamsBotSettings = teamsBotSettings.Value;
        _httpClientFactory = httpClientFactory;
    }

    private UserContext? GetUserContext()
    {
        return _httpContextAccessor.HttpContext?.Items["UserContext"] as UserContext;
    }

    #region Channel Mapping Lifecycle

    /// <summary>
    /// Creates an external channel mapping for an event.
    /// This creates the group on the external platform and registers a bot for messaging.
    /// If an active channel already exists for this event+platform, returns the existing one.
    /// </summary>
    public async Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request)
    {
        var userContext = GetUserContext()
                          ?? throw new UnauthorizedAccessException("User context not found");

        _logger.LogInformation("Creating external channel for event {EventId} on {Platform}",
            request.EventId, request.Platform);

        // Check if an active channel already exists for this event + platform
        var existingChannel = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.EventId == request.EventId
                                   && m.Platform == request.Platform
                                   && m.IsActive);

        if (existingChannel != null)
        {
            _logger.LogInformation("Active {Platform} channel already exists for event {EventId}, returning existing mapping {MappingId}",
                request.Platform, request.EventId, existingChannel.Id);
            return MapToDto(existingChannel);
        }

        // Check for a deactivated channel that can be reactivated
        // This allows reconnecting to the same GroupMe group after disconnecting
        var deactivatedChannel = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.EventId == request.EventId
                                   && m.Platform == request.Platform
                                   && !m.IsActive);

        if (deactivatedChannel != null)
        {
            _logger.LogInformation("Reactivating deactivated {Platform} channel for event {EventId}, mapping {MappingId}",
                request.Platform, request.EventId, deactivatedChannel.Id);

            deactivatedChannel.IsActive = true;
            deactivatedChannel.LastModifiedBy = userContext.Email;
            deactivatedChannel.LastModifiedAt = DateTime.UtcNow;

            // Also reactivate the linked ChatThread if it exists
            var linkedThread = await _dbContext.ChatThreads
                .FirstOrDefaultAsync(ct => ct.ExternalChannelMappingId == deactivatedChannel.Id);
            if (linkedThread != null)
            {
                linkedThread.IsActive = true;
                linkedThread.LastModifiedBy = userContext.Email;
                linkedThread.LastModifiedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            var reactivatedDto = MapToDto(deactivatedChannel);
            await _chatHubService.BroadcastChannelConnectedAsync(request.EventId, reactivatedDto);

            return reactivatedDto;
        }

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

        // Get max display order for this event's channels
        var maxOrder = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == request.EventId && ct.IsActive)
            .MaxAsync(ct => (int?)ct.DisplayOrder) ?? -1;

        // Create a ChatThread linked to this external channel
        var chatThread = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = request.EventId,
            Name = groupName,
            Description = $"Messages from {request.Platform}",
            ChannelType = ChannelType.External,
            DisplayOrder = maxOrder + 1,
            ExternalChannelMappingId = mappingId,
            IsDefaultEventThread = false,
            IsActive = true,
            CreatedBy = userContext.Email,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ChatThreads.Add(chatThread);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created external channel mapping {MappingId} with ChatThread {ThreadId} for event {EventId}",
            mappingId, chatThread.Id, request.EventId);

        var dto = MapToDto(mapping);
        await _chatHubService.BroadcastChannelConnectedAsync(request.EventId, dto);

        return dto;
    }

    /// <summary>
    /// Creates an external channel mapping for Teams with an existing conversation.
    /// Called when connecting to a Teams conversation from the UI.
    /// Creates both the ExternalChannelMapping and a linked ChatThread.
    /// </summary>
    public async Task<ExternalChannelMappingDto> CreateTeamsChannelMappingAsync(
        Guid eventId,
        string teamsConversationId,
        string channelName,
        string createdBy)
    {
        _logger.LogInformation("Creating Teams channel mapping for event {EventId}, conversation {ConversationId}",
            eventId, teamsConversationId);

        // Check if mapping already exists for this conversation
        var existingMapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.ExternalGroupId == teamsConversationId && m.IsActive);

        if (existingMapping != null)
        {
            _logger.LogInformation("Active Teams mapping already exists for conversation {ConversationId}, returning existing",
                teamsConversationId);
            return MapToDto(existingMapping);
        }

        var mappingId = Guid.NewGuid();
        var webhookSecret = GenerateWebhookSecret();

        var mapping = new ExternalChannelMapping
        {
            Id = mappingId,
            EventId = eventId,
            Platform = ExternalPlatform.Teams,
            ExternalGroupId = teamsConversationId,
            ExternalGroupName = channelName,
            BotId = string.Empty,
            WebhookSecret = webhookSecret,
            ShareUrl = null,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ExternalChannelMappings.Add(mapping);

        // Get max display order for this event's channels
        var maxOrder = await _dbContext.ChatThreads
            .Where(ct => ct.EventId == eventId && ct.IsActive)
            .MaxAsync(ct => (int?)ct.DisplayOrder) ?? -1;

        // Create a ChatThread linked to this external channel
        var chatThread = new ChatThread
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Name = channelName,
            Description = "Messages from Microsoft Teams",
            ChannelType = ChannelType.External,
            DisplayOrder = maxOrder + 1,
            ExternalChannelMappingId = mappingId,
            IsDefaultEventThread = false,
            IsActive = true,
            CreatedBy = createdBy,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.ChatThreads.Add(chatThread);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Created Teams channel mapping {MappingId} with ChatThread {ThreadId} for event {EventId}",
            mappingId, chatThread.Id, eventId);

        var dto = MapToDto(mapping);
        await _chatHubService.BroadcastChannelConnectedAsync(eventId, dto);

        return dto;
    }

    /// <summary>
    /// Links a Teams conversation to an existing ChatThread.
    /// This allows any COBRA channel to become bidirectionally synced with Teams.
    /// </summary>
    public async Task<ChatThreadDto> LinkTeamsToChannelAsync(Guid channelId, string teamsConversationId)
    {
        var userContext = GetUserContext()
                          ?? throw new UnauthorizedAccessException("User context not found");

        _logger.LogInformation("Linking Teams conversation {ConversationId} to channel {ChannelId}",
            teamsConversationId, channelId);

        // Get the channel
        var channel = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .FirstOrDefaultAsync(ct => ct.Id == channelId && ct.IsActive)
            ?? throw new KeyNotFoundException($"Channel {channelId} not found");

        // Check if channel already has an external mapping
        if (channel.ExternalChannelMappingId.HasValue)
        {
            throw new InvalidOperationException("Channel is already linked to an external platform. Unlink it first.");
        }

        // Check if there's an existing active mapping for this Teams conversation that we can reuse
        // This allows multiple COBRA channels to share the same Teams conversation
        var existingActiveMapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.ExternalGroupId == teamsConversationId
                                   && m.Platform == ExternalPlatform.Teams
                                   && m.IsActive);

        ExternalChannelMapping mapping;

        if (existingActiveMapping != null)
        {
            // Reuse the existing active mapping - allows multiple channels to link to same Teams conversation
            _logger.LogInformation("Reusing existing active mapping {MappingId} for Teams conversation {ConversationId}",
                existingActiveMapping.Id, teamsConversationId);

            mapping = existingActiveMapping;
        }
        else
        {
            // Check if there's a deactivated mapping we can reactivate (due to unique index on Platform+ExternalGroupId)
            var existingDeactivatedMapping = await _dbContext.ExternalChannelMappings
                .FirstOrDefaultAsync(m => m.ExternalGroupId == teamsConversationId
                                       && m.Platform == ExternalPlatform.Teams
                                       && !m.IsActive);

            if (existingDeactivatedMapping != null)
            {
                // Reactivate the existing mapping
                _logger.LogInformation("Reactivating existing deactivated mapping {MappingId} for Teams conversation {ConversationId}",
                    existingDeactivatedMapping.Id, teamsConversationId);

                existingDeactivatedMapping.EventId = channel.EventId;
                existingDeactivatedMapping.ExternalGroupName = channel.Name;
                existingDeactivatedMapping.IsActive = true;
                existingDeactivatedMapping.LastModifiedBy = userContext.Email;
                existingDeactivatedMapping.LastModifiedAt = DateTime.UtcNow;

                mapping = existingDeactivatedMapping;
            }
            else
            {
                // Create a new external channel mapping
                var mappingId = Guid.NewGuid();
                var webhookSecret = GenerateWebhookSecret();

                mapping = new ExternalChannelMapping
                {
                    Id = mappingId,
                    EventId = channel.EventId,
                    Platform = ExternalPlatform.Teams,
                    ExternalGroupId = teamsConversationId,
                    ExternalGroupName = channel.Name,
                    BotId = string.Empty,
                    WebhookSecret = webhookSecret,
                    ShareUrl = null,
                    IsActive = true,
                    CreatedBy = userContext.Email,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.ExternalChannelMappings.Add(mapping);
            }
        }

        // Link the channel to the mapping
        channel.ExternalChannelMappingId = mapping.Id;
        channel.LastModifiedBy = userContext.Email;
        channel.LastModifiedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Linked Teams conversation {ConversationId} to channel {ChannelId} via mapping {MappingId}",
            teamsConversationId, channelId, mapping.Id);

        // Broadcast channel update
        var mappingDto = MapToDto(mapping);
        await _chatHubService.BroadcastChannelConnectedAsync(channel.EventId, mappingDto);

        // Return updated channel DTO
        return MapChannelToDto(channel, mapping);
    }

    /// <summary>
    /// Unlinks an external platform from a channel without deleting the channel.
    /// Only deactivates the mapping if no other channels are using it.
    /// </summary>
    public async Task UnlinkExternalChannelAsync(Guid channelId)
    {
        var userContext = GetUserContext()
                          ?? throw new UnauthorizedAccessException("User context not found");

        var channel = await _dbContext.ChatThreads
            .Include(ct => ct.ExternalChannelMapping)
            .FirstOrDefaultAsync(ct => ct.Id == channelId && ct.IsActive)
            ?? throw new KeyNotFoundException($"Channel {channelId} not found");

        if (!channel.ExternalChannelMappingId.HasValue || channel.ExternalChannelMapping == null)
        {
            _logger.LogWarning("Channel {ChannelId} is not linked to any external platform", channelId);
            return;
        }

        var mappingId = channel.ExternalChannelMappingId.Value;
        var eventId = channel.EventId;

        // Check if other channels are still using this mapping
        var otherChannelsUsingMapping = await _dbContext.ChatThreads
            .CountAsync(ct => ct.ExternalChannelMappingId == mappingId
                           && ct.Id != channelId
                           && ct.IsActive);

        // Unlink this channel from the mapping
        channel.ExternalChannelMappingId = null;
        channel.LastModifiedBy = userContext.Email;
        channel.LastModifiedAt = DateTime.UtcNow;

        // Only deactivate the mapping if no other channels are using it
        if (otherChannelsUsingMapping == 0)
        {
            channel.ExternalChannelMapping.IsActive = false;
            channel.ExternalChannelMapping.LastModifiedBy = userContext.Email;
            channel.ExternalChannelMapping.LastModifiedAt = DateTime.UtcNow;

            _logger.LogInformation("Unlinked and deactivated external channel mapping {MappingId} from channel {ChannelId}",
                mappingId, channelId);

            await _dbContext.SaveChangesAsync();
            await _chatHubService.BroadcastChannelDisconnectedAsync(eventId, mappingId);
        }
        else
        {
            _logger.LogInformation("Unlinked channel {ChannelId} from mapping {MappingId}, but mapping remains active for {OtherCount} other channel(s)",
                channelId, mappingId, otherChannelsUsingMapping);

            await _dbContext.SaveChangesAsync();
        }
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
    /// Deactivates an external channel mapping and its linked ChatThread.
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

        // Also deactivate the linked ChatThread
        var linkedThread = await _dbContext.ChatThreads
            .FirstOrDefaultAsync(ct => ct.ExternalChannelMappingId == mappingId);
        if (linkedThread != null)
        {
            linkedThread.IsActive = false;
            linkedThread.LastModifiedBy = userContext.Email;
            linkedThread.LastModifiedAt = DateTime.UtcNow;
        }

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

        // Get the ChatThread linked to this external channel mapping
        var chatThread = await _dbContext.ChatThreads
            .Where(ct => ct.ExternalChannelMappingId == mappingId && ct.IsActive)
            .FirstOrDefaultAsync();

        // Fallback to default event thread if no linked thread exists (legacy mappings)
        if (chatThread == null)
        {
            _logger.LogWarning("No linked ChatThread found for mapping {MappingId}, falling back to default event thread", mappingId);
            chatThread = await _dbContext.ChatThreads
                .Where(ct => ct.EventId == mapping.EventId && ct.IsDefaultEventThread && ct.IsActive)
                .FirstOrDefaultAsync();
        }

        if (chatThread == null)
        {
            _logger.LogWarning("No chat thread found for event {EventId}", mapping.EventId);
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

        _logger.LogInformation("Processed GroupMe message {MessageId} for event {EventId}, thread {ThreadId}",
            payload.MessageId, mapping.EventId, chatThread.Id);
    }

    /// <summary>
    /// Processes an incoming webhook message from Teams.
    /// Creates a ChatMessage record and broadcasts via SignalR.
    /// </summary>
    public async Task ProcessTeamsWebhookAsync(Guid mappingId, TeamsWebhookPayload payload)
    {
        // Ignore bot messages to prevent loops (handled by TeamsBot, but double-check)
        if (string.IsNullOrEmpty(payload.Text) && payload.ActivityType == "message")
        {
            _logger.LogDebug("Ignoring empty Teams message");
            return;
        }

        _logger.LogInformation("Processing Teams webhook for mapping {MappingId}, message {MessageId}",
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

        // Get ALL ChatThreads linked to this external channel mapping
        // Multiple COBRA channels can share the same Teams conversation
        var linkedThreads = await _dbContext.ChatThreads
            .Where(ct => ct.ExternalChannelMappingId == mappingId && ct.IsActive)
            .ToListAsync();

        _logger.LogInformation(
            "Found {ThreadCount} channel(s) linked to mapping {MappingId}: [{ChannelNames}]",
            linkedThreads.Count,
            mappingId,
            string.Join(", ", linkedThreads.Select(t => $"{t.Name} ({t.Id})")));

        // Fallback to default event thread if no linked thread exists (legacy mappings)
        if (linkedThreads.Count == 0)
        {
            _logger.LogWarning("No linked ChatThread found for mapping {MappingId}, falling back to default event thread", mappingId);
            var defaultThread = await _dbContext.ChatThreads
                .Where(ct => ct.EventId == mapping.EventId && ct.IsDefaultEventThread && ct.IsActive)
                .FirstOrDefaultAsync();

            if (defaultThread != null)
            {
                linkedThreads.Add(defaultThread);
                _logger.LogInformation("Using default event thread {ThreadId} for mapping {MappingId}",
                    defaultThread.Id, mappingId);
            }
        }

        if (linkedThreads.Count == 0)
        {
            _logger.LogWarning("No chat thread found for event {EventId}", mapping.EventId);
            return;
        }

        // Create a scope for the ChatService to avoid circular dependency
        using var scope = _serviceProvider.CreateScope();
        var chatService = scope.ServiceProvider.GetRequiredService<ChatService>();

        // Send message to ALL linked channels
        foreach (var chatThread in linkedThreads)
        {
            // Check for duplicate message in this specific thread (webhook retry)
            var isDuplicate = await _dbContext.ChatMessages
                .AnyAsync(m => m.ExternalMessageId == payload.MessageId && m.ChatThreadId == chatThread.Id);

            if (isDuplicate)
            {
                _logger.LogDebug("Ignoring duplicate Teams message {MessageId} for thread {ThreadId}",
                    payload.MessageId, chatThread.Id);
                continue;
            }

            await chatService.CreateExternalMessageAsync(
                chatThread.Id,
                mapping.EventId,
                ExternalPlatform.Teams,
                payload.MessageId,
                payload.SenderName,
                payload.SenderId,
                payload.Text ?? "[Attachment]",
                payload.ImageUrl,
                payload.Timestamp,
                mappingId);

            _logger.LogInformation("Processed Teams message {MessageId} for event {EventId}, thread {ThreadId}",
                payload.MessageId, mapping.EventId, chatThread.Id);
        }
    }

    #endregion

    #region Outbound Message Sending

    /// <summary>
    /// Sends a COBRA chat message to all active external channels for the event.
    /// Called from ChatService after a COBRA user sends a message.
    /// If chatThreadId is provided, only sends to the external channel linked to that thread.
    /// </summary>
    public async Task BroadcastToExternalChannelsAsync(Guid eventId, string senderName, string message, Guid? chatThreadId = null)
    {
        // Get event name for context (used when multiple channels share same Teams conversation)
        var eventName = await _dbContext.Events
            .Where(e => e.Id == eventId)
            .Select(e => e.Name)
            .FirstOrDefaultAsync() ?? "Unknown Event";

        // Get the channel info if a specific thread is provided
        string? channelName = null;
        Guid? externalMappingId = null;

        if (chatThreadId.HasValue)
        {
            var threadInfo = await _dbContext.ChatThreads
                .Where(ct => ct.Id == chatThreadId.Value)
                .Select(ct => new { ct.Name, ct.ExternalChannelMappingId })
                .FirstOrDefaultAsync();

            if (threadInfo != null)
            {
                channelName = threadInfo.Name;
                externalMappingId = threadInfo.ExternalChannelMappingId;
            }
        }

        IQueryable<ExternalChannelMapping> query = _dbContext.ExternalChannelMappings
            .Where(m => m.EventId == eventId && m.IsActive);

        // If a specific thread is provided and linked to an external channel, only send to that channel
        if (externalMappingId.HasValue)
        {
            query = query.Where(m => m.Id == externalMappingId.Value);
        }

        var activeChannels = await query.ToListAsync();

        foreach (var channel in activeChannels)
        {
            try
            {
                switch (channel.Platform)
                {
                    case ExternalPlatform.GroupMe:
                        var formattedMessage = $"[{senderName}] {message}";
                        await _groupMeClient.PostBotMessageAsync(channel.BotId, formattedMessage);
                        break;

                    case ExternalPlatform.Teams:
                        // Count how many COBRA channels are linked to this Teams conversation
                        var linkedChannelCount = await _dbContext.ChatThreads
                            .CountAsync(ct => ct.ExternalChannelMappingId == channel.Id && ct.IsActive);

                        // Send with context if multiple channels share this Teams conversation
                        // Include ConversationReferenceJson for stateless bot architecture
                        await SendMessageToTeamsAsync(
                            channel.ExternalGroupId,
                            senderName,
                            message,
                            channel.ConversationReferenceJson,
                            eventName,
                            channelName,
                            hasMultipleChannels: linkedChannelCount > 1);
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

    /// <summary>
    /// Sends a message to a Teams conversation via the TeamsBot service.
    /// Stateless architecture: ConversationReferenceJson is passed from DB to TeamsBot.
    /// </summary>
    /// <param name="conversationId">Teams conversation ID (for logging)</param>
    /// <param name="senderName">COBRA sender name</param>
    /// <param name="message">Message text</param>
    /// <param name="conversationReferenceJson">Serialized Bot Framework ConversationReference (from DB)</param>
    /// <param name="eventName">Optional event name for context</param>
    /// <param name="channelName">Optional channel name for context</param>
    /// <param name="hasMultipleChannels">True if multiple COBRA channels share this Teams conversation</param>
    private async Task SendMessageToTeamsAsync(
        string conversationId,
        string senderName,
        string message,
        string? conversationReferenceJson,
        string? eventName = null,
        string? channelName = null,
        bool hasMultipleChannels = false)
    {
        var baseUrl = _teamsBotSettings.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
        {
            _logger.LogWarning("TeamsBot is not configured - cannot send outbound Teams message");
            return;
        }

        if (string.IsNullOrEmpty(conversationReferenceJson))
        {
            _logger.LogWarning(
                "No ConversationReference stored for Teams conversation {ConversationId} - cannot send message. " +
                "A message must be received from Teams first to populate the ConversationReference.",
                conversationId);
            return;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            // Add API key header if configured
            if (!string.IsNullOrEmpty(_teamsBotSettings.ApiKey))
            {
                client.DefaultRequestHeaders.Add("X-Api-Key", _teamsBotSettings.ApiKey);
            }

            var payload = new
            {
                conversationId,
                conversationReferenceJson,
                message,
                senderName,
                eventName,
                channelName,
                hasMultipleChannels
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json");

            var response = await client.PostAsync($"{baseUrl}/api/internal/send", content);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning(
                    "Failed to send Teams message: {StatusCode} - {Error}",
                    response.StatusCode, errorContent);
            }
            else
            {
                _logger.LogDebug("Sent message to Teams conversation {ConversationId} (hasMultipleChannels: {HasMultiple})",
                    conversationId, hasMultipleChannels);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to connect to TeamsBot at {BaseUrl}", baseUrl);
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("TeamsBot send request timed out");
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

    /// <summary>
    /// Ensures a DateTime is specified as UTC kind for proper JSON serialization.
    /// </summary>
    private static DateTime SpecifyUtc(DateTime dateTime)
    {
        return DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
    }

    /// <summary>
    /// Maps a ChatThread entity to ChatThreadDto.
    /// </summary>
    private static ChatThreadDto MapChannelToDto(ChatThread ct, ExternalChannelMapping? mapping)
    {
        return new ChatThreadDto
        {
            Id = ct.Id,
            EventId = ct.EventId,
            Name = ct.Name,
            Description = ct.Description,
            ChannelType = ct.ChannelType,
            ChannelTypeName = ct.ChannelType.ToString(),
            IsDefaultEventThread = ct.IsDefaultEventThread,
            DisplayOrder = ct.DisplayOrder,
            IconName = ct.IconName,
            Color = ct.Color,
            PositionId = ct.PositionId,
            Position = null, // Not loading position for this use case
            MessageCount = 0, // Not loading messages for this use case
            CreatedAt = SpecifyUtc(ct.CreatedAt),
            IsActive = ct.IsActive,
            LastMessageAt = null,
            LastMessageSender = null,
            ExternalChannel = mapping != null
                ? new ExternalChannelMappingDto
                {
                    Id = mapping.Id,
                    EventId = mapping.EventId,
                    Platform = mapping.Platform,
                    PlatformName = mapping.Platform.ToString(),
                    ExternalGroupId = mapping.ExternalGroupId,
                    ExternalGroupName = mapping.ExternalGroupName,
                    ShareUrl = mapping.ShareUrl,
                    IsActive = mapping.IsActive,
                    CreatedAt = SpecifyUtc(mapping.CreatedAt)
                }
                : null
        };
    }

    #endregion
}

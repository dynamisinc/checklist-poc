using Microsoft.AspNetCore.Mvc;

namespace CobraAPI.Tools.Chat.Controllers;

/// <summary>
/// API controller for chat operations.
/// Provides endpoints for sending messages, retrieving messages, and managing channels.
/// </summary>
[ApiController]
[Route("api/events/{eventId:guid}/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IChannelService _channelService;
    private readonly IExternalMessagingService _externalMessagingService;
    private readonly IChatHubService _chatHubService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        IChatService chatService,
        IChannelService channelService,
        IExternalMessagingService externalMessagingService,
        IChatHubService chatHubService,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _channelService = channelService;
        _externalMessagingService = externalMessagingService;
        _chatHubService = chatHubService;
        _logger = logger;
    }

    #region Channels

    /// <summary>
    /// Gets all channels for an event.
    /// </summary>
    [HttpGet("channels")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChatThreadDto>>> GetChannels(Guid eventId)
    {
        var channels = await _channelService.GetEventChannelsAsync(eventId);
        return Ok(channels);
    }

    /// <summary>
    /// Gets a specific channel by ID.
    /// </summary>
    [HttpGet("channels/{channelId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChatThreadDto>> GetChannel(Guid eventId, Guid channelId)
    {
        var channel = await _channelService.GetChannelAsync(channelId);
        if (channel == null)
        {
            return NotFound("Channel not found");
        }
        return Ok(channel);
    }

    /// <summary>
    /// Creates a new channel in an event.
    /// </summary>
    [HttpPost("channels")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatThreadDto>> CreateChannel(
        Guid eventId,
        [FromBody] CreateChannelRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Channel name is required");
        }

        request.EventId = eventId;
        var channel = await _channelService.CreateChannelAsync(request);

        // Broadcast channel created event
        await _chatHubService.BroadcastChannelCreatedAsync(eventId, channel);

        return CreatedAtAction(
            nameof(GetChannel),
            new { eventId, channelId = channel.Id },
            channel);
    }

    /// <summary>
    /// Updates a channel's metadata.
    /// </summary>
    [HttpPatch("channels/{channelId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChatThreadDto>> UpdateChannel(
        Guid eventId,
        Guid channelId,
        [FromBody] UpdateChannelRequest request)
    {
        var channel = await _channelService.UpdateChannelAsync(channelId, request);
        if (channel == null)
        {
            return NotFound("Channel not found");
        }
        return Ok(channel);
    }

    /// <summary>
    /// Reorders channels within an event.
    /// </summary>
    [HttpPut("channels/reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> ReorderChannels(
        Guid eventId,
        [FromBody] List<Guid> orderedChannelIds)
    {
        await _channelService.ReorderChannelsAsync(eventId, orderedChannelIds);
        return NoContent();
    }

    /// <summary>
    /// Deletes a channel (soft delete/archive).
    /// Cannot delete the default event channel or external channels.
    /// </summary>
    [HttpDelete("channels/{channelId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteChannel(Guid eventId, Guid channelId)
    {
        var result = await _channelService.DeleteChannelAsync(channelId);
        if (!result)
        {
            return BadRequest("Cannot delete this channel. It may be a default or external channel.");
        }

        // Broadcast channel archived event
        await _chatHubService.BroadcastChannelArchivedAsync(eventId, channelId);

        return NoContent();
    }

    /// <summary>
    /// Gets all channels including archived for administration.
    /// </summary>
    [HttpGet("channels/all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChatThreadDto>>> GetAllChannels(
        Guid eventId,
        [FromQuery] bool includeArchived = true)
    {
        var channels = await _channelService.GetAllEventChannelsAsync(eventId, includeArchived);
        return Ok(channels);
    }

    /// <summary>
    /// Gets archived channels for an event.
    /// </summary>
    [HttpGet("channels/archived")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChatThreadDto>>> GetArchivedChannels(Guid eventId)
    {
        var channels = await _channelService.GetArchivedChannelsAsync(eventId);
        return Ok(channels);
    }

    /// <summary>
    /// Restores an archived channel.
    /// </summary>
    [HttpPost("channels/{channelId:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChatThreadDto>> RestoreChannel(Guid eventId, Guid channelId)
    {
        var channel = await _channelService.RestoreChannelAsync(channelId);
        if (channel == null)
        {
            return NotFound("Channel not found or not archived");
        }

        // Broadcast channel restored event
        await _chatHubService.BroadcastChannelRestoredAsync(eventId, channel);

        return Ok(channel);
    }

    /// <summary>
    /// Permanently deletes a channel (cannot be undone without SQL access).
    /// </summary>
    [HttpDelete("channels/{channelId:guid}/permanent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> PermanentDeleteChannel(Guid eventId, Guid channelId)
    {
        var result = await _channelService.PermanentDeleteChannelAsync(channelId);
        if (!result)
        {
            return BadRequest("Cannot permanently delete this channel. It may be a default or Announcements channel.");
        }

        // Broadcast channel permanently deleted event
        await _chatHubService.BroadcastChannelDeletedAsync(eventId, channelId);

        return NoContent();
    }

    /// <summary>
    /// Archives all messages in a channel.
    /// </summary>
    [HttpPost("channels/{channelId:guid}/archive-messages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ArchiveMessagesResponse>> ArchiveAllMessages(Guid eventId, Guid channelId)
    {
        var count = await _channelService.ArchiveAllMessagesAsync(channelId);
        return Ok(new ArchiveMessagesResponse { ArchivedCount = count });
    }

    /// <summary>
    /// Archives messages older than specified days in a channel.
    /// </summary>
    [HttpPost("channels/{channelId:guid}/archive-messages-older-than")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ArchiveMessagesResponse>> ArchiveMessagesOlderThan(
        Guid eventId,
        Guid channelId,
        [FromQuery] int days)
    {
        if (days < 1)
        {
            return BadRequest("Days must be at least 1");
        }

        var count = await _channelService.ArchiveMessagesOlderThanAsync(channelId, days);
        return Ok(new ArchiveMessagesResponse { ArchivedCount = count });
    }

    /// <summary>
    /// Creates position-based channels for an event.
    /// Creates one channel for each ICS position (Command, Operations, Planning, etc.).
    /// </summary>
    [HttpPost("channels/position")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<ActionResult<List<ChatThreadDto>>> CreatePositionChannels(Guid eventId)
    {
        var userContext = HttpContext.Items["UserContext"] as UserContext;
        var createdBy = userContext?.Email ?? "system";

        var channels = await _channelService.CreatePositionChannelsAsync(eventId, createdBy);

        // Broadcast channel created events for each position channel
        foreach (var channel in channels)
        {
            await _chatHubService.BroadcastChannelCreatedAsync(eventId, channel);
        }

        _logger.LogInformation(
            "Created {Count} position channels for event {EventId}",
            channels.Count, eventId);

        return StatusCode(StatusCodes.Status201Created, channels);
    }

    /// <summary>
    /// Gets channels visible to the current user based on their positions and role.
    /// Position channels are only visible to users assigned to that position,
    /// unless the user has Manage role (which can see all channels),
    /// or the user created the channel (creator can always see their channel).
    /// Other channel types are visible to all users.
    /// </summary>
    [HttpGet("channels/visible")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChatThreadDto>>> GetUserVisibleChannels(Guid eventId)
    {
        var userContext = HttpContext.Items["UserContext"] as UserContext;
        var userPositionIds = userContext?.PositionIds ?? new List<Guid>();
        var userEmail = userContext?.Email ?? string.Empty;
        var canManage = userContext?.CanManage ?? false;

        var channels = await _channelService.GetUserVisibleChannelsAsync(eventId, userPositionIds, userEmail, canManage);
        return Ok(channels);
    }

    #endregion

    /// <summary>
    /// Gets or creates the default chat thread for an event.
    /// </summary>
    [HttpGet("thread")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<ChatThreadDto>> GetEventChatThread(Guid eventId)
    {
        var thread = await _chatService.GetOrCreateEventChatThreadAsync(eventId);
        return Ok(thread);
    }

    /// <summary>
    /// Gets messages for a chat thread with optional pagination.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="threadId">The chat thread ID</param>
    /// <param name="skip">Number of messages to skip</param>
    /// <param name="take">Number of messages to return</param>
    [HttpGet("thread/{threadId:guid}/messages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChatMessageDto>>> GetMessages(
        Guid eventId,
        Guid threadId,
        [FromQuery] int? skip = null,
        [FromQuery] int? take = null)
    {
        var messages = await _chatService.GetMessagesAsync(threadId, skip, take);
        return Ok(messages);
    }

    /// <summary>
    /// Sends a new chat message.
    /// </summary>
    [HttpPost("thread/{threadId:guid}/messages")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ChatMessageDto>> SendMessage(
        Guid eventId,
        Guid threadId,
        [FromBody] SendMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Message cannot be empty");
        }

        var message = await _chatService.SendMessageAsync(eventId, threadId, request.Message);
        return Ok(message);
    }

    /// <summary>
    /// Gets external channel mappings for an event.
    /// </summary>
    [HttpGet("external-channels")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ExternalChannelMappingDto>>> GetExternalChannels(Guid eventId)
    {
        var channels = await _externalMessagingService.GetEventChannelMappingsAsync(eventId);
        return Ok(channels);
    }

    /// <summary>
    /// Creates a new external channel mapping (connects GroupMe group to event).
    /// </summary>
    [HttpPost("external-channels")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ExternalChannelMappingDto>> CreateExternalChannel(
        Guid eventId,
        [FromBody] CreateExternalChannelApiRequest request)
    {
        try
        {
            var mapping = await _externalMessagingService.CreateExternalChannelAsync(new CreateExternalChannelRequest
            {
                EventId = eventId,
                Platform = request.Platform,
                CustomGroupName = request.CustomGroupName
            });

            return CreatedAtAction(
                nameof(GetExternalChannels),
                new { eventId },
                mapping);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Failed to create external channel for event {EventId}", eventId);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Deactivates an external channel mapping.
    /// </summary>
    [HttpDelete("external-channels/{mappingId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeactivateExternalChannel(
        Guid eventId,
        Guid mappingId,
        [FromQuery] bool archiveExternalGroup = false)
    {
        try
        {
            await _externalMessagingService.DeactivateChannelAsync(mappingId, archiveExternalGroup);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Channel mapping not found");
        }
    }
}

/// <summary>
/// Request model for creating an external channel.
/// </summary>
public class CreateExternalChannelApiRequest
{
    public ExternalPlatform Platform { get; set; }
    public string? CustomGroupName { get; set; }
}

/// <summary>
/// Response model for archive messages operations.
/// </summary>
public class ArchiveMessagesResponse
{
    public int ArchivedCount { get; set; }
}

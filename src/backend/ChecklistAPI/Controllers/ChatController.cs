using Microsoft.AspNetCore.Mvc;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Services;

namespace ChecklistAPI.Controllers;

/// <summary>
/// API controller for chat operations.
/// Provides endpoints for sending messages, retrieving messages, and managing external channels.
/// </summary>
[ApiController]
[Route("api/events/{eventId:guid}/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly IExternalMessagingService _externalMessagingService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        IChatService chatService,
        IExternalMessagingService externalMessagingService,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _externalMessagingService = externalMessagingService;
        _logger = logger;
    }

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

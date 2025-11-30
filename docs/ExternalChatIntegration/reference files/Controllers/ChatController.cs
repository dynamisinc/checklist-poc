using Cobra.Poc.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cobra.Poc.Controllers;

/// <summary>
/// API controller for chat operations.
/// Provides endpoints for sending messages, retrieving messages, and promoting to logbook.
/// </summary>
[ApiController]
[Route("api/events/{eventId:guid}/chat")]
[Authorize]  // TODO: POC may use [AllowAnonymous] for simplicity
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
    /// Gets the default chat thread for an event.
    /// </summary>
    [HttpGet("thread")]
    public async Task<ActionResult<ViewChatThreadDto>> GetEventChatThread(Guid eventId)
    {
        try
        {
            var thread = await _chatService.GetEventChatThreadAsync(eventId);
            return Ok(thread);
        }
        catch (InvalidOperationException)
        {
            // No thread exists yet - create one
            var threadId = await _chatService.EnsureEventChatThreadExistsAsync(eventId);
            return Ok(new ViewChatThreadDto { Id = threadId, MessageCount = 0 });
        }
    }

    /// <summary>
    /// Gets messages for a chat thread with optional pagination.
    /// </summary>
    /// <param name="eventId">The event ID</param>
    /// <param name="threadId">The chat thread ID</param>
    /// <param name="skip">Number of messages to skip</param>
    /// <param name="take">Number of messages to return</param>
    [HttpGet("thread/{threadId:guid}/messages")]
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
    public async Task<ActionResult<Guid>> SendMessage(
        Guid eventId,
        Guid threadId,
        [FromBody] SendMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Message cannot be empty");
        }

        _chatService.SetEventContext(eventId);

        var messageId = await _chatService.CreateChatMessageAsync(
            threadId,
            request.Message,
            request.SenderDisplayName ?? "Unknown User");

        return Ok(new { id = messageId });
    }

    /// <summary>
    /// Promotes a chat message to a logbook entry.
    /// </summary>
    [HttpPost("messages/{messageId:guid}/promote-to-logbook")]
    public async Task<ActionResult> PromoteToLogbook(
        Guid eventId,
        Guid messageId,
        [FromBody] PromoteToLogbookRequest request)
    {
        try
        {
            var logbookEntryId = await _chatService.PromoteToLogbookEntryAsync(
                messageId,
                request.AdditionalNotes,
                request.CategoryId);

            return Ok(new { logbookEntryId });
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Chat message not found");
        }
    }

    /// <summary>
    /// Gets external channel mappings for an event.
    /// </summary>
    [HttpGet("external-channels")]
    public async Task<ActionResult<List<ExternalChannelMappingDto>>> GetExternalChannels(Guid eventId)
    {
        var channels = await _externalMessagingService.GetEventChannelMappingsAsync(eventId);
        return Ok(channels);
    }

    /// <summary>
    /// Creates a new external channel mapping (connects GroupMe group to event).
    /// </summary>
    [HttpPost("external-channels")]
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
    public async Task<ActionResult> DeactivateExternalChannel(
        Guid eventId,
        Guid mappingId,
        [FromQuery] bool archiveExternalGroup = false)
    {
        await _externalMessagingService.DeactivateChannelAsync(mappingId, archiveExternalGroup);
        return NoContent();
    }
}

#region Request Models

public class SendMessageRequest
{
    public required string Message { get; set; }

    /// <summary>
    /// Display name of the sender. In production, this comes from the authenticated user.
    /// </summary>
    public string? SenderDisplayName { get; set; }
}

public class PromoteToLogbookRequest
{
    public string? AdditionalNotes { get; set; }
    public Guid? CategoryId { get; set; }
}

public class CreateExternalChannelApiRequest
{
    public required ExternalPlatform Platform { get; set; }
    public string? CustomGroupName { get; set; }
}

#endregion

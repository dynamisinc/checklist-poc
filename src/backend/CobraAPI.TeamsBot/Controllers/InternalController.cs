using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Schema;

namespace CobraAPI.TeamsBot.Controllers;

/// <summary>
/// Internal API endpoints for CobraAPI to send messages to Teams.
/// These endpoints are called by CobraAPI when COBRA users send messages.
/// WARNING: For POC, these are not secured. In production, add authentication.
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class InternalController : ControllerBase
{
    private readonly IConversationReferenceService _conversationReferenceService;
    private readonly IBotFrameworkHttpAdapter _adapter;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InternalController> _logger;

    public InternalController(
        IConversationReferenceService conversationReferenceService,
        IBotFrameworkHttpAdapter adapter,
        IConfiguration configuration,
        ILogger<InternalController> logger)
    {
        _conversationReferenceService = conversationReferenceService;
        _adapter = adapter;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Sends a message to a Teams channel/conversation.
    /// Called by CobraAPI when a COBRA user sends a message that should be forwarded to Teams.
    /// </summary>
    /// <param name="request">The message to send</param>
    /// <returns>Success status and message ID</returns>
    [HttpPost("send")]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SendMessage([FromBody] TeamsSendRequest request)
    {
        _logger.LogInformation(
            "Received send request for conversation {ConversationId} from {SenderName}",
            request.ConversationId, request.SenderName);

        // Get the stored conversation reference
        var reference = await _conversationReferenceService.GetAsync(request.ConversationId);

        if (reference == null)
        {
            _logger.LogWarning("No conversation reference found for {ConversationId}", request.ConversationId);
            return NotFound(new TeamsSendResponse
            {
                Success = false,
                Error = $"Conversation '{request.ConversationId}' not found. Bot may not be installed in this channel."
            });
        }

        try
        {
            string? sentMessageId = null;

            // Use the adapter to continue the conversation and send the message
            var appId = _configuration["MicrosoftAppId"] ?? string.Empty;

            await ((CloudAdapter)_adapter).ContinueConversationAsync(
                botAppId: appId,
                reference,
                async (turnContext, cancellationToken) =>
                {
                    // Format the message with sender attribution
                    // Include event/channel context when multiple channels share this Teams conversation
                    string formattedMessage;
                    if (request.HasMultipleChannels && !string.IsNullOrEmpty(request.ChannelName))
                    {
                        // Show channel context: [Event: Channel] [Sender] Message
                        var channelContext = !string.IsNullOrEmpty(request.EventName)
                            ? $"{request.EventName}: {request.ChannelName}"
                            : request.ChannelName;
                        formattedMessage = $"**[{channelContext}]** **[{request.SenderName}]** {request.Message}";
                    }
                    else
                    {
                        // Simple format for single channel: [Sender] Message
                        formattedMessage = $"**[{request.SenderName}]** {request.Message}";
                    }

                    IActivity activity;
                    if (request.UseAdaptiveCard)
                    {
                        // For future: Create an Adaptive Card for rich formatting
                        // For now, just use text
                        activity = MessageFactory.Text(formattedMessage);
                    }
                    else
                    {
                        activity = MessageFactory.Text(formattedMessage);
                    }

                    var response = await turnContext.SendActivityAsync(activity, cancellationToken);
                    sentMessageId = response?.Id;
                },
                default);

            _logger.LogInformation(
                "Successfully sent message to Teams conversation {ConversationId}, messageId: {MessageId}",
                request.ConversationId, sentMessageId);

            return Ok(new TeamsSendResponse
            {
                Success = true,
                MessageId = sentMessageId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send message to Teams conversation {ConversationId}",
                request.ConversationId);

            return StatusCode(500, new TeamsSendResponse
            {
                Success = false,
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Lists all stored conversation references.
    /// Useful for debugging and to see which channels the bot can send to.
    /// </summary>
    [HttpGet("conversations")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetConversations()
    {
        var references = await _conversationReferenceService.GetAllAsync();

        var result = references.Select(kvp => new
        {
            conversationId = kvp.Key,
            serviceUrl = kvp.Value.ServiceUrl,
            channelId = kvp.Value.ChannelId,
            botId = kvp.Value.Bot?.Id,
            botName = kvp.Value.Bot?.Name
        });

        return Ok(new
        {
            count = references.Count,
            conversations = result
        });
    }

    /// <summary>
    /// Health check for the internal API.
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        return Ok(new
        {
            status = "healthy",
            service = "COBRA Teams Bot Internal API",
            timestamp = DateTime.UtcNow
        });
    }
}

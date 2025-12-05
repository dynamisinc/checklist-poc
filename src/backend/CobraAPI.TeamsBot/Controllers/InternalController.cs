using System.Security.Claims;
using System.Text.Json;
using CobraAPI.TeamsBot.Middleware;
using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Core.Models;

namespace CobraAPI.TeamsBot.Controllers;

/// <summary>
/// Internal API endpoints for CobraAPI to send messages to Teams.
/// These endpoints are called by CobraAPI when COBRA users send messages.
/// Protected by API key authentication when CobraApi:ApiKey is configured.
/// Includes retry logic for transient Teams API failures and
/// conversation reference validation to detect expired/uninstalled bots.
/// </summary>
[Route("api/[controller]")]
[ApiController]
[ApiKeyAuth]
public class InternalController : ControllerBase
{
    private readonly IConversationReferenceService _conversationReferenceService;
    private readonly IConversationReferenceValidator _referenceValidator;
    private readonly IAgentHttpAdapter _adapter;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InternalController> _logger;
    private readonly RetryOptions _retryOptions;

    public InternalController(
        IConversationReferenceService conversationReferenceService,
        IConversationReferenceValidator referenceValidator,
        IAgentHttpAdapter adapter,
        IConfiguration configuration,
        ILogger<InternalController> logger)
    {
        _conversationReferenceService = conversationReferenceService;
        _referenceValidator = referenceValidator;
        _adapter = adapter;
        _configuration = configuration;
        _logger = logger;

        // Configure retry options for Teams API calls
        _retryOptions = new RetryOptions
        {
            MaxRetries = 3,
            InitialDelay = TimeSpan.FromSeconds(1),
            MaxDelay = TimeSpan.FromSeconds(15),
            BackoffMultiplier = 2.0,
            AddJitter = true
        };
    }

    /// <summary>
    /// Sends a message to a Teams channel/conversation with retry logic.
    /// Called by CobraAPI when a COBRA user sends a message that should be forwarded to Teams.
    /// Stateless: ConversationReference is passed in the request from CobraAPI database.
    /// </summary>
    /// <param name="request">The message to send, including ConversationReferenceJson</param>
    /// <returns>Success status and message ID</returns>
    [HttpPost("send")]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(TeamsSendResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> SendMessage([FromBody] TeamsSendRequest request)
    {
        _logger.LogInformation(
            "Received send request for conversation {ConversationId} from {SenderName}",
            request.ConversationId, request.SenderName);

        // Stateless architecture: ConversationReference comes from request (CobraAPI database)
        ConversationReference? reference = null;

        if (!string.IsNullOrEmpty(request.ConversationReferenceJson))
        {
            // Primary path: Use ConversationReference from CobraAPI
            try
            {
                reference = JsonSerializer.Deserialize<ConversationReference>(request.ConversationReferenceJson);
                _logger.LogDebug("Using ConversationReference from request for {ConversationId}", request.ConversationId);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize ConversationReferenceJson for {ConversationId}",
                    request.ConversationId);
            }
        }

        // Fallback: Try in-memory storage (for backwards compatibility during migration)
        if (reference == null)
        {
            reference = await _conversationReferenceService.GetAsync(request.ConversationId);
            if (reference != null)
            {
                _logger.LogDebug("Using in-memory ConversationReference fallback for {ConversationId}",
                    request.ConversationId);
            }
        }

        // Validate the conversation reference
        var validation = _referenceValidator.Validate(reference);
        if (!validation.CanAttemptSend)
        {
            _logger.LogWarning(
                "Conversation reference validation failed for {ConversationId}: {Status} - {Message}",
                request.ConversationId, validation.Status, validation.Message);

            var statusCode = validation.SuggestedHttpStatusCode ?? 400;
            return StatusCode(statusCode, new TeamsSendResponse
            {
                Success = false,
                Error = validation.Message,
                ReferenceStatus = validation.Status.ToString()
            });
        }

        if (validation.Status == ConversationReferenceStatus.PossiblyStale)
        {
            _logger.LogInformation(
                "Conversation reference for {ConversationId} may be stale: {Message}. Will attempt to send.",
                request.ConversationId, validation.Message);
        }

        // Cast to ChannelServiceAdapterBase to access ContinueConversationAsync
        if (_adapter is not ChannelServiceAdapterBase channelAdapter)
        {
            _logger.LogError("Adapter does not support ContinueConversationAsync");
            return StatusCode(500, new TeamsSendResponse
            {
                Success = false,
                Error = "Adapter does not support proactive messaging"
            });
        }

        // Use the adapter to continue the conversation and send the message with retry logic
        var appId = _configuration["MicrosoftAppId"] ?? string.Empty;
        var claimsIdentity = new ClaimsIdentity(new[]
        {
            new Claim("appid", appId),
            new Claim("aud", appId)
        });

        var result = await RetryPolicy.ExecuteAsync<string?>(
            async ct =>
            {
                string? sentMessageId = null;

                await channelAdapter.ContinueConversationAsync(
                    claimsIdentity,
                    reference!, // Null-check already done by validator
                    async (turnContext, cancellationToken) =>
                    {
                        // Format the message with sender attribution
                        string formattedMessage = FormatMessage(request);

                        IActivity activity = request.UseAdaptiveCard
                            ? MessageFactory.Text(formattedMessage) // TODO: Create Adaptive Card
                            : MessageFactory.Text(formattedMessage);

                        var response = await turnContext.SendActivityAsync(activity, cancellationToken);
                        sentMessageId = response?.Id;
                    },
                    ct);

                // If we got a message ID, it succeeded
                if (!string.IsNullOrEmpty(sentMessageId))
                {
                    return sentMessageId;
                }

                // No message ID but no exception - this is unexpected
                throw new InvalidOperationException("Message sent but no message ID received");
            },
            messageId => false, // Don't retry if we got a message ID
            _retryOptions,
            _logger,
            $"SendToTeams({request.ConversationId})");

        if (result.Success && !string.IsNullOrEmpty(result.Value))
        {
            _logger.LogInformation(
                "Successfully sent message to Teams conversation {ConversationId}, messageId: {MessageId} (attempts: {Attempts})",
                request.ConversationId, result.Value, result.Attempts);

            return Ok(new TeamsSendResponse
            {
                Success = true,
                MessageId = result.Value,
                Attempts = result.Attempts
            });
        }

        // Failed after all retries - check if reference has expired
        var errorMessage = result.LastException?.Message ?? "Unknown error sending message to Teams";

        if (result.LastException != null && _referenceValidator.IsExpiredReferenceException(result.LastException))
        {
            var expirationResult = _referenceValidator.GetExpirationResult(result.LastException);
            _logger.LogWarning(
                "Conversation reference for {ConversationId} has expired (bot likely uninstalled): {Error}",
                request.ConversationId, errorMessage);

            // Return 410 Gone to indicate the reference is no longer valid
            return StatusCode(410, new TeamsSendResponse
            {
                Success = false,
                Error = expirationResult.Message,
                Attempts = result.Attempts,
                ReferenceStatus = ConversationReferenceStatus.Expired.ToString()
            });
        }

        _logger.LogError(result.LastException,
            "Failed to send message to Teams conversation {ConversationId} after {Attempts} attempts",
            request.ConversationId, result.Attempts);

        return StatusCode(500, new TeamsSendResponse
        {
            Success = false,
            Error = errorMessage,
            Attempts = result.Attempts
        });
    }

    /// <summary>
    /// Formats a message with sender attribution and optional channel context.
    /// </summary>
    private static string FormatMessage(TeamsSendRequest request)
    {
        if (request.HasMultipleChannels && !string.IsNullOrEmpty(request.ChannelName))
        {
            // Show channel context: [Event: Channel] [Sender] Message
            var channelContext = !string.IsNullOrEmpty(request.EventName)
                ? $"{request.EventName}: {request.ChannelName}"
                : request.ChannelName;
            return $"**[{channelContext}]** **[{request.SenderName}]** {request.Message}";
        }

        // Simple format for single channel: [Sender] Message
        return $"**[{request.SenderName}]** {request.Message}";
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
            // Note: Bot property removed in Agents SDK - using Conversation info instead
            conversationName = kvp.Value.Conversation?.Name
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

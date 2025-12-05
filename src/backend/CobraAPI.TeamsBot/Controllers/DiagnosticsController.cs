using System.Security.Claims;
using CobraAPI.TeamsBot.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Hosting.AspNetCore;
using Microsoft.Agents.Core.Models;

namespace CobraAPI.TeamsBot.Controllers;

/// <summary>
/// Diagnostic endpoints for testing the bot locally.
/// These endpoints allow testing without the Bot Framework Emulator.
/// WARNING: Disable or secure these endpoints in production.
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class DiagnosticsController : ControllerBase
{
    private readonly IConversationReferenceService _conversationReferenceService;
    private readonly IAgentHttpAdapter _adapter;
    private readonly IAgent _agent;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(
        IConversationReferenceService conversationReferenceService,
        IAgentHttpAdapter adapter,
        IAgent agent,
        ILogger<DiagnosticsController> logger)
    {
        _conversationReferenceService = conversationReferenceService;
        _adapter = adapter;
        _agent = agent;
        _logger = logger;
    }

    /// <summary>
    /// List all stored conversation references.
    /// Useful for verifying proactive messaging setup.
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
            // Note: Bot property removed in Agents SDK - may be available via Activity context instead
            conversationName = kvp.Value.Conversation?.Name
        });

        return Ok(new
        {
            count = references.Count,
            conversations = result
        });
    }

    /// <summary>
    /// Simulate sending a proactive message to a stored conversation.
    /// Tests the outbound messaging capability.
    /// </summary>
    [HttpPost("send-proactive/{conversationId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> SendProactiveMessage(string conversationId, [FromBody] ProactiveMessageRequest request)
    {
        var reference = await _conversationReferenceService.GetAsync(conversationId);
        if (reference == null)
        {
            return NotFound(new { error = $"Conversation '{conversationId}' not found" });
        }

        _logger.LogInformation("Sending proactive message to {ConversationId}: {Message}", conversationId, request.Message);

        try
        {
            // Create an empty ClaimsIdentity for local testing
            var claimsIdentity = new ClaimsIdentity();

            // Cast to ChannelServiceAdapterBase to access ContinueConversationAsync
            if (_adapter is ChannelServiceAdapterBase channelAdapter)
            {
                await channelAdapter.ContinueConversationAsync(
                    claimsIdentity,
                    reference,
                    async (turnContext, cancellationToken) =>
                    {
                        var formattedMessage = $"📢 **[COBRA]** {request.Message}";
                        await turnContext.SendActivityAsync(MessageFactory.Text(formattedMessage), cancellationToken);
                    },
                    default);

                return Ok(new
                {
                    success = true,
                    conversationId,
                    message = request.Message
                });
            }
            else
            {
                _logger.LogError("Adapter does not support ContinueConversationAsync");
                return StatusCode(500, new { error = "Adapter does not support proactive messaging" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send proactive message to {ConversationId}", conversationId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Simulate a bot installation event (adds a test conversation reference).
    /// Useful for testing without the emulator.
    /// </summary>
    [HttpPost("simulate-install")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> SimulateInstall()
    {
        var testConversationId = $"test-conversation-{Guid.NewGuid():N}";

        var testReference = new ConversationReference
        {
            ChannelId = "emulator",
            ServiceUrl = "http://localhost:3978",
            Conversation = new ConversationAccount
            {
                Id = testConversationId,
                Name = "Test Conversation",
                IsGroup = true
            },
            // Note: In Agents SDK, User property represents the user in the conversation
            User = new ChannelAccount
            {
                Id = "test-user",
                Name = "Test User"
            }
            // Note: Bot property is not directly on ConversationReference in Agents SDK
            // It's populated from Activity context during message handling
        };

        await _conversationReferenceService.AddOrUpdateAsync(testConversationId, testReference);

        _logger.LogInformation("Simulated bot installation for conversation {ConversationId}", testConversationId);

        return Ok(new
        {
            success = true,
            conversationId = testConversationId,
            message = "Test conversation reference created. Use this ID to test proactive messaging."
        });
    }
}

/// <summary>
/// Request model for sending proactive messages.
/// </summary>
public class ProactiveMessageRequest
{
    /// <summary>
    /// The message to send.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

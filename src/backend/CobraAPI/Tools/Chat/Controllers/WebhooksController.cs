using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using CobraAPI.Tools.Chat.ExternalPlatforms;

namespace CobraAPI.Tools.Chat.Controllers;

/// <summary>
/// Controller for receiving webhook callbacks from external messaging platforms.
/// These endpoints are publicly accessible (no auth) but validate payloads.
///
/// Route: /api/webhooks/{platform}/{channelMappingId}
/// </summary>
[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<WebhooksController> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    /// <summary>
    /// Receives webhook callbacks from GroupMe when messages are posted to a group.
    ///
    /// GroupMe sends a POST request with a JSON payload containing message details.
    /// The channelMappingId in the URL identifies which COBRA event this maps to.
    ///
    /// Note: GroupMe webhooks don't include a signature for verification, so we rely on
    /// the obscurity of the channelMappingId GUID. For additional security, the service
    /// validates that the group_id in the payload matches the expected group.
    /// </summary>
    /// <param name="channelMappingId">COBRA's internal channel mapping identifier</param>
    /// <returns>200 OK on success (GroupMe expects this)</returns>
    [HttpPost("groupme/{channelMappingId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GroupMeWebhook(Guid channelMappingId)
    {
        try
        {
            // Read the raw request body
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            _logger.LogDebug("Received GroupMe webhook for mapping {MappingId}: {Body}",
                channelMappingId, body);

            // Parse the payload
            var payload = JsonSerializer.Deserialize<GroupMeWebhookPayload>(body);

            if (payload == null)
            {
                _logger.LogWarning("Failed to parse GroupMe webhook payload");
                return BadRequest("Invalid payload");
            }

            // Process the message asynchronously in a new scope
            // We return 200 immediately to prevent GroupMe from retrying
            // Important: Use IServiceScopeFactory (singleton) to create scope after request ends
            _ = Task.Run(async () =>
            {
                try
                {
                    // Create a new scope for the background task
                    // This ensures DbContext and other scoped services are properly resolved
                    using var scope = _serviceScopeFactory.CreateScope();
                    var messagingService = scope.ServiceProvider.GetRequiredService<IExternalMessagingService>();
                    await messagingService.ProcessGroupMeWebhookAsync(channelMappingId, payload);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing GroupMe webhook for mapping {MappingId}",
                        channelMappingId);
                }
            });

            // Return 200 immediately - GroupMe expects a quick response
            return Ok();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON in GroupMe webhook payload");
            return BadRequest("Invalid JSON payload");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in GroupMe webhook handler");
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Receives webhook callbacks from TeamsBot when messages are posted in Teams.
    ///
    /// TeamsBot sends a POST request with a JSON payload containing message details.
    /// The channelMappingId in the URL identifies which COBRA event this maps to.
    /// </summary>
    /// <param name="channelMappingId">COBRA's internal channel mapping identifier</param>
    /// <returns>200 OK on success</returns>
    [HttpPost("teams/{channelMappingId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> TeamsWebhook(Guid channelMappingId)
    {
        try
        {
            // Read the raw request body
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            _logger.LogDebug("Received Teams webhook for mapping {MappingId}: {Body}",
                channelMappingId, body);

            // Parse the payload
            var payload = JsonSerializer.Deserialize<TeamsWebhookPayload>(body);

            if (payload == null)
            {
                _logger.LogWarning("Failed to parse Teams webhook payload");
                return BadRequest("Invalid payload");
            }

            // Process the message asynchronously in a new scope
            // We return 200 immediately to prevent timeouts
            // Important: Use IServiceScopeFactory (singleton) to create scope after request ends
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _serviceScopeFactory.CreateScope();
                    var messagingService = scope.ServiceProvider.GetRequiredService<IExternalMessagingService>();
                    await messagingService.ProcessTeamsWebhookAsync(channelMappingId, payload);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing Teams webhook for mapping {MappingId}",
                        channelMappingId);
                }
            });

            return Ok();
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Invalid JSON in Teams webhook payload");
            return BadRequest("Invalid JSON payload");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in Teams webhook handler");
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Receives Teams messages that don't have a mapping yet.
    /// Used during initial channel linking flow.
    /// For POC: Just logs the message and returns OK.
    /// </summary>
    [HttpPost("teams/unmapped")]
    [AllowAnonymous]
    public async Task<IActionResult> TeamsUnmappedWebhook()
    {
        try
        {
            using var reader = new StreamReader(Request.Body);
            var body = await reader.ReadToEndAsync();

            _logger.LogInformation("Received unmapped Teams webhook: {Body}", body);

            var payload = JsonSerializer.Deserialize<TeamsWebhookPayload>(body);

            if (payload == null)
            {
                return BadRequest("Invalid payload");
            }

            // For POC: Log the unmapped message for debugging
            _logger.LogInformation(
                "Unmapped Teams message from {SenderName} in conversation {ConversationId}: {Text}",
                payload.SenderName,
                payload.ConversationId,
                payload.Text?.Length > 50 ? payload.Text[..50] + "..." : payload.Text);

            // Return 404 to indicate no mapping exists
            // TeamsBot can use this to decide whether to echo back
            return NotFound(new { message = "No channel mapping found for this conversation" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling unmapped Teams webhook");
            return StatusCode(500);
        }
    }

    /// <summary>
    /// Health check endpoint for webhook receivers.
    /// Can be used to verify the webhook URL is accessible.
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }
}

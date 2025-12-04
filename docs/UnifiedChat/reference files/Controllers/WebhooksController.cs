using Cobra.Poc.ExternalMessaging;
using Cobra.Poc.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace Cobra.Poc.Controllers;

/// <summary>
/// Controller for receiving webhook callbacks from external messaging platforms.
/// These endpoints are publicly accessible (no auth) but validate payloads using secrets.
/// 
/// Route: /api/webhooks/{platform}/{channelMappingId}
/// </summary>
[ApiController]
[Route("api/webhooks")]
public class WebhooksController : ControllerBase
{
    private readonly IExternalMessagingService _externalMessagingService;
    private readonly ILogger<WebhooksController> _logger;

    public WebhooksController(
        IExternalMessagingService externalMessagingService,
        ILogger<WebhooksController> logger)
    {
        _externalMessagingService = externalMessagingService;
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
    [AllowAnonymous]  // Webhooks cannot authenticate - validation happens in service
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

            // Process the message asynchronously
            // We return 200 immediately to prevent GroupMe from retrying
            _ = Task.Run(async () =>
            {
                try
                {
                    await _externalMessagingService.ProcessGroupMeWebhookAsync(channelMappingId, payload);
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

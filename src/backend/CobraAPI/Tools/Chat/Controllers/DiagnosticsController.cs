using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using CobraAPI.Core.Data;
using CobraAPI.Tools.Chat.Models.Entities;
using CobraAPI.Tools.Chat.ExternalPlatforms;
using CobraAPI.Tools.Chat.Services;

namespace CobraAPI.Tools.Chat.Controllers;

/// <summary>
/// Diagnostic endpoints for testing external messaging integrations.
/// WARNING: These endpoints are for development/testing only.
/// Remove or secure before production deployment.
/// </summary>
[ApiController]
[Route("api/chat/[controller]")]
public class DiagnosticsController : ControllerBase
{
    private readonly CobraDbContext _dbContext;
    private readonly IExternalMessagingService _externalMessagingService;
    private readonly TeamsBotSettings _teamsBotSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<DiagnosticsController> _logger;

    public DiagnosticsController(
        CobraDbContext dbContext,
        IExternalMessagingService externalMessagingService,
        IOptions<TeamsBotSettings> teamsBotSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<DiagnosticsController> logger)
    {
        _dbContext = dbContext;
        _externalMessagingService = externalMessagingService;
        _teamsBotSettings = teamsBotSettings.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Creates a test Teams channel mapping for local testing.
    /// Links a Teams conversation ID to a COBRA event and creates a linked ChatThread.
    /// </summary>
    /// <param name="request">The mapping details</param>
    /// <returns>The created mapping ID</returns>
    [HttpPost("teams-mapping")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateTeamsMapping([FromBody] CreateTeamsMappingRequest request)
    {
        _logger.LogInformation(
            "Creating test Teams mapping for conversation {ConversationId} to event {EventId}",
            request.TeamsConversationId, request.EventId);

        // Verify the event exists
        var eventExists = await _dbContext.Events.AnyAsync(e => e.Id == request.EventId);
        if (!eventExists)
        {
            // List available events for convenience
            var events = await _dbContext.Events
                .Select(e => new { e.Id, e.Name })
                .Take(10)
                .ToListAsync();

            return NotFound(new
            {
                error = $"Event {request.EventId} not found",
                availableEvents = events
            });
        }

        // Check for existing mapping with same conversation ID
        var existingMapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m =>
                m.Platform == ExternalPlatform.Teams &&
                m.ExternalGroupId == request.TeamsConversationId &&
                m.IsActive);

        if (existingMapping != null)
        {
            _logger.LogInformation(
                "Existing Teams mapping found for conversation {ConversationId}: {MappingId}",
                request.TeamsConversationId, existingMapping.Id);

            return Ok(new CreateTeamsMappingResponse
            {
                MappingId = existingMapping.Id,
                EventId = existingMapping.EventId,
                TeamsConversationId = existingMapping.ExternalGroupId,
                WebhookUrl = $"/api/webhooks/teams/{existingMapping.Id}",
                IsExisting = true
            });
        }

        // Use the service to create mapping with linked ChatThread
        var channelName = request.ChannelName ?? "Teams Test Channel";
        var mappingDto = await _externalMessagingService.CreateTeamsChannelMappingAsync(
            request.EventId,
            request.TeamsConversationId,
            channelName,
            "diagnostics");

        _logger.LogInformation(
            "Created Teams mapping {MappingId} with linked ChatThread for conversation {ConversationId} to event {EventId}",
            mappingDto.Id, request.TeamsConversationId, request.EventId);

        return Ok(new CreateTeamsMappingResponse
        {
            MappingId = mappingDto.Id,
            EventId = mappingDto.EventId,
            TeamsConversationId = mappingDto.ExternalGroupId,
            WebhookUrl = $"/api/webhooks/teams/{mappingDto.Id}",
            IsExisting = false
        });
    }

    /// <summary>
    /// Lists all Teams channel mappings.
    /// </summary>
    [HttpGet("teams-mappings")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTeamsMappings()
    {
        var mappings = await _dbContext.ExternalChannelMappings
            .Where(m => m.Platform == ExternalPlatform.Teams)
            .Select(m => new
            {
                mappingId = m.Id,
                eventId = m.EventId,
                teamsConversationId = m.ExternalGroupId,
                channelName = m.ExternalGroupName,
                webhookUrl = $"/api/webhooks/teams/{m.Id}",
                isActive = m.IsActive,
                createdAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            count = mappings.Count,
            mappings
        });
    }

    /// <summary>
    /// Lists all available events for mapping.
    /// </summary>
    [HttpGet("events")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEvents()
    {
        var events = await _dbContext.Events
            .Where(e => !e.IsArchived)
            .Select(e => new
            {
                id = e.Id,
                name = e.Name,
                eventType = e.EventType,
                isActive = e.IsActive,
                hasDefaultChatThread = _dbContext.ChatThreads
                    .Any(ct => ct.EventId == e.Id && ct.IsDefaultEventThread && ct.IsActive)
            })
            .ToListAsync();

        return Ok(new
        {
            count = events.Count,
            events
        });
    }

    /// <summary>
    /// Gets the mapping ID for a Teams conversation ID.
    /// Used by TeamsBot to look up mappings.
    /// </summary>
    [HttpGet("teams-mapping/{conversationId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTeamsMappingByConversation(string conversationId)
    {
        // URL decode the conversation ID (Teams IDs can contain special characters)
        var decodedId = Uri.UnescapeDataString(conversationId);

        var mapping = await _dbContext.ExternalChannelMappings
            .Where(m => m.Platform == ExternalPlatform.Teams &&
                       m.ExternalGroupId == decodedId &&
                       m.IsActive)
            .Select(m => new
            {
                mappingId = m.Id,
                eventId = m.EventId,
                teamsConversationId = m.ExternalGroupId,
                webhookUrl = $"/api/webhooks/teams/{m.Id}"
            })
            .FirstOrDefaultAsync();

        if (mapping == null)
        {
            return NotFound(new { error = "No mapping found for this conversation" });
        }

        return Ok(mapping);
    }

    /// <summary>
    /// Deletes a Teams channel mapping.
    /// </summary>
    [HttpDelete("teams-mapping/{mappingId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> DeleteTeamsMapping(Guid mappingId)
    {
        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId);

        if (mapping == null)
        {
            return NotFound(new { error = $"Mapping {mappingId} not found" });
        }

        _dbContext.ExternalChannelMappings.Remove(mapping);
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deleted Teams mapping {MappingId}", mappingId);

        return Ok(new { message = "Mapping deleted", mappingId });
    }

    /// <summary>
    /// Gets available Teams conversations from the TeamsBot service.
    /// These are Teams channels where the bot is installed and ready to receive messages.
    /// </summary>
    [HttpGet("teams-conversations")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTeamsConversations()
    {
        var baseUrl = _teamsBotSettings.BaseUrl?.TrimEnd('/');
        if (string.IsNullOrEmpty(baseUrl))
        {
            return BadRequest(new { error = "TeamsBot is not configured" });
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);

            var response = await client.GetAsync($"{baseUrl}/api/internal/conversations");

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Failed to fetch Teams conversations: {StatusCode}",
                    response.StatusCode);
                return StatusCode((int)response.StatusCode, new
                {
                    error = "Failed to fetch Teams conversations from TeamsBot"
                });
            }

            var content = await response.Content.ReadAsStringAsync();

            // Return the response as-is (it's already JSON)
            return Content(content, "application/json");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Failed to connect to TeamsBot at {BaseUrl}", baseUrl);
            return StatusCode(503, new
            {
                error = "TeamsBot is not reachable",
                details = ex.Message
            });
        }
        catch (TaskCanceledException)
        {
            _logger.LogWarning("TeamsBot request timed out");
            return StatusCode(504, new { error = "TeamsBot request timed out" });
        }
    }

    /// <summary>
    /// Gets recent chat messages for an event.
    /// Used for testing/debugging the message flow.
    /// </summary>
    [HttpGet("messages/{eventId:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetRecentMessages(Guid eventId, [FromQuery] int take = 20)
    {
        var messages = await _dbContext.ChatMessages
            .Include(m => m.ChatThread)
            .Where(m => m.ChatThread.EventId == eventId)
            .OrderByDescending(m => m.CreatedAt)
            .Take(take)
            .Select(m => new
            {
                id = m.Id,
                content = m.Message,
                senderName = m.SenderDisplayName,
                sourcePlatform = m.ExternalSource.HasValue ? m.ExternalSource.Value.ToString() : "COBRA",
                externalMessageId = m.ExternalMessageId,
                externalSenderName = m.ExternalSenderName,
                createdAt = m.CreatedAt
            })
            .ToListAsync();

        return Ok(new
        {
            eventId,
            count = messages.Count,
            messages
        });
    }
}

/// <summary>
/// Request model for creating a test Teams channel mapping.
/// </summary>
public class CreateTeamsMappingRequest
{
    /// <summary>
    /// The COBRA event ID to link the Teams channel to.
    /// </summary>
    public Guid EventId { get; set; }

    /// <summary>
    /// The Teams conversation ID (from the bot's activity.Conversation.Id).
    /// </summary>
    public string TeamsConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Optional: Display name for the channel.
    /// </summary>
    public string? ChannelName { get; set; }
}

/// <summary>
/// Response model for creating a Teams channel mapping.
/// </summary>
public class CreateTeamsMappingResponse
{
    public Guid MappingId { get; set; }
    public Guid EventId { get; set; }
    public string TeamsConversationId { get; set; } = string.Empty;
    public string WebhookUrl { get; set; } = string.Empty;
    public bool IsExisting { get; set; }
}

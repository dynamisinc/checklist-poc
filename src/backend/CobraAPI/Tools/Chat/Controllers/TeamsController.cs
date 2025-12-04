using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using CobraAPI.Core.Data;
using CobraAPI.Tools.Chat.Models.DTOs;
using CobraAPI.Tools.Chat.Models.Entities;

namespace CobraAPI.Tools.Chat.Controllers;

/// <summary>
/// API endpoints for Teams bot stateless architecture.
/// Manages ConversationReferences and connector metadata.
/// </summary>
[ApiController]
[Route("api/chat/[controller]")]
[AllowAnonymous] // POC: No auth required. Production: Add API key or JWT validation.
public class TeamsController : ControllerBase
{
    private readonly CobraDbContext _dbContext;
    private readonly ILogger<TeamsController> _logger;

    public TeamsController(CobraDbContext dbContext, ILogger<TeamsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Store or update a ConversationReference for a Teams conversation.
    /// Called by TeamsBot on every incoming message to keep the reference current.
    /// </summary>
    [HttpPut("conversation-reference")]
    [ProducesResponseType(typeof(StoreConversationReferenceResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> StoreConversationReference(
        [FromBody] StoreConversationReferenceRequest request)
    {
        _logger.LogDebug(
            "Storing conversation reference for {ConversationId}, TenantId: {TenantId}, IsEmulator: {IsEmulator}",
            request.ConversationId, request.TenantId, request.IsEmulator);

        // Find existing mapping by conversation ID
        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m =>
                m.Platform == ExternalPlatform.Teams &&
                m.ExternalGroupId == request.ConversationId);

        var isNewMapping = mapping == null;

        if (mapping == null)
        {
            // Create new mapping (connector not yet linked to an event)
            // Use a placeholder EventId - will be set when linked to a COBRA channel
            var placeholderEvent = await _dbContext.Events.FirstOrDefaultAsync();
            if (placeholderEvent == null)
            {
                _logger.LogWarning("No events exist to create Teams mapping. ConversationId: {ConversationId}",
                    request.ConversationId);
                return BadRequest(new { error = "No events exist. Create an event first." });
            }

            mapping = new ExternalChannelMapping
            {
                Id = Guid.NewGuid(),
                EventId = placeholderEvent.Id, // Placeholder - will be updated when linked
                Platform = ExternalPlatform.Teams,
                ExternalGroupId = request.ConversationId,
                ExternalGroupName = request.ChannelName ?? $"Teams {(request.IsEmulator ? "Emulator" : "Channel")}",
                BotId = string.Empty, // Not used for Teams - ConversationReference has bot info
                WebhookSecret = Guid.NewGuid().ToString("N"), // Generate for consistency
                CreatedBy = "TeamsBot",
                CreatedAt = DateTime.UtcNow
            };

            _dbContext.ExternalChannelMappings.Add(mapping);

            _logger.LogInformation(
                "Created new Teams mapping {MappingId} for conversation {ConversationId}",
                mapping.Id, request.ConversationId);
        }

        // Update ConversationReference and metadata
        mapping.ConversationReferenceJson = request.ConversationReferenceJson;
        mapping.TenantId = request.TenantId;
        mapping.LastActivityAt = DateTime.UtcNow;
        mapping.IsEmulator = request.IsEmulator;
        mapping.LastModifiedBy = "TeamsBot";
        mapping.LastModifiedAt = DateTime.UtcNow;

        // Set InstalledByName only if not already set
        if (string.IsNullOrEmpty(mapping.InstalledByName) && !string.IsNullOrEmpty(request.InstalledByName))
        {
            mapping.InstalledByName = request.InstalledByName;
        }

        await _dbContext.SaveChangesAsync();

        return Ok(new StoreConversationReferenceResponse
        {
            MappingId = mapping.Id,
            IsNewMapping = isNewMapping
        });
    }

    /// <summary>
    /// Get a ConversationReference by conversation ID.
    /// Used by TeamsBot when receiving messages to look up the mapping.
    /// </summary>
    [HttpGet("conversation-reference/{conversationId}")]
    [ProducesResponseType(typeof(GetConversationReferenceResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetConversationReference(string conversationId)
    {
        var decodedId = Uri.UnescapeDataString(conversationId);

        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m =>
                m.Platform == ExternalPlatform.Teams &&
                m.ExternalGroupId == decodedId);

        if (mapping == null)
        {
            return NotFound(new { error = "No mapping found for this conversation" });
        }

        return Ok(new GetConversationReferenceResponse
        {
            MappingId = mapping.Id,
            ConversationReferenceJson = mapping.ConversationReferenceJson,
            IsActive = mapping.IsActive
        });
    }

    /// <summary>
    /// List all Teams connectors with metadata.
    /// Used by admin UI to manage connectors.
    /// </summary>
    [HttpGet("mappings")]
    [ProducesResponseType(typeof(ListTeamsConnectorsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListMappings(
        [FromQuery] bool? isEmulator = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int? staleDays = null)
    {
        var query = _dbContext.ExternalChannelMappings
            .Include(m => m.Event)
            .Where(m => m.Platform == ExternalPlatform.Teams);

        if (isEmulator.HasValue)
        {
            query = query.Where(m => m.IsEmulator == isEmulator.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(m => m.IsActive == isActive.Value);
        }

        if (staleDays.HasValue)
        {
            var cutoff = DateTime.UtcNow.AddDays(-staleDays.Value);
            query = query.Where(m => m.LastActivityAt == null || m.LastActivityAt < cutoff);
        }

        var mappings = await query
            .OrderByDescending(m => m.LastActivityAt)
            .ThenByDescending(m => m.CreatedAt)
            .Select(m => new TeamsConnectorDto
            {
                MappingId = m.Id,
                DisplayName = m.ExternalGroupName,
                ConversationId = m.ExternalGroupId,
                TenantId = m.TenantId,
                LastActivityAt = m.LastActivityAt,
                InstalledByName = m.InstalledByName,
                IsEmulator = m.IsEmulator,
                IsActive = m.IsActive,
                HasConversationReference = m.ConversationReferenceJson != null,
                CreatedAt = m.CreatedAt,
                LinkedEventId = m.EventId,
                LinkedEventName = m.Event.Name
            })
            .ToListAsync();

        return Ok(new ListTeamsConnectorsResponse
        {
            Count = mappings.Count,
            Connectors = mappings
        });
    }

    /// <summary>
    /// Rename a Teams connector (update display name).
    /// </summary>
    [HttpPatch("mappings/{mappingId:guid}/name")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RenameConnector(Guid mappingId, [FromBody] RenameConnectorRequest request)
    {
        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.Platform == ExternalPlatform.Teams);

        if (mapping == null)
        {
            return NotFound(new { error = "Mapping not found" });
        }

        mapping.ExternalGroupName = request.DisplayName;
        mapping.LastModifiedBy = "Admin";
        mapping.LastModifiedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Renamed Teams connector {MappingId} to '{DisplayName}'",
            mappingId, request.DisplayName);

        return Ok(new { message = "Connector renamed", mappingId, displayName = request.DisplayName });
    }

    /// <summary>
    /// Delete (deactivate) a Teams connector.
    /// Uses soft delete - sets IsActive = false.
    /// </summary>
    [HttpDelete("mappings/{mappingId:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteConnector(Guid mappingId)
    {
        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.Platform == ExternalPlatform.Teams);

        if (mapping == null)
        {
            return NotFound(new { error = "Mapping not found" });
        }

        mapping.IsActive = false;
        mapping.LastModifiedBy = "Admin";
        mapping.LastModifiedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Deactivated Teams connector {MappingId}", mappingId);

        return Ok(new { message = "Connector deactivated", mappingId });
    }

    /// <summary>
    /// Bulk delete stale connectors.
    /// Removes connectors that haven't had activity in the specified number of days.
    /// </summary>
    [HttpDelete("mappings/stale")]
    [ProducesResponseType(typeof(CleanupResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteStaleConnectors([FromQuery] int inactiveDays = 30)
    {
        var cutoff = DateTime.UtcNow.AddDays(-inactiveDays);

        var staleConnectors = await _dbContext.ExternalChannelMappings
            .Where(m =>
                m.Platform == ExternalPlatform.Teams &&
                m.IsActive &&
                (m.LastActivityAt == null || m.LastActivityAt < cutoff))
            .ToListAsync();

        var deletedIds = new List<Guid>();

        foreach (var connector in staleConnectors)
        {
            connector.IsActive = false;
            connector.LastModifiedBy = "StaleCleanup";
            connector.LastModifiedAt = DateTime.UtcNow;
            deletedIds.Add(connector.Id);
        }

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation(
            "Cleaned up {Count} stale Teams connectors (inactive for {Days}+ days)",
            deletedIds.Count, inactiveDays);

        return Ok(new CleanupResponse
        {
            DeletedCount = deletedIds.Count,
            DeletedMappingIds = deletedIds
        });
    }

    /// <summary>
    /// Reactivate a previously deactivated connector.
    /// </summary>
    [HttpPost("mappings/{mappingId:guid}/reactivate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReactivateConnector(Guid mappingId)
    {
        var mapping = await _dbContext.ExternalChannelMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.Platform == ExternalPlatform.Teams);

        if (mapping == null)
        {
            return NotFound(new { error = "Mapping not found" });
        }

        mapping.IsActive = true;
        mapping.LastModifiedBy = "Admin";
        mapping.LastModifiedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Reactivated Teams connector {MappingId}", mappingId);

        return Ok(new { message = "Connector reactivated", mappingId });
    }
}

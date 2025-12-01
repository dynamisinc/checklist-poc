using ChecklistAPI.ExternalMessaging;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Services;

/// <summary>
/// Interface for external messaging service operations.
/// </summary>
public interface IExternalMessagingService
{
    /// <summary>
    /// Creates an external channel mapping for an event.
    /// </summary>
    Task<ExternalChannelMappingDto> CreateExternalChannelAsync(CreateExternalChannelRequest request);

    /// <summary>
    /// Gets all external channel mappings for an event.
    /// </summary>
    Task<List<ExternalChannelMappingDto>> GetEventChannelMappingsAsync(Guid eventId);

    /// <summary>
    /// Deactivates an external channel mapping.
    /// </summary>
    Task DeactivateChannelAsync(Guid mappingId, bool archiveExternalGroup = false);

    /// <summary>
    /// Processes an incoming webhook message from GroupMe.
    /// </summary>
    Task ProcessGroupMeWebhookAsync(Guid mappingId, GroupMeWebhookPayload payload);

    /// <summary>
    /// Broadcasts a message to all active external channels for an event.
    /// </summary>
    Task BroadcastToExternalChannelsAsync(Guid eventId, string senderName, string message);
}

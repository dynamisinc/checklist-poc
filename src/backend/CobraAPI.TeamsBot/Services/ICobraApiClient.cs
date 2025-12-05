using CobraAPI.TeamsBot.Models;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// Client interface for communicating with CobraAPI.
/// TeamsBot uses this to forward inbound Teams messages to COBRA
/// and to store/retrieve ConversationReferences for stateless operation.
/// </summary>
public interface ICobraApiClient
{
    /// <summary>
    /// Checks if CobraAPI is reachable and healthy.
    /// </summary>
    /// <returns>True if the health check passes.</returns>
    Task<bool> CheckHealthAsync();

    /// <summary>
    /// Sends a Teams message to the CobraAPI webhook endpoint.
    /// </summary>
    /// <param name="mappingId">The external channel mapping ID in COBRA.</param>
    /// <param name="payload">The Teams message payload.</param>
    /// <returns>True if the webhook was processed successfully.</returns>
    Task<bool> SendWebhookAsync(Guid mappingId, TeamsWebhookPayload payload);

    /// <summary>
    /// Sends a Teams message to CobraAPI when there's no mapping established yet.
    /// Used for initial connection/linking flow.
    /// </summary>
    /// <param name="conversationId">The Teams conversation ID.</param>
    /// <param name="payload">The Teams message payload.</param>
    /// <returns>True if processed successfully.</returns>
    Task<bool> SendUnmappedMessageAsync(string conversationId, TeamsWebhookPayload payload);

    /// <summary>
    /// Gets the channel mapping ID for a Teams conversation.
    /// </summary>
    /// <param name="conversationId">The Teams conversation ID.</param>
    /// <returns>The mapping ID if found, null otherwise.</returns>
    Task<Guid?> GetMappingIdForConversationAsync(string conversationId);

    // === Stateless Architecture Methods (UC-TI-029) ===

    /// <summary>
    /// Stores or updates a ConversationReference in CobraAPI.
    /// Called on every incoming message to keep the reference current.
    /// </summary>
    /// <param name="request">The conversation reference data.</param>
    /// <returns>The response with mapping ID, or null on failure.</returns>
    Task<StoreConversationReferenceResult?> StoreConversationReferenceAsync(StoreConversationReferenceRequest request);

    /// <summary>
    /// Gets a ConversationReference from CobraAPI by conversation ID.
    /// </summary>
    /// <param name="conversationId">The Teams conversation ID.</param>
    /// <returns>The conversation reference JSON, or null if not found.</returns>
    Task<GetConversationReferenceResult?> GetConversationReferenceAsync(string conversationId);
}

/// <summary>
/// Request to store a conversation reference in CobraAPI.
/// </summary>
public class StoreConversationReferenceRequest
{
    public required string ConversationId { get; init; }
    public required string ConversationReferenceJson { get; init; }
    public string? TenantId { get; init; }
    public string? ChannelName { get; init; }
    public string? InstalledByName { get; init; }
    public bool IsEmulator { get; init; }
}

/// <summary>
/// Result from storing a conversation reference.
/// </summary>
public class StoreConversationReferenceResult
{
    public Guid MappingId { get; set; }
    public bool IsNewMapping { get; set; }
}

/// <summary>
/// Result from getting a conversation reference.
/// </summary>
public class GetConversationReferenceResult
{
    public Guid MappingId { get; set; }
    public string? ConversationReferenceJson { get; set; }
    public bool IsActive { get; set; }
}

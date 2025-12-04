namespace CobraAPI.Tools.Chat.Models.DTOs;

/// <summary>
/// Request to store or update a Teams conversation reference.
/// Called by TeamsBot on every incoming message to keep ConversationReference current.
/// </summary>
public record StoreConversationReferenceRequest
{
    /// <summary>
    /// The Teams conversation ID (activity.Conversation.Id).
    /// </summary>
    public required string ConversationId { get; init; }

    /// <summary>
    /// Serialized Bot Framework ConversationReference JSON.
    /// </summary>
    public required string ConversationReferenceJson { get; init; }

    /// <summary>
    /// Customer's Microsoft 365 tenant ID (activity.Conversation.TenantId).
    /// </summary>
    public string? TenantId { get; init; }

    /// <summary>
    /// Display name for the channel.
    /// </summary>
    public string? ChannelName { get; init; }

    /// <summary>
    /// Name of user who first installed/used the bot.
    /// </summary>
    public string? InstalledByName { get; init; }

    /// <summary>
    /// True if this is a Bot Framework Emulator connection.
    /// </summary>
    public bool IsEmulator { get; init; }
}

/// <summary>
/// Response after storing a conversation reference.
/// </summary>
public record StoreConversationReferenceResponse
{
    /// <summary>
    /// The mapping ID (ExternalChannelMapping.Id).
    /// </summary>
    public Guid MappingId { get; init; }

    /// <summary>
    /// True if a new mapping was created, false if existing was updated.
    /// </summary>
    public bool IsNewMapping { get; init; }
}

/// <summary>
/// Response when retrieving a conversation reference.
/// </summary>
public record GetConversationReferenceResponse
{
    /// <summary>
    /// The mapping ID.
    /// </summary>
    public Guid MappingId { get; init; }

    /// <summary>
    /// Serialized ConversationReference JSON for proactive messaging.
    /// </summary>
    public string? ConversationReferenceJson { get; init; }

    /// <summary>
    /// True if the mapping is active.
    /// </summary>
    public bool IsActive { get; init; }
}

/// <summary>
/// Request to rename a Teams connector.
/// </summary>
public record RenameConnectorRequest
{
    /// <summary>
    /// New display name for the connector.
    /// </summary>
    public required string DisplayName { get; init; }
}

/// <summary>
/// Summary of a Teams connector for admin UI.
/// </summary>
public record TeamsConnectorDto
{
    public Guid MappingId { get; init; }
    public string DisplayName { get; init; } = string.Empty;
    public string ConversationId { get; init; } = string.Empty;
    public string? TenantId { get; init; }
    public DateTime? LastActivityAt { get; init; }
    public string? InstalledByName { get; init; }
    public bool IsEmulator { get; init; }
    public bool IsActive { get; init; }
    public bool HasConversationReference { get; init; }
    public DateTime CreatedAt { get; init; }

    // Linked event info
    public Guid? LinkedEventId { get; init; }
    public string? LinkedEventName { get; init; }
}

/// <summary>
/// Response for listing Teams connectors.
/// </summary>
public record ListTeamsConnectorsResponse
{
    public int Count { get; init; }
    public IReadOnlyList<TeamsConnectorDto> Connectors { get; init; } = [];
}

/// <summary>
/// Response for cleanup operations.
/// </summary>
public record CleanupResponse
{
    public int DeletedCount { get; init; }
    public IReadOnlyList<Guid> DeletedMappingIds { get; init; } = [];
}


namespace CobraAPI.Tools.Chat.Models.DTOs;

/// <summary>
/// Extended DTO for chat messages that includes external message metadata.
/// This DTO is used for both API responses and SignalR broadcasts.
/// </summary>
public class ChatMessageDto
{
    public Guid Id { get; set; }
    public Guid ChatThreadId { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public string SenderDisplayName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    // External message fields
    public bool IsExternalMessage { get; set; }
    public string? ExternalSource { get; set; }
    public string? ExternalSenderName { get; set; }
    public string? ExternalAttachmentUrl { get; set; }
}

/// <summary>
/// Chat channel summary information.
/// </summary>
public class ChatThreadDto
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChannelType ChannelType { get; set; }
    public string ChannelTypeName { get; set; } = string.Empty;
    public bool IsDefaultEventThread { get; set; }
    public int DisplayOrder { get; set; }
    public string? IconName { get; set; }
    public string? Color { get; set; }

    /// <summary>
    /// For Position channels, the ID of the associated Position.
    /// </summary>
    public Guid? PositionId { get; set; }

    /// <summary>
    /// For Position channels, the position details.
    /// </summary>
    public PositionChannelDto? Position { get; set; }

    public int MessageCount { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Whether the channel is active (false = archived).
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Timestamp of the last message in this channel (null if no messages).
    /// </summary>
    public DateTime? LastMessageAt { get; set; }

    /// <summary>
    /// Display name of the sender of the last message (null if no messages).
    /// </summary>
    public string? LastMessageSender { get; set; }

    /// <summary>
    /// For External channels, the linked external channel details.
    /// </summary>
    public ExternalChannelMappingDto? ExternalChannel { get; set; }
}

/// <summary>
/// Request to create a new channel.
/// </summary>
public class CreateChannelRequest
{
    public Guid EventId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ChannelType ChannelType { get; set; } = ChannelType.Custom;
    public string? IconName { get; set; }
    public string? Color { get; set; }

    /// <summary>
    /// Optional position ID for Position channels.
    /// When set, only users assigned to this position can see the channel.
    /// If ChannelType is Position, this should be set.
    /// </summary>
    public Guid? PositionId { get; set; }
}

/// <summary>
/// DTO for creating an external channel mapping.
/// </summary>
public class CreateExternalChannelRequest
{
    public Guid EventId { get; set; }
    public ExternalPlatform Platform { get; set; }
    public string? CustomGroupName { get; set; }
}

/// <summary>
/// DTO for external channel mapping details.
/// </summary>
public class ExternalChannelMappingDto
{
    public Guid Id { get; set; }
    /// <summary>
    /// The event this mapping is linked to. Null if unlinked (awaiting assignment).
    /// </summary>
    public Guid? EventId { get; set; }
    public ExternalPlatform Platform { get; set; }
    public string PlatformName { get; set; } = string.Empty;
    public string ExternalGroupId { get; set; } = string.Empty;
    public string ExternalGroupName { get; set; } = string.Empty;
    public string? ShareUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request to update a channel.
/// </summary>
public class UpdateChannelRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? IconName { get; set; }
    public string? Color { get; set; }
}

/// <summary>
/// Request to send a chat message.
/// </summary>
public class SendMessageRequest
{
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Embedded position info for Position channels.
/// </summary>
public class PositionChannelDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconName { get; set; }
    public string? Color { get; set; }
}

/// <summary>
/// DTO for Teams connectors available to link to an event's channels.
/// These are connectors that are active, have conversation references, and are not emulators.
/// </summary>
public class AvailableTeamsConnectorDto
{
    /// <summary>
    /// The ExternalChannelMapping ID.
    /// </summary>
    public Guid MappingId { get; set; }

    /// <summary>
    /// Display name of the Teams channel/conversation.
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The Teams conversation ID.
    /// </summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Microsoft 365 tenant ID (for multi-tenant filtering if needed).
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// When the bot last received activity from this conversation.
    /// </summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>
    /// Name of the user who installed/first used the bot.
    /// </summary>
    public string? InstalledByName { get; set; }

    /// <summary>
    /// When the connector was first registered.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Whether this connector is already linked to a channel in the current event.
    /// If true, it's still available but already in use.
    /// </summary>
    public bool IsLinkedToThisEvent { get; set; }

    /// <summary>
    /// The channel name if linked to a channel in this event.
    /// </summary>
    public string? LinkedChannelName { get; set; }
}

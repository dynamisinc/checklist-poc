namespace CobraAPI.Tools.Chat.Models.Entities;

/// <summary>
/// Represents a chat channel within an event.
/// Each event has default channels (Internal, Announcements) created automatically.
/// Additional channels can be created for specific purposes (position-based, custom, external).
/// </summary>
public class ChatThread
{
    public Guid Id { get; set; }

    public Guid EventId { get; set; }

    public Event Event { get; set; } = null!;

    /// <summary>
    /// The type of channel, affecting visibility, permissions, and bridging behavior.
    /// </summary>
    public ChannelType ChannelType { get; set; } = ChannelType.Internal;

    /// <summary>
    /// Whether this is the default event-wide chat thread.
    /// Each event should have exactly one default thread (the "Internal" channel).
    /// </summary>
    public bool IsDefaultEventThread { get; set; }

    /// <summary>
    /// Display name for the channel.
    /// Default channels: "Internal", "Announcements"
    /// External channels: "GroupMe: {GroupName}" or "{GroupName}"
    /// Custom channels: User-defined name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional description for the channel.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Display order for sorting channels in the UI.
    /// Default channels have fixed order (Internal=0, Announcements=1).
    /// </summary>
    public int DisplayOrder { get; set; }

    /// <summary>
    /// Optional icon name for the channel (FontAwesome icon).
    /// Used for position-based and custom channels.
    /// </summary>
    public string? IconName { get; set; }

    /// <summary>
    /// Optional color override for the channel.
    /// Used for position-based and custom channels.
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// For Position channels, the ID of the associated Position entity.
    /// Used to filter visibility to users assigned to this position.
    /// </summary>
    public Guid? PositionId { get; set; }

    /// <summary>
    /// Navigation property to the Position (if this is a Position channel).
    /// </summary>
    public Position? Position { get; set; }

    /// <summary>
    /// For External channels, the ID of the linked ExternalChannelMapping.
    /// Null for internal channels.
    /// </summary>
    public Guid? ExternalChannelMappingId { get; set; }

    /// <summary>
    /// Navigation property to the external channel mapping (if any).
    /// </summary>
    public ExternalChannelMapping? ExternalChannelMapping { get; set; }

    /// <summary>
    /// Whether this channel is active (soft delete flag).
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Collection of messages in this channel.
    /// </summary>
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }
}

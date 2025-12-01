namespace ChecklistAPI.Models.Entities;

/// <summary>
/// Maps a COBRA event to an external messaging platform group.
/// Created automatically when a named event is created (if external messaging is enabled).
/// Supports the event lifecycle - when event is closed/archived, the external group can be archived too.
/// </summary>
public class ExternalChannelMapping
{
    /// <summary>
    /// Primary key for the mapping record.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The COBRA event this external channel is associated with.
    /// One event can have multiple channel mappings (e.g., GroupMe + Teams).
    /// </summary>
    public Guid EventId { get; set; }

    /// <summary>
    /// Navigation property to the associated event.
    /// </summary>
    public Event Event { get; set; } = null!;

    /// <summary>
    /// The external messaging platform (GroupMe, Signal, Teams, etc.).
    /// </summary>
    public ExternalPlatform Platform { get; set; }

    /// <summary>
    /// The external platform's unique identifier for the group/channel.
    /// For GroupMe: the group_id returned from group creation.
    /// </summary>
    public string ExternalGroupId { get; set; } = string.Empty;

    /// <summary>
    /// The display name of the group on the external platform.
    /// Typically mirrors the COBRA event name.
    /// </summary>
    public string ExternalGroupName { get; set; } = string.Empty;

    /// <summary>
    /// The bot identifier used to post messages to this group.
    /// For GroupMe: the bot_id returned from bot registration.
    /// </summary>
    public string BotId { get; set; } = string.Empty;

    /// <summary>
    /// Secret token used to validate incoming webhook requests.
    /// Generated on creation, compared against webhook payload signatures.
    /// </summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>
    /// The share URL for the external group (if applicable).
    /// For GroupMe: the share_url that can be used to invite external participants.
    /// </summary>
    public string? ShareUrl { get; set; }

    /// <summary>
    /// Whether this channel mapping is currently active.
    /// When false, inbound messages are ignored and outbound messages are not sent.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }
}

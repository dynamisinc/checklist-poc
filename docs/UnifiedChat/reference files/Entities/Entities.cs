namespace Cobra.Poc.Entities;

/// <summary>
/// Supported external messaging platforms for chat integration.
/// Each platform has different API capabilities and authentication requirements.
/// </summary>
public enum ExternalPlatform
{
    /// <summary>
    /// GroupMe - Microsoft-owned group messaging with robust bot API.
    /// Supports: group creation, bot posting, webhooks for inbound messages.
    /// </summary>
    GroupMe = 1,

    /// <summary>
    /// Signal - Privacy-focused messaging via unofficial signal-cli-rest-api.
    /// Requires self-hosted infrastructure. Future consideration.
    /// </summary>
    Signal = 2,

    /// <summary>
    /// Microsoft Teams - Enterprise messaging via Incoming Webhooks and Power Automate.
    /// Best for organizations already using M365. Future consideration.
    /// </summary>
    Teams = 3,

    /// <summary>
    /// Slack - Workspace messaging with comprehensive Bot API.
    /// Requires Slack workspace per organization. Future consideration.
    /// </summary>
    Slack = 4
}

/// <summary>
/// Maps a COBRA event to an external messaging platform group.
/// Created automatically when a named event is created (if external messaging is enabled).
/// Supports the event lifecycle - when event is closed/archived, the external group can be archived too.
/// 
/// TODO: Production - implement IUserModifiableEntity, ISoftDeletableEntity interfaces
/// </summary>
public class ExternalChannelMapping
{
    /// <summary>
    /// Primary key for the mapping record.
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary>
    /// The COBRA event this external channel is associated with.
    /// One event can have multiple channel mappings (e.g., GroupMe + Teams).
    /// </summary>
    public required Guid EventId { get; set; }

    /// <summary>
    /// Navigation property to the associated event.
    /// </summary>
    public Event Event { get; set; } = default!;

    /// <summary>
    /// The organization that owns this channel mapping.
    /// Used to scope GroupMe API credentials at the organization level.
    /// </summary>
    public required Guid OrganizationId { get; set; }

    /// <summary>
    /// The external messaging platform (GroupMe, Signal, Teams, etc.).
    /// </summary>
    public required ExternalPlatform Platform { get; set; }

    /// <summary>
    /// The external platform's unique identifier for the group/channel.
    /// For GroupMe: the group_id returned from group creation.
    /// </summary>
    public required string ExternalGroupId { get; set; }

    /// <summary>
    /// The display name of the group on the external platform.
    /// Typically mirrors the COBRA event name.
    /// </summary>
    public required string ExternalGroupName { get; set; }

    /// <summary>
    /// The bot identifier used to post messages to this group.
    /// For GroupMe: the bot_id returned from bot registration.
    /// </summary>
    public required string BotId { get; set; }

    /// <summary>
    /// Secret token used to validate incoming webhook requests.
    /// Generated on creation, compared against webhook payload signatures.
    /// </summary>
    public required string WebhookSecret { get; set; }

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

    #region Audit Fields
    // TODO: Production - these come from IUserModifiableEntity interface

    /// <summary>
    /// Timestamp when the record was created.
    /// </summary>
    public DateTime Created { get; set; }

    /// <summary>
    /// Foreign key to the creating user.
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// Navigation property to the creating user.
    /// </summary>
    public User CreatedBy { get; set; } = default!;

    /// <summary>
    /// Timestamp when the record was last modified.
    /// </summary>
    public DateTime Modified { get; set; }

    /// <summary>
    /// Foreign key to the modifying user.
    /// </summary>
    public Guid ModifiedById { get; set; }

    /// <summary>
    /// Navigation property to the modifying user.
    /// </summary>
    public User ModifiedBy { get; set; } = default!;

    #endregion
}

/// <summary>
/// Represents a chat thread within an event.
/// Each event has one default thread; additional threads may be created for specific purposes.
/// 
/// Simplified for POC - production version includes translations and location.
/// TODO: Production - implement IEventDataEntity, IUserModifiableEntity, ISoftDeletableEntity, ITranslatableEntity
/// </summary>
public class ChatThread
{
    public required Guid Id { get; set; }

    public required Guid EventId { get; set; }

    public Event Event { get; set; } = default!;

    /// <summary>
    /// Whether this is the default event-wide chat thread.
    /// Each event should have exactly one default thread.
    /// </summary>
    public required bool IsDefaultEventThread { get; set; }

    /// <summary>
    /// Display name for the thread.
    /// TODO: Production - use ITranslatableEntity<ChatThreadTranslation> instead
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Collection of messages in this thread.
    /// </summary>
    public ICollection<ChatMessage> Messages { get; set; } = new List<ChatMessage>();

    #region Audit Fields

    public DateTime Created { get; set; }
    public Guid CreatedById { get; set; }
    public User CreatedBy { get; set; } = default!;
    public DateTime Modified { get; set; }
    public Guid ModifiedById { get; set; }
    public User ModifiedBy { get; set; } = default!;
    public bool IsActive { get; set; } = true;

    #endregion
}

/// <summary>
/// Represents a chat message within a chat thread.
/// Extended to support messages originating from external platforms (GroupMe, Signal, etc.).
/// 
/// For COBRA-native messages:
///   - CreatedById is the COBRA user who sent the message
///   - External* fields are null
/// 
/// For external platform messages:
///   - CreatedById is set to a system user (for audit trail)
///   - ExternalSource identifies the platform
///   - ExternalSenderName/ExternalSenderId identify the external user
/// 
/// TODO: Production - implement IUserModifiableEntity, ISoftDeletableEntity interfaces
/// </summary>
public class ChatMessage
{
    /// <summary>
    /// Primary key for the message.
    /// </summary>
    public required Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the parent chat thread.
    /// </summary>
    public required Guid ChatThreadId { get; set; }

    /// <summary>
    /// Navigation property to the parent chat thread.
    /// </summary>
    public ChatThread ChatThread { get; set; } = default!;

    /// <summary>
    /// The message content/body.
    /// </summary>
    public required string Message { get; set; }

    #region Audit Fields

    /// <summary>
    /// Timestamp when the message was created in COBRA.
    /// For external messages, this is when COBRA received the webhook.
    /// </summary>
    public DateTime Created { get; set; }

    /// <summary>
    /// Foreign key to the creating user.
    /// For external messages, this is set to a system user for audit purposes.
    /// </summary>
    public Guid CreatedById { get; set; }

    /// <summary>
    /// Navigation property to the creating user.
    /// </summary>
    public User CreatedBy { get; set; } = default!;

    /// <summary>
    /// Timestamp when the message was last modified.
    /// </summary>
    public DateTime Modified { get; set; }

    /// <summary>
    /// Foreign key to the modifying user.
    /// </summary>
    public Guid ModifiedById { get; set; }

    /// <summary>
    /// Navigation property to the modifying user.
    /// </summary>
    public User ModifiedBy { get; set; } = default!;

    /// <summary>
    /// Soft delete flag. When false, message is considered deleted.
    /// </summary>
    public bool IsActive { get; set; } = true;

    #endregion

    #region External Messaging Fields

    /// <summary>
    /// Source platform for this message. Null indicates a native COBRA message.
    /// When set, the message originated from an external platform and was
    /// received via webhook.
    /// </summary>
    public ExternalPlatform? ExternalSource { get; set; }

    /// <summary>
    /// The external platform's unique message identifier.
    /// Used for deduplication (webhooks can sometimes fire multiple times).
    /// For GroupMe: the message id from the callback payload.
    /// </summary>
    public string? ExternalMessageId { get; set; }

    /// <summary>
    /// Display name of the external sender as shown on their platform.
    /// Used in the chat UI to show who sent the message.
    /// For GroupMe: the "name" field from the callback payload.
    /// </summary>
    public string? ExternalSenderName { get; set; }

    /// <summary>
    /// External platform's user identifier for the sender.
    /// Can be used for future user mapping (linking external users to COBRA users).
    /// For GroupMe: the "user_id" field from the callback payload.
    /// </summary>
    public string? ExternalSenderId { get; set; }

    /// <summary>
    /// Original timestamp from the external platform (if available).
    /// For GroupMe: the "created_at" field (Unix timestamp) from the callback.
    /// </summary>
    public DateTime? ExternalTimestamp { get; set; }

    /// <summary>
    /// URL to an attached image (if any).
    /// For GroupMe: extracted from the attachments array in the callback.
    /// </summary>
    public string? ExternalAttachmentUrl { get; set; }

    /// <summary>
    /// Reference to the external channel mapping this message came through.
    /// Null for native COBRA messages.
    /// </summary>
    public Guid? ExternalChannelMappingId { get; set; }

    /// <summary>
    /// Navigation property to the external channel mapping.
    /// </summary>
    public ExternalChannelMapping? ExternalChannelMapping { get; set; }

    #endregion

    #region Promotion Tracking

    /// <summary>
    /// If this message was promoted to a logbook entry, the entry ID.
    /// Provides audit trail from chat message to formal logbook record.
    /// </summary>
    public Guid? PromotedToLogbookEntryId { get; set; }

    /// <summary>
    /// Timestamp when the message was promoted to a logbook entry.
    /// </summary>
    public DateTime? PromotedToLogbookAt { get; set; }

    /// <summary>
    /// User who promoted this message to a logbook entry.
    /// </summary>
    public Guid? PromotedToLogbookById { get; set; }

    #endregion

    #region Helper Properties

    /// <summary>
    /// Returns true if this message originated from an external platform.
    /// </summary>
    public bool IsExternalMessage => ExternalSource.HasValue;

    #endregion
}

/// <summary>
/// Simplified LogbookEntry for POC.
/// TODO: Production - use actual LogbookEntry entity with translations
/// </summary>
public class LogbookEntry
{
    public Guid Id { get; set; }
    public Guid EventId { get; set; }
    public Guid? CategoryId { get; set; }
    public string Content { get; set; } = default!;
    public DateTime Created { get; set; }
    public Guid CreatedById { get; set; }
    public DateTime Modified { get; set; }
    public Guid ModifiedById { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Simplified User entity for POC.
/// TODO: Production - use actual User entity
/// </summary>
public class User
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = default!;
    public string Email { get; set; } = default!;
}

/// <summary>
/// Simplified Event entity for POC.
/// Your checklist POC likely already has this - adjust as needed.
/// </summary>
public class Event
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public bool IsActive { get; set; } = true;
}

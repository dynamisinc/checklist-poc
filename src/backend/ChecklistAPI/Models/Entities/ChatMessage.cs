namespace ChecklistAPI.Models.Entities;

/// <summary>
/// Represents a chat message within a chat thread.
/// Extended to support messages originating from external platforms (GroupMe, Signal, etc.).
///
/// For COBRA-native messages:
///   - CreatedBy is the COBRA user who sent the message
///   - External* fields are null
///
/// For external platform messages:
///   - CreatedBy is set to a system identifier (for audit trail)
///   - ExternalSource identifies the platform
///   - ExternalSenderName/ExternalSenderId identify the external user
/// </summary>
public class ChatMessage
{
    /// <summary>
    /// Primary key for the message.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Foreign key to the parent chat thread.
    /// </summary>
    public Guid ChatThreadId { get; set; }

    /// <summary>
    /// Navigation property to the parent chat thread.
    /// </summary>
    public ChatThread ChatThread { get; set; } = null!;

    /// <summary>
    /// The message content/body.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the sender (for quick access without joins).
    /// </summary>
    public string SenderDisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Soft delete flag. When false, message is considered deleted.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }

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

    #region Helper Properties

    /// <summary>
    /// Returns true if this message originated from an external platform.
    /// </summary>
    public bool IsExternalMessage => ExternalSource.HasValue;

    #endregion
}

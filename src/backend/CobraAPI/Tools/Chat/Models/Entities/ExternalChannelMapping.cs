using System.Text.Json;
using Microsoft.Bot.Schema;

namespace CobraAPI.Tools.Chat.Models.Entities;

/// <summary>
/// Maps a COBRA event to an external messaging platform group.
/// Created automatically when a named event is created (if external messaging is enabled).
/// Supports the event lifecycle - when event is closed/archived, the external group can be archived too.
/// For Teams: Also stores ConversationReference for stateless proactive messaging.
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
    /// For Teams: the Conversation.Id from Bot Framework.
    /// </summary>
    public string ExternalGroupId { get; set; } = string.Empty;

    /// <summary>
    /// The display name of the group on the external platform.
    /// Typically mirrors the COBRA event name. Editable by admins.
    /// </summary>
    public string ExternalGroupName { get; set; } = string.Empty;

    /// <summary>
    /// The bot identifier used to post messages to this group.
    /// For GroupMe: the bot_id returned from bot registration.
    /// For Teams: not used (ConversationReference contains bot info).
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
    /// For Teams: not applicable (null).
    /// </summary>
    public string? ShareUrl { get; set; }

    /// <summary>
    /// Whether this channel mapping is currently active.
    /// When false, inbound messages are ignored and outbound messages are not sent.
    /// </summary>
    public bool IsActive { get; set; } = true;

    // === Teams Stateless Architecture Fields (UC-TI-029) ===

    /// <summary>
    /// Serialized Bot Framework ConversationReference for proactive messaging.
    /// Only populated for Teams platform. Contains ServiceUrl, Conversation, Bot info.
    /// Updated on every incoming message to keep ServiceUrl current.
    /// </summary>
    public string? ConversationReferenceJson { get; set; }

    /// <summary>
    /// Customer's Microsoft 365 tenant ID.
    /// Captured from activity.Conversation.TenantId.
    /// Enables future multi-tenant queries and filtering.
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// Last time a message was received from this channel.
    /// Used for health monitoring and stale connector cleanup.
    /// </summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>
    /// Display name of user who installed/first used the bot.
    /// Captured from activity.From.Name on bot installation or first message.
    /// </summary>
    public string? InstalledByName { get; set; }

    /// <summary>
    /// True if this is a Bot Framework Emulator connection.
    /// Detected via activity.ChannelId == "emulator".
    /// Makes it easy to filter/cleanup test connections.
    /// </summary>
    public bool IsEmulator { get; set; }

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }

    // === Helper Methods for Teams ConversationReference ===

    /// <summary>
    /// Deserializes the stored ConversationReference for proactive messaging.
    /// Returns null if not set or if deserialization fails.
    /// </summary>
    public ConversationReference? GetConversationReference()
    {
        if (string.IsNullOrEmpty(ConversationReferenceJson))
            return null;

        try
        {
            return JsonSerializer.Deserialize<ConversationReference>(ConversationReferenceJson);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Serializes and stores a ConversationReference.
    /// </summary>
    public void SetConversationReference(ConversationReference reference)
    {
        ConversationReferenceJson = JsonSerializer.Serialize(reference);
    }
}

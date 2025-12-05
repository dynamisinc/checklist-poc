using System.Text.Json.Serialization;

namespace CobraAPI.TeamsBot.Models;

/// <summary>
/// Payload sent from TeamsBot to CobraAPI webhook endpoint.
/// Contains all information needed to create a ChatMessage in COBRA.
/// </summary>
public class TeamsWebhookPayload
{
    /// <summary>
    /// Unique message identifier from Teams.
    /// </summary>
    [JsonPropertyName("messageId")]
    public string MessageId { get; set; } = string.Empty;

    /// <summary>
    /// Teams conversation ID (channel or chat).
    /// </summary>
    [JsonPropertyName("conversationId")]
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Teams channel ID (e.g., "msteams").
    /// </summary>
    [JsonPropertyName("channelId")]
    public string ChannelId { get; set; } = string.Empty;

    /// <summary>
    /// Sender's Teams user ID.
    /// </summary>
    [JsonPropertyName("senderId")]
    public string SenderId { get; set; } = string.Empty;

    /// <summary>
    /// Sender's display name.
    /// </summary>
    [JsonPropertyName("senderName")]
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// Message text content.
    /// </summary>
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    /// <summary>
    /// UTC timestamp when the message was sent.
    /// </summary>
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Type of message activity: "message", "messageUpdate", "messageDelete".
    /// </summary>
    [JsonPropertyName("activityType")]
    public string ActivityType { get; set; } = "message";

    /// <summary>
    /// Optional image attachment URL.
    /// </summary>
    [JsonPropertyName("imageUrl")]
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Teams Service URL (needed for proactive messaging).
    /// </summary>
    [JsonPropertyName("serviceUrl")]
    public string? ServiceUrl { get; set; }

    /// <summary>
    /// Team ID (if message is from a team channel).
    /// </summary>
    [JsonPropertyName("teamId")]
    public string? TeamId { get; set; }

    /// <summary>
    /// Team name (if available).
    /// </summary>
    [JsonPropertyName("teamName")]
    public string? TeamName { get; set; }
}

/// <summary>
/// Request model for CobraAPI to send outbound messages to Teams.
/// For stateless architecture, includes ConversationReferenceJson from CobraAPI database.
/// </summary>
public class TeamsSendRequest
{
    /// <summary>
    /// The conversation ID to send the message to.
    /// Used for logging and debugging.
    /// </summary>
    [JsonPropertyName("conversationId")]
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>
    /// Serialized Bot Framework ConversationReference (JSON).
    /// Contains all info needed for proactive messaging: ServiceUrl, Conversation, Bot.
    /// Required for stateless bot architecture - passed from CobraAPI database.
    /// </summary>
    [JsonPropertyName("conversationReferenceJson")]
    public string? ConversationReferenceJson { get; set; }

    /// <summary>
    /// The message text to send.
    /// </summary>
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// The COBRA user name to attribute the message to.
    /// </summary>
    [JsonPropertyName("senderName")]
    public string SenderName { get; set; } = string.Empty;

    /// <summary>
    /// Optional: Use Adaptive Card format instead of plain text.
    /// </summary>
    [JsonPropertyName("useAdaptiveCard")]
    public bool UseAdaptiveCard { get; set; } = false;

    /// <summary>
    /// Optional: COBRA event name for context when multiple channels share the same Teams conversation.
    /// </summary>
    [JsonPropertyName("eventName")]
    public string? EventName { get; set; }

    /// <summary>
    /// Optional: COBRA channel name for context when multiple channels share the same Teams conversation.
    /// </summary>
    [JsonPropertyName("channelName")]
    public string? ChannelName { get; set; }

    /// <summary>
    /// Indicates whether multiple COBRA channels are connected to this Teams conversation.
    /// When true, Teams messages should include event/channel context.
    /// </summary>
    [JsonPropertyName("hasMultipleChannels")]
    public bool HasMultipleChannels { get; set; } = false;
}

/// <summary>
/// Response from TeamsBot when sending a message.
/// </summary>
public class TeamsSendResponse
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("messageId")]
    public string? MessageId { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }

    /// <summary>
    /// Number of attempts made to send the message (1 = succeeded on first try).
    /// Useful for monitoring retry behavior.
    /// </summary>
    [JsonPropertyName("attempts")]
    public int Attempts { get; set; } = 1;

    /// <summary>
    /// Status of the conversation reference.
    /// Values: "Valid", "Missing", "Invalid", "Expired", "PossiblyStale".
    /// When "Expired", CobraAPI should mark the channel mapping as disconnected.
    /// </summary>
    [JsonPropertyName("referenceStatus")]
    public string? ReferenceStatus { get; set; }
}

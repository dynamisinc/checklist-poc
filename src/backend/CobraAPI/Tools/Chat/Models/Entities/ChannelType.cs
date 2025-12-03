namespace CobraAPI.Tools.Chat.Models.Entities;

/// <summary>
/// Defines the type of chat channel, affecting visibility, permissions, and bridging behavior.
/// </summary>
public enum ChannelType
{
    /// <summary>
    /// Default internal channel. All COBRA users with event access can read/write.
    /// Messages are never bridged to external platforms.
    /// </summary>
    Internal = 0,

    /// <summary>
    /// Announcements channel. Standard users can read only.
    /// Only users with Manage permissions can write.
    /// Messages are never bridged to external platforms.
    /// </summary>
    Announcements = 1,

    /// <summary>
    /// External channel linked to a messaging platform (GroupMe, Teams, etc.).
    /// Messages are bridged bi-directionally with the external platform.
    /// Linked via ExternalChannelMapping.
    /// </summary>
    External = 2,

    /// <summary>
    /// Position-based channel (e.g., "Logistics", "Operations").
    /// Access may be restricted to users in that position.
    /// Messages are never bridged to external platforms.
    /// </summary>
    Position = 3,

    /// <summary>
    /// Custom channel created by users for specific purposes.
    /// Messages are never bridged to external platforms.
    /// </summary>
    Custom = 4,
}

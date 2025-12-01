namespace ChecklistAPI.Models.Entities;

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

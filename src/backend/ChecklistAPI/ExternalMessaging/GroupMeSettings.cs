namespace ChecklistAPI.ExternalMessaging;

/// <summary>
/// Configuration settings for GroupMe API integration.
/// </summary>
public class GroupMeSettings
{
    public const string SectionName = "GroupMe";

    /// <summary>
    /// GroupMe API access token. Obtain from https://dev.groupme.com/
    /// This token is associated with a GroupMe user account that will own all created groups.
    /// </summary>
    public string AccessToken { get; set; } = string.Empty;

    /// <summary>
    /// Base URL for GroupMe API. Defaults to production API.
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.groupme.com/v3";

    /// <summary>
    /// Base URL for webhook callbacks. This should be the public URL of your COBRA instance.
    /// Example: https://your-cobra-instance.azurewebsites.net
    /// </summary>
    public string WebhookBaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Whether GroupMe integration is enabled.
    /// </summary>
    public bool IsEnabled => !string.IsNullOrEmpty(AccessToken);
}

using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace CobraAPI.Tools.Chat.ExternalPlatforms;

/// <summary>
/// Client service for interacting with the GroupMe REST API.
/// Handles group creation, bot registration, and message sending.
///
/// Configuration:
/// - AccessToken: From database settings (SystemSettings) - admin-configurable
/// - WebhookBaseUrl: From appsettings.json - infrastructure config
///
/// API Documentation: https://dev.groupme.com/docs/v3
/// </summary>
public class GroupMeApiClient : IGroupMeApiClient
{
    private readonly HttpClient _httpClient;
    private readonly GroupMeSettings _settings;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<GroupMeApiClient> _logger;

    public GroupMeApiClient(
        HttpClient httpClient,
        IOptions<GroupMeSettings> settings,
        IServiceProvider serviceProvider,
        ILogger<GroupMeApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _serviceProvider = serviceProvider;
        _logger = logger;

        // Ensure base URL ends with / for proper URI combination
        var baseUrl = _settings.BaseUrl.TrimEnd('/') + "/";
        _httpClient.BaseAddress = new Uri(baseUrl);
    }

    /// <summary>
    /// Gets the access token from database settings (if available) or falls back to appsettings
    /// </summary>
    private async Task<string> GetAccessTokenAsync()
    {
        // Try database settings first
        using var scope = _serviceProvider.CreateScope();
        var settingsService = scope.ServiceProvider.GetService<ISystemSettingsService>();

        if (settingsService != null)
        {
            var dbToken = await settingsService.GetSettingValueAsync(SystemSettingKeys.GroupMeAccessToken);
            if (!string.IsNullOrEmpty(dbToken))
            {
                _logger.LogDebug("Using GroupMe access token from database settings");
                return dbToken;
            }
        }

        // Fall back to appsettings
        _logger.LogDebug("Using GroupMe access token from appsettings");
        return _settings.AccessToken;
    }

    /// <summary>
    /// Gets the webhook base URL from appsettings.
    /// This is infrastructure configuration, not user-editable.
    /// </summary>
    private string GetWebhookBaseUrl()
    {
        return _settings.WebhookBaseUrl;
    }

    #region Group Operations

    /// <summary>
    /// Creates a new GroupMe group for an event.
    /// The group is owned by the user associated with the access token.
    /// </summary>
    /// <param name="name">Display name for the group (typically the event name)</param>
    /// <param name="description">Optional description for the group</param>
    /// <returns>Created group details including group_id and share_url</returns>
    public async Task<GroupMeGroup> CreateGroupAsync(string name, string? description = null)
    {
        _logger.LogInformation("Creating GroupMe group: {GroupName}", name);

        var accessToken = await GetAccessTokenAsync();

        // Validate access token is configured
        if (string.IsNullOrEmpty(accessToken))
        {
            _logger.LogError("GroupMe access token is not configured. Please configure it in Admin → System Settings.");
            throw new InvalidOperationException("GroupMe access token is not configured. Please configure it in Admin → System Settings.");
        }

        var request = new
        {
            name = name,
            description = description ?? $"COBRA Event: {name}",
            share = true
        };

        var response = await _httpClient.PostAsJsonAsync(
            $"groups?token={accessToken}",
            request);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("GroupMe API error creating group. Status: {StatusCode}, Response: {Response}",
                response.StatusCode, errorContent);

            // Check for common error cases
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                throw new InvalidOperationException("GroupMe access token is invalid or expired. Please update it in Admin → System Settings.");
            }

            throw new InvalidOperationException($"GroupMe API error: {response.StatusCode} - {errorContent}");
        }

        var result = await response.Content.ReadFromJsonAsync<GroupMeApiResponse<GroupMeGroup>>();

        _logger.LogInformation("Created GroupMe group {GroupId} for {GroupName}",
            result?.Response?.GroupId, name);

        return result?.Response ?? throw new InvalidOperationException("Failed to parse GroupMe response");
    }

    /// <summary>
    /// Retrieves details about an existing group.
    /// </summary>
    /// <param name="groupId">The GroupMe group ID</param>
    /// <returns>Group details</returns>
    public async Task<GroupMeGroup> GetGroupAsync(string groupId)
    {
        var accessToken = await GetAccessTokenAsync();
        var response = await _httpClient.GetAsync($"groups/{groupId}?token={accessToken}");
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GroupMeApiResponse<GroupMeGroup>>();
        return result?.Response ?? throw new InvalidOperationException("Failed to parse GroupMe response");
    }

    /// <summary>
    /// Archives (destroys) a GroupMe group.
    /// Called when a COBRA event is closed/archived.
    /// </summary>
    /// <param name="groupId">The GroupMe group ID to archive</param>
    public async Task ArchiveGroupAsync(string groupId)
    {
        _logger.LogInformation("Archiving GroupMe group: {GroupId}", groupId);

        var accessToken = await GetAccessTokenAsync();
        var response = await _httpClient.PostAsync(
            $"groups/{groupId}/destroy?token={accessToken}",
            null);

        response.EnsureSuccessStatusCode();

        _logger.LogInformation("Archived GroupMe group: {GroupId}", groupId);
    }

    #endregion

    #region Bot Operations

    /// <summary>
    /// Registers a bot for a group. The bot is used to post messages from COBRA to GroupMe.
    /// Also sets up the callback URL for receiving inbound messages via webhook.
    /// </summary>
    /// <param name="groupId">The GroupMe group ID</param>
    /// <param name="botName">Display name for the bot (e.g., "COBRA")</param>
    /// <param name="channelMappingId">COBRA's channel mapping ID for webhook routing</param>
    /// <returns>Bot details including bot_id</returns>
    public async Task<GroupMeBot> CreateBotAsync(string groupId, string botName, Guid channelMappingId)
    {
        _logger.LogInformation("Creating GroupMe bot for group {GroupId}", groupId);

        var accessToken = await GetAccessTokenAsync();
        var webhookBaseUrl = GetWebhookBaseUrl();
        var callbackUrl = $"{webhookBaseUrl.TrimEnd('/')}/api/webhooks/groupme/{channelMappingId}";

        var request = new
        {
            bot = new
            {
                name = botName,
                group_id = groupId,
                callback_url = callbackUrl,
                avatar_url = (string?)null
            }
        };

        var response = await _httpClient.PostAsJsonAsync(
            $"bots?token={accessToken}",
            request);

        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GroupMeApiResponse<GroupMeBotWrapper>>();

        _logger.LogInformation("Created GroupMe bot {BotId} for group {GroupId}",
            result?.Response?.Bot?.BotId, groupId);

        return result?.Response?.Bot ?? throw new InvalidOperationException("Failed to parse GroupMe response");
    }

    /// <summary>
    /// Posts a message to a group using the bot.
    /// </summary>
    /// <param name="botId">The bot ID to post as</param>
    /// <param name="text">Message text to send</param>
    /// <param name="attachments">Optional attachments (images, locations)</param>
    public async Task PostBotMessageAsync(string botId, string text, List<GroupMeAttachment>? attachments = null)
    {
        _logger.LogDebug("Posting message to GroupMe via bot {BotId}", botId);

        var request = new
        {
            bot_id = botId,
            text = text,
            attachments = attachments
        };

        var response = await _httpClient.PostAsJsonAsync("bots/post", request);

        // Bot post returns 202 Accepted on success, no body
        if (!response.IsSuccessStatusCode)
        {
            var error = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to post GroupMe message: {StatusCode} {Error}",
                response.StatusCode, error);
            throw new InvalidOperationException($"GroupMe bot post failed: {response.StatusCode}");
        }

        _logger.LogDebug("Successfully posted message to GroupMe via bot {BotId}", botId);
    }

    /// <summary>
    /// Destroys a bot. Called when cleaning up a channel mapping.
    /// </summary>
    /// <param name="botId">The bot ID to destroy</param>
    public async Task DestroyBotAsync(string botId)
    {
        _logger.LogInformation("Destroying GroupMe bot: {BotId}", botId);

        var accessToken = await GetAccessTokenAsync();
        var request = new { bot_id = botId };
        var response = await _httpClient.PostAsJsonAsync(
            $"bots/destroy?token={accessToken}",
            request);

        response.EnsureSuccessStatusCode();
    }

    #endregion
}

#region API Response Models

/// <summary>
/// Standard GroupMe API response wrapper.
/// </summary>
public class GroupMeApiResponse<T>
{
    [JsonPropertyName("response")]
    public T? Response { get; set; }

    [JsonPropertyName("meta")]
    public GroupMeMeta? Meta { get; set; }
}

public class GroupMeMeta
{
    [JsonPropertyName("code")]
    public int Code { get; set; }

    [JsonPropertyName("errors")]
    public List<string>? Errors { get; set; }
}

/// <summary>
/// GroupMe group details.
/// </summary>
public class GroupMeGroup
{
    [JsonPropertyName("id")]
    public string GroupId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("share_url")]
    public string? ShareUrl { get; set; }

    [JsonPropertyName("created_at")]
    public long CreatedAt { get; set; }

    [JsonPropertyName("members")]
    public List<GroupMeMember>? Members { get; set; }
}

/// <summary>
/// GroupMe group member.
/// </summary>
public class GroupMeMember
{
    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("nickname")]
    public string Nickname { get; set; } = string.Empty;

    [JsonPropertyName("image_url")]
    public string? ImageUrl { get; set; }
}

/// <summary>
/// Wrapper for bot creation response.
/// </summary>
public class GroupMeBotWrapper
{
    [JsonPropertyName("bot")]
    public GroupMeBot? Bot { get; set; }
}

/// <summary>
/// GroupMe bot details.
/// </summary>
public class GroupMeBot
{
    [JsonPropertyName("bot_id")]
    public string BotId { get; set; } = string.Empty;

    [JsonPropertyName("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("callback_url")]
    public string? CallbackUrl { get; set; }
}

/// <summary>
/// GroupMe message attachment (image, location, etc.).
/// </summary>
public class GroupMeAttachment
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("lat")]
    public double? Latitude { get; set; }

    [JsonPropertyName("lng")]
    public double? Longitude { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

#endregion

#region Webhook Payload Model

/// <summary>
/// Incoming webhook payload from GroupMe when a message is posted to a group.
/// This is what COBRA receives at the callback URL.
/// </summary>
public class GroupMeWebhookPayload
{
    [JsonPropertyName("id")]
    public string MessageId { get; set; } = string.Empty;

    [JsonPropertyName("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [JsonPropertyName("user_id")]
    public string UserId { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string SenderName { get; set; } = string.Empty;

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("created_at")]
    public long CreatedAt { get; set; }

    [JsonPropertyName("avatar_url")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("sender_type")]
    public string SenderType { get; set; } = string.Empty;

    [JsonPropertyName("attachments")]
    public List<GroupMeAttachment>? Attachments { get; set; }

    /// <summary>
    /// Converts Unix timestamp to DateTime.
    /// </summary>
    public DateTime GetCreatedAtUtc() =>
        DateTimeOffset.FromUnixTimeSeconds(CreatedAt).UtcDateTime;
}

#endregion

/// <summary>
/// Interface for GroupMe API operations to support dependency injection and testing.
/// </summary>
public interface IGroupMeApiClient
{
    Task<GroupMeGroup> CreateGroupAsync(string name, string? description = null);
    Task<GroupMeGroup> GetGroupAsync(string groupId);
    Task ArchiveGroupAsync(string groupId);
    Task<GroupMeBot> CreateBotAsync(string groupId, string botName, Guid channelMappingId);
    Task PostBotMessageAsync(string botId, string text, List<GroupMeAttachment>? attachments = null);
    Task DestroyBotAsync(string botId);
}

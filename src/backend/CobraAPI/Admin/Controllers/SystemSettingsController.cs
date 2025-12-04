/**
 * System Settings Controller
 *
 * API endpoints for managing customer-level configuration settings.
 * Requires SysAdmin authentication for all operations.
 */

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using CobraAPI.Tools.Chat.ExternalPlatforms;

namespace CobraAPI.Admin.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingsService _settingsService;
    private readonly GroupMeSettings _groupMeSettings;
    private readonly TeamsBotSettings _teamsBotSettings;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SystemSettingsController> _logger;

    public SystemSettingsController(
        ISystemSettingsService settingsService,
        IOptions<GroupMeSettings> groupMeSettings,
        IOptions<TeamsBotSettings> teamsBotSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<SystemSettingsController> logger)
    {
        _settingsService = settingsService;
        _groupMeSettings = groupMeSettings.Value;
        _teamsBotSettings = teamsBotSettings.Value;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Get all system settings (values masked for secrets)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<SystemSettingDto>>> GetAllSettings(
        [FromQuery] SettingCategory? category = null)
    {
        // In production, verify SysAdmin authentication here
        var settings = await _settingsService.GetAllSettingsAsync(category);
        return Ok(settings);
    }

    /// <summary>
    /// Get a specific setting by key
    /// </summary>
    [HttpGet("{key}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> GetSetting(string key)
    {
        var setting = await _settingsService.GetSettingByKeyAsync(key);
        if (setting == null)
        {
            return NotFound(new { message = $"Setting '{key}' not found" });
        }
        return Ok(setting);
    }

    /// <summary>
    /// Create a new system setting
    /// </summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<SystemSettingDto>> CreateSetting(
        [FromBody] CreateSystemSettingRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var modifiedBy = GetCurrentUser();

        try
        {
            var setting = await _settingsService.CreateSettingAsync(request, modifiedBy);
            return CreatedAtAction(nameof(GetSetting), new { key = setting.Key }, setting);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update a system setting
    /// </summary>
    [HttpPut("{key}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> UpdateSetting(
        string key,
        [FromBody] UpdateSystemSettingRequest request)
    {
        var modifiedBy = GetCurrentUser();
        var setting = await _settingsService.UpdateSettingAsync(key, request, modifiedBy);

        if (setting == null)
        {
            return NotFound(new { message = $"Setting '{key}' not found" });
        }

        return Ok(setting);
    }

    /// <summary>
    /// Update just the value of a setting
    /// </summary>
    [HttpPatch("{key}/value")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> UpdateSettingValue(
        string key,
        [FromBody] UpdateSettingValueRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var modifiedBy = GetCurrentUser();
        var setting = await _settingsService.UpdateSettingValueAsync(key, request.Value, modifiedBy);

        if (setting == null)
        {
            return NotFound(new { message = $"Setting '{key}' not found" });
        }

        return Ok(setting);
    }

    /// <summary>
    /// Delete a system setting
    /// </summary>
    [HttpDelete("{key}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSetting(string key)
    {
        var deleted = await _settingsService.DeleteSettingAsync(key);

        if (!deleted)
        {
            return NotFound(new { message = $"Setting '{key}' not found" });
        }

        return NoContent();
    }

    /// <summary>
    /// Initialize default settings (creates settings if they don't exist)
    /// </summary>
    [HttpPost("initialize")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> InitializeDefaults()
    {
        var modifiedBy = GetCurrentUser();
        await _settingsService.InitializeDefaultSettingsAsync(modifiedBy);
        return Ok(new { message = "Default settings initialized" });
    }

    /// <summary>
    /// Toggle a setting's enabled state
    /// </summary>
    [HttpPatch("{key}/toggle")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SystemSettingDto>> ToggleSetting(string key)
    {
        var existing = await _settingsService.GetSettingByKeyAsync(key);
        if (existing == null)
        {
            return NotFound(new { message = $"Setting '{key}' not found" });
        }

        var modifiedBy = GetCurrentUser();
        var setting = await _settingsService.UpdateSettingAsync(
            key,
            new UpdateSystemSettingRequest { IsEnabled = !existing.IsEnabled },
            modifiedBy);

        return Ok(setting);
    }

    /// <summary>
    /// Get GroupMe integration status including computed webhook callback URL.
    /// The webhook URL is determined by appsettings configuration, not database settings.
    /// </summary>
    [HttpGet("integrations/groupme")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<GroupMeIntegrationStatusDto>> GetGroupMeIntegrationStatus()
    {
        // Get the access token configured status from database
        var hasAccessToken = await _settingsService.HasSettingAsync(SystemSettingKeys.GroupMeAccessToken);

        // Build the webhook callback URL pattern from appsettings
        var webhookBaseUrl = _groupMeSettings.WebhookBaseUrl?.TrimEnd('/');
        var webhookCallbackUrlPattern = !string.IsNullOrEmpty(webhookBaseUrl)
            ? $"{webhookBaseUrl}/api/webhooks/groupme/{{channelMappingId}}"
            : null;

        return Ok(new GroupMeIntegrationStatusDto
        {
            IsConfigured = hasAccessToken && !string.IsNullOrEmpty(webhookBaseUrl),
            HasAccessToken = hasAccessToken,
            WebhookBaseUrl = webhookBaseUrl ?? "(not configured)",
            WebhookCallbackUrlPattern = webhookCallbackUrlPattern ?? "(WebhookBaseUrl not configured)",
            WebhookHealthCheckUrl = !string.IsNullOrEmpty(webhookBaseUrl)
                ? $"{webhookBaseUrl}/api/webhooks/health"
                : "(not available)"
        });
    }

    /// <summary>
    /// Get Teams Bot integration status including connection health.
    /// Checks if the TeamsBot service is configured and reachable.
    /// </summary>
    [HttpGet("integrations/teams")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<TeamsIntegrationStatusDto>> GetTeamsIntegrationStatus()
    {
        var baseUrl = _teamsBotSettings.BaseUrl?.TrimEnd('/');
        var isConfigured = !string.IsNullOrEmpty(baseUrl);
        var isConnected = false;
        var availableConversations = 0;

        if (isConfigured)
        {
            try
            {
                // Check if TeamsBot is reachable
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(5);

                // Add API key header if configured
                if (!string.IsNullOrEmpty(_teamsBotSettings.ApiKey))
                {
                    client.DefaultRequestHeaders.Add("X-Api-Key", _teamsBotSettings.ApiKey);
                }

                var healthResponse = await client.GetAsync($"{baseUrl}/api/health");
                isConnected = healthResponse.IsSuccessStatusCode;

                if (isConnected)
                {
                    // Get count of available conversations
                    var conversationsResponse = await client.GetAsync($"{baseUrl}/api/internal/conversations");
                    if (conversationsResponse.IsSuccessStatusCode)
                    {
                        var json = await conversationsResponse.Content.ReadAsStringAsync();
                        // Simple parse to get count
                        if (json.Contains("\"count\":"))
                        {
                            var countMatch = System.Text.RegularExpressions.Regex.Match(json, @"""count"":(\d+)");
                            if (countMatch.Success)
                            {
                                availableConversations = int.Parse(countMatch.Groups[1].Value);
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to check Teams Bot health at {BaseUrl}", baseUrl);
                isConnected = false;
            }
        }

        return Ok(new TeamsIntegrationStatusDto
        {
            IsConfigured = isConfigured,
            IsConnected = isConnected,
            BotBaseUrl = baseUrl ?? "(not configured)",
            InternalApiUrl = isConfigured ? $"{baseUrl}/api/internal/send" : "(not available)",
            AvailableConversations = availableConversations,
            StatusMessage = GetTeamsStatusMessage(isConfigured, isConnected, availableConversations)
        });
    }

    private static string GetTeamsStatusMessage(bool isConfigured, bool isConnected, int availableConversations)
    {
        if (!isConfigured)
            return "Teams Bot URL not configured in appsettings";
        if (!isConnected)
            return "Teams Bot is not reachable";
        if (availableConversations == 0)
            return "Connected, but no Teams channels have installed the bot yet";
        return $"Connected with {availableConversations} available channel(s)";
    }

    private string GetCurrentUser()
    {
        // Get user from context (set by MockUserMiddleware)
        var userContext = HttpContext.Items["UserContext"] as UserContext;
        return userContext?.Email ?? "system";
    }
}

/// <summary>
/// GroupMe integration status for Admin UI display.
/// </summary>
public record GroupMeIntegrationStatusDto
{
    /// <summary>Whether GroupMe integration is fully configured (has token + webhook URL)</summary>
    public bool IsConfigured { get; init; }

    /// <summary>Whether an access token has been set in system settings</summary>
    public bool HasAccessToken { get; init; }

    /// <summary>The webhook base URL from appsettings (read-only, not user-editable)</summary>
    public string WebhookBaseUrl { get; init; } = string.Empty;

    /// <summary>
    /// The full webhook callback URL pattern that GroupMe will use.
    /// Replace {channelMappingId} with the actual channel mapping GUID.
    /// </summary>
    public string WebhookCallbackUrlPattern { get; init; } = string.Empty;

    /// <summary>URL to test webhook endpoint accessibility</summary>
    public string WebhookHealthCheckUrl { get; init; } = string.Empty;
}

/// <summary>
/// Teams Bot integration status for Admin UI display.
/// </summary>
public record TeamsIntegrationStatusDto
{
    /// <summary>Whether Teams Bot URL is configured in appsettings</summary>
    public bool IsConfigured { get; init; }

    /// <summary>Whether the Teams Bot service is currently reachable</summary>
    public bool IsConnected { get; init; }

    /// <summary>The Teams Bot base URL from appsettings</summary>
    public string BotBaseUrl { get; init; } = string.Empty;

    /// <summary>The internal API URL for sending messages to Teams</summary>
    public string InternalApiUrl { get; init; } = string.Empty;

    /// <summary>Number of Teams channels that have installed the bot</summary>
    public int AvailableConversations { get; init; }

    /// <summary>Human-readable status message</summary>
    public string StatusMessage { get; init; } = string.Empty;
}

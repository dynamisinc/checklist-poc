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
    private readonly ILogger<SystemSettingsController> _logger;

    public SystemSettingsController(
        ISystemSettingsService settingsService,
        IOptions<GroupMeSettings> groupMeSettings,
        ILogger<SystemSettingsController> logger)
    {
        _settingsService = settingsService;
        _groupMeSettings = groupMeSettings.Value;
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

using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using System.Text.Json;
using ChecklistAPI.Models.Configuration;

namespace ChecklistAPI.Controllers;

/// <summary>
/// API controller for managing feature flags.
/// Returns merged flags from appsettings.json defaults and server-side overrides.
/// Admin can update overrides which persist in a JSON file for all users.
/// </summary>
[ApiController]
[Route("api/config/[controller]")]
public class FeatureFlagsController : ControllerBase
{
    private readonly FeatureFlagsConfig _defaultConfig;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<FeatureFlagsController> _logger;
    private readonly string _overrideFilePath;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public FeatureFlagsController(
        IOptions<FeatureFlagsConfig> defaultConfig,
        IWebHostEnvironment environment,
        ILogger<FeatureFlagsController> logger)
    {
        _defaultConfig = defaultConfig.Value;
        _environment = environment;
        _logger = logger;
        _overrideFilePath = Path.Combine(_environment.ContentRootPath, "Data", "featureflags.override.json");
    }

    /// <summary>
    /// Get current feature flags (merged defaults + overrides)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    public ActionResult<FeatureFlagsDto> GetFeatureFlags()
    {
        var merged = GetMergedFlags();
        _logger.LogDebug("Returning feature flags: {@Flags}", merged);
        return Ok(merged);
    }

    /// <summary>
    /// Update feature flag overrides (admin only - persists to server file)
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FeatureFlagsDto>> UpdateFeatureFlags([FromBody] FeatureFlagsDto flags)
    {
        try
        {
            // Ensure Data directory exists
            var dataDir = Path.GetDirectoryName(_overrideFilePath);
            if (!string.IsNullOrEmpty(dataDir) && !Directory.Exists(dataDir))
            {
                Directory.CreateDirectory(dataDir);
            }

            // Write overrides to file
            var json = JsonSerializer.Serialize(flags, JsonOptions);
            await System.IO.File.WriteAllTextAsync(_overrideFilePath, json);

            _logger.LogInformation("Feature flags updated by admin: {@Flags}", flags);

            return Ok(flags);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save feature flag overrides");
            return StatusCode(500, new { message = "Failed to save feature flags" });
        }
    }

    /// <summary>
    /// Reset all overrides back to appsettings.json defaults
    /// </summary>
    [HttpDelete]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    public ActionResult<FeatureFlagsDto> ResetToDefaults()
    {
        try
        {
            if (System.IO.File.Exists(_overrideFilePath))
            {
                System.IO.File.Delete(_overrideFilePath);
                _logger.LogInformation("Feature flag overrides reset to defaults");
            }

            return Ok(FeatureFlagsDto.FromConfig(_defaultConfig));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reset feature flags");
            return StatusCode(500, new { message = "Failed to reset feature flags" });
        }
    }

    /// <summary>
    /// Get defaults from appsettings.json (without overrides)
    /// </summary>
    [HttpGet("defaults")]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    public ActionResult<FeatureFlagsDto> GetDefaults()
    {
        return Ok(FeatureFlagsDto.FromConfig(_defaultConfig));
    }

    private FeatureFlagsDto GetMergedFlags()
    {
        // Start with defaults from appsettings.json
        var result = FeatureFlagsDto.FromConfig(_defaultConfig);

        // If override file exists, merge those values
        if (System.IO.File.Exists(_overrideFilePath))
        {
            try
            {
                var json = System.IO.File.ReadAllText(_overrideFilePath);
                var overrides = JsonSerializer.Deserialize<FeatureFlagsDto>(json, JsonOptions);

                if (overrides != null)
                {
                    // Override file completely replaces defaults
                    result = overrides;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to read feature flag overrides, using defaults");
            }
        }

        return result;
    }
}

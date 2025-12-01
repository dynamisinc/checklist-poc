using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ChecklistAPI.Data;
using ChecklistAPI.Models.Configuration;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Controllers;

/// <summary>
/// API controller for managing feature flags.
/// Returns merged flags from appsettings.json defaults and database overrides.
/// Admin can update overrides which persist in the database for all users.
///
/// Flag states: "Hidden", "ComingSoon", "Active"
/// </summary>
[ApiController]
[Route("api/config/[controller]")]
public class FeatureFlagsController : ControllerBase
{
    private readonly FeatureFlagsConfig _defaultConfig;
    private readonly ChecklistDbContext _context;
    private readonly ILogger<FeatureFlagsController> _logger;

    public FeatureFlagsController(
        IOptions<FeatureFlagsConfig> defaultConfig,
        ChecklistDbContext context,
        ILogger<FeatureFlagsController> logger)
    {
        _defaultConfig = defaultConfig.Value;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get current feature flags (merged defaults + database overrides)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<FeatureFlagsDto>> GetFeatureFlags()
    {
        var merged = await GetMergedFlagsAsync();
        _logger.LogDebug("Returning feature flags: {@Flags}", merged);
        return Ok(merged);
    }

    /// <summary>
    /// Update feature flag overrides (admin only - persists to database)
    /// </summary>
    [HttpPut]
    [ProducesResponseType(typeof(FeatureFlagsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<FeatureFlagsDto>> UpdateFeatureFlags([FromBody] FeatureFlagsDto flags)
    {
        try
        {
            var currentUser = HttpContext.Items["UserEmail"]?.ToString() ?? "system";
            var now = DateTime.UtcNow;

            // Convert DTO to dictionary for easier processing
            var flagValues = new Dictionary<string, string>
            {
                { "Checklist", flags.Checklist },
                { "Chat", flags.Chat },
                { "Tasking", flags.Tasking },
                { "CobraKai", flags.CobraKai },
                { "EventSummary", flags.EventSummary },
                { "StatusChart", flags.StatusChart },
                { "EventTimeline", flags.EventTimeline },
                { "CobraAi", flags.CobraAi }
            };

            // Validate all states
            foreach (var kvp in flagValues)
            {
                if (!FeatureFlagsDto.IsValidState(kvp.Value))
                {
                    return BadRequest(new { message = $"Invalid state '{kvp.Value}' for flag '{kvp.Key}'. Valid states: Hidden, ComingSoon, Active" });
                }
            }

            // Get existing overrides
            var existingOverrides = await _context.FeatureFlagOverrides.ToListAsync();
            var existingDict = existingOverrides.ToDictionary(o => o.FlagName);

            foreach (var kvp in flagValues)
            {
                if (existingDict.TryGetValue(kvp.Key, out var existing))
                {
                    // Update existing
                    existing.State = kvp.Value;
                    existing.ModifiedAt = now;
                    existing.ModifiedBy = currentUser;
                }
                else
                {
                    // Insert new
                    _context.FeatureFlagOverrides.Add(new FeatureFlagOverride
                    {
                        FlagName = kvp.Key,
                        State = kvp.Value,
                        ModifiedAt = now,
                        ModifiedBy = currentUser
                    });
                }
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Feature flags updated by {User}: {@Flags}", currentUser, flags);

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
    public async Task<ActionResult<FeatureFlagsDto>> ResetToDefaults()
    {
        try
        {
            var overrides = await _context.FeatureFlagOverrides.ToListAsync();
            _context.FeatureFlagOverrides.RemoveRange(overrides);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Feature flag overrides reset to defaults");

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

    private async Task<FeatureFlagsDto> GetMergedFlagsAsync()
    {
        // Start with defaults from appsettings.json
        var result = FeatureFlagsDto.FromConfig(_defaultConfig);

        // Get overrides from database
        var overrides = await _context.FeatureFlagOverrides.ToListAsync();

        if (overrides.Count > 0)
        {
            var overrideDict = overrides.ToDictionary(o => o.FlagName, o => o.State);

            // Apply overrides
            if (overrideDict.TryGetValue("Checklist", out var checklist))
                result.Checklist = checklist;
            if (overrideDict.TryGetValue("Chat", out var chat))
                result.Chat = chat;
            if (overrideDict.TryGetValue("Tasking", out var tasking))
                result.Tasking = tasking;
            if (overrideDict.TryGetValue("CobraKai", out var cobraKai))
                result.CobraKai = cobraKai;
            if (overrideDict.TryGetValue("EventSummary", out var eventSummary))
                result.EventSummary = eventSummary;
            if (overrideDict.TryGetValue("StatusChart", out var statusChart))
                result.StatusChart = statusChart;
            if (overrideDict.TryGetValue("EventTimeline", out var eventTimeline))
                result.EventTimeline = eventTimeline;
            if (overrideDict.TryGetValue("CobraAi", out var cobraAi))
                result.CobraAi = cobraAi;
        }

        return result;
    }
}

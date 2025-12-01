namespace ChecklistAPI.Models.Entities;

/// <summary>
/// Stores admin overrides for feature flags.
/// These override the defaults from appsettings.json.
/// </summary>
public class FeatureFlagOverride
{
    /// <summary>
    /// Flag name (e.g., "Checklist", "Chat", "Tasking")
    /// </summary>
    public required string FlagName { get; set; }

    /// <summary>
    /// Feature state: "Hidden", "ComingSoon", or "Active"
    /// </summary>
    public required string State { get; set; }

    /// <summary>
    /// When this override was last modified
    /// </summary>
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Who modified this override (for audit trail)
    /// </summary>
    public string ModifiedBy { get; set; } = string.Empty;
}

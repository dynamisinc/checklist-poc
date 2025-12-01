namespace ChecklistAPI.Models.Configuration;

/// <summary>
/// Feature flag states for POC tool visibility
/// </summary>
public enum FeatureFlagState
{
    /// <summary>Tool is hidden from sidebar</summary>
    Hidden = 0,
    /// <summary>Tool is visible but disabled with "Coming Soon" badge</summary>
    ComingSoon = 1,
    /// <summary>Tool is fully active and functional</summary>
    Active = 2
}

/// <summary>
/// Feature flags configuration for controlling POC tool visibility.
/// Loaded from appsettings.json FeatureFlags section.
/// Admin UI can override these defaults via database.
/// </summary>
public class FeatureFlagsConfig
{
    public const string SectionName = "FeatureFlags";

    /// <summary>
    /// Checklist tool - create and manage operational checklists
    /// </summary>
    public string Checklist { get; set; } = "Active";

    /// <summary>
    /// External Chat integration - GroupMe/messaging platform integration
    /// </summary>
    public string Chat { get; set; } = "ComingSoon";

    /// <summary>
    /// Tasking tool - task assignment and tracking
    /// </summary>
    public string Tasking { get; set; } = "ComingSoon";

    /// <summary>
    /// COBRA KAI - knowledge and intelligence assistant
    /// </summary>
    public string CobraKai { get; set; } = "ComingSoon";

    /// <summary>
    /// Event Summary - event overview and reporting
    /// </summary>
    public string EventSummary { get; set; } = "ComingSoon";

    /// <summary>
    /// Status Chart - visual status tracking
    /// </summary>
    public string StatusChart { get; set; } = "ComingSoon";

    /// <summary>
    /// Event Timeline - chronological event view
    /// </summary>
    public string EventTimeline { get; set; } = "ComingSoon";

    /// <summary>
    /// COBRA AI - AI-powered assistance
    /// </summary>
    public string CobraAi { get; set; } = "ComingSoon";
}

/// <summary>
/// DTO for returning feature flags to the frontend.
/// Uses string values: "Hidden", "ComingSoon", "Active"
/// </summary>
public class FeatureFlagsDto
{
    public string Checklist { get; set; } = "Active";
    public string Chat { get; set; } = "ComingSoon";
    public string Tasking { get; set; } = "ComingSoon";
    public string CobraKai { get; set; } = "ComingSoon";
    public string EventSummary { get; set; } = "ComingSoon";
    public string StatusChart { get; set; } = "ComingSoon";
    public string EventTimeline { get; set; } = "ComingSoon";
    public string CobraAi { get; set; } = "ComingSoon";

    public static FeatureFlagsDto FromConfig(FeatureFlagsConfig config)
    {
        return new FeatureFlagsDto
        {
            Checklist = config.Checklist,
            Chat = config.Chat,
            Tasking = config.Tasking,
            CobraKai = config.CobraKai,
            EventSummary = config.EventSummary,
            StatusChart = config.StatusChart,
            EventTimeline = config.EventTimeline,
            CobraAi = config.CobraAi
        };
    }

    /// <summary>
    /// Valid state values
    /// </summary>
    public static readonly string[] ValidStates = { "Hidden", "ComingSoon", "Active" };

    /// <summary>
    /// Check if a state value is valid
    /// </summary>
    public static bool IsValidState(string state) =>
        ValidStates.Contains(state, StringComparer.OrdinalIgnoreCase);
}

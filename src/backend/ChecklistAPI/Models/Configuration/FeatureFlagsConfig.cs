namespace ChecklistAPI.Models.Configuration;

/// <summary>
/// Feature flags configuration for controlling POC tool visibility.
/// Loaded from appsettings.json FeatureFlags section.
/// Admin UI can override these defaults via localStorage on the frontend.
/// </summary>
public class FeatureFlagsConfig
{
    public const string SectionName = "FeatureFlags";

    /// <summary>
    /// Checklist tool - create and manage operational checklists
    /// </summary>
    public bool Checklist { get; set; } = true;

    /// <summary>
    /// External Chat integration - GroupMe/messaging platform integration
    /// </summary>
    public bool Chat { get; set; } = false;

    /// <summary>
    /// Tasking tool - task assignment and tracking
    /// </summary>
    public bool Tasking { get; set; } = false;

    /// <summary>
    /// COBRA KAI - knowledge and intelligence assistant
    /// </summary>
    public bool CobraKai { get; set; } = false;

    /// <summary>
    /// Event Summary - event overview and reporting
    /// </summary>
    public bool EventSummary { get; set; } = false;

    /// <summary>
    /// Status Chart - visual status tracking
    /// </summary>
    public bool StatusChart { get; set; } = false;

    /// <summary>
    /// Event Timeline - chronological event view
    /// </summary>
    public bool EventTimeline { get; set; } = false;

    /// <summary>
    /// COBRA AI - AI-powered assistance
    /// </summary>
    public bool CobraAi { get; set; } = false;
}

/// <summary>
/// DTO for returning feature flags to the frontend
/// </summary>
public class FeatureFlagsDto
{
    public bool Checklist { get; set; }
    public bool Chat { get; set; }
    public bool Tasking { get; set; }
    public bool CobraKai { get; set; }
    public bool EventSummary { get; set; }
    public bool StatusChart { get; set; }
    public bool EventTimeline { get; set; }
    public bool CobraAi { get; set; }

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
}

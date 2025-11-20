namespace ChecklistAPI.Models;

/// <summary>
/// Represents a single status option for status-type checklist items
/// Used in JSON configuration stored in StatusConfiguration field
/// </summary>
public class StatusOption
{
    /// <summary>
    /// The display label for this status option (e.g., "Not Started", "Complete")
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Whether this status counts as "complete" for progress calculation
    /// </summary>
    public bool IsCompletion { get; set; } = false;

    /// <summary>
    /// Display order in the status dropdown (lower numbers appear first)
    /// </summary>
    public int Order { get; set; }
}

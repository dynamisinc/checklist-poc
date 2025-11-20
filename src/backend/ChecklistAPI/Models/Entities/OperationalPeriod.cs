namespace ChecklistAPI.Models.Entities;

/// <summary>
/// Operational Period - time-based work shifts during an incident
///
/// OPTIONAL: Not all organizations use operational periods. When used, they divide
/// incident response into manageable time blocks (e.g., 12-hour shifts).
///
/// Examples:
/// - "OP 1 - 12/20 0600-1800" (Day shift)
/// - "OP 2 - 12/20 1800-0600" (Night shift)
/// - "Morning Briefing Period"
/// </summary>
public class OperationalPeriod
{
    public Guid Id { get; set; }

    /// <summary>
    /// The event this operational period belongs to
    /// </summary>
    public string EventId { get; set; } = string.Empty;

    /// <summary>
    /// Display name (e.g., "OP 1 - 12/20 0600-1800")
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Period start time (UTC)
    /// </summary>
    public DateTime StartTime { get; set; }

    /// <summary>
    /// Period end time (UTC). NULL = still active/no end time set
    /// </summary>
    public DateTime? EndTime { get; set; }

    /// <summary>
    /// Is this the current operational period for the event?
    /// Only one period per event should have IsCurrent = true
    /// </summary>
    public bool IsCurrent { get; set; } = false;

    /// <summary>
    /// Optional description/notes about this operational period
    /// </summary>
    public string? Description { get; set; }

    // Soft delete fields
    public bool IsArchived { get; set; } = false;
    public string? ArchivedBy { get; set; }
    public DateTime? ArchivedAt { get; set; }

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }

    // Navigation properties
    // NOTE: Event navigation not added yet (Event entity doesn't exist in POC)
    public ICollection<ChecklistInstance> Checklists { get; set; } = new List<ChecklistInstance>();
}

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// ChecklistInstanceDto - Data transfer object for active checklists
///
/// Purpose:
///   Represents an active checklist created from a template.
///   Used for API responses when returning checklist data.
///
/// Checklist Lifecycle:
///   1. Created from a Template by a user
///   2. Associated with an Event and optionally an Operational Period
///   3. Items are checked off or status updated during incident response
///   4. Progress is automatically tracked
///   5. Can be archived when incident is closed
///
/// Progress Tracking:
///   - ProgressPercentage: Overall completion (0-100)
///   - TotalItems: Total number of items in checklist
///   - CompletedItems: Number of items completed
///   - RequiredItems: Number of required items
///   - RequiredItemsCompleted: Number of required items completed
///
/// Position-Based Filtering:
///   - AssignedPositions field determines visibility
///   - Null = visible to all positions
///   - Comma-separated list = visible only to those positions
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public record ChecklistInstanceDto
{
    /// <summary>
    /// Unique identifier for this checklist instance
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Checklist name (usually copied from template, but can be customized)
    /// Example: "Daily Safety Briefing - Nov 20, 2025"
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Template this checklist was created from
    /// Used to link back to original template
    /// </summary>
    public Guid TemplateId { get; init; }

    /// <summary>
    /// Event this checklist belongs to
    /// Example: "Hurricane-2025-001"
    /// </summary>
    public string EventId { get; init; } = string.Empty;

    /// <summary>
    /// Human-readable event name
    /// Example: "Hurricane Milton Response"
    /// </summary>
    public string EventName { get; init; } = string.Empty;

    /// <summary>
    /// Operational period this checklist belongs to (optional)
    /// Foreign key to OperationalPeriod entity
    /// Null for incident-level checklists
    /// </summary>
    public Guid? OperationalPeriodId { get; init; }

    /// <summary>
    /// Human-readable operational period name (optional)
    /// Example: "Nov 20, 2025 - Day Shift"
    /// </summary>
    public string? OperationalPeriodName { get; init; }

    /// <summary>
    /// Comma-separated list of ICS positions that can see this checklist
    /// Example: "Incident Commander,Safety Officer"
    /// Null = visible to all positions
    /// </summary>
    public string? AssignedPositions { get; init; }

    /// <summary>
    /// Overall completion percentage (0-100)
    /// Calculated as: (CompletedItems / TotalItems) * 100
    /// </summary>
    public decimal ProgressPercentage { get; init; }

    /// <summary>
    /// Total number of items in this checklist
    /// </summary>
    public int TotalItems { get; init; }

    /// <summary>
    /// Number of items marked complete
    /// </summary>
    public int CompletedItems { get; init; }

    /// <summary>
    /// Number of items marked as required
    /// </summary>
    public int RequiredItems { get; init; }

    /// <summary>
    /// Number of required items marked complete
    /// Critical for tracking mandatory tasks
    /// </summary>
    public int RequiredItemsCompleted { get; init; }

    /// <summary>
    /// Whether checklist is archived (soft delete)
    /// Archived checklists are hidden from active lists
    /// </summary>
    public bool IsArchived { get; init; }

    /// <summary>
    /// User who archived this checklist
    /// Example: "admin@cobra.mil"
    /// </summary>
    public string? ArchivedBy { get; init; }

    /// <summary>
    /// When this checklist was archived (UTC)
    /// Null if not archived
    /// </summary>
    public DateTime? ArchivedAt { get; init; }

    /// <summary>
    /// User who created this checklist
    /// Example: "ops.chief@cobra.mil"
    /// </summary>
    public string CreatedBy { get; init; } = string.Empty;

    /// <summary>
    /// Position of user who created this checklist
    /// Example: "Operations Section Chief"
    /// </summary>
    public string CreatedByPosition { get; init; } = string.Empty;

    /// <summary>
    /// When this checklist was created (UTC)
    /// </summary>
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// User who last modified this checklist
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedBy { get; init; }

    /// <summary>
    /// Position of user who last modified
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedByPosition { get; init; }

    /// <summary>
    /// When this checklist was last modified (UTC)
    /// Null if never modified after creation
    /// </summary>
    public DateTime? LastModifiedAt { get; init; }

    /// <summary>
    /// Collection of items in this checklist
    /// Ordered by DisplayOrder
    /// </summary>
    public List<ChecklistItemDto> Items { get; init; } = new();

    /// <summary>
    /// Number of items in this checklist (computed)
    /// Useful for displaying counts without loading all items
    /// Should match TotalItems
    /// </summary>
    public int ItemCount => Items.Count;

    /// <summary>
    /// Whether all required items are completed (computed)
    /// True if RequiredItemsCompleted == RequiredItems
    /// </summary>
    public bool AllRequiredItemsCompleted => RequiredItems > 0 && RequiredItemsCompleted == RequiredItems;
}

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// ChecklistItemDto - Data transfer object for checklist items
///
/// Purpose:
///   Represents an individual item within an active checklist.
///   Items are copied from template items when checklist is created.
///   Used for API responses when returning item data.
///
/// Item Types:
///   - "checkbox": Simple yes/no completion (IsCompleted field)
///   - "status": Dropdown with multiple status options (CurrentStatus field)
///
/// Checkbox Type Fields:
///   - IsCompleted: true/false/null
///   - CompletedBy: User who checked the box
///   - CompletedByPosition: Position of user who checked
///   - CompletedAt: Timestamp of completion
///
/// Status Type Fields:
///   - CurrentStatus: Selected status value
///   - StatusConfiguration: JSON array of status options with completion flags
///   - Example: [{"label":"Complete","isCompletion":true,"order":1}, ...]
///
/// Position-Based Access:
///   - AllowedPositions: Comma-separated list of positions that can modify item
///   - Null = all positions can modify
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public record ChecklistItemDto
{
    /// <summary>
    /// Unique identifier for this checklist item
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Checklist this item belongs to
    /// </summary>
    public Guid ChecklistInstanceId { get; init; }

    /// <summary>
    /// Template item this was copied from
    /// Used to link back to original template item
    /// </summary>
    public Guid TemplateItemId { get; init; }

    /// <summary>
    /// Text of the checklist item
    /// Example: "Verify all personnel are wearing PPE"
    /// </summary>
    public string ItemText { get; init; } = string.Empty;

    /// <summary>
    /// Type of item: "checkbox" or "status"
    /// - checkbox: Simple yes/no completion
    /// - status: Dropdown with multiple options
    /// </summary>
    public string ItemType { get; init; } = string.Empty;

    /// <summary>
    /// Display order (ascending)
    /// Items are sorted by this value
    /// Example: 10, 20, 30 (allows inserting new items between)
    /// </summary>
    public int DisplayOrder { get; init; }

    /// <summary>
    /// Whether this item is required
    /// Required items must be completed for checklist to be considered complete
    /// </summary>
    public bool IsRequired { get; init; }

    /// <summary>
    /// Whether checkbox is completed (checkbox items only)
    /// Null = not completed, True = completed, False = explicitly marked as not complete
    /// </summary>
    public bool? IsCompleted { get; init; }

    /// <summary>
    /// User who completed this item (checkbox items only)
    /// Example: "safety.officer@cobra.mil"
    /// </summary>
    public string? CompletedBy { get; init; }

    /// <summary>
    /// Position of user who completed this item (checkbox items only)
    /// Example: "Safety Officer"
    /// </summary>
    public string? CompletedByPosition { get; init; }

    /// <summary>
    /// When this item was completed (UTC) (checkbox items only)
    /// </summary>
    public DateTime? CompletedAt { get; init; }

    /// <summary>
    /// Current status value (status items only)
    /// Must be one of the values in StatusOptions
    /// Example: "In Progress", "Complete"
    /// </summary>
    public string? CurrentStatus { get; init; }

    /// <summary>
    /// JSON configuration of status options with completion flags (status items only)
    /// Example: "[{\"label\":\"Complete\",\"isCompletion\":true,\"order\":1}, ...]"
    /// </summary>
    public string? StatusConfiguration { get; init; }

    /// <summary>
    /// Comma-separated list of positions allowed to modify this item
    /// Example: "Safety Officer,Incident Commander"
    /// Null = all positions can modify
    /// </summary>
    public string? AllowedPositions { get; init; }

    /// <summary>
    /// Notes or comments about this item
    /// Example: "Verified with Safety Officer at 14:30"
    /// </summary>
    public string? Notes { get; init; }

    /// <summary>
    /// When this item was created (UTC)
    /// </summary>
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// User who last modified this item
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedBy { get; init; }

    /// <summary>
    /// Position of user who last modified
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedByPosition { get; init; }

    /// <summary>
    /// When this item was last modified (UTC)
    /// Null if never modified after creation
    /// </summary>
    public DateTime? LastModifiedAt { get; init; }
}

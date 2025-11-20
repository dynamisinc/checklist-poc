namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// TemplateItemDto - Data transfer object for template items
///
/// Purpose:
///   Represents a single item within a checklist template.
///   Used for API responses when returning template data.
///
/// Item Types:
///   - "checkbox": Simple yes/no completion
///   - "status": Dropdown with custom status options
///
/// Display Order:
///   Items are sorted by DisplayOrder when presenting to users.
///   Lower numbers appear first (10, 20, 30...).
///
/// Status Configuration (for "status" type):
///   Stored as JSON array with completion flags:
///   [{"label":"Not Started","isCompletion":false,"order":1}, ...]
///   Null for "checkbox" type items.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public record TemplateItemDto
{
    /// <summary>
    /// Unique identifier for this template item
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// ID of the parent template
    /// </summary>
    public Guid TemplateId { get; init; }

    /// <summary>
    /// The text/description of the checklist item
    /// Example: "Verify all personnel have safety equipment"
    /// </summary>
    public string ItemText { get; init; } = string.Empty;

    /// <summary>
    /// Type of item: "checkbox" or "status"
    /// </summary>
    public string ItemType { get; init; } = string.Empty;

    /// <summary>
    /// Display order for sorting (10, 20, 30, etc.)
    /// </summary>
    public int DisplayOrder { get; init; }

    /// <summary>
    /// Whether this item is required to complete the checklist
    /// </summary>
    public bool IsRequired { get; init; }

    /// <summary>
    /// For "status" type items: JSON array of status options with completion flags
    /// Example: [{"label":"Complete","isCompletion":true,"order":1}, ...]
    /// Null for "checkbox" type items
    /// </summary>
    public string? StatusConfiguration { get; init; }

    /// <summary>
    /// Positions allowed to interact with this item (JSON array)
    /// Null means all positions allowed
    /// </summary>
    public string? AllowedPositions { get; init; }

    /// <summary>
    /// Optional default notes/instructions for this item
    /// </summary>
    public string? DefaultNotes { get; init; }
}

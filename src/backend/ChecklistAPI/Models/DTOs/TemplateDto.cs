namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// TemplateDto - Data transfer object for checklist templates
///
/// Purpose:
///   Represents a complete checklist template with all its items.
///   Used for API responses when returning template data.
///
/// Template Lifecycle:
///   1. Created by admin users (IsActive = true, IsArchived = false)
///   2. Used to create ChecklistInstances
///   3. Can be deactivated (IsActive = false) to hide from template library
///   4. Can be archived (IsArchived = true) for historical record
///
/// Categories:
///   - "ICS Forms" - Standard ICS documentation
///   - "Safety" - Safety protocols and briefings
///   - "Operations" - Operational checklists
///   - "Logistics" - Resource and supply tracking
///   - "Planning" - Planning section checklists
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public record TemplateDto
{
    /// <summary>
    /// Unique identifier for this template
    /// </summary>
    public Guid Id { get; init; }

    /// <summary>
    /// Template name displayed in template library
    /// Example: "Daily Safety Briefing", "Incident Commander Initial Actions"
    /// </summary>
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Detailed description of template purpose and usage
    /// Example: "Use this checklist at the start of each operational period..."
    /// </summary>
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Category for organizing templates
    /// Example: "Safety", "ICS Forms", "Operations"
    /// </summary>
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Comma-separated or JSON array of tags for searchability
    /// Example: "hurricane, shelter, daily"
    /// </summary>
    public string Tags { get; init; } = string.Empty;

    /// <summary>
    /// Whether template is available for creating new checklists
    /// Inactive templates are hidden from template library
    /// </summary>
    public bool IsActive { get; init; }

    /// <summary>
    /// Whether template is archived (soft delete)
    /// Archived templates are not shown in any lists
    /// </summary>
    public bool IsArchived { get; init; }

    /// <summary>
    /// User who created this template
    /// Example: "admin@cobra.mil"
    /// </summary>
    public string CreatedBy { get; init; } = string.Empty;

    /// <summary>
    /// Position of user who created this template
    /// Example: "Incident Commander"
    /// </summary>
    public string CreatedByPosition { get; init; } = string.Empty;

    /// <summary>
    /// When this template was created (UTC)
    /// </summary>
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// User who last modified this template
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedBy { get; init; }

    /// <summary>
    /// Position of user who last modified
    /// Null if never modified after creation
    /// </summary>
    public string? LastModifiedByPosition { get; init; }

    /// <summary>
    /// When this template was last modified (UTC)
    /// Null if never modified after creation
    /// </summary>
    public DateTime? LastModifiedAt { get; init; }

    /// <summary>
    /// User who archived this template
    /// Null if not archived
    /// </summary>
    public string? ArchivedBy { get; init; }

    /// <summary>
    /// When this template was archived (UTC)
    /// Null if not archived
    /// </summary>
    public DateTime? ArchivedAt { get; init; }

    /// <summary>
    /// Collection of items in this template
    /// Ordered by DisplayOrder
    /// </summary>
    public List<TemplateItemDto> Items { get; init; } = new();

    /// <summary>
    /// Number of items in this template (computed)
    /// Useful for displaying in template library without loading all items
    /// </summary>
    public int ItemCount => Items.Count;
}

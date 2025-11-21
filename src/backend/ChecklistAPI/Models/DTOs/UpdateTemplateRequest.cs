using System.ComponentModel.DataAnnotations;
using ChecklistAPI.Models.Enums;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// UpdateTemplateRequest - Request DTO for updating existing templates
///
/// Purpose:
///   Captures data for updating an existing template.
///   Used by PUT /api/templates/{id} endpoint.
///
/// Important:
///   - Template ID comes from route parameter, not request body
///   - Only modifiable fields are included (not audit fields)
///   - LastModifiedBy/Position set automatically from UserContext
///   - Updating items requires full replacement (PUT semantics)
///
/// Validation Rules:
///   Same as CreateTemplateRequest
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public record UpdateTemplateRequest
{
    /// <summary>
    /// Template name displayed in template library
    /// Example: "Daily Safety Briefing", "Incident Commander Initial Actions"
    /// </summary>
    [Required(ErrorMessage = "Template name is required")]
    [MaxLength(200, ErrorMessage = "Template name cannot exceed 200 characters")]
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Detailed description of template purpose and usage
    /// </summary>
    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Category for organizing templates
    /// </summary>
    [Required(ErrorMessage = "Category is required")]
    [MaxLength(50, ErrorMessage = "Category cannot exceed 50 characters")]
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Comma-separated or JSON array of tags
    /// </summary>
    [MaxLength(500, ErrorMessage = "Tags cannot exceed 500 characters")]
    public string Tags { get; init; } = string.Empty;

    /// <summary>
    /// Whether template is available for creating new checklists
    /// Set to false to hide from template library
    /// </summary>
    public bool IsActive { get; init; } = true;

    /// <summary>
    /// Template type - determines how checklist instances are created
    /// </summary>
    public TemplateType? TemplateType { get; init; }

    /// <summary>
    /// JSON array of incident categories that trigger auto-creation
    /// Only used when TemplateType = AutoCreate
    /// </summary>
    [MaxLength(1000, ErrorMessage = "AutoCreateForCategories cannot exceed 1000 characters")]
    public string? AutoCreateForCategories { get; init; }

    /// <summary>
    /// JSON configuration for recurring template schedule
    /// Only used when TemplateType = Recurring (future feature)
    /// </summary>
    [MaxLength(2000, ErrorMessage = "RecurrenceConfig cannot exceed 2000 characters")]
    public string? RecurrenceConfig { get; init; }

    /// <summary>
    /// JSON array of ICS positions this template is recommended for
    /// Used for smart suggestions to match user's position
    /// Example: ["Safety Officer", "Operations Section Chief"]
    /// </summary>
    [MaxLength(1000, ErrorMessage = "RecommendedPositions cannot exceed 1000 characters")]
    public string? RecommendedPositions { get; init; }

    /// <summary>
    /// JSON array of event categories this template is suited for
    /// Used for smart suggestions to match event type
    /// Example: ["Fire", "Flood", "Hurricane"]
    /// </summary>
    [MaxLength(1000, ErrorMessage = "EventCategories cannot exceed 1000 characters")]
    public string? EventCategories { get; init; }

    /// <summary>
    /// Complete replacement of template items
    /// PUT semantics: send all items, old items will be replaced
    /// </summary>
    public List<CreateTemplateItemRequest> Items { get; init; } = new();
}

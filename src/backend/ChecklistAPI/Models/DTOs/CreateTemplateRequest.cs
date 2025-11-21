using System.ComponentModel.DataAnnotations;
using ChecklistAPI.Models.Enums;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// CreateTemplateRequest - Request DTO for creating new templates
///
/// Purpose:
///   Captures all data needed to create a complete checklist template
///   including its items. Used by POST /api/templates endpoint.
///
/// Validation Rules:
///   - Name: Required, max 200 characters
///   - Description: Optional, max 1000 characters
///   - Category: Required, max 50 characters
///   - Tags: Optional, max 500 characters
///   - Items: Optional, but template with no items is not useful
///
/// User Attribution:
///   CreatedBy and CreatedByPosition are NOT in this request.
///   They are automatically populated from UserContext by the service layer.
///   This ensures FEMA audit compliance.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public record CreateTemplateRequest
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
    /// Example: "Use this checklist at the start of each operational period..."
    /// </summary>
    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string Description { get; init; } = string.Empty;

    /// <summary>
    /// Category for organizing templates
    /// Example: "Safety", "ICS Forms", "Operations", "Logistics", "Planning"
    /// </summary>
    [Required(ErrorMessage = "Category is required")]
    [MaxLength(50, ErrorMessage = "Category cannot exceed 50 characters")]
    public string Category { get; init; } = string.Empty;

    /// <summary>
    /// Comma-separated or JSON array of tags for searchability
    /// Example: "hurricane, shelter, daily"
    /// </summary>
    [MaxLength(500, ErrorMessage = "Tags cannot exceed 500 characters")]
    public string Tags { get; init; } = string.Empty;

    /// <summary>
    /// Template type - determines how checklist instances are created
    /// Defaults to Manual if not specified
    /// </summary>
    public TemplateType? TemplateType { get; init; }

    /// <summary>
    /// JSON array of incident categories that trigger auto-creation
    /// Only used when TemplateType = AutoCreate
    /// Example: ["Hurricane", "Flood", "Wildfire"]
    /// </summary>
    [MaxLength(1000, ErrorMessage = "AutoCreateForCategories cannot exceed 1000 characters")]
    public string? AutoCreateForCategories { get; init; }

    /// <summary>
    /// JSON configuration for recurring template schedule
    /// Only used when TemplateType = Recurring
    /// Future feature - not yet implemented
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
    /// Collection of items to create with this template
    /// Can be empty, but template won't be very useful
    /// </summary>
    public List<CreateTemplateItemRequest> Items { get; init; } = new();
}

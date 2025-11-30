using System.ComponentModel.DataAnnotations;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// CreateEventRequest - Request DTO for creating a new event
///
/// Required fields:
///   - Name: Event display name
///   - EventType: "PLANNED" or "UNPLANNED"
///   - PrimaryCategoryId: Must match EventType
///
/// Optional fields:
///   - AdditionalCategoryIds: For multi-category events
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-29
/// </summary>
public record CreateEventRequest
{
    /// <summary>
    /// Event name for display
    /// Example: "Hurricane Milton Response", "July 4th Parade Detail"
    /// </summary>
    [Required(ErrorMessage = "Event name is required")]
    [StringLength(200, MinimumLength = 3, ErrorMessage = "Name must be 3-200 characters")]
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Event type: "Planned" or "Unplanned" (case-insensitive)
    /// </summary>
    [Required(ErrorMessage = "Event type is required")]
    [RegularExpression("^(PLANNED|UNPLANNED|Planned|Unplanned|planned|unplanned)$", ErrorMessage = "Event type must be Planned or Unplanned")]
    public string EventType { get; init; } = string.Empty;

    /// <summary>
    /// Primary category ID - must be a valid category matching the EventType
    /// </summary>
    [Required(ErrorMessage = "Primary category is required")]
    public Guid PrimaryCategoryId { get; init; }

    /// <summary>
    /// Optional additional category IDs for multi-category events
    /// Example: Hurricane event might also have Flood and Power Outage categories
    /// </summary>
    public List<Guid>? AdditionalCategoryIds { get; init; }
}

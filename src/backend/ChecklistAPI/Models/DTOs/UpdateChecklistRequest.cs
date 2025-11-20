using System.ComponentModel.DataAnnotations;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// UpdateChecklistRequest - Request DTO for updating checklist metadata
///
/// Purpose:
///   Updates checklist metadata like name, event, operational period.
///   Does NOT update items (use item-specific endpoints for that).
///   Used by PUT /api/checklists/{id} endpoint.
///
/// What This Updates:
///   - Name: Checklist display name
///   - EventId/EventName: Event association
///   - OperationalPeriodId/OperationalPeriodName: Op period association
///   - AssignedPositions: Visibility control
///
/// What This Does NOT Update:
///   - Items: Use PATCH /api/checklists/{id}/items/{itemId} endpoints
///   - Progress tracking: Auto-calculated when items change
///   - Audit fields: Auto-populated from UserContext
///
/// Validation Rules:
///   - Name: Required, max 200 characters
///   - EventId: Required, max 100 characters
///   - EventName: Required, max 200 characters
///   - OperationalPeriodId: Optional, max 100 characters
///   - OperationalPeriodName: Optional, max 200 characters
///   - AssignedPositions: Optional, max 500 characters
///
/// User Attribution:
///   LastModifiedBy and LastModifiedByPosition are NOT in this request.
///   They are automatically populated from UserContext by the service layer.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public record UpdateChecklistRequest
{
    /// <summary>
    /// Checklist name
    /// Example: "Daily Safety Briefing - Nov 20, 2025 (Updated)"
    /// </summary>
    [Required(ErrorMessage = "Checklist name is required")]
    [MaxLength(200, ErrorMessage = "Checklist name cannot exceed 200 characters")]
    public string Name { get; init; } = string.Empty;

    /// <summary>
    /// Event this checklist belongs to
    /// Example: "Hurricane-2025-001"
    /// </summary>
    [Required(ErrorMessage = "Event ID is required")]
    [MaxLength(100, ErrorMessage = "Event ID cannot exceed 100 characters")]
    public string EventId { get; init; } = string.Empty;

    /// <summary>
    /// Human-readable event name
    /// Example: "Hurricane Milton Response"
    /// </summary>
    [Required(ErrorMessage = "Event name is required")]
    [MaxLength(200, ErrorMessage = "Event name cannot exceed 200 characters")]
    public string EventName { get; init; } = string.Empty;

    /// <summary>
    /// Operational period this checklist belongs to (optional)
    /// Foreign key to OperationalPeriod entity
    /// Set to null to make incident-level
    /// </summary>
    public Guid? OperationalPeriodId { get; init; }

    /// <summary>
    /// Human-readable operational period name (optional)
    /// Example: "Nov 20, 2025 - Day Shift"
    /// </summary>
    [MaxLength(200, ErrorMessage = "Operational period name cannot exceed 200 characters")]
    public string? OperationalPeriodName { get; init; }

    /// <summary>
    /// Comma-separated list of ICS positions that can see this checklist (optional)
    /// Example: "Incident Commander,Safety Officer"
    /// Set to null to make visible to all positions
    /// </summary>
    [MaxLength(500, ErrorMessage = "Assigned positions cannot exceed 500 characters")]
    public string? AssignedPositions { get; init; }
}

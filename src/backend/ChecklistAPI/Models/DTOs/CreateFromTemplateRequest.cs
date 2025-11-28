using System.ComponentModel.DataAnnotations;

namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// CreateFromTemplateRequest - Request DTO for creating checklist from template
///
/// Purpose:
///   Captures all data needed to instantiate a checklist from a template.
///   Used by POST /api/checklists endpoint.
///
/// Business Logic:
///   1. Service retrieves the template and all its items
///   2. Creates ChecklistInstance with provided event/operational period
///   3. Copies all template items to checklist items
///   4. Initializes progress tracking (all items not completed)
///   5. Auto-populates CreatedBy/CreatedByPosition from UserContext
///
/// Validation Rules:
///   - TemplateId: Required, must exist
///   - Name: Optional, defaults to template name if not provided
///   - EventId: Required, max 100 characters
///   - EventName: Required, max 200 characters
///   - OperationalPeriodId: Optional, max 100 characters
///   - OperationalPeriodName: Optional, max 200 characters
///   - AssignedPositions: Optional, max 500 characters
///
/// User Attribution:
///   CreatedBy and CreatedByPosition are NOT in this request.
///   They are automatically populated from UserContext by the service layer.
///   This ensures FEMA audit compliance.
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public record CreateFromTemplateRequest
{
    /// <summary>
    /// Template to create checklist from
    /// Must be an active, non-archived template
    /// </summary>
    [Required(ErrorMessage = "Template ID is required")]
    public Guid TemplateId { get; init; }

    /// <summary>
    /// Name for this checklist (optional)
    /// If not provided, uses template name with timestamp
    /// Example: "Daily Safety Briefing - Nov 20, 2025"
    /// </summary>
    [MaxLength(200, ErrorMessage = "Checklist name cannot exceed 200 characters")]
    public string? Name { get; init; }

    /// <summary>
    /// Event this checklist belongs to (optional for POC)
    /// Example: "Hurricane-2025-001"
    /// Defaults to "POC-Event-001" if not provided
    /// </summary>
    [MaxLength(100, ErrorMessage = "Event ID cannot exceed 100 characters")]
    public string? EventId { get; init; }

    /// <summary>
    /// Human-readable event name (optional for POC)
    /// Example: "Hurricane Milton Response"
    /// Defaults to "POC Demo Event" if not provided
    /// </summary>
    [MaxLength(200, ErrorMessage = "Event name cannot exceed 200 characters")]
    public string? EventName { get; init; }

    /// <summary>
    /// Operational period this checklist belongs to (optional)
    /// Foreign key to OperationalPeriod entity
    /// Leave null for incident-level checklists
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
    /// Leave null to make visible to all positions
    /// </summary>
    [MaxLength(500, ErrorMessage = "Assigned positions cannot exceed 500 characters")]
    public string? AssignedPositions { get; init; }
}

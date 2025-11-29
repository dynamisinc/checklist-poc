namespace ChecklistAPI.Models;

/// <summary>
/// UserContext - Represents the current authenticated user's context
///
/// Purpose:
///   Provides user information for audit trails and authorization.
///   In POC mode, populated by MockUserMiddleware.
///   In production, would be populated from JWT/OAuth claims.
///
/// FEMA Compliance:
///   All database mutations must track CreatedBy and CreatedByPosition
///   for audit compliance. This class provides that information.
///
/// Usage:
///   Injected into controllers via HttpContext.Items["UserContext"]
///   Services receive UserContext as method parameters
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public class UserContext
{
    /// <summary>
    /// User's email address (unique identifier)
    /// Example: "admin@cobra.mil"
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// User's full name for display purposes
    /// Example: "John Smith"
    /// </summary>
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// User's ICS position title (primary position, first in the list)
    /// Example: "Incident Commander", "Operations Section Chief", "Safety Officer"
    /// </summary>
    public string Position { get; set; } = string.Empty;

    /// <summary>
    /// All ICS positions the user is assigned to (comma-separated in header, split into list)
    /// Used for filtering checklists - user sees checklists assigned to ANY of their positions
    /// Example: ["Safety Officer", "Operations Section Chief"]
    /// </summary>
    public List<string> Positions { get; set; } = new();

    /// <summary>
    /// Indicates if user has admin privileges (for template management)
    /// </summary>
    public bool IsAdmin { get; set; } = false;

    /// <summary>
    /// Current event ID user is working in (optional)
    /// Example: "Hurricane-Laura-2024"
    /// </summary>
    public string? CurrentEventId { get; set; }

    /// <summary>
    /// Current operational period (optional)
    /// Example: "2024-11-19 06:00 - 18:00"
    /// </summary>
    public string? CurrentOperationalPeriod { get; set; }
}

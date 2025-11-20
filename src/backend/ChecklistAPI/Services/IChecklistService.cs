using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Services;

/// <summary>
/// IChecklistService - Interface for checklist instance business logic operations
///
/// Purpose:
///   Defines the contract for checklist instance management operations.
///   Controllers call service methods, services orchestrate business logic.
///
/// Single Responsibility:
///   This service ONLY handles ChecklistInstance operations.
///   Template operations are in ITemplateService.
///   Individual item operations might be in IChecklistItemService (future).
///
/// Key Business Logic:
///   - Template Instantiation: Copy all items from template to new checklist
///   - Progress Tracking: Auto-calculate completion percentages
///   - Position-Based Filtering: Filter by AssignedPositions field
///   - Event Association: Associate checklists with events and operational periods
///
/// Dependency Injection:
///   Registered as scoped service in Program.cs:
///   builder.Services.AddScoped<IChecklistService, ChecklistService>();
///
/// Design Pattern:
///   - Interface for testability and loose coupling
///   - Services receive UserContext for audit trail
///   - Services throw exceptions, controllers handle HTTP responses
///   - All async for database operations
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public interface IChecklistService
{
    /// <summary>
    /// Get all checklists for the current user's position
    /// Filters by AssignedPositions field (null = all positions can see)
    /// Used by "My Checklists" page
    /// </summary>
    /// <param name="userContext">Current user context (position used for filtering)</param>
    /// <param name="includeArchived">If true, includes archived checklists (default: false)</param>
    /// <returns>List of checklists visible to this user's position</returns>
    Task<List<ChecklistInstanceDto>> GetMyChecklistsAsync(
        UserContext userContext,
        bool includeArchived = false);

    /// <summary>
    /// Get a single checklist by ID with all its items
    /// Used by Checklist Detail page
    /// </summary>
    /// <param name="id">Checklist GUID</param>
    /// <returns>Checklist with items, or null if not found</returns>
    Task<ChecklistInstanceDto?> GetChecklistByIdAsync(Guid id);

    /// <summary>
    /// Get all checklists for a specific event
    /// Used by Event Dashboard to show all checklists for an incident
    /// </summary>
    /// <param name="eventId">Event identifier</param>
    /// <param name="includeArchived">If true, includes archived checklists (default: false)</param>
    /// <returns>List of checklists for this event</returns>
    Task<List<ChecklistInstanceDto>> GetChecklistsByEventAsync(
        string eventId,
        bool includeArchived = false);

    /// <summary>
    /// Get all checklists for a specific operational period
    /// Used by Operational Period Dashboard
    /// </summary>
    /// <param name="eventId">Event identifier</param>
    /// <param name="operationalPeriodId">Operational period GUID</param>
    /// <param name="includeArchived">If true, includes archived checklists (default: false)</param>
    /// <returns>List of checklists for this operational period</returns>
    Task<List<ChecklistInstanceDto>> GetChecklistsByOperationalPeriodAsync(
        string eventId,
        Guid? operationalPeriodId,
        bool includeArchived = false);

    /// <summary>
    /// Create a new checklist from a template
    /// Copies all items from template to new checklist
    /// Initializes progress tracking (all items not completed)
    /// Automatically sets CreatedBy/CreatedByPosition from UserContext
    /// </summary>
    /// <param name="request">Checklist creation data (template, event, etc.)</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Newly created checklist with all items</returns>
    /// <exception cref="InvalidOperationException">If template not found or not active</exception>
    Task<ChecklistInstanceDto> CreateFromTemplateAsync(
        CreateFromTemplateRequest request,
        UserContext userContext);

    /// <summary>
    /// Update checklist metadata (name, event, operational period, positions)
    /// Does NOT update items (use item-specific endpoints)
    /// Automatically sets LastModifiedBy/LastModifiedByPosition
    /// </summary>
    /// <param name="id">Checklist ID to update</param>
    /// <param name="request">Updated checklist metadata</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Updated checklist, or null if not found</returns>
    Task<ChecklistInstanceDto?> UpdateChecklistAsync(
        Guid id,
        UpdateChecklistRequest request,
        UserContext userContext);

    /// <summary>
    /// Soft delete a checklist (set IsArchived = true)
    /// Archived checklists are hidden from all lists
    /// Used when incident is closed or checklist is no longer needed
    /// </summary>
    /// <param name="id">Checklist ID to archive</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>True if archived, false if not found</returns>
    Task<bool> ArchiveChecklistAsync(Guid id, UserContext userContext);

    /// <summary>
    /// Restore an archived checklist (set IsArchived = false)
    /// Admin-only operation to undelete archived checklists
    /// </summary>
    /// <param name="id">Checklist ID to restore</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>True if restored, false if not found</returns>
    Task<bool> RestoreChecklistAsync(Guid id, UserContext userContext);

    /// <summary>
    /// Get all archived checklists
    /// Admin-only operation to view archived checklists
    /// </summary>
    /// <returns>List of archived checklists</returns>
    Task<List<ChecklistInstanceDto>> GetArchivedChecklistsAsync();

    /// <summary>
    /// Recalculate progress for a checklist
    /// Called internally when items are completed/uncompleted
    /// Updates: ProgressPercentage, CompletedItems, RequiredItemsCompleted
    /// </summary>
    /// <param name="checklistId">Checklist ID to recalculate</param>
    /// <returns>Updated progress data</returns>
    Task RecalculateProgressAsync(Guid checklistId);

    /// <summary>
    /// Clone an existing checklist with a new name
    /// Useful for creating similar checklists for different operational periods
    /// Supports both "clean copy" (reset status) and "direct copy" (preserve status)
    /// </summary>
    /// <param name="id">Checklist ID to clone</param>
    /// <param name="newName">Name for the cloned checklist</param>
    /// <param name="preserveStatus">If true, preserves completion status and notes; if false, resets to fresh checklist</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Newly created cloned checklist</returns>
    Task<ChecklistInstanceDto?> CloneChecklistAsync(
        Guid id,
        string newName,
        bool preserveStatus,
        UserContext userContext);
}

using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Services;

/// <summary>
/// ITemplateService - Interface for template business logic operations
///
/// Purpose:
///   Defines the contract for template management operations.
///   Controllers call service methods, services orchestrate business logic.
///
/// Single Responsibility:
///   This service ONLY handles Template operations.
///   ChecklistInstance operations would be in IChecklistService.
///
/// Dependency Injection:
///   Registered as scoped service in Program.cs:
///   builder.Services.AddScoped<ITemplateService, TemplateService>();
///
/// Design Pattern:
///   - Interface for testability and loose coupling
///   - Services receive UserContext for audit trail
///   - Services throw exceptions, controllers handle HTTP responses
///   - All async for database operations
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public interface ITemplateService
{
    /// <summary>
    /// Get all active templates (not archived)
    /// Used by Template Library page to display available templates
    /// </summary>
    /// <param name="includeInactive">If true, includes inactive templates (default: false)</param>
    /// <returns>List of all active templates with their items</returns>
    Task<List<TemplateDto>> GetAllTemplatesAsync(bool includeInactive = false);

    /// <summary>
    /// Get a single template by ID with all its items
    /// Used by Template Editor and Template Detail views
    /// </summary>
    /// <param name="id">Template GUID</param>
    /// <returns>Template with items, or null if not found</returns>
    Task<TemplateDto?> GetTemplateByIdAsync(Guid id);

    /// <summary>
    /// Get templates filtered by category
    /// Example: category = "Safety" returns all safety templates
    /// </summary>
    /// <param name="category">Category name (case-insensitive)</param>
    /// <returns>List of templates in that category</returns>
    Task<List<TemplateDto>> GetTemplatesByCategoryAsync(string category);

    /// <summary>
    /// Create a new template with items
    /// Automatically sets CreatedBy/CreatedByPosition from UserContext
    /// </summary>
    /// <param name="request">Template data including items</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Newly created template with generated ID</returns>
    Task<TemplateDto> CreateTemplateAsync(
        CreateTemplateRequest request,
        UserContext userContext);

    /// <summary>
    /// Update an existing template
    /// Replaces all items (PUT semantics)
    /// Automatically sets LastModifiedBy/LastModifiedByPosition
    /// </summary>
    /// <param name="id">Template ID to update</param>
    /// <param name="request">Updated template data</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Updated template, or null if not found</returns>
    Task<TemplateDto?> UpdateTemplateAsync(
        Guid id,
        UpdateTemplateRequest request,
        UserContext userContext);

    /// <summary>
    /// Soft delete a template (set IsArchived = true)
    /// Archived templates are hidden from all lists
    /// </summary>
    /// <param name="id">Template ID to archive</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>True if archived, false if not found</returns>
    Task<bool> ArchiveTemplateAsync(Guid id, UserContext userContext);

    /// <summary>
    /// Restore an archived template (set IsArchived = false)
    /// Admin-only operation to undelete archived templates
    /// </summary>
    /// <param name="id">Template ID to restore</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>True if restored, false if not found</returns>
    Task<bool> RestoreTemplateAsync(Guid id, UserContext userContext);

    /// <summary>
    /// Permanently delete a template from the database
    /// ADMIN-ONLY OPERATION - Cannot be undone!
    /// Deletes template and all associated items
    /// </summary>
    /// <param name="id">Template ID to permanently delete</param>
    /// <param name="userContext">Current user context (must be admin)</param>
    /// <returns>True if deleted, false if not found</returns>
    Task<bool> PermanentlyDeleteTemplateAsync(Guid id, UserContext userContext);

    /// <summary>
    /// Get all archived templates
    /// Admin-only operation to view archived templates
    /// </summary>
    /// <returns>List of archived templates</returns>
    Task<List<TemplateDto>> GetArchivedTemplatesAsync();

    /// <summary>
    /// Get smart template suggestions based on user position and event category
    /// Returns templates ranked by relevance:
    ///   1. Position match (highest priority)
    ///   2. Event category match
    ///   3. Recently used
    ///   4. Popular (high usage count)
    /// </summary>
    /// <param name="position">User's ICS position (e.g., "Safety Officer")</param>
    /// <param name="eventCategory">Event category (e.g., "Fire", "Flood") - optional</param>
    /// <param name="limit">Maximum number of suggestions to return (default: 10)</param>
    /// <returns>List of suggested templates ordered by relevance</returns>
    Task<List<TemplateDto>> GetTemplateSuggestionsAsync(
        string position,
        string? eventCategory = null,
        int limit = 10);

    /// <summary>
    /// Duplicate an existing template with a new name
    /// Useful for creating variations of standard templates
    /// </summary>
    /// <param name="id">Template ID to duplicate</param>
    /// <param name="newName">Name for the duplicated template</param>
    /// <param name="userContext">Current user context for audit trail</param>
    /// <returns>Newly created duplicate template</returns>
    Task<TemplateDto?> DuplicateTemplateAsync(
        Guid id,
        string newName,
        UserContext userContext);
}

using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChecklistAPI.Controllers;

/// <summary>
/// ChecklistsController - API endpoints for checklist instance management
///
/// Purpose:
///   Provides RESTful endpoints for CRUD operations on checklist instances.
///   Thin controller pattern: validation and routing only, business logic in service.
///
/// Base Route: /api/checklists
///
/// Endpoints:
///   GET    /api/checklists/my-checklists              - List my checklists (position-filtered)
///   GET    /api/checklists/{id}                       - Get single checklist
///   GET    /api/checklists/event/{eventId}            - Get checklists for event
///   GET    /api/checklists/event/{eventId}/period/{periodId} - Get checklists for operational period
///   GET    /api/checklists/archived                   - Get all archived checklists (Manage role)
///   GET    /api/checklists/event/{eventId}/archived   - Get archived checklists for event (Manage role)
///   POST   /api/checklists                            - Create checklist from template
///   PUT    /api/checklists/{id}                       - Update checklist metadata
///   DELETE /api/checklists/{id}                       - Archive checklist (Manage role)
///   POST   /api/checklists/{id}/restore               - Restore archived checklist (Manage role)
///   DELETE /api/checklists/{id}/permanent             - Permanently delete checklist (Manage role)
///   POST   /api/checklists/{id}/clone                 - Clone checklist
///
/// User Context:
///   Automatically injected by MockUserMiddleware (POC)
///   Controllers extract from HttpContext.Items["UserContext"]
///
/// Error Handling:
///   - 400 Bad Request: Validation failures
///   - 403 Forbidden: Admin-only operations by non-admin
///   - 404 Not Found: Checklist doesn't exist
///   - 500 Internal Server Error: Unhandled exceptions (logged to App Insights)
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ChecklistsController : ControllerBase
{
    private readonly IChecklistService _checklistService;
    private readonly ILogger<ChecklistsController> _logger;

    public ChecklistsController(
        IChecklistService checklistService,
        ILogger<ChecklistsController> logger)
    {
        _checklistService = checklistService;
        _logger = logger;
    }

    /// <summary>
    /// Get all checklists for the current user's position
    /// Filters by AssignedPositions field (null = visible to all)
    /// </summary>
    /// <param name="includeArchived">Include archived checklists (default: false)</param>
    /// <returns>List of checklists visible to this user</returns>
    [HttpGet("my-checklists")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChecklistInstanceDto>>> GetMyChecklists(
        [FromQuery] bool includeArchived = false)
    {
        var userContext = GetUserContext();
        var checklists = await _checklistService.GetMyChecklistsAsync(userContext, includeArchived);
        return Ok(checklists);
    }

    /// <summary>
    /// Get a single checklist by ID
    /// </summary>
    /// <param name="id">Checklist GUID</param>
    /// <returns>Checklist with items</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChecklistInstanceDto>> GetChecklist(Guid id)
    {
        var checklist = await _checklistService.GetChecklistByIdAsync(id);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        return Ok(checklist);
    }

    /// <summary>
    /// Get all checklists for a specific event (filtered by user position)
    /// </summary>
    /// <param name="eventId">Event identifier</param>
    /// <param name="includeArchived">Include archived checklists (default: false)</param>
    /// <param name="showAll">If true and user has Manage role, shows all checklists regardless of position (default: false)</param>
    /// <returns>List of checklists for this event visible to the current user</returns>
    [HttpGet("event/{eventId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChecklistInstanceDto>>> GetChecklistsByEvent(
        Guid eventId,
        [FromQuery] bool includeArchived = false,
        [FromQuery] bool? showAll = null)
    {
        var userContext = GetUserContext();
        var checklists = await _checklistService.GetChecklistsByEventAsync(eventId, userContext, includeArchived, showAll);
        return Ok(checklists);
    }

    /// <summary>
    /// Get all checklists for a specific operational period
    /// </summary>
    /// <param name="eventId">Event identifier</param>
    /// <param name="operationalPeriodId">Operational period identifier</param>
    /// <param name="includeArchived">Include archived checklists (default: false)</param>
    /// <returns>List of checklists for this operational period</returns>
    [HttpGet("event/{eventId}/period/{operationalPeriodId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ChecklistInstanceDto>>> GetChecklistsByOperationalPeriod(
        Guid eventId,
        Guid operationalPeriodId,
        [FromQuery] bool includeArchived = false)
    {
        var checklists = await _checklistService.GetChecklistsByOperationalPeriodAsync(
            eventId,
            operationalPeriodId,
            includeArchived);
        return Ok(checklists);
    }

    /// <summary>
    /// Create a new checklist from a template
    /// </summary>
    /// <param name="request">Checklist creation data (template, event, etc.)</param>
    /// <returns>Newly created checklist</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChecklistInstanceDto>> CreateFromTemplate(
        [FromBody] CreateFromTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userContext = GetUserContext();

        // Readonly users cannot create checklists
        if (userContext.IsReadonly)
        {
            _logger.LogWarning(
                "Readonly user {User} attempted to create checklist",
                userContext.Email);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Readonly users cannot create checklists"
            });
        }

        try
        {
            var checklist = await _checklistService.CreateFromTemplateAsync(request, userContext);

            _logger.LogInformation(
                "Checklist {ChecklistId} created from template {TemplateId} by {User}",
                checklist.Id,
                request.TemplateId,
                userContext.Email);

            return CreatedAtAction(
                nameof(GetChecklist),
                new { id = checklist.Id },
                checklist);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create checklist from template {TemplateId}", request.TemplateId);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update checklist metadata (name, event, operational period, positions)
    /// </summary>
    /// <param name="id">Checklist ID to update</param>
    /// <param name="request">Updated checklist metadata</param>
    /// <returns>Updated checklist</returns>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChecklistInstanceDto>> UpdateChecklist(
        Guid id,
        [FromBody] UpdateChecklistRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userContext = GetUserContext();

        // Readonly users cannot update checklists
        if (userContext.IsReadonly)
        {
            _logger.LogWarning(
                "Readonly user {User} attempted to update checklist {ChecklistId}",
                userContext.Email,
                id);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Readonly users cannot update checklists"
            });
        }

        var checklist = await _checklistService.UpdateChecklistAsync(id, request, userContext);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for update", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        _logger.LogInformation(
            "Checklist {ChecklistId} updated by {User}",
            id,
            userContext.Email);

        return Ok(checklist);
    }

    /// <summary>
    /// Archive a checklist (soft delete)
    /// Requires Manage role
    /// </summary>
    /// <param name="id">Checklist ID to archive</param>
    /// <returns>No content on success</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveChecklist(Guid id)
    {
        var userContext = GetUserContext();

        // Only Manage role can archive checklists
        if (!userContext.CanManage)
        {
            _logger.LogWarning(
                "User {User} with role {Role} attempted to archive checklist {ChecklistId}",
                userContext.Email,
                userContext.Role,
                id);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Only users with Manage role can archive checklists"
            });
        }

        var success = await _checklistService.ArchiveChecklistAsync(id, userContext);

        if (!success)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for archiving", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        _logger.LogInformation(
            "Checklist {ChecklistId} archived by {User}",
            id,
            userContext.Email);

        return NoContent();
    }

    /// <summary>
    /// Get all archived checklists (Manage role)
    /// </summary>
    /// <returns>List of archived checklists</returns>
    [HttpGet("archived")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<ChecklistInstanceDto>>> GetArchivedChecklists()
    {
        var userContext = GetUserContext();

        if (!userContext.CanManage)
        {
            _logger.LogWarning(
                "User {User} with role {Role} attempted to access archived checklists",
                userContext.Email,
                userContext.Role);
            return Forbid();
        }

        var checklists = await _checklistService.GetArchivedChecklistsAsync();
        return Ok(checklists);
    }

    /// <summary>
    /// Get archived checklists for a specific event (Manage role)
    /// </summary>
    /// <param name="eventId">Event identifier</param>
    /// <returns>List of archived checklists for this event</returns>
    [HttpGet("event/{eventId}/archived")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<ChecklistInstanceDto>>> GetArchivedChecklistsByEvent(Guid eventId)
    {
        var userContext = GetUserContext();

        if (!userContext.CanManage)
        {
            _logger.LogWarning(
                "User {User} with role {Role} attempted to access archived checklists for event {EventId}",
                userContext.Email,
                userContext.Role,
                eventId);
            return Forbid();
        }

        var checklists = await _checklistService.GetArchivedChecklistsByEventAsync(eventId);
        return Ok(checklists);
    }

    /// <summary>
    /// Restore an archived checklist (Manage role)
    /// </summary>
    /// <param name="id">Checklist ID to restore</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreChecklist(Guid id)
    {
        var userContext = GetUserContext();

        if (!userContext.CanManage)
        {
            _logger.LogWarning(
                "User {User} with role {Role} attempted to restore checklist {ChecklistId}",
                userContext.Email,
                userContext.Role,
                id);
            return Forbid();
        }

        var success = await _checklistService.RestoreChecklistAsync(id, userContext);

        if (!success)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for restoration", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        _logger.LogInformation(
            "Checklist {ChecklistId} restored by {User}",
            id,
            userContext.Email);

        return NoContent();
    }

    /// <summary>
    /// Permanently delete an archived checklist (Manage role)
    /// This action cannot be undone!
    /// </summary>
    /// <param name="id">Checklist ID to permanently delete</param>
    /// <returns>No content on success</returns>
    [HttpDelete("{id:guid}/permanent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PermanentlyDeleteChecklist(Guid id)
    {
        var userContext = GetUserContext();

        if (!userContext.CanManage)
        {
            _logger.LogWarning(
                "User {User} with role {Role} attempted to permanently delete checklist {ChecklistId}",
                userContext.Email,
                userContext.Role,
                id);
            return Forbid();
        }

        var result = await _checklistService.PermanentlyDeleteChecklistAsync(id, userContext);

        if (result == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for permanent deletion", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        if (!result.Value)
        {
            _logger.LogWarning("Checklist {ChecklistId} must be archived before permanent deletion", id);
            return BadRequest(new { message = "Checklist must be archived before it can be permanently deleted" });
        }

        _logger.LogInformation(
            "Checklist {ChecklistId} permanently deleted by {User}",
            id,
            userContext.Email);

        return NoContent();
    }

    /// <summary>
    /// Clone an existing checklist with a new name
    /// Supports both "clean copy" (reset status) and "direct copy" (preserve status)
    /// </summary>
    /// <param name="id">Checklist ID to clone</param>
    /// <param name="request">Clone configuration (name, preserve status)</param>
    /// <returns>Newly created cloned checklist</returns>
    [HttpPost("{id:guid}/clone")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChecklistInstanceDto>> CloneChecklist(
        Guid id,
        [FromBody] CloneChecklistRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewName))
        {
            return BadRequest(new { message = "New name is required" });
        }

        var userContext = GetUserContext();

        // Readonly users cannot clone checklists
        if (userContext.IsReadonly)
        {
            _logger.LogWarning(
                "Readonly user {User} attempted to clone checklist {ChecklistId}",
                userContext.Email,
                id);
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Readonly users cannot clone checklists"
            });
        }

        var clone = await _checklistService.CloneChecklistAsync(
            id,
            request.NewName,
            request.PreserveStatus,
            userContext,
            request.AssignedPositions);

        if (clone == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for cloning", id);
            return NotFound(new { message = $"Checklist {id} not found" });
        }

        _logger.LogInformation(
            "Checklist {ChecklistId} cloned to {NewId} ({Mode}) by {User}",
            id,
            clone.Id,
            request.PreserveStatus ? "direct copy" : "clean copy",
            userContext.Email);

        return CreatedAtAction(
            nameof(GetChecklist),
            new { id = clone.Id },
            clone);
    }

    /// <summary>
    /// Extract UserContext from HttpContext (injected by middleware)
    /// Falls back to default if not found (should never happen in POC)
    /// </summary>
    private UserContext GetUserContext()
    {
        if (HttpContext.Items.TryGetValue("UserContext", out var context) &&
            context is UserContext userContext)
        {
            return userContext;
        }

        _logger.LogWarning("UserContext not found in HttpContext, using default");
        return new UserContext
        {
            Email = "unknown@cobra.mil",
            FullName = "Unknown User",
            Position = "Unknown",
            IsAdmin = false
        };
    }
}

/// <summary>
/// Request DTO for cloning a checklist
/// </summary>
public record CloneChecklistRequest
{
    /// <summary>
    /// New name for the cloned checklist
    /// </summary>
    public string NewName { get; init; } = string.Empty;

    /// <summary>
    /// Whether to preserve completion status and notes from original (default: false)
    /// - false: "Clean copy" - resets all completion, status, notes (fresh start)
    /// - true: "Direct copy" - preserves completion status, notes, timestamps
    /// </summary>
    public bool PreserveStatus { get; init; } = false;

    /// <summary>
    /// Comma-separated list of positions that can see this checklist (optional)
    /// If null/empty, inherits from original checklist
    /// </summary>
    public string? AssignedPositions { get; init; }
}

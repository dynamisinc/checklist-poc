using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Services;
using Microsoft.AspNetCore.Mvc;

namespace ChecklistAPI.Controllers;

/// <summary>
/// TemplatesController - API endpoints for template management
///
/// Purpose:
///   Provides RESTful endpoints for CRUD operations on checklist templates.
///   Thin controller pattern: validation and routing only, business logic in service.
///
/// Base Route: /api/templates
///
/// Endpoints:
///   GET    /api/templates              - List all active templates
///   GET    /api/templates/{id}         - Get single template
///   GET    /api/templates/category/{category} - Filter by category
///   GET    /api/templates/archived     - Get archived templates (Admin only)
///   POST   /api/templates              - Create new template
///   PUT    /api/templates/{id}         - Update existing template
///   DELETE /api/templates/{id}         - Soft delete (archive) template
///   POST   /api/templates/{id}/restore - Restore archived template (Admin only)
///   POST   /api/templates/{id}/duplicate - Duplicate template
///   DELETE /api/templates/{id}/permanent - PERMANENTLY delete template (Admin only)
///
/// User Context:
///   Automatically injected by MockUserMiddleware (POC)
///   Controllers extract from HttpContext.Items["UserContext"]
///
/// Error Handling:
///   - 400 Bad Request: Validation failures
///   - 404 Not Found: Template doesn't exist
///   - 500 Internal Server Error: Unhandled exceptions (logged to App Insights)
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class TemplatesController : ControllerBase
{
    private readonly ITemplateService _templateService;
    private readonly ILogger<TemplatesController> _logger;

    public TemplatesController(
        ITemplateService templateService,
        ILogger<TemplatesController> logger)
    {
        _templateService = templateService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active templates
    /// </summary>
    /// <param name="includeInactive">Include inactive templates (default: false)</param>
    /// <returns>List of templates</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TemplateDto>>> GetTemplates(
        [FromQuery] bool includeInactive = false)
    {
        var templates = await _templateService.GetAllTemplatesAsync(includeInactive);
        return Ok(templates);
    }

    /// <summary>
    /// Get a single template by ID
    /// </summary>
    /// <param name="id">Template GUID</param>
    /// <returns>Template with items</returns>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateDto>> GetTemplate(Guid id)
    {
        var template = await _templateService.GetTemplateByIdAsync(id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found", id);
            return NotFound(new { message = $"Template {id} not found" });
        }

        return Ok(template);
    }

    /// <summary>
    /// Get templates filtered by category
    /// </summary>
    /// <param name="category">Category name (case-insensitive)</param>
    /// <returns>List of templates in category</returns>
    [HttpGet("category/{category}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<TemplateDto>>> GetTemplatesByCategory(string category)
    {
        var templates = await _templateService.GetTemplatesByCategoryAsync(category);
        return Ok(templates);
    }

    /// <summary>
    /// Get smart template suggestions based on position and event category
    /// </summary>
    /// <param name="position">User's ICS position (e.g., "Safety Officer")</param>
    /// <param name="eventCategory">Event category (e.g., "Fire", "Flood") - optional</param>
    /// <param name="limit">Maximum number of suggestions (default: 10, max: 50)</param>
    /// <returns>List of suggested templates ranked by relevance</returns>
    /// <remarks>
    /// Returns templates ranked by:
    /// 1. Position match (highest priority) - +1000 points
    /// 2. Event category match - +500 points
    /// 3. Recently used (last 30 days) - +0 to +200 points
    /// 4. Popularity (usage count) - +0 to +100 points
    /// </remarks>
    [HttpGet("suggestions")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<List<TemplateDto>>> GetTemplateSuggestions(
        [FromQuery] string position,
        [FromQuery] string? eventCategory = null,
        [FromQuery] int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(position))
        {
            return BadRequest(new { message = "Position parameter is required" });
        }

        if (limit < 1 || limit > 50)
        {
            return BadRequest(new { message = "Limit must be between 1 and 50" });
        }

        var suggestions = await _templateService.GetTemplateSuggestionsAsync(
            position,
            eventCategory,
            limit);

        _logger.LogInformation(
            "Returned {Count} template suggestions for position {Position}, category {Category}",
            suggestions.Count,
            position,
            eventCategory ?? "(none)");

        return Ok(suggestions);
    }

    /// <summary>
    /// Create a new template
    /// </summary>
    /// <param name="request">Template data including items</param>
    /// <returns>Newly created template</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TemplateDto>> CreateTemplate(
        [FromBody] CreateTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        // Get user context from middleware
        var userContext = GetUserContext();

        var template = await _templateService.CreateTemplateAsync(request, userContext);

        _logger.LogInformation(
            "Template {TemplateId} created by {User}",
            template.Id,
            userContext.Email);

        return CreatedAtAction(
            nameof(GetTemplate),
            new { id = template.Id },
            template);
    }

    /// <summary>
    /// Update an existing template
    /// </summary>
    /// <param name="id">Template ID to update</param>
    /// <param name="request">Updated template data</param>
    /// <returns>Updated template</returns>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateDto>> UpdateTemplate(
        Guid id,
        [FromBody] UpdateTemplateRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var userContext = GetUserContext();

        var template = await _templateService.UpdateTemplateAsync(id, request, userContext);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for update", id);
            return NotFound(new { message = $"Template {id} not found" });
        }

        _logger.LogInformation(
            "Template {TemplateId} updated by {User}",
            id,
            userContext.Email);

        return Ok(template);
    }

    /// <summary>
    /// Soft delete a template (archive)
    /// </summary>
    /// <param name="id">Template ID to archive</param>
    /// <returns>No content on success</returns>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveTemplate(Guid id)
    {
        var userContext = GetUserContext();

        var success = await _templateService.ArchiveTemplateAsync(id, userContext);

        if (!success)
        {
            _logger.LogWarning("Template {TemplateId} not found for archiving", id);
            return NotFound(new { message = $"Template {id} not found" });
        }

        _logger.LogInformation(
            "Template {TemplateId} archived by {User}",
            id,
            userContext.Email);

        return NoContent();
    }

    /// <summary>
    /// Get all archived templates (Admin only)
    /// </summary>
    /// <returns>List of archived templates</returns>
    [HttpGet("archived")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<List<TemplateDto>>> GetArchivedTemplates()
    {
        var userContext = GetUserContext();

        if (!userContext.IsAdmin)
        {
            _logger.LogWarning(
                "Non-admin user {User} attempted to access archived templates",
                userContext.Email);
            return Forbid();
        }

        var templates = await _templateService.GetArchivedTemplatesAsync();
        return Ok(templates);
    }

    /// <summary>
    /// Restore an archived template (Admin only)
    /// </summary>
    /// <param name="id">Template ID to restore</param>
    /// <returns>No content on success</returns>
    [HttpPost("{id:guid}/restore")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreTemplate(Guid id)
    {
        var userContext = GetUserContext();

        if (!userContext.IsAdmin)
        {
            _logger.LogWarning(
                "Non-admin user {User} attempted to restore template {TemplateId}",
                userContext.Email,
                id);
            return Forbid();
        }

        var success = await _templateService.RestoreTemplateAsync(id, userContext);

        if (!success)
        {
            _logger.LogWarning("Template {TemplateId} not found for restoration", id);
            return NotFound(new { message = $"Template {id} not found" });
        }

        _logger.LogInformation(
            "Template {TemplateId} restored by admin {User}",
            id,
            userContext.Email);

        return NoContent();
    }

    /// <summary>
    /// Permanently delete a template (Admin only - CANNOT BE UNDONE)
    /// </summary>
    /// <param name="id">Template ID to permanently delete</param>
    /// <returns>No content on success</returns>
    [HttpDelete("{id:guid}/permanent")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PermanentlyDeleteTemplate(Guid id)
    {
        var userContext = GetUserContext();

        if (!userContext.IsAdmin)
        {
            _logger.LogError(
                "Non-admin user {User} attempted permanent delete of template {TemplateId}",
                userContext.Email,
                id);
            return Forbid();
        }

        try
        {
            var success = await _templateService.PermanentlyDeleteTemplateAsync(id, userContext);

            if (!success)
            {
                _logger.LogWarning("Template {TemplateId} not found for permanent deletion", id);
                return NotFound(new { message = $"Template {id} not found" });
            }

            _logger.LogWarning(
                "Template {TemplateId} PERMANENTLY DELETED by admin {User}",
                id,
                userContext.Email);

            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogError(ex, "Unauthorized permanent delete attempt");
            return Forbid();
        }
    }

    /// <summary>
    /// Duplicate an existing template
    /// </summary>
    /// <param name="id">Template ID to duplicate</param>
    /// <param name="request">New name for duplicate</param>
    /// <returns>Newly created duplicate template</returns>
    [HttpPost("{id:guid}/duplicate")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TemplateDto>> DuplicateTemplate(
        Guid id,
        [FromBody] DuplicateTemplateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewName))
        {
            return BadRequest(new { message = "New name is required" });
        }

        var userContext = GetUserContext();

        var duplicate = await _templateService.DuplicateTemplateAsync(
            id,
            request.NewName,
            userContext);

        if (duplicate == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for duplication", id);
            return NotFound(new { message = $"Template {id} not found" });
        }

        _logger.LogInformation(
            "Template {TemplateId} duplicated to {NewId} by {User}",
            id,
            duplicate.Id,
            userContext.Email);

        return CreatedAtAction(
            nameof(GetTemplate),
            new { id = duplicate.Id },
            duplicate);
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

        // Fallback (should not happen if middleware is configured correctly)
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
/// Request DTO for duplicating a template
/// </summary>
public record DuplicateTemplateRequest
{
    /// <summary>
    /// New name for the duplicated template
    /// </summary>
    public string NewName { get; init; } = string.Empty;
}

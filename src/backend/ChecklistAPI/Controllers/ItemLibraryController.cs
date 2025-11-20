using Microsoft.AspNetCore.Mvc;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Services;

namespace ChecklistAPI.Controllers;

/// <summary>
/// API controller for managing item library entries
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class ItemLibraryController : ControllerBase
{
    private readonly IItemLibraryService _service;
    private readonly ILogger<ItemLibraryController> _logger;

    public ItemLibraryController(
        IItemLibraryService service,
        ILogger<ItemLibraryController> logger)
    {
        _service = service;
        _logger = logger;
    }

    /// <summary>
    /// Get all library items with optional filtering and sorting
    /// </summary>
    /// <param name="category">Filter by category (e.g., "Safety", "Logistics")</param>
    /// <param name="itemType">Filter by item type ("checkbox" or "status")</param>
    /// <param name="searchText">Search in item text and tags</param>
    /// <param name="sortBy">Sort order: "recent", "popular", "alphabetical" (default: "recent")</param>
    /// <returns>List of library items matching the filters</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ItemLibraryEntryDto>>> GetLibraryItems(
        [FromQuery] string? category = null,
        [FromQuery] string? itemType = null,
        [FromQuery] string? searchText = null,
        [FromQuery] string sortBy = "recent")
    {
        _logger.LogInformation(
            "GET /api/itemlibrary - Category: {Category}, ItemType: {ItemType}, SearchText: {SearchText}, SortBy: {SortBy}",
            category, itemType, searchText, sortBy);

        var items = await _service.GetLibraryItemsAsync(category, itemType, searchText, sortBy);
        return Ok(items);
    }

    /// <summary>
    /// Get a specific library item by ID
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <returns>The library item if found</returns>
    [HttpGet("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ItemLibraryEntryDto>> GetLibraryItem(Guid id)
    {
        _logger.LogInformation("GET /api/itemlibrary/{Id}", id);

        var item = await _service.GetLibraryItemByIdAsync(id);

        if (item == null)
        {
            _logger.LogWarning("Library item not found: {Id}", id);
            return NotFound(new { message = $"Library item {id} not found" });
        }

        return Ok(item);
    }

    /// <summary>
    /// Create a new library item
    /// </summary>
    /// <param name="request">The library item data</param>
    /// <returns>The created library item</returns>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ItemLibraryEntryDto>> CreateLibraryItem(
        [FromBody] CreateItemLibraryEntryRequest request)
    {
        _logger.LogInformation("POST /api/itemlibrary - Creating new library item");

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state for create library item");
            return BadRequest(ModelState);
        }

        try
        {
            var item = await _service.CreateLibraryItemAsync(request);
            return CreatedAtAction(
                nameof(GetLibraryItem),
                new { id = item.Id },
                item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating library item");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update an existing library item
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <param name="request">The updated library item data</param>
    /// <returns>The updated library item</returns>
    [HttpPut("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ItemLibraryEntryDto>> UpdateLibraryItem(
        Guid id,
        [FromBody] UpdateItemLibraryEntryRequest request)
    {
        _logger.LogInformation("PUT /api/itemlibrary/{Id}", id);

        if (!ModelState.IsValid)
        {
            _logger.LogWarning("Invalid model state for update library item");
            return BadRequest(ModelState);
        }

        try
        {
            var item = await _service.UpdateLibraryItemAsync(id, request);
            return Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Library item not found for update: {Id}", id);
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating library item {Id}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Increment the usage count for a library item (called when added to a template)
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <returns>Success response</returns>
    [HttpPost("{id}/increment-usage")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> IncrementUsage(Guid id)
    {
        _logger.LogInformation("POST /api/itemlibrary/{Id}/increment-usage", id);

        await _service.IncrementUsageCountAsync(id);
        return Ok(new { message = "Usage count incremented" });
    }

    /// <summary>
    /// Archive a library item (soft delete)
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <returns>Success response</returns>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ArchiveLibraryItem(Guid id)
    {
        _logger.LogInformation("DELETE /api/itemlibrary/{Id} (archive)", id);

        try
        {
            await _service.ArchiveLibraryItemAsync(id);
            return Ok(new { message = $"Library item {id} archived successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error archiving library item: {Id}", id);
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Restore an archived library item
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <returns>Success response</returns>
    [HttpPost("{id}/restore")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestoreLibraryItem(Guid id)
    {
        _logger.LogInformation("POST /api/itemlibrary/{Id}/restore", id);

        try
        {
            await _service.RestoreLibraryItemAsync(id);
            return Ok(new { message = $"Library item {id} restored successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error restoring library item: {Id}", id);
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Permanently delete a library item (admin only)
    /// </summary>
    /// <param name="id">The library item ID</param>
    /// <returns>Success response</returns>
    [HttpDelete("{id}/permanent")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteLibraryItem(Guid id)
    {
        _logger.LogInformation("DELETE /api/itemlibrary/{Id}/permanent", id);

        try
        {
            await _service.DeleteLibraryItemAsync(id);
            return Ok(new { message = $"Library item {id} permanently deleted" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Error deleting library item: {Id}", id);
            return NotFound(new { message = ex.Message });
        }
    }
}

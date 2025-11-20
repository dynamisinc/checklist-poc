using Microsoft.EntityFrameworkCore;
using ChecklistAPI.Data;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Models.DTOs;
using System.Text.Json;

namespace ChecklistAPI.Services;

/// <summary>
/// Service for managing item library entries
/// </summary>
public class ItemLibraryService : IItemLibraryService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<ItemLibraryService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public ItemLibraryService(
        ChecklistDbContext context,
        ILogger<ItemLibraryService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    private string GetCurrentUser()
    {
        return _httpContextAccessor.HttpContext?.Items["UserName"]?.ToString() ?? "Unknown User";
    }

    public async Task<List<ItemLibraryEntryDto>> GetLibraryItemsAsync(
        string? category = null,
        string? itemType = null,
        string? searchText = null,
        string sortBy = "recent")
    {
        _logger.LogInformation(
            "Getting library items with filters - Category: {Category}, ItemType: {ItemType}, SearchText: {SearchText}, SortBy: {SortBy}",
            category, itemType, searchText, sortBy);

        var query = _context.ItemLibraryEntries
            .Where(item => !item.IsArchived)
            .AsQueryable();

        // Apply filters
        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(item => item.Category == category);
        }

        if (!string.IsNullOrWhiteSpace(itemType))
        {
            query = query.Where(item => item.ItemType == itemType);
        }

        if (!string.IsNullOrWhiteSpace(searchText))
        {
            var searchLower = searchText.ToLower();
            query = query.Where(item =>
                item.ItemText.ToLower().Contains(searchLower) ||
                (item.Tags != null && item.Tags.ToLower().Contains(searchLower)));
        }

        // Apply sorting
        query = sortBy.ToLower() switch
        {
            "popular" => query.OrderByDescending(item => item.UsageCount)
                              .ThenByDescending(item => item.CreatedAt),
            "alphabetical" => query.OrderBy(item => item.ItemText),
            _ => query.OrderByDescending(item => item.CreatedAt) // "recent" (default)
        };

        var items = await query.ToListAsync();

        _logger.LogInformation("Found {Count} library items", items.Count);

        return items.Select(MapToDto).ToList();
    }

    public async Task<ItemLibraryEntryDto?> GetLibraryItemByIdAsync(Guid id)
    {
        _logger.LogInformation("Getting library item by ID: {Id}", id);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id && !item.IsArchived);

        if (item == null)
        {
            _logger.LogWarning("Library item not found: {Id}", id);
            return null;
        }

        return MapToDto(item);
    }

    public async Task<ItemLibraryEntryDto> CreateLibraryItemAsync(CreateItemLibraryEntryRequest request)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Creating library item for user: {User}", currentUser);

        var item = new ItemLibraryEntry
        {
            Id = Guid.NewGuid(),
            ItemText = request.ItemText.Trim(),
            ItemType = request.ItemType,
            Category = request.Category.Trim(),
            StatusConfiguration = request.StatusConfiguration,
            AllowedPositions = request.AllowedPositions,
            DefaultNotes = request.DefaultNotes,
            Tags = request.Tags != null && request.Tags.Length > 0
                ? JsonSerializer.Serialize(request.Tags)
                : null,
            IsRequiredByDefault = request.IsRequiredByDefault,
            UsageCount = 0,
            CreatedBy = currentUser,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        _context.ItemLibraryEntries.Add(item);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created library item: {Id}", item.Id);

        return MapToDto(item);
    }

    public async Task<ItemLibraryEntryDto> UpdateLibraryItemAsync(Guid id, UpdateItemLibraryEntryRequest request)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Updating library item {Id} by user: {User}", id, currentUser);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id && !item.IsArchived);

        if (item == null)
        {
            _logger.LogWarning("Library item not found for update: {Id}", id);
            throw new InvalidOperationException($"Library item {id} not found");
        }

        // Update properties
        item.ItemText = request.ItemText.Trim();
        item.ItemType = request.ItemType;
        item.Category = request.Category.Trim();
        item.StatusConfiguration = request.StatusConfiguration;
        item.AllowedPositions = request.AllowedPositions;
        item.DefaultNotes = request.DefaultNotes;
        item.Tags = request.Tags != null && request.Tags.Length > 0
            ? JsonSerializer.Serialize(request.Tags)
            : null;
        item.IsRequiredByDefault = request.IsRequiredByDefault;
        item.LastModifiedBy = currentUser;
        item.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated library item: {Id}", id);

        return MapToDto(item);
    }

    public async Task IncrementUsageCountAsync(Guid id)
    {
        _logger.LogInformation("Incrementing usage count for library item: {Id}", id);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id);

        if (item != null)
        {
            item.UsageCount++;
            await _context.SaveChangesAsync();
            _logger.LogInformation("Library item {Id} usage count now: {Count}", id, item.UsageCount);
        }
        else
        {
            _logger.LogWarning("Library item not found for usage increment: {Id}", id);
        }
    }

    public async Task ArchiveLibraryItemAsync(Guid id)
    {
        var currentUser = GetCurrentUser();
        _logger.LogInformation("Archiving library item {Id} by user: {User}", id, currentUser);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id);

        if (item == null)
        {
            _logger.LogWarning("Library item not found for archive: {Id}", id);
            throw new InvalidOperationException($"Library item {id} not found");
        }

        if (item.IsArchived)
        {
            _logger.LogWarning("Library item {Id} is already archived", id);
            throw new InvalidOperationException($"Library item {id} is already archived");
        }

        item.IsArchived = true;
        item.ArchivedBy = currentUser;
        item.ArchivedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Archived library item: {Id}", id);
    }

    public async Task RestoreLibraryItemAsync(Guid id)
    {
        _logger.LogInformation("Restoring library item: {Id}", id);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id);

        if (item == null)
        {
            _logger.LogWarning("Library item not found for restore: {Id}", id);
            throw new InvalidOperationException($"Library item {id} not found");
        }

        if (!item.IsArchived)
        {
            _logger.LogWarning("Library item {Id} is not archived", id);
            throw new InvalidOperationException($"Library item {id} is not archived");
        }

        item.IsArchived = false;
        item.ArchivedBy = null;
        item.ArchivedAt = null;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restored library item: {Id}", id);
    }

    public async Task DeleteLibraryItemAsync(Guid id)
    {
        _logger.LogInformation("Permanently deleting library item: {Id}", id);

        var item = await _context.ItemLibraryEntries
            .FirstOrDefaultAsync(item => item.Id == id);

        if (item == null)
        {
            _logger.LogWarning("Library item not found for deletion: {Id}", id);
            throw new InvalidOperationException($"Library item {id} not found");
        }

        _context.ItemLibraryEntries.Remove(item);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Permanently deleted library item: {Id}", id);
    }

    private static ItemLibraryEntryDto MapToDto(ItemLibraryEntry item)
    {
        return new ItemLibraryEntryDto(
            item.Id,
            item.ItemText,
            item.ItemType,
            item.Category,
            item.StatusConfiguration,
            item.AllowedPositions,
            item.DefaultNotes,
            item.Tags,
            item.IsRequiredByDefault,
            item.UsageCount,
            item.CreatedBy,
            item.CreatedAt,
            item.LastModifiedBy,
            item.LastModifiedAt
        );
    }
}

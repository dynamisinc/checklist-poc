using ChecklistAPI.Data;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChecklistAPI.Services;

/// <summary>
/// TemplateService - Implementation of template business logic
///
/// Purpose:
///   Handles all CRUD operations for templates with proper audit trails.
///   Orchestrates database operations, mapping, and business rules.
///
/// Dependencies:
///   - ChecklistDbContext: Database access via EF Core
///   - ILogger: Application Insights and console logging
///
/// Design Decisions:
///   - All methods are async for database I/O
///   - Returns DTOs, not entities (encapsulation)
///   - Throws exceptions for error cases (caught by middleware)
///   - Comprehensive logging for all operations
///   - User attribution on all create/update/delete operations
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-19
/// </summary>
public class TemplateService : ITemplateService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<TemplateService> _logger;

    public TemplateService(
        ChecklistDbContext context,
        ILogger<TemplateService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<TemplateDto>> GetAllTemplatesAsync(bool includeInactive = false)
    {
        _logger.LogInformation("Fetching all templates (includeInactive: {IncludeInactive})", includeInactive);

        var query = _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .Where(t => !t.IsArchived);

        if (!includeInactive)
        {
            query = query.Where(t => t.IsActive);
        }

        var templates = await query
            .OrderBy(t => t.Category)
            .ThenBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} templates", templates.Count);

        return templates.Select(MapToDto).ToList();
    }

    public async Task<TemplateDto?> GetTemplateByIdAsync(Guid id)
    {
        _logger.LogInformation("Fetching template {TemplateId}", id);

        var template = await _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found", id);
            return null;
        }

        return MapToDto(template);
    }

    public async Task<List<TemplateDto>> GetTemplatesByCategoryAsync(string category)
    {
        _logger.LogInformation("Fetching templates by category: {Category}", category);

        var templates = await _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .Where(t => !t.IsArchived
                     && t.IsActive
                     && t.Category.ToLower() == category.ToLower())
            .OrderBy(t => t.Name)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} templates in category {Category}",
            templates.Count, category);

        return templates.Select(MapToDto).ToList();
    }

    public async Task<TemplateDto> CreateTemplateAsync(
        CreateTemplateRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Creating template '{Name}' by {User} ({Position})",
            request.Name,
            userContext.Email,
            userContext.Position);

        var template = new Template
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            Category = request.Category,
            Tags = request.Tags,
            IsActive = true,
            IsArchived = false,
            CreatedBy = userContext.Email,
            CreatedByPosition = userContext.Position,
            CreatedAt = DateTime.UtcNow
        };

        // Add items with proper ordering
        foreach (var itemRequest in request.Items)
        {
            template.Items.Add(new TemplateItem
            {
                Id = Guid.NewGuid(),
                TemplateId = template.Id,
                ItemText = itemRequest.ItemText,
                ItemType = itemRequest.ItemType,
                DisplayOrder = itemRequest.DisplayOrder,
                StatusOptions = itemRequest.StatusOptions,
                DefaultNotes = itemRequest.Notes
            });
        }

        _context.Templates.Add(template);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Created template {TemplateId} with {ItemCount} items",
            template.Id,
            template.Items.Count);

        return MapToDto(template);
    }

    public async Task<TemplateDto?> UpdateTemplateAsync(
        Guid id,
        UpdateTemplateRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Updating template {TemplateId} by {User}",
            id,
            userContext.Email);

        var template = await _context.Templates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for update", id);
            return null;
        }

        // Update template properties
        template.Name = request.Name;
        template.Description = request.Description;
        template.Category = request.Category;
        template.Tags = request.Tags;
        template.IsActive = request.IsActive;
        template.LastModifiedBy = userContext.Email;
        template.LastModifiedByPosition = userContext.Position;
        template.LastModifiedAt = DateTime.UtcNow;

        // Replace all items (PUT semantics)
        // Remove existing items
        _context.TemplateItems.RemoveRange(template.Items);

        // Add new items
        var newItems = request.Items.Select(itemRequest => new TemplateItem
        {
            Id = Guid.NewGuid(),
            TemplateId = template.Id,
            ItemText = itemRequest.ItemText,
            ItemType = itemRequest.ItemType,
            DisplayOrder = itemRequest.DisplayOrder,
            StatusOptions = itemRequest.StatusOptions,
            DefaultNotes = itemRequest.Notes,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        _context.TemplateItems.AddRange(newItems);

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Updated template {TemplateId} with {ItemCount} items",
            id,
            newItems.Count);

        // Reload template with new items for return
        template = await _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        return template == null ? null : MapToDto(template);
    }

    public async Task<bool> ArchiveTemplateAsync(Guid id, UserContext userContext)
    {
        _logger.LogInformation(
            "Archiving template {TemplateId} by {User}",
            id,
            userContext.Email);

        var template = await _context.Templates.FindAsync(id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for archiving", id);
            return false;
        }

        template.IsArchived = true;
        template.ArchivedBy = userContext.Email;
        template.ArchivedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Archived template {TemplateId}", id);

        return true;
    }

    public async Task<bool> RestoreTemplateAsync(Guid id, UserContext userContext)
    {
        _logger.LogInformation(
            "Restoring archived template {TemplateId} by {User}",
            id,
            userContext.Email);

        var template = await _context.Templates.FindAsync(id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for restoration", id);
            return false;
        }

        template.IsArchived = false;
        template.ArchivedBy = null;
        template.ArchivedAt = null;
        template.LastModifiedBy = userContext.Email;
        template.LastModifiedByPosition = userContext.Position;
        template.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restored template {TemplateId}", id);

        return true;
    }

    public async Task<bool> PermanentlyDeleteTemplateAsync(Guid id, UserContext userContext)
    {
        _logger.LogWarning(
            "PERMANENT DELETE requested for template {TemplateId} by {User} (Admin: {IsAdmin})",
            id,
            userContext.Email,
            userContext.IsAdmin);

        if (!userContext.IsAdmin)
        {
            _logger.LogError(
                "Unauthorized permanent delete attempt by non-admin user {User}",
                userContext.Email);
            throw new UnauthorizedAccessException("Only administrators can permanently delete templates");
        }

        var template = await _context.Templates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for permanent deletion", id);
            return false;
        }

        // Log what we're about to delete for audit trail
        _logger.LogWarning(
            "PERMANENTLY DELETING template {TemplateId} '{TemplateName}' with {ItemCount} items by admin {User}",
            id,
            template.Name,
            template.Items.Count,
            userContext.Email);

        _context.Templates.Remove(template);
        await _context.SaveChangesAsync();

        _logger.LogWarning("Template {TemplateId} permanently deleted", id);

        return true;
    }

    public async Task<List<TemplateDto>> GetArchivedTemplatesAsync()
    {
        _logger.LogInformation("Fetching archived templates");

        var templates = await _context.Templates
            .Include(t => t.Items.OrderBy(i => i.DisplayOrder))
            .Where(t => t.IsArchived)
            .OrderBy(t => t.ArchivedAt)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} archived templates", templates.Count);

        return templates.Select(MapToDto).ToList();
    }

    public async Task<TemplateDto?> DuplicateTemplateAsync(
        Guid id,
        string newName,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Duplicating template {TemplateId} as '{NewName}'",
            id,
            newName);

        var original = await _context.Templates
            .Include(t => t.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id);

        if (original == null)
        {
            _logger.LogWarning("Template {TemplateId} not found for duplication", id);
            return null;
        }

        var duplicate = new Template
        {
            Id = Guid.NewGuid(),
            Name = newName,
            Description = original.Description,
            Category = original.Category,
            Tags = original.Tags,
            IsActive = true,
            IsArchived = false,
            CreatedBy = userContext.Email,
            CreatedByPosition = userContext.Position,
            CreatedAt = DateTime.UtcNow
        };

        // Copy items
        foreach (var item in original.Items)
        {
            duplicate.Items.Add(new TemplateItem
            {
                Id = Guid.NewGuid(),
                TemplateId = duplicate.Id,
                ItemText = item.ItemText,
                ItemType = item.ItemType,
                DisplayOrder = item.DisplayOrder,
                StatusOptions = item.StatusOptions,
                DefaultNotes = item.DefaultNotes
            });
        }

        _context.Templates.Add(duplicate);
        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Duplicated template {OriginalId} to {NewId}",
            id,
            duplicate.Id);

        return MapToDto(duplicate);
    }

    /// <summary>
    /// Maps Template entity to TemplateDto
    /// Keeps mapping logic centralized and DRY
    /// </summary>
    private static TemplateDto MapToDto(Template template)
    {
        return new TemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Category = template.Category,
            Tags = template.Tags,
            IsActive = template.IsActive,
            IsArchived = template.IsArchived,
            CreatedBy = template.CreatedBy,
            CreatedByPosition = template.CreatedByPosition,
            CreatedAt = template.CreatedAt,
            LastModifiedBy = template.LastModifiedBy,
            LastModifiedByPosition = template.LastModifiedByPosition,
            LastModifiedAt = template.LastModifiedAt,
            ArchivedBy = template.ArchivedBy,
            ArchivedAt = template.ArchivedAt,
            Items = template.Items.OrderBy(i => i.DisplayOrder).Select(MapItemToDto).ToList()
        };
    }

    /// <summary>
    /// Maps TemplateItem entity to TemplateItemDto
    /// </summary>
    private static TemplateItemDto MapItemToDto(TemplateItem item)
    {
        return new TemplateItemDto
        {
            Id = item.Id,
            TemplateId = item.TemplateId,
            ItemText = item.ItemText,
            ItemType = item.ItemType,
            DisplayOrder = item.DisplayOrder,
            StatusOptions = item.StatusOptions,
            Notes = item.DefaultNotes
        };
    }
}

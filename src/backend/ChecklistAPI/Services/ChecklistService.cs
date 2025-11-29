using ChecklistAPI.Data;
using ChecklistAPI.Hubs;
using ChecklistAPI.Mappers;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Services.Helpers;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChecklistAPI.Services;

/// <summary>
/// ChecklistService - Implementation of checklist instance business logic
///
/// Purpose:
///   Handles all CRUD operations for checklist instances with proper audit trails.
///   Orchestrates database operations, mapping, and business rules.
///
/// Key Business Logic:
///   - Template Instantiation: Delegates to ChecklistCreationHelper
///   - Progress Tracking: Delegates to ChecklistProgressHelper
///   - Position Filtering: GetMyChecklistsAsync filters by AssignedPositions
///
/// Dependencies:
///   - ChecklistDbContext: Database access via EF Core
///   - ILogger: Application Insights and console logging
///   - ChecklistCreationHelper: Complex creation logic
///   - ChecklistProgressHelper: Progress calculation logic
///   - ChecklistMapper: Entity-to-DTO mapping
///
/// Design Decisions:
///   - All methods are async for database I/O
///   - Returns DTOs, not entities (encapsulation)
///   - Throws exceptions for error cases (caught by middleware)
///   - Comprehensive logging for all operations
///   - User attribution on all create/update/delete operations
///   - Complex logic extracted to helper classes (file size limit)
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public class ChecklistService : IChecklistService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<ChecklistService> _logger;
    private readonly IHubContext<ChecklistHub> _hubContext;

    public ChecklistService(
        ChecklistDbContext context,
        ILogger<ChecklistService> logger,
        IHubContext<ChecklistHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task<List<ChecklistInstanceDto>> GetMyChecklistsAsync(
        UserContext userContext,
        bool includeArchived = false)
    {
        var userPositions = userContext.Positions.Count > 0
            ? userContext.Positions
            : new List<string> { userContext.Position };

        _logger.LogInformation(
            "Fetching checklists for positions: {Positions} (includeArchived: {IncludeArchived})",
            string.Join(", ", userPositions),
            includeArchived);

        var query = _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .AsQueryable();

        // Filter by archived status at DB level
        if (!includeArchived)
        {
            query = query.Where(c => !c.IsArchived);
        }

        // Get all non-archived checklists, then filter by position in-memory
        // (position filtering with multiple positions can't be efficiently translated to SQL)
        var allChecklists = await query
            .OrderByDescending(c => c.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        // Filter for exact position match in comma-separated list
        // A checklist is visible if:
        // 1. AssignedPositions is null/empty (visible to all), OR
        // 2. ANY of the user's positions matches ANY of the checklist's assigned positions
        var checklists = allChecklists.Where(c =>
        {
            if (string.IsNullOrEmpty(c.AssignedPositions))
                return true; // Null/empty = visible to all

            var checklistPositions = c.AssignedPositions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            var hasMatch = userPositions.Any(up => checklistPositions.Contains(up));

            _logger.LogDebug(
                "Checklist {ChecklistId} assigned to '{ChecklistPositions}' - User positions '{UserPositions}' - Match: {HasMatch}",
                c.Id, c.AssignedPositions, string.Join(", ", userPositions), hasMatch);

            return hasMatch;
        }).ToList();

        _logger.LogInformation(
            "Retrieved {Count} checklists for positions {Positions} (filtered from {TotalCount})",
            checklists.Count,
            string.Join(", ", userPositions),
            allChecklists.Count);

        return checklists.Select(ChecklistMapper.MapToDto).ToList();
    }

    public async Task<ChecklistInstanceDto?> GetChecklistByIdAsync(Guid id)
    {
        _logger.LogInformation("Fetching checklist {ChecklistId}", id);

        var checklist = await _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found", id);
            return null;
        }

        return ChecklistMapper.MapToDto(checklist);
    }

    public async Task<List<ChecklistInstanceDto>> GetChecklistsByEventAsync(
        string eventId,
        bool includeArchived = false)
    {
        _logger.LogInformation(
            "Fetching checklists for event: {EventId} (includeArchived: {IncludeArchived})",
            eventId,
            includeArchived);

        var query = _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .Where(c => c.EventId == eventId);

        if (!includeArchived)
        {
            query = query.Where(c => !c.IsArchived);
        }

        var checklists = await query
            .OrderByDescending(c => c.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation(
            "Retrieved {Count} checklists for event {EventId}",
            checklists.Count,
            eventId);

        return checklists.Select(ChecklistMapper.MapToDto).ToList();
    }

    public async Task<List<ChecklistInstanceDto>> GetChecklistsByOperationalPeriodAsync(
        string eventId,
        Guid? operationalPeriodId,
        bool includeArchived = false)
    {
        _logger.LogInformation(
            "Fetching checklists for event: {EventId}, op period: {OpPeriod}",
            eventId,
            operationalPeriodId);

        var query = _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .Where(c => c.EventId == eventId && c.OperationalPeriodId == operationalPeriodId);

        if (!includeArchived)
        {
            query = query.Where(c => !c.IsArchived);
        }

        var checklists = await query
            .OrderByDescending(c => c.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation(
            "Retrieved {Count} checklists for event {EventId}, op period {OpPeriod}",
            checklists.Count,
            eventId,
            operationalPeriodId);

        return checklists.Select(ChecklistMapper.MapToDto).ToList();
    }

    public async Task<ChecklistInstanceDto> CreateFromTemplateAsync(
        CreateFromTemplateRequest request,
        UserContext userContext)
    {
        var checklist = await ChecklistCreationHelper.CreateFromTemplateAsync(
            _context,
            _logger,
            request,
            userContext);

        _context.ChecklistInstances.Add(checklist);

        // Track template usage for smart suggestions
        var template = await _context.Templates.FindAsync(request.TemplateId);
        if (template != null)
        {
            template.UsageCount++;
            template.LastUsedAt = DateTime.UtcNow;
            _logger.LogDebug(
                "Updated usage tracking for template {TemplateId} ({Name}): UsageCount={Count}, LastUsedAt={Time}",
                template.Id,
                template.Name,
                template.UsageCount,
                template.LastUsedAt);
        }
        else
        {
            _logger.LogWarning(
                "Template {TemplateId} not found for usage tracking update",
                request.TemplateId);
        }

        await _context.SaveChangesAsync();

        var dto = ChecklistMapper.MapToDto(checklist);

        // Broadcast checklist creation to all connected clients via SignalR
        try
        {
            await _hubContext.Clients.All.SendAsync("ChecklistCreated", new
            {
                checklistId = dto.Id,
                checklistName = dto.Name,
                eventId = dto.EventId,
                eventName = dto.EventName,
                positions = dto.AssignedPositions,
                createdBy = userContext.Email,
                createdAt = dto.CreatedAt
            });

            _logger.LogInformation(
                "Broadcasted checklist creation via SignalR: {ChecklistId} ({ChecklistName})",
                dto.Id,
                dto.Name);
        }
        catch (Exception ex)
        {
            // Don't fail the request if SignalR broadcast fails
            _logger.LogWarning(
                ex,
                "Failed to broadcast checklist creation via SignalR for {ChecklistId}",
                dto.Id);
        }

        return dto;
    }

    public async Task<ChecklistInstanceDto?> UpdateChecklistAsync(
        Guid id,
        UpdateChecklistRequest request,
        UserContext userContext)
    {
        _logger.LogInformation("Updating checklist {ChecklistId} by {User}", id, userContext.Email);

        var checklist = await _context.ChecklistInstances.FindAsync(id);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for update", id);
            return null;
        }

        // Update metadata
        checklist.Name = request.Name;
        checklist.EventId = request.EventId;
        checklist.EventName = request.EventName;
        checklist.OperationalPeriodId = request.OperationalPeriodId;
        checklist.OperationalPeriodName = request.OperationalPeriodName;
        checklist.AssignedPositions = request.AssignedPositions;
        checklist.LastModifiedBy = userContext.Email;
        checklist.LastModifiedByPosition = userContext.Position;
        checklist.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Updated checklist {ChecklistId}", id);

        // Reload with items for return
        var updated = await _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        return updated == null ? null : ChecklistMapper.MapToDto(updated);
    }

    public async Task<bool> ArchiveChecklistAsync(Guid id, UserContext userContext)
    {
        _logger.LogInformation("Archiving checklist {ChecklistId} by {User}", id, userContext.Email);

        var checklist = await _context.ChecklistInstances.FindAsync(id);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for archiving", id);
            return false;
        }

        checklist.IsArchived = true;
        checklist.ArchivedBy = userContext.Email;
        checklist.ArchivedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Archived checklist {ChecklistId}", id);
        return true;
    }

    public async Task<bool> RestoreChecklistAsync(Guid id, UserContext userContext)
    {
        _logger.LogInformation("Restoring checklist {ChecklistId} by {User}", id, userContext.Email);

        var checklist = await _context.ChecklistInstances.FindAsync(id);

        if (checklist == null)
        {
            _logger.LogWarning("Checklist {ChecklistId} not found for restoration", id);
            return false;
        }

        checklist.IsArchived = false;
        checklist.ArchivedBy = null;
        checklist.ArchivedAt = null;
        checklist.LastModifiedBy = userContext.Email;
        checklist.LastModifiedByPosition = userContext.Position;
        checklist.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Restored checklist {ChecklistId}", id);
        return true;
    }

    public async Task<List<ChecklistInstanceDto>> GetArchivedChecklistsAsync()
    {
        _logger.LogInformation("Fetching archived checklists");

        var checklists = await _context.ChecklistInstances
            .Include(c => c.Items.OrderBy(i => i.DisplayOrder))
            .Where(c => c.IsArchived)
            .OrderBy(c => c.ArchivedAt)
            .AsNoTracking()
            .ToListAsync();

        _logger.LogInformation("Retrieved {Count} archived checklists", checklists.Count);

        return checklists.Select(ChecklistMapper.MapToDto).ToList();
    }

    public async Task RecalculateProgressAsync(Guid checklistId)
    {
        await ChecklistProgressHelper.RecalculateProgressAsync(
            _context,
            _logger,
            checklistId);
    }

    public async Task<ChecklistInstanceDto?> CloneChecklistAsync(
        Guid id,
        string newName,
        bool preserveStatus,
        UserContext userContext)
    {
        try
        {
            var clone = await ChecklistCreationHelper.CloneChecklistAsync(
                _context,
                _logger,
                id,
                newName,
                preserveStatus,
                userContext);

            _context.ChecklistInstances.Add(clone);
            await _context.SaveChangesAsync();

            return ChecklistMapper.MapToDto(clone);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to clone checklist {ChecklistId}", id);
            return null;
        }
    }

}

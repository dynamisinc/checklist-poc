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
/// ChecklistItemService - Implementation of checklist item business logic
///
/// Purpose:
///   Handles individual ChecklistItem operations (completion, status, notes).
///   Orchestrates item-level updates with permission checks and progress tracking.
///
/// Key Business Logic:
///   - Permission Validation: Checks AllowedPositions before any update
///   - Item Completion: Updates IsCompleted, CompletedBy, CompletedAt (checkbox items)
///   - Status Updates: Validates status against StatusOptions (status items)
///   - Notes Management: Updates Notes field (any item type)
///   - Progress Triggering: Auto-calls ChecklistProgressHelper after completion/status changes
///
/// Dependencies:
///   - ChecklistDbContext: Database access via EF Core
///   - ILogger: Application Insights and console logging
///   - ChecklistMapper: Entity-to-DTO mapping
///   - ChecklistProgressHelper: Progress recalculation
///
/// Design Decisions:
///   - All methods are async for database I/O
///   - Returns DTOs, not entities (encapsulation)
///   - Throws exceptions for error cases (caught by middleware)
///   - Comprehensive logging for all operations
///   - User attribution on all updates (LastModifiedBy, LastModifiedByPosition)
///   - Position-based permissions enforced before any modification
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public class ChecklistItemService : IChecklistItemService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<ChecklistItemService> _logger;
    private readonly IHubContext<ChecklistHub> _hubContext;

    public ChecklistItemService(
        ChecklistDbContext context,
        ILogger<ChecklistItemService> logger,
        IHubContext<ChecklistHub> hubContext)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
    }

    public async Task<ChecklistItemDto?> GetItemByIdAsync(Guid checklistId, Guid itemId)
    {
        _logger.LogInformation(
            "Fetching item {ItemId} from checklist {ChecklistId}",
            itemId,
            checklistId);

        var item = await _context.ChecklistItems
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ChecklistInstanceId == checklistId);

        if (item == null)
        {
            _logger.LogWarning(
                "Item {ItemId} not found in checklist {ChecklistId}",
                itemId,
                checklistId);
            return null;
        }

        return ChecklistMapper.MapItemToDto(item);
    }

    public async Task<ChecklistItemDto?> UpdateItemCompletionAsync(
        Guid checklistId,
        Guid itemId,
        UpdateItemCompletionRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Updating completion for item {ItemId} in checklist {ChecklistId} by {User} ({Position})",
            itemId,
            checklistId,
            userContext.Email,
            userContext.Position);

        var item = await _context.ChecklistItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ChecklistInstanceId == checklistId);

        if (item == null)
        {
            _logger.LogWarning(
                "Item {ItemId} not found in checklist {ChecklistId}",
                itemId,
                checklistId);
            return null;
        }

        // Validate item type
        if (item.ItemType != "checkbox")
        {
            _logger.LogError(
                "Cannot update completion for non-checkbox item {ItemId} (type: {ItemType})",
                itemId,
                item.ItemType);
            throw new InvalidOperationException(
                $"Item {itemId} is not a checkbox item. Use UpdateItemStatusAsync for status items.");
        }

        // Validate position permissions
        ValidatePositionPermission(item, userContext);

        // Update completion status
        item.IsCompleted = request.IsCompleted;
        item.CompletedBy = request.IsCompleted ? userContext.Email : null;
        item.CompletedByPosition = request.IsCompleted ? userContext.Position : null;
        item.CompletedAt = request.IsCompleted ? DateTime.UtcNow : null;

        // Update notes if provided
        if (request.Notes != null)
        {
            item.Notes = request.Notes;
        }

        // Update audit fields
        item.LastModifiedBy = userContext.Email;
        item.LastModifiedByPosition = userContext.Position;
        item.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Item {ItemId} marked as {Status} by {User}",
            itemId,
            request.IsCompleted ? "COMPLETE" : "INCOMPLETE",
            userContext.Email);

        // Broadcast real-time update to all connected clients viewing this checklist
        await _hubContext.Clients
            .Group($"checklist-{checklistId}")
            .SendAsync("ItemCompletionChanged", new
            {
                checklistId = checklistId.ToString(),
                itemId = itemId.ToString(),
                isCompleted = item.IsCompleted,
                completedBy = item.CompletedBy,
                completedByPosition = item.CompletedByPosition,
                completedAt = item.CompletedAt
            });

        // Trigger progress recalculation
        await ChecklistProgressHelper.RecalculateProgressAsync(_context, _logger, checklistId);

        // Reload item for return
        var updatedItem = await _context.ChecklistItems
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId);

        return updatedItem == null ? null : ChecklistMapper.MapItemToDto(updatedItem);
    }

    public async Task<ChecklistItemDto?> UpdateItemStatusAsync(
        Guid checklistId,
        Guid itemId,
        UpdateItemStatusRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Updating status for item {ItemId} in checklist {ChecklistId} to '{Status}' by {User}",
            itemId,
            checklistId,
            request.Status,
            userContext.Email);

        var item = await _context.ChecklistItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ChecklistInstanceId == checklistId);

        if (item == null)
        {
            _logger.LogWarning(
                "Item {ItemId} not found in checklist {ChecklistId}",
                itemId,
                checklistId);
            return null;
        }

        // Validate item type
        if (item.ItemType != "status")
        {
            _logger.LogError(
                "Cannot update status for non-status item {ItemId} (type: {ItemType})",
                itemId,
                item.ItemType);
            throw new InvalidOperationException(
                $"Item {itemId} is not a status item. Use UpdateItemCompletionAsync for checkbox items.");
        }

        // Validate position permissions
        ValidatePositionPermission(item, userContext);

        // Validate status value against allowed options
        if (!string.IsNullOrEmpty(item.StatusConfiguration))
        {
            var statusOptions = System.Text.Json.JsonSerializer.Deserialize<List<StatusOption>>(
                item.StatusConfiguration,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (statusOptions != null && statusOptions.Count > 0)
            {
                var allowedLabels = statusOptions.Select(s => s.Label).ToList();
                if (!allowedLabels.Contains(request.Status, StringComparer.OrdinalIgnoreCase))
                {
                    _logger.LogError(
                        "Invalid status '{Status}' for item {ItemId}. Allowed: {AllowedStatuses}",
                        request.Status,
                        itemId,
                        string.Join(", ", allowedLabels));
                    throw new InvalidOperationException(
                        $"Status '{request.Status}' is not valid. Allowed values: {string.Join(", ", allowedLabels)}");
                }
            }
        }

        // Update status
        item.CurrentStatus = request.Status;

        // Mark as complete if status is "Complete" (case-insensitive)
        item.IsCompleted = request.Status.Equals("Complete", StringComparison.OrdinalIgnoreCase);

        // Update notes if provided
        if (request.Notes != null)
        {
            item.Notes = request.Notes;
        }

        // Update audit fields
        item.LastModifiedBy = userContext.Email;
        item.LastModifiedByPosition = userContext.Position;
        item.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Item {ItemId} status updated to '{Status}' by {User}",
            itemId,
            request.Status,
            userContext.Email);

        // Broadcast real-time update to all connected clients viewing this checklist
        await _hubContext.Clients
            .Group($"checklist-{checklistId}")
            .SendAsync("ItemStatusChanged", new
            {
                checklistId = checklistId.ToString(),
                itemId = itemId.ToString(),
                newStatus = item.CurrentStatus,
                isCompleted = item.IsCompleted,
                changedBy = userContext.Email,
                changedByPosition = userContext.Position,
                changedAt = item.LastModifiedAt
            });

        // Trigger progress recalculation (status items count as complete if status = "Complete")
        await ChecklistProgressHelper.RecalculateProgressAsync(_context, _logger, checklistId);

        // Reload item for return
        var updatedItem = await _context.ChecklistItems
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId);

        return updatedItem == null ? null : ChecklistMapper.MapItemToDto(updatedItem);
    }

    public async Task<ChecklistItemDto?> UpdateItemNotesAsync(
        Guid checklistId,
        Guid itemId,
        UpdateItemNotesRequest request,
        UserContext userContext)
    {
        _logger.LogInformation(
            "Updating notes for item {ItemId} in checklist {ChecklistId} by {User}",
            itemId,
            checklistId,
            userContext.Email);

        var item = await _context.ChecklistItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ChecklistInstanceId == checklistId);

        if (item == null)
        {
            _logger.LogWarning(
                "Item {ItemId} not found in checklist {ChecklistId}",
                itemId,
                checklistId);
            return null;
        }

        // Validate position permissions
        ValidatePositionPermission(item, userContext);

        // Update notes
        item.Notes = request.Notes;

        // Update audit fields
        item.LastModifiedBy = userContext.Email;
        item.LastModifiedByPosition = userContext.Position;
        item.LastModifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "Notes updated for item {ItemId} by {User}",
            itemId,
            userContext.Email);

        // Broadcast real-time update to all connected clients viewing this checklist
        await _hubContext.Clients
            .Group($"checklist-{checklistId}")
            .SendAsync("ItemNotesChanged", new
            {
                checklistId = checklistId.ToString(),
                itemId = itemId.ToString(),
                notes = item.Notes,
                changedBy = userContext.Email,
                changedByPosition = userContext.Position,
                changedAt = item.LastModifiedAt
            });

        // Note: Does NOT trigger progress recalculation (notes-only changes don't affect progress)

        // Reload item for return
        var updatedItem = await _context.ChecklistItems
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == itemId);

        return updatedItem == null ? null : ChecklistMapper.MapItemToDto(updatedItem);
    }

    /// <summary>
    /// Validates that the user's position is allowed to modify this item
    /// Throws UnauthorizedAccessException if not allowed
    /// </summary>
    /// <param name="item">The item to check permissions for</param>
    /// <param name="userContext">Current user context</param>
    /// <exception cref="UnauthorizedAccessException">If user position not in AllowedPositions</exception>
    private void ValidatePositionPermission(
        Models.Entities.ChecklistItem item,
        UserContext userContext)
    {
        // Null or empty AllowedPositions = accessible to all positions
        if (string.IsNullOrEmpty(item.AllowedPositions))
        {
            return;
        }

        var allowedPositions = item.AllowedPositions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (!allowedPositions.Contains(userContext.Position, StringComparer.OrdinalIgnoreCase))
        {
            _logger.LogError(
                "User {User} with position '{Position}' is not authorized to modify item {ItemId} (allowed: {AllowedPositions})",
                userContext.Email,
                userContext.Position,
                item.Id,
                item.AllowedPositions);

            throw new UnauthorizedAccessException(
                $"Position '{userContext.Position}' is not authorized to modify this item. Allowed positions: {item.AllowedPositions}");
        }
    }
}

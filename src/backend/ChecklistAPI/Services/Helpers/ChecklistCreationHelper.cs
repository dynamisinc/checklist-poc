using ChecklistAPI.Data;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChecklistAPI.Services.Helpers;

/// <summary>
/// ChecklistCreationHelper - Helper for complex checklist creation logic
///
/// Purpose:
///   Handles template instantiation and checklist cloning.
///   Extracted from ChecklistService to keep files under 250 lines.
///
/// Single Responsibility:
///   ONLY handles creation logic (from template or cloning).
///   All other CRUD operations remain in ChecklistService.
///
/// Dependencies:
///   - ChecklistDbContext: Database access
///   - ILogger: Logging
///
/// Design Pattern:
///   - Static methods (no state)
///   - Called by ChecklistService
///   - Returns entities (not DTOs) for service to save
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public static class ChecklistCreationHelper
{
    /// <summary>
    /// Creates a checklist instance from a template
    /// Copies all template items to checklist items
    /// </summary>
    public static async Task<ChecklistInstance> CreateFromTemplateAsync(
        ChecklistDbContext context,
        ILogger logger,
        CreateFromTemplateRequest request,
        UserContext userContext)
    {
        logger.LogInformation(
            "Creating checklist from template {TemplateId} by {User}",
            request.TemplateId,
            userContext.Email);

        // Retrieve template with items
        var template = await context.Templates
            .Include(t => t.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.TemplateId);

        if (template == null || !template.IsActive || template.IsArchived)
        {
            throw new InvalidOperationException(
                $"Template {request.TemplateId} not found or not available");
        }

        // Create checklist instance
        // Use defaults for EventId/EventName if not provided (POC mode)
        var checklist = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = request.Name ?? $"{template.Name} - {DateTime.UtcNow:yyyy-MM-dd}",
            TemplateId = template.Id,
            EventId = request.EventId ?? "POC-Event-001",
            EventName = request.EventName ?? "POC Demo Event",
            OperationalPeriodId = request.OperationalPeriodId,
            OperationalPeriodName = request.OperationalPeriodName,
            AssignedPositions = request.AssignedPositions,
            CreatedBy = userContext.Email,
            CreatedByPosition = userContext.Position,
            CreatedAt = DateTime.UtcNow
        };

        // Copy items from template
        foreach (var templateItem in template.Items)
        {
            checklist.Items.Add(new ChecklistItem
            {
                Id = Guid.NewGuid(),
                ChecklistInstanceId = checklist.Id,
                TemplateItemId = templateItem.Id,
                ItemText = templateItem.ItemText,
                ItemType = templateItem.ItemType,
                DisplayOrder = templateItem.DisplayOrder,
                IsRequired = templateItem.IsRequired,
                StatusConfiguration = templateItem.StatusConfiguration,
                AllowedPositions = templateItem.AllowedPositions,
                CreatedAt = DateTime.UtcNow
            });
        }

        // Initialize progress tracking
        InitializeProgress(checklist);

        logger.LogInformation(
            "Created checklist {ChecklistId} with {ItemCount} items from template {TemplateId}",
            checklist.Id,
            checklist.Items.Count,
            template.Id);

        return checklist;
    }

    /// <summary>
    /// Clones an existing checklist with a new name
    /// Supports both "clean copy" (reset status) and "direct copy" (preserve status)
    /// </summary>
    /// <param name="preserveStatus">If true, preserves completion status and notes; if false, resets to fresh checklist</param>
    public static async Task<ChecklistInstance> CloneChecklistAsync(
        ChecklistDbContext context,
        ILogger logger,
        Guid checklistId,
        string newName,
        bool preserveStatus,
        UserContext userContext)
    {
        logger.LogInformation(
            "Cloning checklist {ChecklistId} as '{NewName}' ({Mode})",
            checklistId,
            newName,
            preserveStatus ? "direct copy" : "clean copy");

        var original = await context.ChecklistInstances
            .Include(c => c.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == checklistId);

        if (original == null)
        {
            throw new InvalidOperationException(
                $"Checklist {checklistId} not found");
        }

        var clone = new ChecklistInstance
        {
            Id = Guid.NewGuid(),
            Name = newName,
            TemplateId = original.TemplateId,
            EventId = original.EventId,
            EventName = original.EventName,
            OperationalPeriodId = original.OperationalPeriodId,
            OperationalPeriodName = original.OperationalPeriodName,
            AssignedPositions = original.AssignedPositions,
            CreatedBy = userContext.Email,
            CreatedByPosition = userContext.Position,
            CreatedAt = DateTime.UtcNow
        };

        // Copy items
        foreach (var item in original.Items)
        {
            var newItem = new ChecklistItem
            {
                Id = Guid.NewGuid(),
                ChecklistInstanceId = clone.Id,
                TemplateItemId = item.TemplateItemId,
                ItemText = item.ItemText,
                ItemType = item.ItemType,
                DisplayOrder = item.DisplayOrder,
                IsRequired = item.IsRequired,
                StatusConfiguration = item.StatusConfiguration,
                AllowedPositions = item.AllowedPositions,
                CreatedAt = DateTime.UtcNow
            };

            // Preserve status if requested (direct copy)
            if (preserveStatus)
            {
                newItem.IsCompleted = item.IsCompleted;
                newItem.CompletedAt = item.CompletedAt;
                newItem.CompletedBy = item.CompletedBy;
                newItem.CompletedByPosition = item.CompletedByPosition;
                newItem.CurrentStatus = item.CurrentStatus;
                newItem.Notes = item.Notes;
                newItem.LastModifiedAt = item.LastModifiedAt;
                newItem.LastModifiedBy = item.LastModifiedBy;
                newItem.LastModifiedByPosition = item.LastModifiedByPosition;
            }
            // Otherwise reset (clean copy) - already done by default

            clone.Items.Add(newItem);
        }

        // Initialize or copy progress tracking
        if (preserveStatus)
        {
            // Copy progress from original
            clone.TotalItems = original.TotalItems;
            clone.CompletedItems = original.CompletedItems;
            clone.RequiredItems = original.RequiredItems;
            clone.RequiredItemsCompleted = original.RequiredItemsCompleted;
            clone.ProgressPercentage = original.ProgressPercentage;
        }
        else
        {
            // Initialize fresh progress
            InitializeProgress(clone);
        }

        logger.LogInformation(
            "Cloned checklist {OriginalId} to {NewId} with {ItemCount} items",
            checklistId,
            clone.Id,
            clone.Items.Count);

        return clone;
    }

    /// <summary>
    /// Initializes progress tracking fields for a new checklist
    /// </summary>
    private static void InitializeProgress(ChecklistInstance checklist)
    {
        checklist.TotalItems = checklist.Items.Count;
        checklist.CompletedItems = 0;
        checklist.RequiredItems = checklist.Items.Count(i => i.IsRequired);
        checklist.RequiredItemsCompleted = 0;
        checklist.ProgressPercentage = 0;
    }
}

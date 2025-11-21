using ChecklistAPI.Data;
using ChecklistAPI.Models;
using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;
using ChecklistAPI.Models.Enums;
using Microsoft.EntityFrameworkCore;

namespace ChecklistAPI.Services.Helpers;

/// <summary>
/// TemplateCreationHelper - Helper for template creation and duplication logic
///
/// Purpose:
///   Handles template creation from requests and duplication of existing templates.
///   Extracted from TemplateService to keep files under 250 lines.
///
/// Single Responsibility:
///   ONLY handles creation and duplication logic.
///   All other CRUD operations remain in TemplateService.
///
/// Dependencies:
///   - ChecklistDbContext: Database access
///   - ILogger: Logging
///
/// Design Pattern:
///   - Static methods (no state)
///   - Called by TemplateService
///   - Returns entities (not DTOs) for service to save
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public static class TemplateCreationHelper
{
    /// <summary>
    /// Creates a new template from a request
    /// Adds all requested items with proper ordering
    /// </summary>
    public static Template CreateTemplate(
        CreateTemplateRequest request,
        UserContext userContext,
        ILogger logger)
    {
        logger.LogInformation(
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
            CreatedAt = DateTime.UtcNow,
            TemplateType = request.TemplateType ?? TemplateType.Manual,
            AutoCreateForCategories = request.AutoCreateForCategories,
            RecurrenceConfig = request.RecurrenceConfig,
            RecommendedPositions = request.RecommendedPositions,
            EventCategories = request.EventCategories,
            UsageCount = 0,
            LastUsedAt = null
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
                StatusConfiguration = itemRequest.StatusConfiguration,
                DefaultNotes = itemRequest.Notes,
                CreatedAt = DateTime.UtcNow
            });
        }

        logger.LogInformation(
            "Created template {TemplateId} with {ItemCount} items",
            template.Id,
            template.Items.Count);

        return template;
    }

    /// <summary>
    /// Duplicates an existing template with a new name
    /// Copies all items from the original
    /// </summary>
    public static async Task<Template> DuplicateTemplateAsync(
        ChecklistDbContext context,
        ILogger logger,
        Guid templateId,
        string newName,
        UserContext userContext)
    {
        logger.LogInformation(
            "Duplicating template {TemplateId} as '{NewName}'",
            templateId,
            newName);

        var original = await context.Templates
            .Include(t => t.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (original == null)
        {
            throw new InvalidOperationException(
                $"Template {templateId} not found");
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
            CreatedAt = DateTime.UtcNow,
            TemplateType = original.TemplateType,
            AutoCreateForCategories = original.AutoCreateForCategories,
            RecurrenceConfig = original.RecurrenceConfig,
            RecommendedPositions = original.RecommendedPositions,
            EventCategories = original.EventCategories,
            UsageCount = 0, // Reset usage count for duplicate
            LastUsedAt = null // Reset usage timestamp for duplicate
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
                StatusConfiguration = item.StatusConfiguration,
                DefaultNotes = item.DefaultNotes,
                IsRequired = item.IsRequired,
                CreatedAt = DateTime.UtcNow
            });
        }

        logger.LogInformation(
            "Duplicated template {OriginalId} to {NewId} with {ItemCount} items",
            templateId,
            duplicate.Id,
            duplicate.Items.Count);

        return duplicate;
    }
}

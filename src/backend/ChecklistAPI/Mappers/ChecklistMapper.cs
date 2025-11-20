using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Mappers;

/// <summary>
/// ChecklistMapper - Static utility class for entity-to-DTO mapping
///
/// Purpose:
///   Centralizes all mapping logic for ChecklistInstance and ChecklistItem.
///   Keeps mapping DRY and separate from business logic.
///
/// Single Responsibility:
///   ONLY handles entity-to-DTO conversion.
///   No business logic, no database access.
///
/// Usage:
///   var dto = ChecklistMapper.MapToDto(checklist);
///   var itemDto = ChecklistMapper.MapItemToDto(item);
///
/// Design Decisions:
///   - Static class (no state, pure functions)
///   - Returns immutable DTOs (record types)
///   - Handles null safety
///   - Orders items by DisplayOrder in DTO
///
/// Author: Checklist POC Team
/// Last Modified: 2025-11-20
/// </summary>
public static class ChecklistMapper
{
    /// <summary>
    /// Maps ChecklistInstance entity to ChecklistInstanceDto
    /// Includes all audit fields and nested items
    /// </summary>
    /// <param name="checklist">ChecklistInstance entity from database</param>
    /// <returns>Immutable ChecklistInstanceDto for API response</returns>
    public static ChecklistInstanceDto MapToDto(ChecklistInstance checklist)
    {
        return new ChecklistInstanceDto
        {
            Id = checklist.Id,
            Name = checklist.Name,
            TemplateId = checklist.TemplateId,
            EventId = checklist.EventId,
            EventName = checklist.EventName,
            OperationalPeriodId = checklist.OperationalPeriodId,
            OperationalPeriodName = checklist.OperationalPeriodName,
            AssignedPositions = checklist.AssignedPositions,
            ProgressPercentage = checklist.ProgressPercentage,
            TotalItems = checklist.TotalItems,
            CompletedItems = checklist.CompletedItems,
            RequiredItems = checklist.RequiredItems,
            RequiredItemsCompleted = checklist.RequiredItemsCompleted,
            IsArchived = checklist.IsArchived,
            ArchivedBy = checklist.ArchivedBy,
            ArchivedAt = checklist.ArchivedAt,
            CreatedBy = checklist.CreatedBy,
            CreatedByPosition = checklist.CreatedByPosition,
            CreatedAt = checklist.CreatedAt,
            LastModifiedBy = checklist.LastModifiedBy,
            LastModifiedByPosition = checklist.LastModifiedByPosition,
            LastModifiedAt = checklist.LastModifiedAt,
            Items = checklist.Items
                .OrderBy(i => i.DisplayOrder)
                .Select(MapItemToDto)
                .ToList()
        };
    }

    /// <summary>
    /// Maps ChecklistItem entity to ChecklistItemDto
    /// Includes completion status and audit fields
    /// </summary>
    /// <param name="item">ChecklistItem entity from database</param>
    /// <returns>Immutable ChecklistItemDto for API response</returns>
    public static ChecklistItemDto MapItemToDto(ChecklistItem item)
    {
        return new ChecklistItemDto
        {
            Id = item.Id,
            ChecklistInstanceId = item.ChecklistInstanceId,
            TemplateItemId = item.TemplateItemId,
            ItemText = item.ItemText,
            ItemType = item.ItemType,
            DisplayOrder = item.DisplayOrder,
            IsRequired = item.IsRequired,
            IsCompleted = item.IsCompleted,
            CompletedBy = item.CompletedBy,
            CompletedByPosition = item.CompletedByPosition,
            CompletedAt = item.CompletedAt,
            CurrentStatus = item.CurrentStatus,
            StatusConfiguration = item.StatusConfiguration,
            AllowedPositions = item.AllowedPositions,
            Notes = item.Notes,
            CreatedAt = item.CreatedAt,
            LastModifiedBy = item.LastModifiedBy,
            LastModifiedByPosition = item.LastModifiedByPosition,
            LastModifiedAt = item.LastModifiedAt
        };
    }
}

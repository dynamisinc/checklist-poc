using ChecklistAPI.Models.DTOs;
using ChecklistAPI.Models.Entities;

namespace ChecklistAPI.Mappers;

/// <summary>
/// TemplateMapper - Static utility class for template entity-to-DTO mapping
///
/// Purpose:
///   Centralizes all mapping logic for Template and TemplateItem entities.
///   Keeps mapping DRY and separate from business logic.
///
/// Single Responsibility:
///   ONLY handles entity-to-DTO conversion.
///   No business logic, no database access.
///
/// Usage:
///   var dto = TemplateMapper.MapToDto(template);
///   var itemDto = TemplateMapper.MapItemToDto(item);
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
public static class TemplateMapper
{
    /// <summary>
    /// Maps Template entity to TemplateDto
    /// Includes all audit fields and nested items
    /// </summary>
    /// <param name="template">Template entity from database</param>
    /// <returns>Immutable TemplateDto for API response</returns>
    public static TemplateDto MapToDto(Template template)
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
            Items = template.Items
                .OrderBy(i => i.DisplayOrder)
                .Select(MapItemToDto)
                .ToList()
        };
    }

    /// <summary>
    /// Maps TemplateItem entity to TemplateItemDto
    /// Includes all item configuration and default notes
    /// </summary>
    /// <param name="item">TemplateItem entity from database</param>
    /// <returns>Immutable TemplateItemDto for API response</returns>
    public static TemplateItemDto MapItemToDto(TemplateItem item)
    {
        return new TemplateItemDto
        {
            Id = item.Id,
            TemplateId = item.TemplateId,
            ItemText = item.ItemText,
            ItemType = item.ItemType,
            DisplayOrder = item.DisplayOrder,
            IsRequired = item.IsRequired,
            StatusConfiguration = item.StatusConfiguration,
            AllowedPositions = item.AllowedPositions,
            DefaultNotes = item.DefaultNotes
        };
    }
}

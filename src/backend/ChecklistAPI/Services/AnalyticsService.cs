using Microsoft.EntityFrameworkCore;
using ChecklistAPI.Data;
using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Services;

/// <summary>
/// Service for generating analytics and insights about templates and library items
/// </summary>
public class AnalyticsService : IAnalyticsService
{
    private readonly ChecklistDbContext _context;
    private readonly ILogger<AnalyticsService> _logger;

    public AnalyticsService(ChecklistDbContext context, ILogger<AnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get analytics dashboard data
    /// </summary>
    public async Task<AnalyticsDashboardDto> GetDashboardAsync()
    {
        _logger.LogInformation("Generating analytics dashboard");

        try
        {
            // Get overview statistics
            var totalTemplates = await _context.Templates
                .Where(t => !t.IsArchived)
                .CountAsync();

            var totalChecklistInstances = await _context.ChecklistInstances
                .Where(c => !c.IsArchived)
                .CountAsync();

            var totalLibraryItems = await _context.ItemLibraryEntries
                .Where(i => !i.IsArchived)
                .CountAsync();

            // Get template usage counts
            var templateUsage = await _context.Templates
                .Where(t => !t.IsArchived)
                .Select(t => new
                {
                    Template = t,
                    InstanceCount = _context.ChecklistInstances
                        .Count(c => c.TemplateId == t.Id && !c.IsArchived)
                })
                .ToListAsync();

            var activeTemplates = templateUsage.Count(t => t.InstanceCount > 0);
            var unusedTemplates = templateUsage.Count(t => t.InstanceCount == 0);

            var overview = new AnalyticsOverviewDto(
                TotalTemplates: totalTemplates,
                TotalChecklistInstances: totalChecklistInstances,
                TotalLibraryItems: totalLibraryItems,
                ActiveTemplates: activeTemplates,
                UnusedTemplates: unusedTemplates
            );

            // Most used templates (top 5)
            var mostUsedTemplates = templateUsage
                .Where(t => t.InstanceCount > 0)
                .OrderByDescending(t => t.InstanceCount)
                .Take(5)
                .Select(t => new TemplateUsageDto(
                    Id: t.Template.Id,
                    Name: t.Template.Name,
                    Category: t.Template.Category,
                    UsageCount: t.InstanceCount,
                    CreatedAt: t.Template.CreatedAt,
                    CreatedBy: t.Template.CreatedBy
                ))
                .ToList();

            // Never used templates
            var neverUsedTemplates = templateUsage
                .Where(t => t.InstanceCount == 0)
                .OrderByDescending(t => t.Template.CreatedAt)
                .Take(5)
                .Select(t => new TemplateUsageDto(
                    Id: t.Template.Id,
                    Name: t.Template.Name,
                    Category: t.Template.Category,
                    UsageCount: 0,
                    CreatedAt: t.Template.CreatedAt,
                    CreatedBy: t.Template.CreatedBy
                ))
                .ToList();

            // Most popular library items (top 5)
            var mostPopularLibraryItems = await _context.ItemLibraryEntries
                .Where(i => !i.IsArchived && i.UsageCount > 0)
                .OrderByDescending(i => i.UsageCount)
                .Take(5)
                .Select(i => new ItemLibraryUsageDto(
                    Id: i.Id,
                    ItemText: i.ItemText,
                    Category: i.Category,
                    ItemType: i.ItemType,
                    UsageCount: i.UsageCount
                ))
                .ToListAsync();

            // Recently created templates (last 5)
            var recentlyCreatedTemplates = await _context.Templates
                .Where(t => !t.IsArchived)
                .OrderByDescending(t => t.CreatedAt)
                .Take(5)
                .Include(t => t.Items)
                .Select(t => new TemplateDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Description = t.Description,
                    Category = t.Category,
                    Tags = t.Tags,
                    IsActive = t.IsActive,
                    IsArchived = t.IsArchived,
                    CreatedBy = t.CreatedBy,
                    CreatedByPosition = t.CreatedByPosition,
                    CreatedAt = t.CreatedAt,
                    LastModifiedBy = t.LastModifiedBy,
                    LastModifiedByPosition = t.LastModifiedByPosition,
                    LastModifiedAt = t.LastModifiedAt,
                    ArchivedBy = t.ArchivedBy,
                    ArchivedAt = t.ArchivedAt,
                    Items = t.Items.Select(i => new TemplateItemDto
                    {
                        Id = i.Id,
                        TemplateId = i.TemplateId,
                        ItemText = i.ItemText,
                        ItemType = i.ItemType,
                        DisplayOrder = i.DisplayOrder,
                        IsRequired = i.IsRequired,
                        StatusConfiguration = i.StatusConfiguration,
                        AllowedPositions = i.AllowedPositions,
                        DefaultNotes = i.DefaultNotes
                    }).ToList()
                })
                .ToListAsync();

            var dashboard = new AnalyticsDashboardDto(
                Overview: overview,
                MostUsedTemplates: mostUsedTemplates,
                NeverUsedTemplates: neverUsedTemplates,
                MostPopularLibraryItems: mostPopularLibraryItems,
                RecentlyCreatedTemplates: recentlyCreatedTemplates
            );

            _logger.LogInformation("Analytics dashboard generated successfully");
            return dashboard;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating analytics dashboard");
            throw;
        }
    }
}

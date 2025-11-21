namespace ChecklistAPI.Models.DTOs;

/// <summary>
/// Analytics dashboard data
/// </summary>
public record AnalyticsDashboardDto(
    AnalyticsOverviewDto Overview,
    List<TemplateUsageDto> MostUsedTemplates,
    List<TemplateUsageDto> NeverUsedTemplates,
    List<ItemLibraryUsageDto> MostPopularLibraryItems,
    List<TemplateDto> RecentlyCreatedTemplates
);

/// <summary>
/// Overview statistics
/// </summary>
public record AnalyticsOverviewDto(
    int TotalTemplates,
    int TotalChecklistInstances,
    int TotalLibraryItems,
    int ActiveTemplates,  // Templates with at least one instance
    int UnusedTemplates   // Templates with zero instances
);

/// <summary>
/// Template usage statistics
/// </summary>
public record TemplateUsageDto(
    Guid Id,
    string Name,
    string Category,
    int UsageCount,
    DateTime CreatedAt,
    string CreatedBy
);

/// <summary>
/// Library item usage statistics
/// </summary>
public record ItemLibraryUsageDto(
    Guid Id,
    string ItemText,
    string Category,
    string ItemType,
    int UsageCount
);

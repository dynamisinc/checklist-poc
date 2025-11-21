using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Services;

/// <summary>
/// Service for generating analytics and insights about templates and library items
/// </summary>
public interface IAnalyticsService
{
    /// <summary>
    /// Get analytics dashboard data
    /// </summary>
    Task<AnalyticsDashboardDto> GetDashboardAsync();
}

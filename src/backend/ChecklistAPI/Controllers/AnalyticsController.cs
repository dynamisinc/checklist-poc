using Microsoft.AspNetCore.Mvc;
using ChecklistAPI.Services;
using ChecklistAPI.Models.DTOs;

namespace ChecklistAPI.Controllers;

/// <summary>
/// Controller for analytics and insights
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IAnalyticsService analyticsService, ILogger<AnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Get analytics dashboard data
    /// </summary>
    /// <returns>Dashboard with overview, most used templates, popular library items, etc.</returns>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(AnalyticsDashboardDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<ActionResult<AnalyticsDashboardDto>> GetDashboard()
    {
        _logger.LogInformation("GET /api/analytics/dashboard requested");

        try
        {
            var dashboard = await _analyticsService.GetDashboardAsync();
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving analytics dashboard");
            return StatusCode(500, new { message = "Failed to retrieve analytics dashboard" });
        }
    }
}

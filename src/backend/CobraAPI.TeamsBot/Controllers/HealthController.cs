using CobraAPI.TeamsBot.Services;
using Microsoft.AspNetCore.Mvc;

namespace CobraAPI.TeamsBot.Controllers;

/// <summary>
/// Health check endpoint for monitoring bot availability.
/// Suitable for container orchestration health probes.
/// </summary>
[Route("api/[controller]")]
[ApiController]
public class HealthController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly ICobraApiClient _cobraApiClient;
    private readonly IConversationReferenceService _conversationReferenceService;
    private readonly ILogger<HealthController> _logger;

    public HealthController(
        IConfiguration configuration,
        ICobraApiClient cobraApiClient,
        IConversationReferenceService conversationReferenceService,
        ILogger<HealthController> logger)
    {
        _configuration = configuration;
        _cobraApiClient = cobraApiClient;
        _conversationReferenceService = conversationReferenceService;
        _logger = logger;
    }

    /// <summary>
    /// Returns basic liveness status.
    /// Use this endpoint for Kubernetes liveness probes.
    /// </summary>
    [HttpGet("live")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Live()
    {
        return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Returns detailed health status including dependencies.
    /// Use this endpoint for Kubernetes readiness probes.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Ready()
    {
        var appId = _configuration["MicrosoftAppId"];
        var hasAppId = !string.IsNullOrEmpty(appId);
        var cobraApiUrl = _configuration["CobraApi:BaseUrl"];
        var hasCobraApiKey = !string.IsNullOrEmpty(_configuration["CobraApi:ApiKey"]);

        // Check CobraAPI connectivity
        var cobraApiHealthy = false;
        string? cobraApiError = null;
        try
        {
            cobraApiHealthy = await _cobraApiClient.CheckHealthAsync();
        }
        catch (Exception ex)
        {
            cobraApiError = ex.Message;
            _logger.LogWarning(ex, "CobraAPI health check failed");
        }

        // Get conversation reference count
        var references = await _conversationReferenceService.GetAllAsync();
        var referenceCount = references.Count;

        var isHealthy = hasAppId || Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";
        var dependencies = new
        {
            cobraApi = new
            {
                healthy = cobraApiHealthy,
                url = cobraApiUrl ?? "(not configured)",
                hasApiKey = hasCobraApiKey,
                error = cobraApiError
            },
            inMemoryStorage = new
            {
                healthy = true,
                conversationReferences = referenceCount
            }
        };

        var response = new
        {
            status = isHealthy ? "healthy" : "degraded",
            service = "COBRA Teams Bot",
            version = GetType().Assembly.GetName().Version?.ToString() ?? "1.0.0",
            environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
            timestamp = DateTime.UtcNow,
            configuration = new
            {
                hasAppId,
                appIdPrefix = hasAppId && appId != null ? appId[..Math.Min(8, appId.Length)] + "..." : null,
                botDisplayName = _configuration["Bot:DisplayName"] ?? "COBRA Bot"
            },
            dependencies
        };

        return isHealthy ? Ok(response) : StatusCode(503, response);
    }
}

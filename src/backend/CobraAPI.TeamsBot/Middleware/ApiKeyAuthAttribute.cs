using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CobraAPI.TeamsBot.Middleware;

/// <summary>
/// Attribute to enforce API key authentication on internal endpoints.
/// Validates the X-Api-Key header against the configured CobraApi:ApiKey setting.
/// If no API key is configured, all requests are allowed (for development).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class ApiKeyAuthAttribute : Attribute, IAsyncActionFilter
{
    private const string ApiKeyHeaderName = "X-Api-Key";

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        var configuredApiKey = configuration["CobraApi:ApiKey"];

        // If no API key is configured, allow all requests (development mode)
        if (string.IsNullOrEmpty(configuredApiKey))
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<ApiKeyAuthAttribute>>();
            logger.LogWarning("No API key configured for internal endpoints. Set CobraApi:ApiKey in appsettings to secure these endpoints.");
            await next();
            return;
        }

        // Check for API key header
        if (!context.HttpContext.Request.Headers.TryGetValue(ApiKeyHeaderName, out var providedApiKey))
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "API key required",
                message = $"Missing {ApiKeyHeaderName} header"
            });
            return;
        }

        // Validate API key
        if (!string.Equals(configuredApiKey, providedApiKey, StringComparison.Ordinal))
        {
            context.Result = new UnauthorizedObjectResult(new
            {
                error = "Invalid API key",
                message = "The provided API key is not valid"
            });
            return;
        }

        await next();
    }
}

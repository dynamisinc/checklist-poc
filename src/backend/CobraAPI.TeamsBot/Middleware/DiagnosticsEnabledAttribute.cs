using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace CobraAPI.TeamsBot.Middleware;

/// <summary>
/// Attribute to control access to diagnostic endpoints based on environment and configuration.
/// In Development: Always enabled
/// In Production: Only enabled if Bot:EnableDiagnostics=true in configuration
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class DiagnosticsEnabledAttribute : Attribute, IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var environment = context.HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        var configuration = context.HttpContext.RequestServices.GetRequiredService<IConfiguration>();

        // Always allow in Development
        if (environment.IsDevelopment())
        {
            await next();
            return;
        }

        // In production, check if diagnostics are explicitly enabled
        var enableDiagnostics = configuration.GetValue<bool>("Bot:EnableDiagnostics", false);

        if (!enableDiagnostics)
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<DiagnosticsEnabledAttribute>>();
            logger.LogWarning(
                "Diagnostics endpoint access denied in {Environment}. Set Bot:EnableDiagnostics=true to enable.",
                environment.EnvironmentName);

            context.Result = new NotFoundObjectResult(new
            {
                error = "Endpoint not available",
                message = "Diagnostic endpoints are disabled in this environment."
            });
            return;
        }

        await next();
    }
}

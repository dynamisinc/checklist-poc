using Microsoft.Agents.Builder;
using Microsoft.Agents.Core.Models;
using Microsoft.Agents.Hosting.AspNetCore;

namespace CobraAPI.TeamsBot.Bots;

/// <summary>
/// Custom error handler for Microsoft 365 Agents SDK.
/// Note: The Agents SDK provides built-in error handling through the CloudAdapter.
/// This class is retained for backward compatibility and custom error logging.
/// </summary>
/// <remarks>
/// In the Agents SDK, error handling can also be configured via:
/// - Turn lifecycle hooks (preferred approach)
/// - Middleware registration
/// - The default CloudAdapter's OnTurnError callback
///
/// Migration note: This class no longer inherits from CloudAdapter.
/// The Agents SDK handles adapter registration automatically through builder.AddAgent().
/// </remarks>
public class AdapterWithErrorHandler
{
    private readonly ILogger<AdapterWithErrorHandler> _logger;

    /// <summary>
    /// Initializes the error handler.
    /// </summary>
    public AdapterWithErrorHandler(ILogger<AdapterWithErrorHandler> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _logger.LogInformation("Bot adapter error handler initialized");
    }

    /// <summary>
    /// Logs an error that occurred during turn processing.
    /// Can be called from turn error handlers.
    /// </summary>
    public async Task HandleTurnErrorAsync(ITurnContext turnContext, Exception exception, CancellationToken cancellationToken = default)
    {
        // Log the exception
        _logger.LogError(
            exception,
            "Agents SDK Error: {ErrorType} - {ErrorMessage}. Activity: {ActivityType} from {From}",
            exception.GetType().Name,
            exception.Message,
            turnContext.Activity?.Type,
            turnContext.Activity?.From?.Name ?? "Unknown");

        // Send a message to the user (if possible)
        try
        {
            // Only send error message if this is a message activity (not for system events)
            if (turnContext.Activity?.Type == ActivityTypes.Message)
            {
                var errorMessage = "Sorry, something went wrong processing your message. " +
                                   "The error has been logged. Please try again or contact support.";
                await turnContext.SendActivityAsync(MessageFactory.Text(errorMessage), cancellationToken);
            }
        }
        catch (Exception sendException)
        {
            _logger.LogError(sendException, "Failed to send error message to user");
        }

        // Send a trace activity for debugging
        await turnContext.TraceActivityAsync(
            "OnTurnError Trace",
            exception.ToString(),
            "https://www.botframework.com/schemas/error",
            "TurnError",
            cancellationToken);
    }
}

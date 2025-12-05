using Microsoft.Agents.Core.Models;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// Validation results for conversation reference checks.
/// </summary>
public enum ConversationReferenceStatus
{
    /// <summary>
    /// Reference is valid and can be used for messaging.
    /// </summary>
    Valid,

    /// <summary>
    /// Reference is missing or null.
    /// </summary>
    Missing,

    /// <summary>
    /// Reference is missing required fields (ServiceUrl, Conversation).
    /// </summary>
    Invalid,

    /// <summary>
    /// Reference has expired (bot likely uninstalled or removed from channel).
    /// Detected by Teams API returning 403/404.
    /// </summary>
    Expired,

    /// <summary>
    /// Reference may be stale (no activity for extended period).
    /// Should still attempt to use but may fail.
    /// </summary>
    PossiblyStale
}

/// <summary>
/// Result of conversation reference validation.
/// </summary>
public class ConversationReferenceValidationResult
{
    /// <summary>
    /// The validation status.
    /// </summary>
    public ConversationReferenceStatus Status { get; init; }

    /// <summary>
    /// Whether the reference can be used for messaging.
    /// True for Valid and PossiblyStale statuses.
    /// </summary>
    public bool CanAttemptSend => Status == ConversationReferenceStatus.Valid ||
                                   Status == ConversationReferenceStatus.PossiblyStale;

    /// <summary>
    /// Human-readable description of the validation result.
    /// </summary>
    public string Message { get; init; } = string.Empty;

    /// <summary>
    /// HTTP status code to return when this validation fails.
    /// </summary>
    public int? SuggestedHttpStatusCode { get; init; }

    /// <summary>
    /// Creates a successful validation result.
    /// </summary>
    public static ConversationReferenceValidationResult ValidResult() => new()
    {
        Status = ConversationReferenceStatus.Valid,
        Message = "Conversation reference is valid"
    };

    /// <summary>
    /// Creates a missing reference result.
    /// </summary>
    public static ConversationReferenceValidationResult MissingResult() => new()
    {
        Status = ConversationReferenceStatus.Missing,
        Message = "Conversation reference is missing. Bot may not be installed in this channel.",
        SuggestedHttpStatusCode = 404
    };

    /// <summary>
    /// Creates an invalid reference result.
    /// </summary>
    public static ConversationReferenceValidationResult InvalidResult(string details) => new()
    {
        Status = ConversationReferenceStatus.Invalid,
        Message = $"Conversation reference is invalid: {details}",
        SuggestedHttpStatusCode = 400
    };

    /// <summary>
    /// Creates an expired reference result.
    /// </summary>
    public static ConversationReferenceValidationResult ExpiredResult(string details) => new()
    {
        Status = ConversationReferenceStatus.Expired,
        Message = $"Conversation reference has expired: {details}",
        SuggestedHttpStatusCode = 410 // 410 Gone
    };

    /// <summary>
    /// Creates a possibly stale reference result.
    /// </summary>
    public static ConversationReferenceValidationResult PossiblyStaleResult(TimeSpan age) => new()
    {
        Status = ConversationReferenceStatus.PossiblyStale,
        Message = $"Conversation reference may be stale (age: {age.TotalDays:F1} days). Will attempt to send."
    };
}

/// <summary>
/// Interface for validating conversation references.
/// </summary>
public interface IConversationReferenceValidator
{
    /// <summary>
    /// Validates a conversation reference before attempting to send a message.
    /// </summary>
    ConversationReferenceValidationResult Validate(ConversationReference? reference);

    /// <summary>
    /// Determines if an exception indicates the conversation reference has expired.
    /// This helps detect when a bot has been uninstalled or removed from a channel.
    /// </summary>
    bool IsExpiredReferenceException(Exception ex);

    /// <summary>
    /// Gets a validation result from a send failure exception.
    /// </summary>
    ConversationReferenceValidationResult GetExpirationResult(Exception ex);
}

/// <summary>
/// Validates conversation references to detect expired or invalid references.
/// Helps handle scenarios where the bot has been uninstalled from Teams.
/// </summary>
public class ConversationReferenceValidator : IConversationReferenceValidator
{
    private readonly ILogger<ConversationReferenceValidator> _logger;

    // HTTP status codes that indicate the reference is expired/invalid
    private static readonly int[] ExpiredStatusCodes = [403, 404];

    // Error messages that indicate bot removal/uninstall
    private static readonly string[] ExpiredErrorPatterns =
    [
        "Bot is not part of the conversation",
        "Conversation not found",
        "The bot is not installed",
        "Resource not found",
        "Forbidden",
        "The conversation reference is not valid"
    ];

    public ConversationReferenceValidator(ILogger<ConversationReferenceValidator> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public ConversationReferenceValidationResult Validate(ConversationReference? reference)
    {
        if (reference == null)
        {
            _logger.LogDebug("Conversation reference is null");
            return ConversationReferenceValidationResult.MissingResult();
        }

        // Check required fields
        if (string.IsNullOrEmpty(reference.ServiceUrl))
        {
            _logger.LogDebug("Conversation reference missing ServiceUrl");
            return ConversationReferenceValidationResult.InvalidResult("ServiceUrl is required");
        }

        if (reference.Conversation == null)
        {
            _logger.LogDebug("Conversation reference missing Conversation");
            return ConversationReferenceValidationResult.InvalidResult("Conversation is required");
        }

        if (string.IsNullOrEmpty(reference.Conversation.Id))
        {
            _logger.LogDebug("Conversation reference missing Conversation.Id");
            return ConversationReferenceValidationResult.InvalidResult("Conversation.Id is required");
        }

        // Validate ServiceUrl format
        if (!Uri.TryCreate(reference.ServiceUrl, UriKind.Absolute, out var serviceUri) ||
            (serviceUri.Scheme != "http" && serviceUri.Scheme != "https"))
        {
            _logger.LogDebug("Conversation reference has invalid ServiceUrl: {ServiceUrl}", reference.ServiceUrl);
            return ConversationReferenceValidationResult.InvalidResult("ServiceUrl must be a valid HTTP/HTTPS URL");
        }

        _logger.LogDebug(
            "Conversation reference validated successfully. ConversationId: {ConversationId}, ServiceUrl: {ServiceUrl}",
            reference.Conversation.Id, reference.ServiceUrl);

        return ConversationReferenceValidationResult.ValidResult();
    }

    /// <inheritdoc />
    public bool IsExpiredReferenceException(Exception ex)
    {
        // Check for HTTP status codes
        if (ex is HttpRequestException httpEx && httpEx.StatusCode.HasValue)
        {
            if (ExpiredStatusCodes.Contains((int)httpEx.StatusCode.Value))
            {
                _logger.LogDebug("Exception indicates expired reference (HTTP {StatusCode})", httpEx.StatusCode);
                return true;
            }
        }

        // Check for known error message patterns
        var message = ex.Message ?? string.Empty;
        var innerMessage = ex.InnerException?.Message ?? string.Empty;

        foreach (var pattern in ExpiredErrorPatterns)
        {
            if (message.Contains(pattern, StringComparison.OrdinalIgnoreCase) ||
                innerMessage.Contains(pattern, StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogDebug("Exception message indicates expired reference: {Pattern}", pattern);
                return true;
            }
        }

        return false;
    }

    /// <inheritdoc />
    public ConversationReferenceValidationResult GetExpirationResult(Exception ex)
    {
        var detail = ex.Message;

        if (ex is HttpRequestException httpEx && httpEx.StatusCode.HasValue)
        {
            detail = $"HTTP {(int)httpEx.StatusCode} - {ex.Message}";
        }

        return ConversationReferenceValidationResult.ExpiredResult(detail);
    }
}

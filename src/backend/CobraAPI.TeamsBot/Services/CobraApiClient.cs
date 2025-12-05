using System.Net.Http.Json;
using CobraAPI.TeamsBot.Models;
using Microsoft.Extensions.Options;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// HTTP client for communicating with CobraAPI.
/// Forwards Teams messages to COBRA webhook endpoints.
/// Includes retry logic for transient failures.
/// </summary>
public class CobraApiClient : ICobraApiClient
{
    private readonly HttpClient _httpClient;
    private readonly CobraApiSettings _settings;
    private readonly ILogger<CobraApiClient> _logger;
    private readonly RetryOptions _retryOptions;

    public CobraApiClient(
        HttpClient httpClient,
        IOptions<CobraApiSettings> settings,
        ILogger<CobraApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

        // Configure retry options for CobraAPI calls
        _retryOptions = new RetryOptions
        {
            MaxRetries = 3,
            InitialDelay = TimeSpan.FromMilliseconds(500),
            MaxDelay = TimeSpan.FromSeconds(10),
            BackoffMultiplier = 2.0,
            AddJitter = true
        };

        // Set base address from configuration
        if (!string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _httpClient.BaseAddress = new Uri(_settings.BaseUrl.TrimEnd('/') + "/");
        }

        // Add API key header if configured
        if (!string.IsNullOrEmpty(_settings.ApiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Api-Key", _settings.ApiKey);
        }
    }

    /// <summary>
    /// Checks if CobraAPI is reachable and healthy.
    /// </summary>
    public async Task<bool> CheckHealthAsync()
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            return false;
        }

        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var response = await _httpClient.GetAsync("api/health", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "CobraAPI health check failed");
            return false;
        }
    }

    /// <summary>
    /// Sends a Teams message to the CobraAPI webhook endpoint with retry logic.
    /// </summary>
    public async Task<bool> SendWebhookAsync(Guid mappingId, TeamsWebhookPayload payload)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Message not forwarded.");
            return false;
        }

        _logger.LogInformation(
            "Forwarding Teams message {MessageId} to CobraAPI webhook for mapping {MappingId}",
            payload.MessageId, mappingId);

        var result = await RetryPolicy.ExecuteAsync(
            async ct =>
            {
                var response = await _httpClient.PostAsJsonAsync(
                    $"api/webhooks/teams/{mappingId}",
                    payload,
                    ct);

                if (response.IsSuccessStatusCode)
                {
                    return true;
                }

                // Check if this is a transient error that should be retried
                if (RetryPolicy.IsTransientHttpStatusCode(response.StatusCode))
                {
                    var errorContent = await response.Content.ReadAsStringAsync(ct);
                    _logger.LogWarning(
                        "CobraAPI webhook returned transient error {StatusCode}: {Error}",
                        response.StatusCode, errorContent);
                    return false; // Will trigger retry
                }

                // Non-transient error - log and don't retry
                var content = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "CobraAPI webhook returned {StatusCode}: {Error}",
                    response.StatusCode, content);
                return false;
            },
            _retryOptions,
            _logger,
            $"SendWebhook({mappingId})");

        if (!result.Success && result.LastException != null)
        {
            _logger.LogError(result.LastException,
                "Failed to forward message to CobraAPI after {Attempts} attempts",
                result.Attempts);
        }

        return result.Success && result.Value;
    }

    /// <summary>
    /// Sends a Teams message to CobraAPI when no mapping exists yet with retry logic.
    /// Used during initial channel linking flow.
    /// </summary>
    public async Task<bool> SendUnmappedMessageAsync(string conversationId, TeamsWebhookPayload payload)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Message not forwarded.");
            return false;
        }

        _logger.LogInformation(
            "Forwarding unmapped Teams message {MessageId} from conversation {ConversationId}",
            payload.MessageId, conversationId);

        var result = await RetryPolicy.ExecuteAsync(
            async ct =>
            {
                var response = await _httpClient.PostAsJsonAsync(
                    "api/webhooks/teams/unmapped",
                    payload,
                    ct);

                if (response.IsSuccessStatusCode)
                {
                    return true;
                }

                // 404 is expected if no mapping exists - don't retry
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogDebug("No mapping found for conversation {ConversationId} - message not stored",
                        conversationId);
                    return false;
                }

                // Check if transient
                if (RetryPolicy.IsTransientHttpStatusCode(response.StatusCode))
                {
                    return false; // Will trigger retry
                }

                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "CobraAPI returned {StatusCode} for unmapped message: {Error}",
                    response.StatusCode, errorContent);
                return false;
            },
            _retryOptions,
            _logger,
            $"SendUnmappedMessage({conversationId})");

        return result.Success && result.Value;
    }

    /// <summary>
    /// Gets the channel mapping ID for a Teams conversation from CobraAPI with retry logic.
    /// </summary>
    public async Task<Guid?> GetMappingIdForConversationAsync(string conversationId)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Cannot lookup mapping.");
            return null;
        }

        // URL encode the conversation ID (Teams IDs can contain special characters)
        var encodedId = Uri.EscapeDataString(conversationId);

        var result = await RetryPolicy.ExecuteAsync<Guid?>(
            async ct =>
            {
                var response = await _httpClient.GetAsync(
                    $"api/chat/diagnostics/teams-mapping/{encodedId}",
                    ct);

                if (response.IsSuccessStatusCode)
                {
                    var mappingResult = await response.Content.ReadFromJsonAsync<MappingLookupResponse>(ct);
                    if (mappingResult != null)
                    {
                        _logger.LogInformation(
                            "Found mapping {MappingId} for conversation {ConversationId}",
                            mappingResult.MappingId, conversationId);
                        return mappingResult.MappingId;
                    }
                }

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogDebug("No mapping found for conversation {ConversationId}", conversationId);
                    return null;
                }

                // Check if transient - should retry
                if (RetryPolicy.IsTransientHttpStatusCode(response.StatusCode))
                {
                    throw new HttpRequestException($"Transient error: {response.StatusCode}",
                        null, response.StatusCode);
                }

                _logger.LogWarning(
                    "Unexpected response {StatusCode} when looking up mapping for {ConversationId}",
                    response.StatusCode, conversationId);
                return null;
            },
            result => false, // null result doesn't trigger retry - only exceptions do
            _retryOptions,
            _logger,
            $"GetMappingId({conversationId})");

        return result.Value;
    }

    // === Stateless Architecture Methods (UC-TI-029) ===

    /// <summary>
    /// Stores or updates a ConversationReference in CobraAPI with retry logic.
    /// Called on every incoming message to keep the reference current.
    /// </summary>
    public async Task<StoreConversationReferenceResult?> StoreConversationReferenceAsync(
        StoreConversationReferenceRequest request)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Cannot store ConversationReference.");
            return null;
        }

        _logger.LogDebug(
            "Storing ConversationReference for {ConversationId}, TenantId: {TenantId}, IsEmulator: {IsEmulator}",
            request.ConversationId, request.TenantId, request.IsEmulator);

        var result = await RetryPolicy.ExecuteAsync<StoreConversationReferenceResult?>(
            async ct =>
            {
                var response = await _httpClient.PutAsJsonAsync(
                    "api/chat/teams/conversation-reference",
                    request,
                    ct);

                if (response.IsSuccessStatusCode)
                {
                    var storeResult = await response.Content.ReadFromJsonAsync<StoreConversationReferenceResult>(ct);
                    if (storeResult != null)
                    {
                        _logger.LogInformation(
                            "Stored ConversationReference for {ConversationId}, MappingId: {MappingId}, IsNew: {IsNew}",
                            request.ConversationId, storeResult.MappingId, storeResult.IsNewMapping);
                        return storeResult;
                    }
                }

                // Check if transient
                if (RetryPolicy.IsTransientHttpStatusCode(response.StatusCode))
                {
                    throw new HttpRequestException($"Transient error: {response.StatusCode}",
                        null, response.StatusCode);
                }

                var errorContent = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning(
                    "Failed to store ConversationReference. Status: {StatusCode}, Error: {Error}",
                    response.StatusCode, errorContent);
                return null;
            },
            result => false, // null result doesn't trigger retry
            _retryOptions,
            _logger,
            $"StoreConversationReference({request.ConversationId})");

        return result.Value;
    }

    /// <summary>
    /// Gets a ConversationReference from CobraAPI by conversation ID with retry logic.
    /// </summary>
    public async Task<GetConversationReferenceResult?> GetConversationReferenceAsync(string conversationId)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Cannot get ConversationReference.");
            return null;
        }

        var encodedId = Uri.EscapeDataString(conversationId);

        var result = await RetryPolicy.ExecuteAsync<GetConversationReferenceResult?>(
            async ct =>
            {
                var response = await _httpClient.GetAsync(
                    $"api/chat/teams/conversation-reference/{encodedId}",
                    ct);

                if (response.IsSuccessStatusCode)
                {
                    var getResult = await response.Content.ReadFromJsonAsync<GetConversationReferenceResult>(ct);
                    if (getResult != null)
                    {
                        _logger.LogDebug(
                            "Retrieved ConversationReference for {ConversationId}, MappingId: {MappingId}",
                            conversationId, getResult.MappingId);
                        return getResult;
                    }
                }

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogDebug("No ConversationReference found for {ConversationId}", conversationId);
                    return null;
                }

                // Check if transient
                if (RetryPolicy.IsTransientHttpStatusCode(response.StatusCode))
                {
                    throw new HttpRequestException($"Transient error: {response.StatusCode}",
                        null, response.StatusCode);
                }

                _logger.LogWarning(
                    "Unexpected response {StatusCode} when getting ConversationReference for {ConversationId}",
                    response.StatusCode, conversationId);
                return null;
            },
            result => false, // null doesn't trigger retry
            _retryOptions,
            _logger,
            $"GetConversationReference({conversationId})");

        return result.Value;
    }
}

/// <summary>
/// Response model for mapping lookup.
/// </summary>
public class MappingLookupResponse
{
    public Guid MappingId { get; set; }
    public Guid EventId { get; set; }
    public string TeamsConversationId { get; set; } = string.Empty;
    public string WebhookUrl { get; set; } = string.Empty;
}

/// <summary>
/// Configuration settings for CobraAPI client.
/// </summary>
public class CobraApiSettings
{
    /// <summary>
    /// Base URL of the CobraAPI service (e.g., "http://localhost:5000").
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Optional API key for authentication.
    /// For POC, this can be left empty if on the same network.
    /// </summary>
    public string? ApiKey { get; set; }
}

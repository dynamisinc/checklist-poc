using System.Net.Http.Json;
using CobraAPI.TeamsBot.Models;
using Microsoft.Extensions.Options;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// HTTP client for communicating with CobraAPI.
/// Forwards Teams messages to COBRA webhook endpoints.
/// </summary>
public class CobraApiClient : ICobraApiClient
{
    private readonly HttpClient _httpClient;
    private readonly CobraApiSettings _settings;
    private readonly ILogger<CobraApiClient> _logger;

    public CobraApiClient(
        HttpClient httpClient,
        IOptions<CobraApiSettings> settings,
        ILogger<CobraApiClient> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;

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
    /// Sends a Teams message to the CobraAPI webhook endpoint.
    /// </summary>
    public async Task<bool> SendWebhookAsync(Guid mappingId, TeamsWebhookPayload payload)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Message not forwarded.");
            return false;
        }

        try
        {
            _logger.LogInformation(
                "Forwarding Teams message {MessageId} to CobraAPI webhook for mapping {MappingId}",
                payload.MessageId, mappingId);

            var response = await _httpClient.PostAsJsonAsync(
                $"api/webhooks/teams/{mappingId}",
                payload);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Successfully forwarded message to CobraAPI");
                return true;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "CobraAPI webhook returned {StatusCode}: {Error}",
                response.StatusCode, errorContent);
            return false;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to CobraAPI at {BaseUrl}", _settings.BaseUrl);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error forwarding message to CobraAPI");
            return false;
        }
    }

    /// <summary>
    /// Sends a Teams message to CobraAPI when no mapping exists yet.
    /// Used during initial channel linking flow.
    /// </summary>
    public async Task<bool> SendUnmappedMessageAsync(string conversationId, TeamsWebhookPayload payload)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Message not forwarded.");
            return false;
        }

        try
        {
            _logger.LogInformation(
                "Forwarding unmapped Teams message {MessageId} from conversation {ConversationId}",
                payload.MessageId, conversationId);

            var response = await _httpClient.PostAsJsonAsync(
                $"api/webhooks/teams/unmapped",
                payload);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Successfully forwarded unmapped message to CobraAPI");
                return true;
            }

            // 404 is expected if no mapping exists and we're not handling unmapped messages
            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogDebug("No mapping found for conversation {ConversationId} - message not stored", conversationId);
                return false;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "CobraAPI returned {StatusCode} for unmapped message: {Error}",
                response.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forwarding unmapped message to CobraAPI");
            return false;
        }
    }

    /// <summary>
    /// Gets the channel mapping ID for a Teams conversation from CobraAPI.
    /// </summary>
    public async Task<Guid?> GetMappingIdForConversationAsync(string conversationId)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Cannot lookup mapping.");
            return null;
        }

        try
        {
            // URL encode the conversation ID (Teams IDs can contain special characters)
            var encodedId = Uri.EscapeDataString(conversationId);

            var response = await _httpClient.GetAsync(
                $"api/chat/diagnostics/teams-mapping/{encodedId}");

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<MappingLookupResponse>();
                if (result != null)
                {
                    _logger.LogInformation(
                        "Found mapping {MappingId} for conversation {ConversationId}",
                        result.MappingId, conversationId);
                    return result.MappingId;
                }
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogDebug("No mapping found for conversation {ConversationId}", conversationId);
                return null;
            }

            _logger.LogWarning(
                "Unexpected response {StatusCode} when looking up mapping for {ConversationId}",
                response.StatusCode, conversationId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error looking up mapping for conversation {ConversationId}", conversationId);
            return null;
        }
    }

    // === Stateless Architecture Methods (UC-TI-029) ===

    /// <summary>
    /// Stores or updates a ConversationReference in CobraAPI.
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

        try
        {
            _logger.LogDebug(
                "Storing ConversationReference for {ConversationId}, TenantId: {TenantId}, IsEmulator: {IsEmulator}",
                request.ConversationId, request.TenantId, request.IsEmulator);

            var response = await _httpClient.PutAsJsonAsync(
                "api/chat/teams/conversation-reference",
                request);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<StoreConversationReferenceResult>();
                if (result != null)
                {
                    _logger.LogInformation(
                        "Stored ConversationReference for {ConversationId}, MappingId: {MappingId}, IsNew: {IsNew}",
                        request.ConversationId, result.MappingId, result.IsNewMapping);
                    return result;
                }
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogWarning(
                "Failed to store ConversationReference. Status: {StatusCode}, Error: {Error}",
                response.StatusCode, errorContent);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error storing ConversationReference for {ConversationId}",
                request.ConversationId);
            return null;
        }
    }

    /// <summary>
    /// Gets a ConversationReference from CobraAPI by conversation ID.
    /// </summary>
    public async Task<GetConversationReferenceResult?> GetConversationReferenceAsync(string conversationId)
    {
        if (string.IsNullOrEmpty(_settings.BaseUrl))
        {
            _logger.LogWarning("CobraAPI BaseUrl is not configured. Cannot get ConversationReference.");
            return null;
        }

        try
        {
            var encodedId = Uri.EscapeDataString(conversationId);
            var response = await _httpClient.GetAsync(
                $"api/chat/teams/conversation-reference/{encodedId}");

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<GetConversationReferenceResult>();
                if (result != null)
                {
                    _logger.LogDebug(
                        "Retrieved ConversationReference for {ConversationId}, MappingId: {MappingId}",
                        conversationId, result.MappingId);
                    return result;
                }
            }

            if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                _logger.LogDebug("No ConversationReference found for {ConversationId}", conversationId);
                return null;
            }

            _logger.LogWarning(
                "Unexpected response {StatusCode} when getting ConversationReference for {ConversationId}",
                response.StatusCode, conversationId);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting ConversationReference for {ConversationId}", conversationId);
            return null;
        }
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

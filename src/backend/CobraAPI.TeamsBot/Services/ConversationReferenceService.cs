using System.Collections.Concurrent;
using Microsoft.Agents.Core.Models;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// In-memory implementation of conversation reference storage for POC.
/// For production, this should be replaced with persistent storage (database, Redis, etc.).
/// </summary>
/// <remarks>
/// Conversation references are essential for proactive messaging in Bot Framework.
/// They contain the service URL, conversation ID, and other metadata needed to
/// send messages to a Teams channel without a prior user message.
///
/// The service URL can change over time (e.g., due to Teams infrastructure changes),
/// so references should be updated on every incoming message.
/// </remarks>
public class ConversationReferenceService : IConversationReferenceService
{
    private readonly ConcurrentDictionary<string, ConversationReference> _references = new();
    private readonly ILogger<ConversationReferenceService> _logger;

    /// <summary>
    /// Initializes a new instance of the ConversationReferenceService.
    /// </summary>
    public ConversationReferenceService(ILogger<ConversationReferenceService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public Task AddOrUpdateAsync(string conversationId, ConversationReference reference, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(conversationId))
        {
            throw new ArgumentNullException(nameof(conversationId));
        }

        if (reference == null)
        {
            throw new ArgumentNullException(nameof(reference));
        }

        var isUpdate = _references.ContainsKey(conversationId);
        _references[conversationId] = reference;

        _logger.LogDebug(
            "{Action} conversation reference for {ConversationId}. Service URL: {ServiceUrl}",
            isUpdate ? "Updated" : "Added",
            conversationId,
            reference.ServiceUrl);

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<ConversationReference?> GetAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(conversationId))
        {
            return Task.FromResult<ConversationReference?>(null);
        }

        _references.TryGetValue(conversationId, out var reference);
        return Task.FromResult(reference);
    }

    /// <inheritdoc />
    public Task<IReadOnlyDictionary<string, ConversationReference>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        // Return a snapshot to avoid concurrent modification issues
        var snapshot = new Dictionary<string, ConversationReference>(_references);
        return Task.FromResult<IReadOnlyDictionary<string, ConversationReference>>(snapshot);
    }

    /// <inheritdoc />
    public Task RemoveAsync(string conversationId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(conversationId))
        {
            return Task.CompletedTask;
        }

        if (_references.TryRemove(conversationId, out _))
        {
            _logger.LogInformation("Removed conversation reference for {ConversationId}", conversationId);
        }

        return Task.CompletedTask;
    }
}

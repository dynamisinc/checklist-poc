using Microsoft.Agents.Core.Models;

namespace CobraAPI.TeamsBot.Services;

/// <summary>
/// Service for managing conversation references for proactive messaging.
/// Conversation references are required to send messages to Teams without a prior user message.
/// </summary>
public interface IConversationReferenceService
{
    /// <summary>
    /// Adds or updates a conversation reference.
    /// Should be called on every inbound message to ensure we have the latest service URL.
    /// </summary>
    /// <param name="conversationId">The unique conversation identifier.</param>
    /// <param name="reference">The conversation reference from the activity.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task AddOrUpdateAsync(string conversationId, ConversationReference reference, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a conversation reference by conversation ID.
    /// </summary>
    /// <param name="conversationId">The conversation ID to look up.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The conversation reference if found, null otherwise.</returns>
    Task<ConversationReference?> GetAsync(string conversationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all stored conversation references.
    /// Useful for broadcasting to all connected channels.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A dictionary of conversation ID to conversation reference.</returns>
    Task<IReadOnlyDictionary<string, ConversationReference>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a conversation reference (e.g., when bot is uninstalled from a team).
    /// </summary>
    /// <param name="conversationId">The conversation ID to remove.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task RemoveAsync(string conversationId, CancellationToken cancellationToken = default);
}

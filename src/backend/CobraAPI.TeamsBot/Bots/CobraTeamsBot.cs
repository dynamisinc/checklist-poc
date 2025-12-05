using System.Text.Json;
using CobraAPI.TeamsBot.Models;
using CobraAPI.TeamsBot.Services;
using Microsoft.Agents.Builder;
using Microsoft.Agents.Builder.State;
using Microsoft.Agents.Core.Models;
using Microsoft.Agents.Extensions.Teams.Compat;
using Microsoft.Agents.Extensions.Teams.Models;
using Microsoft.Extensions.Options;

namespace CobraAPI.TeamsBot.Bots;

/// <summary>
/// COBRA Teams Bot - Handles bi-directional messaging between COBRA and Microsoft Teams.
/// Inherits from TeamsActivityHandler to get Teams-specific functionality.
/// </summary>
/// <remarks>
/// Key responsibilities:
/// - Receive channel messages from Teams (with RSC permissions, receives all messages without @mention)
/// - Forward Teams messages to COBRA chat system
/// - Send COBRA messages to Teams channels
/// - Handle bot installation/removal events
/// - Manage conversation references for proactive messaging
///
/// Migration note: Updated from Bot Framework SDK v4 to Microsoft 365 Agents SDK.
/// Namespace changes:
/// - Microsoft.Bot.Builder -> Microsoft.Agents.Builder
/// - Microsoft.Bot.Builder.Teams -> Microsoft.Agents.Extensions.Teams.Compat
/// - Microsoft.Bot.Schema -> Microsoft.Agents.Core.Models
/// - Microsoft.Bot.Schema.Teams -> Microsoft.Agents.Extensions.Teams.Models
/// </remarks>
public class CobraTeamsBot : TeamsActivityHandler
{
    private readonly ILogger<CobraTeamsBot> _logger;
    private readonly IConversationReferenceService _conversationReferenceService;
    private readonly ICobraApiClient _cobraApiClient;
    private readonly IBotMetrics _metrics;
    private readonly ConversationState _conversationState;
    private readonly UserState _userState;
    private readonly BotSettings _botSettings;

    /// <summary>
    /// Initializes a new instance of the CobraTeamsBot.
    /// </summary>
    public CobraTeamsBot(
        ILogger<CobraTeamsBot> logger,
        IConversationReferenceService conversationReferenceService,
        ICobraApiClient cobraApiClient,
        IBotMetrics metrics,
        ConversationState conversationState,
        UserState userState,
        IOptions<BotSettings> botSettings)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _conversationReferenceService = conversationReferenceService ?? throw new ArgumentNullException(nameof(conversationReferenceService));
        _cobraApiClient = cobraApiClient ?? throw new ArgumentNullException(nameof(cobraApiClient));
        _metrics = metrics ?? throw new ArgumentNullException(nameof(metrics));
        _conversationState = conversationState ?? throw new ArgumentNullException(nameof(conversationState));
        _userState = userState ?? throw new ArgumentNullException(nameof(userState));
        _botSettings = botSettings?.Value ?? new BotSettings();
    }

    /// <summary>
    /// Called when any activity is received. Used to capture conversation references.
    /// </summary>
    public override async Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default)
    {
        // Capture/update conversation reference for proactive messaging
        await CaptureConversationReferenceAsync(turnContext, cancellationToken);

        await base.OnTurnAsync(turnContext, cancellationToken);

        // Save any state changes
        await _conversationState.SaveChangesAsync(turnContext, false, cancellationToken);
        await _userState.SaveChangesAsync(turnContext, false, cancellationToken);
    }

    /// <summary>
    /// Called when a message activity is received from a user in Teams.
    /// With RSC permissions, this receives ALL channel messages (not just @mentions).
    /// </summary>
    protected override async Task OnMessageActivityAsync(ITurnContext<IMessageActivity> turnContext, CancellationToken cancellationToken)
    {
        var startTime = DateTime.UtcNow;
        var activity = turnContext.Activity;
        var senderName = activity.From?.Name ?? "Unknown";
        var messageText = activity.Text ?? string.Empty;
        var channelId = activity.ChannelId ?? "unknown";
        var conversationId = activity.Conversation?.Id ?? "unknown";

        // Record metric for received message
        _metrics.IncrementMessagesReceived(channelId);

        _logger.LogInformation(
            "Received message from {SenderName} in channel {ChannelId}, conversation {ConversationId}: {MessagePreview}",
            senderName,
            channelId,
            conversationId,
            messageText.Length > 50 ? messageText[..50] + "..." : messageText);

        // Filter out our own messages to prevent echo loops
        if (IsOwnMessage(activity))
        {
            _logger.LogDebug("Ignoring own message");
            return;
        }

        // Build webhook payload for CobraAPI
        var payload = BuildWebhookPayload(activity, "message");

        // Try to get the channel mapping ID from stored conversation reference metadata
        // For POC: We'll use the conversationId to look up the mapping
        // In production, this would be stored in the ConversationReferenceService with mapping info
        var mappingId = await GetChannelMappingIdAsync(conversationId);

        if (mappingId.HasValue)
        {
            // Forward to CobraAPI webhook
            var success = await _cobraApiClient.SendWebhookAsync(mappingId.Value, payload);
            _metrics.IncrementWebhooksSent(success);

            if (success)
            {
                _logger.LogDebug("Message forwarded to CobraAPI successfully");
            }
            else
            {
                _logger.LogWarning("Failed to forward message to CobraAPI");
                _metrics.IncrementMessagesFailed(channelId, "webhook_failed");
                // Still echo back for debugging in POC
                var errorMessage = "⚠️ Message received but failed to forward to COBRA. Check logs.";
                await turnContext.SendActivityAsync(MessageFactory.Text(errorMessage), cancellationToken);
            }
        }
        else
        {
            // No mapping found - channel not linked to COBRA event yet
            _logger.LogDebug("No channel mapping found for conversation {ConversationId}", conversationId);

            // For POC: Echo back to show the bot is working
            var echoMessage = $"🔄 **COBRA received:** \"{messageText}\" from {senderName}\n\n" +
                              "_Note: This channel is not linked to a COBRA event yet. Messages are not being stored._";
            await turnContext.SendActivityAsync(MessageFactory.Text(echoMessage), cancellationToken);
        }

        // Record latency
        var latency = (DateTime.UtcNow - startTime).TotalMilliseconds;
        _metrics.RecordMessageLatency(latency);

        _logger.LogDebug("Message processed successfully in {Latency}ms", latency);
    }

    /// <summary>
    /// Builds a webhook payload from a Teams activity.
    /// </summary>
    private static TeamsWebhookPayload BuildWebhookPayload(IActivity activity, string activityType)
    {
        // Extract image attachment URL if present
        string? imageUrl = null;
        if (activity is IMessageActivity messageActivity && messageActivity.Attachments != null)
        {
            var imageAttachment = messageActivity.Attachments
                .FirstOrDefault(a => a.ContentType?.StartsWith("image/") == true);
            imageUrl = imageAttachment?.ContentUrl;
        }

        return new TeamsWebhookPayload
        {
            MessageId = activity.Id ?? Guid.NewGuid().ToString(),
            ConversationId = activity.Conversation?.Id ?? string.Empty,
            ChannelId = activity.ChannelId ?? string.Empty,
            SenderId = activity.From?.Id ?? string.Empty,
            SenderName = activity.From?.Name ?? "Unknown",
            Text = (activity as IMessageActivity)?.Text,
            Timestamp = activity.Timestamp?.UtcDateTime ?? DateTime.UtcNow,
            ActivityType = activityType,
            ImageUrl = imageUrl,
            ServiceUrl = activity.ServiceUrl
        };
    }

    /// <summary>
    /// Gets the COBRA channel mapping ID for a Teams conversation.
    /// Calls CobraAPI to lookup the mapping in the database.
    /// </summary>
    private async Task<Guid?> GetChannelMappingIdAsync(string conversationId)
    {
        // Call CobraAPI to lookup the mapping by conversation ID
        // This queries the ExternalChannelMappings table
        return await _cobraApiClient.GetMappingIdForConversationAsync(conversationId);
    }

    /// <summary>
    /// Called when a message is updated (edited) in Teams.
    /// </summary>
    protected override async Task OnMessageUpdateActivityAsync(ITurnContext<IMessageUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        var activity = turnContext.Activity;
        _logger.LogInformation(
            "Message updated by {SenderName}: {MessageId}",
            activity.From?.Name ?? "Unknown",
            activity.Id);

        // TODO: In Phase 2, update the corresponding ChatMessage in COBRA
        await Task.CompletedTask;
    }

    /// <summary>
    /// Called when a message is deleted in Teams.
    /// </summary>
    protected override async Task OnMessageDeleteActivityAsync(ITurnContext<IMessageDeleteActivity> turnContext, CancellationToken cancellationToken)
    {
        var activity = turnContext.Activity;
        _logger.LogInformation(
            "Message deleted: {MessageId}",
            activity.Id);

        // TODO: In Phase 2, mark the corresponding ChatMessage as deleted in COBRA
        await Task.CompletedTask;
    }

    /// <summary>
    /// Called when the bot is added to a team or a new member joins.
    /// Used to capture initial conversation reference and trigger onboarding.
    /// </summary>
    protected override async Task OnMembersAddedAsync(IList<ChannelAccount> membersAdded, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        var activity = turnContext.Activity;
        var botId = activity.Recipient?.Id;

        foreach (var member in membersAdded)
        {
            // Check if the bot itself was added (bot installation)
            if (member.Id == botId)
            {
                _logger.LogInformation(
                    "Bot installed in team/channel. Conversation: {ConversationId}, Channel: {ChannelId}",
                    activity.Conversation?.Id,
                    activity.ChannelId);

                // Send welcome message using configurable display name
                var welcomeText = $@"👋 **Welcome to COBRA Communications!**

I'm **{_botSettings.DisplayName}**, connecting this Teams channel to your COBRA incident management system.

**What I can do:**
• Forward messages from this channel to COBRA
• Post COBRA messages and announcements here
• Keep your team synchronized across platforms

**Get Started:**
Use the `help` command to see available options, or contact your COBRA administrator to link this channel to an event.

_This integration is part of the COBRA Unified Communications system._";

                await turnContext.SendActivityAsync(MessageFactory.Text(welcomeText), cancellationToken);

                // Store conversation reference for proactive messaging
                if (activity.Conversation?.Id != null)
                {
                    await _conversationReferenceService.AddOrUpdateAsync(
                        activity.Conversation.Id,
                        activity.GetConversationReference(),
                        cancellationToken);
                }
            }
            else
            {
                _logger.LogDebug("New member added: {MemberName} ({MemberId})", member.Name, member.Id);
            }
        }
    }

    /// <summary>
    /// Called when members are removed from a team or the bot is uninstalled.
    /// Handles UC-TI-021: Bot Removal Detection.
    /// </summary>
    protected override async Task OnMembersRemovedAsync(IList<ChannelAccount> membersRemoved, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        var activity = turnContext.Activity;
        var botId = activity.Recipient?.Id;

        foreach (var member in membersRemoved)
        {
            if (member.Id == botId)
            {
                var conversationId = activity.Conversation?.Id;
                _logger.LogInformation(
                    "Bot removed from team/channel. Conversation: {ConversationId}",
                    conversationId);

                if (conversationId != null)
                {
                    // Remove from local in-memory storage
                    await _conversationReferenceService.RemoveAsync(conversationId, cancellationToken);

                    // Notify CobraAPI to deactivate the ExternalChannelMapping (UC-TI-021)
                    // This marks the mapping as inactive and clears the ConversationReference
                    var removedBy = activity.From?.Name;
                    var success = await _cobraApiClient.NotifyBotRemovedAsync(conversationId, removedBy);

                    if (success)
                    {
                        _logger.LogInformation(
                            "Successfully notified CobraAPI of bot removal from {ConversationId}",
                            conversationId);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "Failed to notify CobraAPI of bot removal from {ConversationId}. " +
                            "The ExternalChannelMapping may remain active until manually cleaned up.",
                            conversationId);
                    }
                }
            }
        }
    }

    /// <summary>
    /// Called when a Teams channel is created. Can be used to auto-register new channels.
    /// </summary>
    protected override async Task OnTeamsChannelCreatedAsync(ChannelInfo channelInfo, TeamInfo teamInfo, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "New Teams channel created: {ChannelName} in team {TeamName}",
            channelInfo.Name,
            teamInfo.Name);

        await Task.CompletedTask;
    }

    /// <summary>
    /// Called when a Teams channel is deleted.
    /// </summary>
    protected override async Task OnTeamsChannelDeletedAsync(ChannelInfo channelInfo, TeamInfo teamInfo, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Teams channel deleted: {ChannelName} in team {TeamName}",
            channelInfo.Name,
            teamInfo.Name);

        // TODO: Deactivate any associated channel mappings
        await Task.CompletedTask;
    }

    /// <summary>
    /// Called when a Teams channel is renamed.
    /// </summary>
    protected override async Task OnTeamsChannelRenamedAsync(ChannelInfo channelInfo, TeamInfo teamInfo, ITurnContext<IConversationUpdateActivity> turnContext, CancellationToken cancellationToken)
    {
        _logger.LogInformation(
            "Teams channel renamed to: {ChannelName} in team {TeamName}",
            channelInfo.Name,
            teamInfo.Name);

        // TODO: Update ExternalChannelMapping name
        await Task.CompletedTask;
    }

    /// <summary>
    /// Captures the conversation reference for proactive messaging.
    /// Called on every turn to ensure we have the latest service URL.
    /// Stateless architecture: Stores in CobraAPI database (primary) and in-memory (fallback).
    /// </summary>
    private async Task CaptureConversationReferenceAsync(ITurnContext turnContext, CancellationToken cancellationToken)
    {
        var activity = turnContext.Activity;
        if (activity.Conversation == null)
            return;

        var conversationId = activity.Conversation.Id;
        var reference = activity.GetConversationReference();

        // Extract metadata for stateless storage
        var tenantId = activity.Conversation.TenantId;
        var channelName = activity.ChannelId == "emulator" ? "Emulator" : (activity.Conversation.Name ?? "Teams Channel");
        var installedByName = activity.From?.Name;
        var isEmulator = activity.ChannelId == "emulator";

        // Serialize ConversationReference for storage
        var referenceJson = JsonSerializer.Serialize(reference);

        // Primary: Store in CobraAPI database
        var storeRequest = new StoreConversationReferenceRequest
        {
            ConversationId = conversationId,
            ConversationReferenceJson = referenceJson,
            TenantId = tenantId,
            ChannelName = channelName,
            InstalledByName = installedByName,
            IsEmulator = isEmulator
        };

        var result = await _cobraApiClient.StoreConversationReferenceAsync(storeRequest);
        if (result != null)
        {
            _logger.LogDebug(
                "Stored ConversationReference in CobraAPI. MappingId: {MappingId}, IsNew: {IsNew}",
                result.MappingId, result.IsNewMapping);
        }
        else
        {
            _logger.LogDebug(
                "CobraAPI storage unavailable, using in-memory fallback for {ConversationId}",
                conversationId);
        }

        // Fallback: Also store in-memory for backwards compatibility
        await _conversationReferenceService.AddOrUpdateAsync(
            conversationId,
            reference,
            cancellationToken);
    }

    /// <summary>
    /// Determines if a message was sent by this bot (to prevent echo loops).
    /// </summary>
    private bool IsOwnMessage(IActivity activity)
    {
        // The bot's messages have the same ID in From and Recipient
        return activity.From?.Id == activity.Recipient?.Id;
    }
}

# COBRA Teams Integration - Developer Documentation

## Overview

This document provides comprehensive technical documentation for developers working on the COBRA Teams bot integration. It covers architecture, implementation patterns, API details, and troubleshooting.

**Audience:** Software developers, DevOps engineers, technical architects

**Related User Stories:** UC-TI-001 through UC-TI-028

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Bot Framework Fundamentals](#bot-framework-fundamentals)
4. [Message Flow](#message-flow)
5. [Database Schema](#database-schema)
6. [API Integration](#api-integration)
7. [Authentication & Security](#authentication--security)
8. [Proactive Messaging](#proactive-messaging)
9. [RSC Permissions](#rsc-permissions)
10. [Adaptive Cards](#adaptive-cards)
11. [Error Handling](#error-handling)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Microsoft 365                                   │
│  ┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐  │
│  │   Teams     │────▶│  Azure Bot       │────▶│  COBRA Teams Bot        │  │
│  │   Client    │◀────│  Service         │◀────│  (ASP.NET Core)         │  │
│  └─────────────┘     └──────────────────┘     └───────────┬─────────────┘  │
│                                                           │                  │
└───────────────────────────────────────────────────────────┼──────────────────┘
                                                            │
                    ┌───────────────────────────────────────┼───────────────┐
                    │                COBRA Infrastructure   │               │
                    │  ┌────────────────────────────────────▼────────────┐  │
                    │  │              UC POC Services                     │  │
                    │  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │  │
                    │  │  │ IChatService│  │IChannelSvc  │  │ SignalR  │ │  │
                    │  │  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │  │
                    │  └─────────┼────────────────┼───────────────┼──────┘  │
                    │            │                │               │         │
                    │  ┌─────────▼────────────────▼───────────────▼──────┐  │
                    │  │                   SQL Server                     │  │
                    │  │   Messages │ Channels │ ConversationReferences   │  │
                    │  └─────────────────────────────────────────────────┘  │
                    └───────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component         | Responsibility                                           |
| ----------------- | -------------------------------------------------------- |
| Teams Client      | User interface, message composition                      |
| Azure Bot Service | Message routing, authentication, scaling                 |
| COBRA Teams Bot   | Message handling, COBRA integration, proactive messaging |
| UC POC Services   | Shared chat/channel services, database access            |
| SignalR Hub       | Real-time updates to COBRA web clients                   |
| SQL Server        | Message persistence, conversation references             |

---

## Project Structure

```
src/
├── CobraTeamsBot/
│   ├── CobraTeamsBot.csproj
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   │
│   ├── Bot/
│   │   ├── CobraBot.cs                 # Main ActivityHandler
│   │   ├── AdapterWithErrorHandler.cs  # Error handling adapter
│   │   └── Commands/
│   │       ├── ICommandHandler.cs
│   │       ├── HelpCommandHandler.cs
│   │       ├── StatusCommandHandler.cs
│   │       └── LinkCommandHandler.cs
│   │
│   ├── Services/
│   │   ├── IConversationReferenceService.cs
│   │   ├── ConversationReferenceService.cs
│   │   ├── ITeamsChannelService.cs
│   │   ├── TeamsChannelService.cs
│   │   └── ProactiveMessageService.cs
│   │
│   ├── Models/
│   │   ├── TeamsConversationReference.cs
│   │   ├── TeamsChannelMapping.cs
│   │   └── TeamsMessageActivity.cs
│   │
│   ├── Cards/
│   │   ├── WelcomeCard.cs
│   │   ├── EventLinkCard.cs
│   │   └── StatusCard.cs
│   │
│   └── Controllers/
│       ├── BotController.cs            # /api/messages endpoint
│       └── ProactiveController.cs      # Internal COBRA trigger
│
├── CobraTeamsBot.Tests/
│   ├── Bot/
│   │   └── CobraBotTests.cs
│   ├── Services/
│   │   └── ConversationReferenceServiceTests.cs
│   └── Integration/
│       └── MessageFlowTests.cs
│
└── manifest/
    ├── manifest.json
    ├── color.png
    └── outline.png
```

---

## Bot Framework Fundamentals

### Core Packages

```xml
<PackageReference Include="Microsoft.Bot.Builder" Version="4.22.0" />
<PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.22.0" />
<PackageReference Include="Microsoft.Bot.Connector" Version="4.22.0" />
<PackageReference Include="AdaptiveCards" Version="3.1.0" />
```

### Program.cs Setup

```csharp
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Integration.AspNet.Core;
using Microsoft.Bot.Connector.Authentication;

var builder = WebApplication.CreateBuilder(args);

// Bot Framework authentication
builder.Services.AddSingleton<BotFrameworkAuthentication, ConfigurationBotFrameworkAuthentication>();

// Bot adapter with error handling
builder.Services.AddSingleton<IBotFrameworkHttpAdapter, AdapterWithErrorHandler>();

// Bot implementation
builder.Services.AddTransient<IBot, CobraBot>();

// COBRA services
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IChannelService, ChannelService>();
builder.Services.AddScoped<IConversationReferenceService, ConversationReferenceService>();
builder.Services.AddScoped<IProactiveMessageService, ProactiveMessageService>();

// Database
builder.Services.AddDbContext<PocDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();

var app = builder.Build();

app.UseRouting();
app.UseAuthorization();
app.MapControllers();

app.Run();
```

### Configuration (appsettings.json)

```json
{
  "MicrosoftAppType": "MultiTenant",
  "MicrosoftAppId": "{{BOT_APP_ID}}",
  "MicrosoftAppPassword": "{{BOT_APP_SECRET}}",
  "MicrosoftAppTenantId": "",
  "ConnectionStrings": {
    "DefaultConnection": "Server=...;Database=CobraUC;..."
  },
  "Cobra": {
    "ApiBaseUrl": "https://cbr-shr-eu-api-app-q.azurewebsites.net",
    "SignalRHubUrl": "https://cobra-signalr.azurewebsites.net/chathub"
  }
}
```

---

## Message Flow

### Inbound: Teams → COBRA

```
┌──────────┐    ┌─────────────┐    ┌────────────┐    ┌────────────┐    ┌──────────┐
│  Teams   │───▶│ Bot Service │───▶│ BotController│───▶│ CobraBot   │───▶│ Database │
│  User    │    │   (Azure)   │    │ /api/messages│    │ Handler    │    │          │
└──────────┘    └─────────────┘    └────────────┘    └─────┬──────┘    └──────────┘
                                                          │
                                                          ▼
                                                    ┌──────────┐
                                                    │ SignalR  │───▶ COBRA Web Clients
                                                    └──────────┘
```

**Sequence:**

1. User posts message in Teams channel
2. Azure Bot Service authenticates and routes to bot endpoint
3. `BotController` receives HTTP POST at `/api/messages`
4. `CobraBot.OnMessageActivityAsync()` processes the activity
5. Message saved to database via `IChatService`
6. SignalR broadcasts to connected COBRA clients
7. Bot optionally sends acknowledgment to Teams

### Outbound: COBRA → Teams

```
┌──────────┐    ┌────────────────┐    ┌─────────────────┐    ┌─────────────┐    ┌──────────┐
│  COBRA   │───▶│ ProactiveCtrl  │───▶│ ProactiveMsgSvc │───▶│ Bot Service │───▶│  Teams   │
│  User    │    │ /api/send      │    │                 │    │   (Azure)   │    │ Channel  │
└──────────┘    └────────────────┘    └────────┬────────┘    └─────────────┘    └──────────┘
                                               │
                                               ▼
                                        ┌──────────────┐
                                        │ ConvRef Store│
                                        └──────────────┘
```

**Sequence:**

1. User sends message in COBRA linked channel
2. COBRA API calls internal `/api/send` endpoint
3. `ProactiveMessageService` retrieves stored `ConversationReference`
4. Uses `ContinueConversationAsync` to send proactive message
5. Message appears in Teams with COBRA attribution

---

## Database Schema

### TeamsConversationReferences Table

```sql
CREATE TABLE TeamsConversationReferences (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    -- Teams identifiers
    TeamId NVARCHAR(100) NOT NULL,
    ChannelId NVARCHAR(100) NOT NULL,
    ServiceUrl NVARCHAR(500) NOT NULL,

    -- Bot info
    BotId NVARCHAR(100) NOT NULL,
    BotName NVARCHAR(200),

    -- Serialized ConversationReference
    ConversationReferenceJson NVARCHAR(MAX) NOT NULL,

    -- Metadata
    TeamName NVARCHAR(200),
    ChannelName NVARCHAR(200),
    InstalledByUserId NVARCHAR(100),
    InstalledByUserName NVARCHAR(200),

    -- Timestamps
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    LastActivityAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Indexes
    INDEX IX_TeamChannel (TeamId, ChannelId)
);
```

### TeamsChannelMappings Table

```sql
CREATE TABLE TeamsChannelMappings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    -- COBRA event reference
    CobraEventId UNIQUEIDENTIFIER NOT NULL,
    CobraChannelId UNIQUEIDENTIFIER NOT NULL,

    -- Teams reference
    TeamsConversationReferenceId UNIQUEIDENTIFIER NOT NULL,

    -- Link metadata
    LinkedByUserId UNIQUEIDENTIFIER NOT NULL,
    LinkedByUserName NVARCHAR(200),
    LinkedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Status
    IsActive BIT NOT NULL DEFAULT 1,
    UnlinkedAt DATETIME2 NULL,
    UnlinkedByUserId UNIQUEIDENTIFIER NULL,

    FOREIGN KEY (TeamsConversationReferenceId)
        REFERENCES TeamsConversationReferences(Id),
    FOREIGN KEY (CobraChannelId)
        REFERENCES ExternalChannels(Id)
);
```

### Entity Models

```csharp
/// <summary>
/// Stores Teams conversation references for proactive messaging.
/// Each record represents a team/channel where the bot is installed.
/// </summary>
public class TeamsConversationReference
{
    public Guid Id { get; set; }

    // Teams identifiers
    public string TeamId { get; set; } = string.Empty;
    public string ChannelId { get; set; } = string.Empty;
    public string ServiceUrl { get; set; } = string.Empty;

    // Bot info
    public string BotId { get; set; } = string.Empty;
    public string? BotName { get; set; }

    // Serialized for flexibility
    public string ConversationReferenceJson { get; set; } = string.Empty;

    // Display metadata
    public string? TeamName { get; set; }
    public string? ChannelName { get; set; }
    public string? InstalledByUserId { get; set; }
    public string? InstalledByUserName { get; set; }

    // Timestamps
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<TeamsChannelMapping> Mappings { get; set; } = new List<TeamsChannelMapping>();

    /// <summary>
    /// Deserializes the stored ConversationReference.
    /// </summary>
    public ConversationReference GetConversationReference()
    {
        return JsonSerializer.Deserialize<ConversationReference>(ConversationReferenceJson)
            ?? throw new InvalidOperationException("Failed to deserialize ConversationReference");
    }

    /// <summary>
    /// Serializes and stores a ConversationReference.
    /// </summary>
    public void SetConversationReference(ConversationReference reference)
    {
        ConversationReferenceJson = JsonSerializer.Serialize(reference);
        ServiceUrl = reference.ServiceUrl;
        ChannelId = reference.Conversation?.Id ?? string.Empty;
    }
}
```

---

## API Integration

### BotController

```csharp
/// <summary>
/// Handles incoming Bot Framework messages from Azure Bot Service.
/// All Teams messages are routed through this endpoint.
/// </summary>
[ApiController]
[Route("api/messages")]
public class BotController : ControllerBase
{
    private readonly IBotFrameworkHttpAdapter _adapter;
    private readonly IBot _bot;
    private readonly ILogger<BotController> _logger;

    public BotController(
        IBotFrameworkHttpAdapter adapter,
        IBot bot,
        ILogger<BotController> logger)
    {
        _adapter = adapter;
        _bot = bot;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/messages
    /// Receives all incoming activities from Teams via Bot Service.
    /// </summary>
    [HttpPost]
    public async Task PostAsync()
    {
        _logger.LogInformation("Received activity from Bot Service");

        await _adapter.ProcessAsync(Request, Response, _bot);
    }
}
```

### ProactiveController

```csharp
/// <summary>
/// Internal API for COBRA to trigger proactive messages to Teams.
/// Not exposed externally - called by COBRA services.
/// </summary>
[ApiController]
[Route("api/internal/proactive")]
public class ProactiveController : ControllerBase
{
    private readonly IProactiveMessageService _proactiveService;
    private readonly ILogger<ProactiveController> _logger;

    public ProactiveController(
        IProactiveMessageService proactiveService,
        ILogger<ProactiveController> logger)
    {
        _proactiveService = proactiveService;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/internal/proactive/send
    /// Sends a message from COBRA to a linked Teams channel.
    /// </summary>
    [HttpPost("send")]
    public async Task<IActionResult> SendMessageAsync([FromBody] ProactiveMessageRequest request)
    {
        _logger.LogInformation(
            "Sending proactive message to Teams. MappingId: {MappingId}",
            request.ChannelMappingId);

        try
        {
            await _proactiveService.SendMessageAsync(
                request.ChannelMappingId,
                request.Message,
                request.SenderName);

            return Ok(new { success = true });
        }
        catch (ConversationReferenceNotFoundException ex)
        {
            _logger.LogWarning(ex, "Conversation reference not found");
            return NotFound(new { error = "Teams channel not found or bot removed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send proactive message");
            return StatusCode(500, new { error = "Failed to send message" });
        }
    }
}

public record ProactiveMessageRequest(
    Guid ChannelMappingId,
    string Message,
    string SenderName);
```

---

## Authentication & Security

### Azure AD App Registration

Required settings in Azure portal:

```
App Registration:
├── Authentication
│   ├── Platform: Web
│   ├── Redirect URI: https://token.botframework.com/.auth/web/redirect
│   └── Implicit grant: ID tokens (checked)
│
├── Certificates & secrets
│   └── Client secret: [Generate and store securely]
│
├── API permissions
│   └── Microsoft Graph
│       └── User.Read (Delegated) - Sign in and read user profile
│
└── Expose an API
    └── Application ID URI: api://botid-{app-id}
```

### Bot Authentication Validation

The Bot Framework SDK automatically validates incoming requests. Key validations:

1. **JWT Token Validation:** Every request includes a Bearer token from Bot Service
2. **App ID Verification:** Token must be issued for your registered app ID
3. **Service URL Validation:** Requests must come from valid Bot Service URLs

```csharp
/// <summary>
/// Custom adapter with enhanced error handling and logging.
/// </summary>
public class AdapterWithErrorHandler : CloudAdapter
{
    public AdapterWithErrorHandler(
        BotFrameworkAuthentication auth,
        ILogger<AdapterWithErrorHandler> logger)
        : base(auth, logger)
    {
        OnTurnError = async (turnContext, exception) =>
        {
            logger.LogError(exception,
                "Unhandled exception. Activity: {ActivityType}",
                turnContext.Activity.Type);

            // Don't expose internal errors to Teams
            await turnContext.SendActivityAsync(
                "Sorry, something went wrong. Please try again.");
        };
    }
}
```

### Internal API Security

For the proactive messaging endpoint:

```csharp
// In Program.cs - require internal API key
builder.Services.AddAuthentication("InternalApiKey")
    .AddScheme<AuthenticationSchemeOptions, InternalApiKeyHandler>("InternalApiKey", null);

// Apply to internal controllers
[Authorize(AuthenticationSchemes = "InternalApiKey")]
[ApiController]
[Route("api/internal/proactive")]
public class ProactiveController : ControllerBase
{
    // ...
}
```

---

## Proactive Messaging

### ConversationReference Storage

```csharp
/// <summary>
/// Manages storage and retrieval of Teams conversation references.
/// References are required for proactive (bot-initiated) messaging.
/// </summary>
public interface IConversationReferenceService
{
    /// <summary>
    /// Stores or updates a conversation reference when bot is added to a channel.
    /// </summary>
    Task SaveReferenceAsync(
        ConversationReference reference,
        string teamId,
        string teamName,
        string channelName,
        string installedByUserId,
        string installedByUserName);

    /// <summary>
    /// Retrieves a conversation reference for proactive messaging.
    /// </summary>
    Task<TeamsConversationReference?> GetReferenceAsync(string teamId, string channelId);

    /// <summary>
    /// Retrieves reference by mapping ID (for COBRA-initiated messages).
    /// </summary>
    Task<TeamsConversationReference?> GetReferenceByMappingAsync(Guid mappingId);

    /// <summary>
    /// Removes reference when bot is removed from team.
    /// </summary>
    Task RemoveReferenceAsync(string teamId, string channelId);

    /// <summary>
    /// Updates last activity timestamp (for health monitoring).
    /// </summary>
    Task UpdateLastActivityAsync(string teamId, string channelId);
}
```

### ProactiveMessageService Implementation

```csharp
/// <summary>
/// Sends proactive messages from COBRA to Teams channels.
/// Uses stored ConversationReferences to initiate conversations.
/// </summary>
public class ProactiveMessageService : IProactiveMessageService
{
    private readonly IConversationReferenceService _referenceService;
    private readonly IBotFrameworkHttpAdapter _adapter;
    private readonly string _appId;
    private readonly ILogger<ProactiveMessageService> _logger;

    public ProactiveMessageService(
        IConversationReferenceService referenceService,
        IBotFrameworkHttpAdapter adapter,
        IConfiguration configuration,
        ILogger<ProactiveMessageService> logger)
    {
        _referenceService = referenceService;
        _adapter = adapter;
        _appId = configuration["MicrosoftAppId"]
            ?? throw new InvalidOperationException("MicrosoftAppId not configured");
        _logger = logger;
    }

    /// <summary>
    /// Sends a message to a Teams channel linked to COBRA.
    /// </summary>
    /// <param name="mappingId">The TeamsChannelMapping ID</param>
    /// <param name="message">Message content to send</param>
    /// <param name="senderName">COBRA user's display name for attribution</param>
    public async Task SendMessageAsync(Guid mappingId, string message, string senderName)
    {
        var reference = await _referenceService.GetReferenceByMappingAsync(mappingId)
            ?? throw new ConversationReferenceNotFoundException(mappingId);

        var conversationRef = reference.GetConversationReference();

        _logger.LogInformation(
            "Sending proactive message. Team: {TeamName}, Channel: {ChannelName}",
            reference.TeamName,
            reference.ChannelName);

        await ((CloudAdapter)_adapter).ContinueConversationAsync(
            _appId,
            conversationRef,
            async (turnContext, cancellationToken) =>
            {
                // Format message with sender attribution
                var formattedMessage = $"**[{senderName} via COBRA]**\n\n{message}";

                await turnContext.SendActivityAsync(
                    MessageFactory.Text(formattedMessage),
                    cancellationToken);
            },
            CancellationToken.None);

        // Update last activity
        await _referenceService.UpdateLastActivityAsync(
            reference.TeamId,
            reference.ChannelId);
    }

    /// <summary>
    /// Sends an Adaptive Card to a Teams channel (for announcements).
    /// </summary>
    public async Task SendCardAsync(Guid mappingId, AdaptiveCard card, string title)
    {
        var reference = await _referenceService.GetReferenceByMappingAsync(mappingId)
            ?? throw new ConversationReferenceNotFoundException(mappingId);

        var conversationRef = reference.GetConversationReference();

        await ((CloudAdapter)_adapter).ContinueConversationAsync(
            _appId,
            conversationRef,
            async (turnContext, cancellationToken) =>
            {
                var attachment = new Attachment
                {
                    ContentType = AdaptiveCard.ContentType,
                    Content = card
                };

                var activity = MessageFactory.Attachment(attachment);
                activity.Summary = title; // Shows in notifications

                await turnContext.SendActivityAsync(activity, cancellationToken);
            },
            CancellationToken.None);
    }
}
```

### Important: ServiceUrl Handling

The ServiceUrl can vary by tenant geography. Always use the latest from incoming messages:

```csharp
protected override async Task OnMessageActivityAsync(
    ITurnContext<IMessageActivity> turnContext,
    CancellationToken cancellationToken)
{
    // Always update ServiceUrl from incoming messages
    var reference = turnContext.Activity.GetConversationReference();
    await _referenceService.UpdateServiceUrlAsync(
        reference.Conversation.Id,
        reference.ServiceUrl);

    // ... process message
}
```

---

## RSC Permissions

### Enabling RSC in Manifest

```json
{
  "webApplicationInfo": {
    "id": "{{BOT_APP_ID}}",
    "resource": "api://botid-{{BOT_APP_ID}}"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {
          "name": "ChannelMessage.Read.Group",
          "type": "Application"
        },
        {
          "name": "TeamSettings.Read.Group",
          "type": "Application"
        }
      ]
    }
  }
}
```

### Detecting RSC Consent

When RSC is granted, the bot receives ALL channel messages, not just @mentions:

```csharp
protected override async Task OnMessageActivityAsync(
    ITurnContext<IMessageActivity> turnContext,
    CancellationToken cancellationToken)
{
    var activity = turnContext.Activity;

    // Check if this is a direct @mention or RSC-delivered message
    var isMentioned = activity.GetMentions()
        .Any(m => m.Mentioned.Id == activity.Recipient.Id);

    if (isMentioned)
    {
        // User explicitly @mentioned the bot - respond
        await HandleCommandAsync(turnContext, cancellationToken);
    }
    else
    {
        // RSC-delivered message - process silently (no response to Teams)
        await ProcessChannelMessageAsync(turnContext, cancellationToken);
    }
}

private async Task ProcessChannelMessageAsync(
    ITurnContext<IMessageActivity> turnContext,
    CancellationToken cancellationToken)
{
    var activity = turnContext.Activity;

    // Extract message data
    var message = new ChatMessage
    {
        ExternalId = activity.Id,
        Content = activity.Text,
        SenderName = activity.From.Name,
        SenderExternalId = activity.From.AadObjectId,
        Timestamp = activity.Timestamp ?? DateTimeOffset.UtcNow,
        Source = MessageSource.Teams
    };

    // Save to COBRA - no response to Teams
    await _chatService.SaveExternalMessageAsync(message);

    // Broadcast to COBRA clients via SignalR
    await _signalRService.BroadcastMessageAsync(message);
}
```

---

## Adaptive Cards

### WelcomeCard

```csharp
/// <summary>
/// Creates the welcome card shown when bot is installed in a channel.
/// </summary>
public static class WelcomeCard
{
    public static AdaptiveCard Create(string teamName, string channelName)
    {
        return new AdaptiveCard(new AdaptiveSchemaVersion(1, 4))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = "👋 Welcome to COBRA Communications!",
                    Weight = AdaptiveTextWeight.Bolder,
                    Size = AdaptiveTextSize.Large
                },
                new AdaptiveTextBlock
                {
                    Text = $"I'm now connected to **{channelName}** in **{teamName}**.",
                    Wrap = true
                },
                new AdaptiveTextBlock
                {
                    Text = "I'll bridge messages between this channel and COBRA events.",
                    Wrap = true
                },
                new AdaptiveFactSet
                {
                    Facts = new List<AdaptiveFact>
                    {
                        new AdaptiveFact("Team", teamName),
                        new AdaptiveFact("Channel", channelName),
                        new AdaptiveFact("Status", "✅ Connected")
                    }
                }
            },
            Actions = new List<AdaptiveAction>
            {
                new AdaptiveSubmitAction
                {
                    Title = "Link to COBRA Event",
                    Data = new { action = "link" }
                },
                new AdaptiveOpenUrlAction
                {
                    Title = "Open COBRA",
                    Url = new Uri("https://cobra-poc.azurewebsites.net/")
                }
            }
        };
    }
}
```

### EventLinkCard

```csharp
/// <summary>
/// Creates the event selection card for linking a Teams channel to COBRA.
/// </summary>
public static class EventLinkCard
{
    public static AdaptiveCard Create(IEnumerable<CobraEvent> events)
    {
        var choices = events.Select(e => new AdaptiveChoice
        {
            Title = e.Name,
            Value = e.Id.ToString()
        }).ToList();

        return new AdaptiveCard(new AdaptiveSchemaVersion(1, 4))
        {
            Body = new List<AdaptiveElement>
            {
                new AdaptiveTextBlock
                {
                    Text = "Link to COBRA Event",
                    Weight = AdaptiveTextWeight.Bolder,
                    Size = AdaptiveTextSize.Medium
                },
                new AdaptiveTextBlock
                {
                    Text = "Select the COBRA event to link to this Teams channel:",
                    Wrap = true
                },
                new AdaptiveChoiceSetInput
                {
                    Id = "eventId",
                    Style = AdaptiveChoiceInputStyle.Compact,
                    Choices = choices,
                    IsRequired = true
                }
            },
            Actions = new List<AdaptiveAction>
            {
                new AdaptiveSubmitAction
                {
                    Title = "Link Event",
                    Data = new { action = "confirmLink" }
                }
            }
        };
    }
}
```

---

## Error Handling

### Retry Logic for Teams API

```csharp
/// <summary>
/// Retry policy for Teams/Bot Service API calls.
/// Handles transient failures gracefully.
/// </summary>
public static class TeamsRetryPolicy
{
    public static AsyncRetryPolicy CreatePolicy(ILogger logger)
    {
        return Policy
            .Handle<HttpRequestException>()
            .Or<ErrorResponseException>(ex =>
                ex.Response?.StatusCode == HttpStatusCode.TooManyRequests ||
                ex.Response?.StatusCode == HttpStatusCode.ServiceUnavailable)
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: attempt =>
                    TimeSpan.FromSeconds(Math.Pow(2, attempt)),
                onRetry: (exception, timeSpan, retryCount, context) =>
                {
                    logger.LogWarning(
                        exception,
                        "Teams API retry {RetryCount} after {Delay}s",
                        retryCount,
                        timeSpan.TotalSeconds);
                });
    }
}
```

### Graceful Degradation

```csharp
/// <summary>
/// Sends message to Teams but doesn't block COBRA save on failure.
/// </summary>
public async Task SendMessageWithFallbackAsync(
    Guid mappingId,
    string message,
    string senderName)
{
    try
    {
        await _retryPolicy.ExecuteAsync(async () =>
        {
            await SendMessageAsync(mappingId, message, senderName);
        });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex,
            "Failed to send message to Teams. MappingId: {MappingId}. Message saved to COBRA only.",
            mappingId);

        // Queue for retry later
        await _retryQueue.EnqueueAsync(new FailedTeamsMessage
        {
            MappingId = mappingId,
            Message = message,
            SenderName = senderName,
            FailedAt = DateTime.UtcNow,
            RetryCount = 0
        });
    }
}
```

---

## Testing

### Unit Testing the Bot

```csharp
public class CobraBotTests
{
    private readonly Mock<IChatService> _mockChatService;
    private readonly Mock<IConversationReferenceService> _mockRefService;
    private readonly CobraBot _bot;

    public CobraBotTests()
    {
        _mockChatService = new Mock<IChatService>();
        _mockRefService = new Mock<IConversationReferenceService>();
        _bot = new CobraBot(_mockChatService.Object, _mockRefService.Object);
    }

    [Fact]
    public async Task OnMessageActivity_SavesMessageToCobra()
    {
        // Arrange
        var activity = new Activity
        {
            Type = ActivityTypes.Message,
            Text = "Test message",
            From = new ChannelAccount { Name = "Test User", AadObjectId = "user-123" },
            Conversation = new ConversationAccount { Id = "conv-123" }
        };

        var turnContext = new TurnContext(new TestAdapter(), activity);

        // Act
        await _bot.OnTurnAsync(turnContext);

        // Assert
        _mockChatService.Verify(
            s => s.SaveExternalMessageAsync(It.Is<ChatMessage>(m =>
                m.Content == "Test message" &&
                m.SenderName == "Test User")),
            Times.Once);
    }

    [Fact]
    public async Task OnMembersAdded_BotAdded_StoresConversationReference()
    {
        // Arrange
        var activity = new Activity
        {
            Type = ActivityTypes.ConversationUpdate,
            MembersAdded = new List<ChannelAccount>
            {
                new ChannelAccount { Id = "bot-id" }
            },
            Recipient = new ChannelAccount { Id = "bot-id" },
            ChannelData = JObject.FromObject(new
            {
                team = new { id = "team-123", name = "Test Team" },
                channel = new { id = "channel-123", name = "General" }
            })
        };

        var turnContext = new TurnContext(new TestAdapter(), activity);

        // Act
        await _bot.OnTurnAsync(turnContext);

        // Assert
        _mockRefService.Verify(
            s => s.SaveReferenceAsync(
                It.IsAny<ConversationReference>(),
                "team-123",
                "Test Team",
                "General",
                It.IsAny<string>(),
                It.IsAny<string>()),
            Times.Once);
    }
}
```

### Integration Testing

```csharp
public class MessageFlowIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public MessageFlowIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ProactiveEndpoint_ValidRequest_SendsToTeams()
    {
        // Arrange
        var request = new
        {
            channelMappingId = Guid.NewGuid(),
            message = "Test from COBRA",
            senderName = "Test User"
        };

        // Act
        var response = await _client.PostAsJsonAsync(
            "/api/internal/proactive/send",
            request);

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
```

---

## Deployment

### Azure Resources Required

```
Azure Resources:
├── Bot Channels Registration (Free tier)
│   └── Messaging endpoint: https://{your-domain}/api/messages
│
├── App Service (or Azure Functions)
│   ├── .NET 8 runtime
│   ├── HTTPS required
│   └── Always On: Enabled (for proactive messaging)
│
├── Azure AD App Registration
│   ├── Client ID → MicrosoftAppId
│   └── Client Secret → MicrosoftAppPassword
│
└── Key Vault (recommended)
    ├── MicrosoftAppPassword
    └── Database connection string
```

### Environment Variables

```bash
# Required
MicrosoftAppType=MultiTenant
MicrosoftAppId=<from-azure-ad>
MicrosoftAppPassword=<from-azure-ad>

# Database
ConnectionStrings__DefaultConnection=<sql-connection-string>

# COBRA integration
Cobra__ApiBaseUrl=https://cbr-shr-eu-api-app-q.azurewebsites.net
Cobra__SignalRHubUrl=https://cobra-signalr.azurewebsites.net/chathub

# Optional
ASPNETCORE_ENVIRONMENT=Production
ApplicationInsights__InstrumentationKey=<app-insights-key>
```

### CI/CD Pipeline (Azure DevOps)

```yaml
trigger:
  - main

pool:
  vmImage: "ubuntu-latest"

variables:
  buildConfiguration: "Release"

stages:
  - stage: Build
    jobs:
      - job: Build
        steps:
          - task: UseDotNet@2
            inputs:
              version: "8.x"

          - task: DotNetCoreCLI@2
            displayName: "Restore"
            inputs:
              command: "restore"
              projects: "**/*.csproj"

          - task: DotNetCoreCLI@2
            displayName: "Build"
            inputs:
              command: "build"
              arguments: "--configuration $(buildConfiguration)"

          - task: DotNetCoreCLI@2
            displayName: "Test"
            inputs:
              command: "test"
              arguments: "--configuration $(buildConfiguration)"

          - task: DotNetCoreCLI@2
            displayName: "Publish"
            inputs:
              command: "publish"
              publishWebProjects: true
              arguments: "--configuration $(buildConfiguration) --output $(Build.ArtifactStagingDirectory)"

          - publish: $(Build.ArtifactStagingDirectory)
            artifact: drop

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: Deploy
        environment: "production"
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs:
                    azureSubscription: "Azure-Connection"
                    appType: "webApp"
                    appName: "cobra-teams-bot"
                    package: "$(Pipeline.Workspace)/drop/**/*.zip"
```

---

## Troubleshooting

### Common Issues

| Symptom                    | Possible Cause                | Solution                         |
| -------------------------- | ----------------------------- | -------------------------------- |
| Bot not receiving messages | Endpoint not reachable        | Verify HTTPS, check firewall     |
| 401 Unauthorized           | App ID/secret mismatch        | Verify config matches Azure AD   |
| Proactive messages fail    | Invalid ConversationReference | Check ServiceUrl, re-install bot |
| RSC messages not received  | Permissions not granted       | Re-install app, verify manifest  |
| Messages delayed           | Rate limiting                 | Implement backoff, check quotas  |

### Diagnostic Logging

```csharp
// Add detailed logging in development
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// In production, use structured logging
builder.Logging.AddApplicationInsights();
```

### Bot Framework Emulator

For local testing without Teams:

1. Download Bot Framework Emulator
2. Connect to `http://localhost:3978/api/messages`
3. Enter App ID and Password (or leave blank for local)
4. Test message handling directly

### Teams Developer Tools

1. In Teams: `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (Mac)
2. Check Console for errors
3. Check Network tab for API failures
4. Use "App Studio" to validate manifest

---

## Glossary

| Term                      | Definition                                                     |
| ------------------------- | -------------------------------------------------------------- |
| **Activity**              | Bot Framework message object (includes messages, events, etc.) |
| **Adaptive Card**         | JSON-based card format for rich Teams messages                 |
| **ConversationReference** | Stored context required for proactive messaging                |
| **Proactive Message**     | Bot-initiated message (vs. responding to user)                 |
| **RSC**                   | Resource-Specific Consent - granular Teams permissions         |
| **Turn**                  | Single request/response exchange in Bot Framework              |
| **TurnContext**           | Context object for current conversation turn                   |

---

## References

- [Bot Framework SDK Documentation](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Teams Platform Documentation](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [RSC Permissions](https://docs.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator)

---

_Document Version: 1.0_  
_Last Updated: December 2025_

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

The COBRA Teams integration uses a **stateless bot architecture** where all persistent data lives in CobraAPI's SQL Server database. The TeamsBot service acts as a bridge/adapter with no local state.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Customer Microsoft 365 Tenants                         │
│                                                                                  │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐                          │
│   │ Customer A  │   │ Customer B  │   │ Customer C  │   ...                    │
│   │ Teams       │   │ Teams       │   │ Teams       │                          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘                          │
│          │                 │                 │                                  │
└──────────┼─────────────────┼─────────────────┼──────────────────────────────────┘
           │                 │                 │
           └────────────────┬┴─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              YOUR Azure Tenant                                   │
│                                                                                  │
│   ┌──────────────────┐                                                          │
│   │  Azure Bot       │ ◄── Bot Registration (App ID, Messaging Endpoint)        │
│   │  Service         │                                                          │
│   └────────┬─────────┘                                                          │
│            │                                                                     │
│            ▼                                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                     COBRA Teams Bot (Stateless)                          │  │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐    │  │
│   │   │ /api/messages   │    │ /api/internal/* │    │ No Local State   │    │  │
│   │   │ (Bot Framework) │    │ (CobraAPI calls)│    │ (Stateless)      │    │  │
│   │   └────────┬────────┘    └────────┬────────┘    └──────────────────┘    │  │
│   └────────────┼──────────────────────┼─────────────────────────────────────┘  │
│                │                      │                                         │
│                └──────────┬───────────┘                                         │
│                           │                                                     │
│                           ▼                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                           CobraAPI                                        │  │
│   │   ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐    │  │
│   │   │ Webhook Handler │    │ External        │    │ SignalR Hub      │    │  │
│   │   │ /api/webhooks/* │    │ MessagingService│    │ (Real-time)      │    │  │
│   │   └────────┬────────┘    └────────┬────────┘    └────────┬─────────┘    │  │
│   └────────────┼──────────────────────┼──────────────────────┼──────────────┘  │
│                │                      │                      │                  │
│                └──────────────────────┼──────────────────────┘                  │
│                                       │                                         │
│                                       ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │                          SQL Server                                       │  │
│   │   ┌─────────────────────────────────────────────────────────────────┐    │  │
│   │   │  ExternalChannelMapping                                          │    │  │
│   │   │  - ConversationReferenceJson (Teams proactive messaging data)   │    │  │
│   │   │  - TenantId (Customer's M365 tenant)                            │    │  │
│   │   │  - LastActivityAt (Health monitoring)                           │    │  │
│   │   │  - Messages, Channels, Events...                                 │    │  │
│   │   └─────────────────────────────────────────────────────────────────┘    │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

#### Stateless Bot Design
The TeamsBot is designed to be **completely stateless**:
- **No in-memory state**: ConversationReferences stored in CobraAPI database
- **Horizontally scalable**: Multiple bot instances can run simultaneously
- **Restart-safe**: No data loss when bot restarts or redeploys
- **Single source of truth**: All data in CobraAPI's SQL Server

#### Bot Registration vs Bot Hosting
Understanding the difference is critical:

| Concept | Lives In | Purpose |
|---------|----------|---------|
| **Bot Registration** | Your Azure tenant | App ID, messaging endpoint URL, Teams channel config |
| **Bot Hosting** | Your infrastructure | The ASP.NET service handling `/api/messages` |
| **Bot Installation** | Customer's Teams | When customer adds bot to their team/channel |

- One bot registration serves all customer tenants (multi-tenant bot)
- Customers install YOUR bot into THEIR Teams - no hosting required on their side
- Bot appears in customer's Teams but runs on your infrastructure

#### Why Stateless?
1. **Operations**: One database to manage, backup, and monitor
2. **Scaling**: Add more bot instances without state synchronization
3. **Reliability**: Bot restarts don't lose ConversationReferences
4. **Development**: Emulator sessions don't create orphan connectors

### Component Responsibilities

| Component         | Responsibility                                                    |
| ----------------- | ----------------------------------------------------------------- |
| Teams Client      | User interface in customer's Microsoft 365 tenant                 |
| Azure Bot Service | Message routing, authentication, token validation                 |
| COBRA Teams Bot   | **Stateless** message handling, calls CobraAPI for all persistence |
| CobraAPI          | Business logic, database access, ConversationReference storage     |
| SignalR Hub       | Real-time updates to COBRA web clients                            |
| SQL Server        | All persistent data including ConversationReferences              |

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

### Inbound: Teams → COBRA (Stateless Architecture)

```
┌──────────────┐    ┌─────────────┐    ┌──────────────────────────────────────────────────┐
│  Teams User  │───▶│ Bot Service │───▶│              COBRA Teams Bot (Stateless)         │
│ (Customer    │    │   (Azure)   │    │                                                   │
│  Tenant)     │    │             │    │   1. Receive activity at /api/messages           │
└──────────────┘    └─────────────┘    │   2. Call CobraAPI to store ConversationRef      │
                                       │   3. Call CobraAPI webhook with message          │
                                       └───────────────────────┬──────────────────────────┘
                                                               │
                                                               ▼
                                       ┌──────────────────────────────────────────────────┐
                                       │                    CobraAPI                       │
                                       │                                                   │
                                       │   1. Store/update ConversationReference in DB    │
                                       │   2. Process webhook → save ChatMessage          │
                                       │   3. Broadcast via SignalR                       │
                                       └───────────────────────┬──────────────────────────┘
                                                               │
                                                               ▼
                                       ┌──────────────────────────────────────────────────┐
                                       │                  SQL Server                       │
                                       │   - ExternalChannelMapping.ConversationRefJson   │
                                       │   - ExternalChannelMapping.LastActivityAt        │
                                       │   - ChatMessage                                   │
                                       └──────────────────────────────────────────────────┘
```

**Sequence:**

1. User posts message in Teams channel (any customer tenant)
2. Azure Bot Service authenticates and routes to TeamsBot `/api/messages`
3. TeamsBot calls CobraAPI `PUT /api/chat/teams/conversation-reference` to store/update ConversationReference
4. TeamsBot calls CobraAPI `POST /api/webhooks/teams/{mappingId}` with message payload
5. CobraAPI saves message to database via `ChatService`
6. CobraAPI broadcasts via SignalR to connected COBRA clients
7. TeamsBot does NOT store anything locally - all state is in CobraAPI

**Key Point:** TeamsBot has no local state. If it restarts, ConversationReferences are preserved in CobraAPI's database.

### Outbound: COBRA → Teams (Stateless Architecture)

```
┌──────────────┐    ┌──────────────────────────────────────────────────────────────────┐
│  COBRA User  │───▶│                         CobraAPI                                  │
│              │    │                                                                   │
└──────────────┘    │   1. Save message to database                                    │
                    │   2. Lookup ExternalChannelMapping (has ConversationRefJson)     │
                    │   3. Call TeamsBot /api/internal/send with ConversationRef       │
                    └───────────────────────┬──────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────────────────────┐
                    │                COBRA Teams Bot (Stateless)                        │
                    │                                                                   │
                    │   1. Receive ConversationRef + message from CobraAPI             │
                    │   2. Use ContinueConversationAsync with provided ConversationRef │
                    │   3. Send to Teams via Bot Service                               │
                    │   (No database lookup - CobraAPI provides everything)            │
                    └───────────────────────┬──────────────────────────────────────────┘
                                            │
                                            ▼
                    ┌──────────────────────────────────────────────────────────────────┐
                    │                     Azure Bot Service                             │
                    │                           │                                       │
                    │                           ▼                                       │
                    │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐           │
                    │   │ Customer A  │   │ Customer B  │   │ Customer C  │           │
                    │   │ Teams       │   │ Teams       │   │ Teams       │           │
                    │   └─────────────┘   └─────────────┘   └─────────────┘           │
                    └──────────────────────────────────────────────────────────────────┘
```

**Sequence:**

1. User sends message in COBRA linked channel
2. CobraAPI saves message and looks up `ExternalChannelMapping`
3. CobraAPI retrieves `ConversationReferenceJson` from database
4. CobraAPI calls TeamsBot `/api/internal/send` with:
   - `ConversationReferenceJson` (from database)
   - `Message` content
   - `SenderName` for attribution
5. TeamsBot uses `ContinueConversationAsync` with the provided ConversationReference
6. Message appears in Teams with COBRA sender attribution

**Key Point:** TeamsBot doesn't look up anything - CobraAPI provides the ConversationReference. This makes TeamsBot truly stateless.

---

## Database Schema

### Stateless Architecture: ExternalChannelMapping Extensions

In the stateless architecture, ConversationReferences are stored directly in the existing `ExternalChannelMapping` table (no separate Teams-specific tables needed). This leverages the existing multi-platform infrastructure.

```sql
-- Extensions to existing ExternalChannelMapping table for Teams stateless architecture
ALTER TABLE ExternalChannelMapping ADD
    -- Serialized Bot Framework ConversationReference (required for proactive messaging)
    ConversationReferenceJson NVARCHAR(MAX) NULL,

    -- Customer's Microsoft 365 tenant ID (for future multi-tenant filtering)
    TenantId NVARCHAR(100) NULL,

    -- Track connector health and activity
    LastActivityAt DATETIME2 NULL,

    -- Who installed the bot (for audit/debugging)
    InstalledByName NVARCHAR(200) NULL,

    -- Flag emulator/test connections for easy cleanup
    IsEmulator BIT NOT NULL DEFAULT 0;

-- Index for tenant-based queries (future multi-tenancy)
CREATE INDEX IX_ExternalChannelMapping_TenantId
    ON ExternalChannelMapping(TenantId)
    WHERE TenantId IS NOT NULL;

-- Index for stale connector cleanup
CREATE INDEX IX_ExternalChannelMapping_LastActivityAt
    ON ExternalChannelMapping(LastActivityAt)
    WHERE Platform = 3; -- Teams platform enum value
```

### ExternalChannelMapping Entity (Updated)

```csharp
/// <summary>
/// Maps external platform channels (Teams, GroupMe, etc.) to COBRA events.
/// For Teams, also stores the ConversationReference for proactive messaging.
/// </summary>
public class ExternalChannelMapping
{
    public Guid Id { get; set; }

    // COBRA references
    public Guid EventId { get; set; }
    public Guid? ChatThreadId { get; set; }

    // Platform identification
    public ExternalPlatform Platform { get; set; }  // Teams, GroupMe, Signal, Slack

    // External platform identifiers
    public string ExternalGroupId { get; set; } = string.Empty;  // Teams ConversationId
    public string ExternalGroupName { get; set; } = string.Empty; // Display name (editable)

    // Existing fields...
    public string? BotId { get; set; }
    public string? WebhookSecret { get; set; }
    public string? ShareUrl { get; set; }
    public bool IsActive { get; set; } = true;

    // === NEW: Teams Stateless Architecture Fields ===

    /// <summary>
    /// Serialized Bot Framework ConversationReference for proactive messaging.
    /// Only populated for Teams platform.
    /// </summary>
    public string? ConversationReferenceJson { get; set; }

    /// <summary>
    /// Customer's Microsoft 365 tenant ID.
    /// Captured from activity.Conversation.TenantId.
    /// Enables future multi-tenant queries.
    /// </summary>
    public string? TenantId { get; set; }

    /// <summary>
    /// Last time a message was received from this channel.
    /// Used for health monitoring and stale connector cleanup.
    /// </summary>
    public DateTime? LastActivityAt { get; set; }

    /// <summary>
    /// Display name of user who installed the bot.
    /// Captured from activity.From.Name on bot installation.
    /// </summary>
    public string? InstalledByName { get; set; }

    /// <summary>
    /// True if this is a Bot Framework Emulator connection.
    /// Detected via activity.ChannelId == "emulator".
    /// Makes it easy to filter/cleanup test connections.
    /// </summary>
    public bool IsEmulator { get; set; }

    // Audit fields
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? LastModifiedBy { get; set; }
    public DateTime? LastModifiedAt { get; set; }

    // Navigation
    public Event Event { get; set; } = null!;
    public ChatThread? ChatThread { get; set; }

    // === Helper Methods ===

    /// <summary>
    /// Deserializes the stored ConversationReference for proactive messaging.
    /// </summary>
    public ConversationReference? GetConversationReference()
    {
        if (string.IsNullOrEmpty(ConversationReferenceJson))
            return null;

        return JsonSerializer.Deserialize<ConversationReference>(ConversationReferenceJson);
    }

    /// <summary>
    /// Serializes and stores a ConversationReference.
    /// </summary>
    public void SetConversationReference(ConversationReference reference)
    {
        ConversationReferenceJson = JsonSerializer.Serialize(reference);
    }
}
```

### Legacy Schema (Deprecated)

The following tables were planned in the original architecture but are **NOT used** in the stateless architecture:

```sql
-- DEPRECATED: TeamsConversationReferences table
-- ConversationReferences are now stored in ExternalChannelMapping.ConversationReferenceJson

-- DEPRECATED: TeamsChannelMappings table
-- Use ExternalChannelMapping with Platform = Teams instead
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

### Stateless Architecture: ConversationReference Flow

In the stateless architecture, ConversationReferences are stored in CobraAPI's database, not in the TeamsBot. This changes the proactive messaging flow:

**Key Principle:** CobraAPI owns all persistent data. TeamsBot receives the ConversationReference as a parameter when sending messages.

### CobraAPI: Store/Update ConversationReference

When TeamsBot receives a message, it calls CobraAPI to store the ConversationReference:

```csharp
// CobraAPI endpoint for storing ConversationReferences
[HttpPut("teams/conversation-reference")]
public async Task<IActionResult> StoreConversationReference(
    [FromBody] StoreConversationReferenceRequest request)
{
    // Find or create ExternalChannelMapping
    var mapping = await _dbContext.ExternalChannelMappings
        .FirstOrDefaultAsync(m =>
            m.Platform == ExternalPlatform.Teams &&
            m.ExternalGroupId == request.ConversationId);

    if (mapping == null)
    {
        // Create new mapping (bot just installed in this channel)
        mapping = new ExternalChannelMapping
        {
            Id = Guid.NewGuid(),
            Platform = ExternalPlatform.Teams,
            ExternalGroupId = request.ConversationId,
            ExternalGroupName = request.ChannelName ?? "Teams Channel",
            CreatedBy = "TeamsBot",
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.ExternalChannelMappings.Add(mapping);
    }

    // Update ConversationReference and metadata
    mapping.ConversationReferenceJson = request.ConversationReferenceJson;
    mapping.TenantId = request.TenantId;
    mapping.LastActivityAt = DateTime.UtcNow;
    mapping.InstalledByName = request.InstalledByName;
    mapping.IsEmulator = request.IsEmulator;

    await _dbContext.SaveChangesAsync();

    return Ok(new { mappingId = mapping.Id });
}
```

### CobraAPI: Send to Teams (Includes ConversationReference)

When COBRA sends a message, CobraAPI includes the ConversationReference in the request to TeamsBot:

```csharp
// In ExternalMessagingService.SendToTeamsAsync()
public async Task SendToTeamsAsync(ExternalChannelMapping mapping, string message, string senderName)
{
    if (string.IsNullOrEmpty(mapping.ConversationReferenceJson))
    {
        _logger.LogWarning("No ConversationReference stored for mapping {MappingId}", mapping.Id);
        return;
    }

    var request = new TeamsSendRequest
    {
        ConversationId = mapping.ExternalGroupId,
        ConversationReferenceJson = mapping.ConversationReferenceJson, // From database
        Message = message,
        SenderName = senderName,
        EventName = mapping.Event?.Name,
        ChannelName = mapping.ExternalGroupName
    };

    var response = await _httpClient.PostAsJsonAsync(
        $"{_teamsBotBaseUrl}/api/internal/send",
        request);

    if (!response.IsSuccessStatusCode)
    {
        _logger.LogError("Failed to send to Teams: {StatusCode}", response.StatusCode);
    }
}
```

### TeamsBot: Stateless Send (No Database Lookup)

TeamsBot receives everything it needs from CobraAPI - no local storage required:

```csharp
// TeamsBot /api/internal/send endpoint
[HttpPost("send")]
public async Task<IActionResult> SendMessage([FromBody] TeamsSendRequest request)
{
    // Deserialize the ConversationReference provided by CobraAPI
    var conversationRef = JsonSerializer.Deserialize<ConversationReference>(
        request.ConversationReferenceJson);

    if (conversationRef == null)
    {
        return BadRequest(new { error = "Invalid ConversationReference" });
    }

    try
    {
        await ((CloudAdapter)_adapter).ContinueConversationAsync(
            _appId,
            conversationRef,
            async (turnContext, cancellationToken) =>
            {
                var formattedMessage = $"**[{request.SenderName}]** {request.Message}";
                await turnContext.SendActivityAsync(
                    MessageFactory.Text(formattedMessage),
                    cancellationToken);
            },
            CancellationToken.None);

        return Ok(new { success = true });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to send to Teams");
        return StatusCode(500, new { error = ex.Message });
    }
}
```

### Important: ServiceUrl Handling

The ServiceUrl can change over time (Teams infrastructure updates). The stateless architecture handles this automatically:

1. **Every inbound message** triggers a call to CobraAPI to update the ConversationReference
2. **CobraAPI stores the latest** ConversationReferenceJson (which includes ServiceUrl)
3. **Outbound messages** always use the latest stored ConversationReference

```csharp
// In TeamsBot.OnMessageActivityAsync()
protected override async Task OnMessageActivityAsync(
    ITurnContext<IMessageActivity> turnContext,
    CancellationToken cancellationToken)
{
    var activity = turnContext.Activity;
    var reference = activity.GetConversationReference();

    // Always update ConversationReference in CobraAPI (ServiceUrl may have changed)
    await _cobraApiClient.StoreConversationReferenceAsync(new StoreConversationReferenceRequest
    {
        ConversationId = activity.Conversation.Id,
        ConversationReferenceJson = JsonSerializer.Serialize(reference),
        TenantId = activity.Conversation.TenantId,
        IsEmulator = activity.ChannelId == "emulator"
    });

    // Then process the message via webhook
    await _cobraApiClient.SendWebhookAsync(mappingId, payload);
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

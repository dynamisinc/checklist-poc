# COBRA External Messaging Integration POC (v2)

## Overview

This POC integrates external group messaging platforms (starting with GroupMe) into COBRA's event chat system. It is designed to be **bolted onto an existing POC application** (like the checklist POC) that already has events, users, and deployment infrastructure.

### Key Design Principles

1. **Entities match production exactly** - `ChatMessage`, `ExternalChannelMapping`, etc. can be lifted directly into COBRA
2. **Services are simplified** - No `BaseService`, no `IFilteredDbContextService`, just direct DbContext injection
3. **Clear TODO markers** - Every place where production differs is marked with `// TODO: Production - ...`
4. **Standalone GroupMe client** - `GroupMeApiClient` has zero COBRA dependencies

## What's Included

```
groupme-poc-v2/
├── Controllers/
│   ├── ChatController.cs         # API endpoints for chat operations
│   └── WebhooksController.cs     # Public webhook endpoint for GroupMe
├── Data/
│   └── PocDbContext.cs           # DbContext with EF configurations
├── Entities/
│   └── Entities.cs               # All entity classes (production-ready structure)
├── ExternalMessaging/
│   └── GroupMeApiClient.cs       # GroupMe API client (standalone)
├── Services/
│   ├── ChatService.cs            # Chat operations with external integration
│   ├── ChatHubService.cs         # SignalR broadcasting
│   └── ExternalMessagingService.cs # External platform orchestration
├── Frontend/
│   └── src/
│       ├── types/
│       │   └── chat.types.ts     # TypeScript interfaces
│       └── components/
│           └── Chat/
│               ├── EventChat.tsx           # Main chat container
│               ├── ChatMessage.tsx         # Message display component
│               ├── PromoteToLogbookDialog.tsx # Logbook promotion modal
│               └── index.ts
├── ServiceRegistration.cs        # DI registration helpers
└── README.md                     # This file
```

## Integration Steps for Existing POC

### 1. Add NuGet Packages

```bash
dotnet add package Microsoft.AspNetCore.SignalR
```

### 2. Copy Files

Copy the following folders into your POC project:
- `Controllers/` → merge with existing controllers folder
- `Data/` → merge configurations into your existing DbContext
- `Entities/` → add to your entities folder
- `ExternalMessaging/` → add as new folder
- `Services/` → merge with existing services folder

### 3. Update Your DbContext

Add these DbSets to your existing DbContext:

```csharp
public DbSet<ChatThread> ChatThreads => Set<ChatThread>();
public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
public DbSet<ExternalChannelMapping> ExternalChannelMappings => Set<ExternalChannelMapping>();
public DbSet<LogbookEntry> LogbookEntries => Set<LogbookEntry>();
```

And apply configurations in `OnModelCreating`:

```csharp
modelBuilder.ApplyConfiguration(new ChatThreadConfiguration());
modelBuilder.ApplyConfiguration(new ChatMessageConfiguration());
modelBuilder.ApplyConfiguration(new ExternalChannelMappingConfiguration());
```

### 4. Register Services in Program.cs

```csharp
// Add SignalR
builder.Services.AddSignalR();

// Add chat services
builder.Services.AddChatServices(builder.Configuration);

// After app.Build():
app.MapHub<ChatHub>("/hubs/chat");
```

### 5. Add Configuration

Add to `appsettings.json`:

```json
{
  "GroupMe": {
    "AccessToken": "YOUR_ACCESS_TOKEN_FROM_DEV_GROUPME_COM",
    "WebhookBaseUrl": "https://your-poc-url.azurewebsites.net"
  }
}
```

### 6. Create EF Migration

```bash
dotnet ef migrations add AddChatAndExternalMessaging
dotnet ef database update
```

### 7. Copy Frontend Components

Copy the `Frontend/src/` contents to your React app's source folder.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/{eventId}/chat/thread` | Get default chat thread |
| GET | `/api/events/{eventId}/chat/thread/{threadId}/messages` | Get messages |
| POST | `/api/events/{eventId}/chat/thread/{threadId}/messages` | Send message |
| POST | `/api/events/{eventId}/chat/messages/{messageId}/promote-to-logbook` | Promote to logbook |
| GET | `/api/events/{eventId}/chat/external-channels` | Get GroupMe connections |
| POST | `/api/events/{eventId}/chat/external-channels` | Connect GroupMe group |
| DELETE | `/api/events/{eventId}/chat/external-channels/{mappingId}` | Disconnect |
| POST | `/api/webhooks/groupme/{mappingId}` | GroupMe webhook (public) |

## SignalR Hub

Connect to `/hubs/chat` and join event chat:

```typescript
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/hubs/chat")
  .build();

await connection.start();
await connection.invoke("JoinEventChat", eventId);

connection.on("ReceiveChatMessage", (message: ChatMessageDto) => {
  // Handle new message
});
```

## Testing with ngrok

For local development, use ngrok to expose your webhook endpoint:

```bash
ngrok http 5000
```

Update `appsettings.Development.json`:

```json
{
  "GroupMe": {
    "WebhookBaseUrl": "https://abc123.ngrok.io"
  }
}
```

## Production Migration Notes

When moving to COBRA production, the following changes are needed:

### Services

1. Change class declarations to inherit from `BaseService`
2. Update constructors to accept `IOptionsSnapshot<CobraConfigurationSettings>`, `IUserContextService`, `IFilteredDbContextService`
3. Replace `CurrentUserId` property with `CurrentUserContext.UserId`
4. Replace `await _dbContext.SaveChangesAsync()` with `await _dbContext.SaveChangesAsync(Action.X, entityId, null, description)`
5. Replace `_chatHubService.BroadcastMessageToEventAsync()` with `_notifierService.SendMessageToEventUsers()`

### Entities

1. Add interface implementations: `IUserModifiableEntity`, `ISoftDeletableEntity`
2. For `ChatThread`: Add `IEventDataEntity`, `ITranslatableEntity<ChatThreadTranslation>`
3. Remove simplified `User`, `Event`, `LogbookEntry` classes (use actual COBRA entities)

### Search for all `// TODO: Production` comments to find specific changes needed.

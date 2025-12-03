# GroupMe Integration - Technical Design & Setup Guide

## Overview

This document describes how COBRA integrates with GroupMe for bi-directional messaging and provides instructions for local development and testing.

## Architecture

### How GroupMe Integration Works

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   COBRA User    │         │   COBRA API     │         │   GroupMe API   │
│                 │         │                 │         │                 │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │ 1. Send message           │                           │
         ├──────────────────────────►│                           │
         │                           │ 2. POST /bots/post        │
         │                           ├──────────────────────────►│
         │                           │                           │
         │                           │                           │
┌────────┴────────┐         ┌────────┴────────┐         ┌────────┴────────┐
│  GroupMe User   │         │  Webhook Handler│         │  GroupMe Group  │
│                 │         │                 │         │                 │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │                           │ 3. POST (webhook callback)│
         │                           │◄──────────────────────────┤
         │                           │                           │
         │ 4. Message via SignalR    │                           │
         │◄──────────────────────────┤                           │
         │                           │                           │
```

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `GroupMeApiClient` | `Tools/Chat/ExternalPlatforms/` | HTTP client for GroupMe REST API |
| `GroupMeSettings` | `Tools/Chat/ExternalPlatforms/` | Configuration (access token, webhook URL) |
| `WebhooksController` | `Tools/Chat/Controllers/` | Receives inbound messages from GroupMe |
| `ExternalMessagingService` | `Tools/Chat/Services/` | Orchestrates channel creation and message flow |
| `ExternalChannelMapping` | `Tools/Chat/Models/Entities/` | Database record linking event to GroupMe group |

### Configuration Storage

| Setting | Source | Admin UI | Notes |
|---------|--------|----------|-------|
| `GroupMe:AccessToken` | Database (SystemSettings) | **Editable** | Secret - admin enters in UI |
| `GroupMe:WebhookBaseUrl` | appsettings.json / environment | **Display only** | Determined by deployment |
| `GroupMe:BaseUrl` | appsettings.json | Hidden | GroupMe API URL - never changes |

**Why WebhookBaseUrl is NOT editable in Admin UI:**
- The webhook URL is determined by where the application is deployed
- The app knows its own base URL from configuration
- In Azure, this is set via App Settings (environment variable): `GroupMe__WebhookBaseUrl`
- Admins shouldn't need to configure this - it's infrastructure
- The Admin UI should **display** the computed webhook callback URL (read-only) for verification

**Configuration Priority:**
1. Environment variables (e.g., `GroupMe__WebhookBaseUrl` in Azure App Settings)
2. `appsettings.{Environment}.json` (e.g., `appsettings.Production.json`)
3. `appsettings.json` (base defaults)
4. Database SystemSettings (only for AccessToken)

**Example Environment Configuration:**

| Environment | WebhookBaseUrl Value |
|-------------|---------------------|
| Local Dev | `http://localhost:5000` (default in appsettings.json) |
| Local + ngrok | Set in `appsettings.Development.json` or env var |
| Azure POC | `https://checklist-poc-app.azurewebsites.net` (Azure App Setting) |
| Production | `https://cobra.customer.com` (Azure App Setting) |

---

## Setup Instructions

### Prerequisites

1. A GroupMe account (create at groupme.com)
2. Access to GroupMe Developer Portal (dev.groupme.com)

### Step 1: Get Your GroupMe Access Token

1. Go to https://dev.groupme.com/
2. Log in with your GroupMe account
3. Click "Access Token" in the top right
4. Copy your access token (keep this secret!)

### Step 2: Configure COBRA

#### Option A: Via Admin UI (Recommended for Production)

1. Navigate to `/admin` in the COBRA application
2. Go to "System Settings" tab
3. Find "Integration" category
4. Enter your GroupMe Access Token
5. Enter your Webhook Base URL (your server's public URL)
6. Click Save

#### Option B: Via appsettings.json (Development)

Add to `appsettings.Development.json`:

```json
{
  "GroupMe": {
    "AccessToken": "YOUR_ACCESS_TOKEN_HERE",
    "WebhookBaseUrl": "https://your-public-url.ngrok.io",
    "BaseUrl": "https://api.groupme.com/v3"
  }
}
```

### Step 3: Expose Your Local Server (for Webhook Testing)

GroupMe needs to reach your webhook endpoint. For local development, use ngrok or similar:

```bash
# Install ngrok (one-time)
# Windows: winget install ngrok
# Mac: brew install ngrok

# Start your COBRA API
cd src/backend/CobraAPI
dotnet run

# In another terminal, expose port 5000
ngrok http 5000
```

ngrok will give you a public URL like `https://abc123.ngrok.io`. Use this as your `WebhookBaseUrl`.

**Important:** The webhook callback URL that gets registered with GroupMe will be:
```
{WebhookBaseUrl}/api/webhooks/groupme/{channelMappingId}
```

### Step 4: Verify Configuration

1. Check the webhook health endpoint:
   ```bash
   curl https://your-public-url.ngrok.io/api/webhooks/health
   ```
   Should return: `{"status":"healthy","timestamp":"..."}`

2. Check GroupMe API connectivity (future: via Admin UI status check)

---

## Local Development & Testing

### Testing Inbound Messages (GroupMe → COBRA)

1. **Create an External Channel:**
   - Use the chat admin UI to create a GroupMe channel for an event
   - Or call the API directly:
   ```bash
   POST /api/chat/external-channels
   {
     "eventId": "your-event-id",
     "platform": "GroupMe",
     "customGroupName": "Test Channel"
   }
   ```

2. **Get the Share URL:**
   - The response includes a `shareUrl`
   - Open this in your browser to join the GroupMe group

3. **Send a Message in GroupMe:**
   - Send a message from the GroupMe app
   - Check COBRA - the message should appear via SignalR
   - Check the database: `SELECT * FROM ChatMessages WHERE IsExternalMessage = 1`

4. **Check Logs:**
   ```bash
   # Watch for webhook activity
   # Logs will show: "Received GroupMe webhook for mapping..."
   ```

### Testing Outbound Messages (COBRA → GroupMe)

1. Send a message in COBRA's event chat
2. Check the GroupMe group - message should appear from the "COBRA" bot
3. Format will be: `[Sender Name] Message text`

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook not receiving messages | ngrok URL changed | Update `WebhookBaseUrl` in settings, recreate the channel |
| "Invalid access token" | Token expired or wrong | Get a new token from dev.groupme.com |
| Messages not appearing in COBRA | Bot messages filtered | This is intentional - bot messages are ignored to prevent loops |
| Duplicate messages | Webhook retry | Normal - COBRA deduplicates by `ExternalMessageId` |

### ngrok Tips

- **Free tier limitation:** URL changes every restart
- **Paid tier:** Get a stable subdomain (`ngrok http 5000 --subdomain=myapp`)
- **Alternative:** Use a cloud dev environment or deploy to Azure

---

## Multi-Tenancy Considerations (Future)

The current POC uses a simple model where the `channelMappingId` in the webhook URL identifies the event. For production with multiple customers/organizations:

### Current URL Structure
```
POST /api/webhooks/groupme/{channelMappingId}
```

### Why This Works for Multi-Tenancy

The `ExternalChannelMapping.Id` (GUID) is:
- Globally unique across all customers
- Contains no sensitive information
- Used to look up the associated event, which will have customer/org context

### Future Database Changes

When multi-tenancy is added, the `ExternalChannelMapping` entity will include:

```csharp
// Future additions (nullable for migration)
public Guid? CustomerId { get; set; }      // COBRA customer
public Guid? OrganizationId { get; set; }  // Organization within customer
```

The webhook URL structure does NOT need to change - customer isolation happens at the service layer.

---

## API Reference

### Create External Channel

```http
POST /api/chat/external-channels
Authorization: Bearer {token}
Content-Type: application/json

{
  "eventId": "guid",
  "platform": "GroupMe",
  "customGroupName": "Optional custom name"
}
```

Response:
```json
{
  "id": "channel-mapping-guid",
  "eventId": "event-guid",
  "platform": "GroupMe",
  "platformName": "GroupMe",
  "externalGroupId": "12345678",
  "externalGroupName": "COBRA: Event Name",
  "shareUrl": "https://groupme.com/join_group/...",
  "isActive": true,
  "createdAt": "2025-12-02T..."
}
```

### Webhook Health Check

```http
GET /api/webhooks/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-02T20:30:00Z"
}
```

### GroupMe Webhook (Internal - called by GroupMe)

```http
POST /api/webhooks/groupme/{channelMappingId}
Content-Type: application/json

{
  "id": "message-id",
  "group_id": "group-id",
  "user_id": "sender-user-id",
  "name": "Sender Name",
  "text": "Message content",
  "created_at": 1701547800,
  "sender_type": "user",
  "attachments": []
}
```

---

## Security Considerations

1. **Access Token Storage:**
   - Stored in SystemSettings with `IsSecret = true`
   - Masked in API responses
   - Consider encryption at rest for production

2. **Webhook Security:**
   - GroupMe does NOT sign webhook payloads
   - Security relies on:
     - Obscurity of the `channelMappingId` GUID
     - Validation that `group_id` in payload matches expected group
     - Rate limiting (future)

3. **Bot Messages:**
   - Bot messages (sender_type = "bot") are filtered to prevent infinite loops
   - This means COBRA's own outbound messages are not echoed back

---

## Troubleshooting

### Enable Debug Logging

In `appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "CobraAPI.Tools.Chat": "Debug"
    }
  }
}
```

### Check Channel Mapping

```sql
SELECT * FROM ExternalChannelMappings WHERE EventId = 'your-event-id';
```

### Test GroupMe API Directly

```bash
# Get your groups
curl "https://api.groupme.com/v3/groups?token=YOUR_TOKEN"

# Get your bots
curl "https://api.groupme.com/v3/bots?token=YOUR_TOKEN"
```

---

## Related User Stories

- UC-022: Configure External Platform API Credentials
- UC-023: Webhook Health Check
- UC-009: Receive External Messages in COBRA
- UC-010: Send Channel Messages to External Platform
- UC-002: Create External GroupMe Channel on Event Creation
- UC-003: Associate Existing GroupMe Group with Event

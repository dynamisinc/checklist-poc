# COBRA Teams Integration - Migration Status & Prompt

**Generated:** 2025-12-04
**Purpose:** Context for AI assistant to continue Teams integration work
**Current SDK:** Bot Framework SDK v4 (.NET)
**Target SDK:** Microsoft 365 Agents SDK (future migration)

---

## Executive Summary

The COBRA Teams integration is **substantially complete** at the POC level, with bi-directional messaging working via Bot Framework SDK v4. A future migration to Microsoft 365 Agents SDK may be needed as Microsoft is modernizing their bot platform.

### Current State

| Aspect | Status |
|--------|--------|
| **Architecture** | Stateless bot design with CobraAPI storage |
| **Inbound messages** | Teams → TeamsBot → CobraAPI webhook → SignalR → UI ✅ |
| **Outbound messages** | COBRA UI → CobraAPI → TeamsBot → Teams API ✅ |
| **Admin UI** | Connector management (rename, delete, cleanup) ✅ |
| **Local testing** | Bot Framework Emulator compatible ✅ |
| **Production deployment** | Pending (requires Azure Bot Service registration) |

---

## Completed User Stories

### Phase 1: Bot Development & Infrastructure

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-001** | Create Teams Bot Project | ✅ **COMPLETE** |
| **UC-TI-002** | Register Azure Bot Service | 📋 DOCUMENTED (not executed - POC only) |
| **UC-TI-003** | Create Azure AD App Registration | 📋 DOCUMENTED |
| **UC-TI-004** | Configure RSC Permissions | 📋 DOCUMENTED (manifest ready) |
| **UC-TI-005** | Create Teams App Manifest | 📋 Template documented |
| **UC-TI-006** | Local Development Environment | ✅ **COMPLETE** (Emulator works) |

### Phase 2: COBRA Integration (Core - Complete)

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-007** | Integrate Bot with CobraAPI via Webhooks | ✅ **COMPLETE** |
| **UC-TI-008** | Store Conversation References | ✅ **COMPLETE** |
| **UC-TI-009** | Implement Inbound Message Handler | ✅ **COMPLETE** |
| **UC-TI-010** | Implement Outbound Proactive Messaging | ✅ **COMPLETE** |
| **UC-TI-011** | Create External Channel Mapping for Teams | ✅ **COMPLETE** |
| **UC-TI-012** | Integrate with Announcements Broadcast | ✅ **COMPLETE** |

### Phase 3: Customer Installation & Documentation

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-013** | Customer Installation Guide | ✅ **COMPLETE** |
| **UC-TI-014** | O365 Permission Requirements | ✅ **COMPLETE** |
| **UC-TI-015** | Teams Admin Center Deployment Guide | ✅ **COMPLETE** |
| **UC-TI-016** | Sideloading Guide | ✅ **COMPLETE** |
| **UC-TI-017** | In-App Onboarding Flow | ⚠️ PARTIAL (welcome message only) |

### Phase 4: Channel Selection & Management

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-018** | List Available Teams for Linking | ✅ **COMPLETE** |
| **UC-TI-019** | Link Teams Channel to COBRA Event | ⚠️ PARTIAL (UI exists, flow incomplete) |
| **UC-TI-020** | Unlink Teams Channel | ✅ **COMPLETE** |
| **UC-TI-021** | Handle Bot Removal from Team | ✅ **COMPLETE** |

### Phase 5: Message Display & UX

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-022** | Display Teams Messages in COBRA UI | ✅ **COMPLETE** |
| **UC-TI-023** | Display Teams Channels in Channel List | ✅ **COMPLETE** |

### Phase 6: Error Handling & Resilience

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-024** | Handle Teams API Failures | ✅ **COMPLETE** (exponential backoff with jitter) |
| **UC-TI-025** | Handle Conversation Reference Expiration | ✅ **COMPLETE** (validator + HTTP 410 responses) |

### Phase 7: Documentation & Training

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-026** | Developer Documentation | ✅ **COMPLETE** (54KB guide) |
| **UC-TI-027** | End User Guide | ✅ **COMPLETE** |
| **UC-TI-028** | Video Walkthrough Script | ✅ **COMPLETE** |

### Phase 8: Stateless Architecture

| Story ID | Title | Status |
|----------|-------|--------|
| **UC-TI-029** | Stateless Bot with CobraAPI Storage | ✅ **COMPLETE** |
| **UC-TI-030** | Connector Management Admin UI | ✅ **COMPLETE** |

---

## Implementation Summary

### Backend: CobraAPI.TeamsBot Project

**Key Files:**

| File | Purpose |
|------|---------|
| [Program.cs](../../../src/backend/CobraAPI.TeamsBot/Program.cs) | DI registration, CORS, Bot Framework setup |
| [Bots/CobraTeamsBot.cs](../../../src/backend/CobraAPI.TeamsBot/Bots/CobraTeamsBot.cs) | Main `TeamsActivityHandler` - message handling |
| [Bots/AdapterWithErrorHandler.cs](../../../src/backend/CobraAPI.TeamsBot/Bots/AdapterWithErrorHandler.cs) | Error handling adapter |
| [Controllers/BotController.cs](../../../src/backend/CobraAPI.TeamsBot/Controllers/BotController.cs) | `/api/messages` endpoint (Bot Framework entry) |
| [Controllers/InternalController.cs](../../../src/backend/CobraAPI.TeamsBot/Controllers/InternalController.cs) | `/api/internal/send` - outbound messaging from CobraAPI |
| [Services/CobraApiClient.cs](../../../src/backend/CobraAPI.TeamsBot/Services/CobraApiClient.cs) | HTTP client to call CobraAPI webhooks |
| [Middleware/ApiKeyAuthAttribute.cs](../../../src/backend/CobraAPI.TeamsBot/Middleware/ApiKeyAuthAttribute.cs) | API key auth for internal endpoints |
| [Models/BotSettings.cs](../../../src/backend/CobraAPI.TeamsBot/Models/BotSettings.cs) | Configurable bot display name |

**NuGet Packages (Current - Bot Framework SDK v4):**
```xml
<PackageReference Include="Microsoft.Bot.Builder" Version="4.22.x" />
<PackageReference Include="Microsoft.Bot.Builder.Integration.AspNet.Core" Version="4.22.x" />
<PackageReference Include="Microsoft.Bot.Connector" Version="4.22.x" />
```

### Backend: CobraAPI Integration

**Key Files:**

| File | Purpose |
|------|---------|
| [Tools/Chat/Controllers/TeamsController.cs](../../../src/backend/CobraAPI/Tools/Chat/Controllers/TeamsController.cs) | Teams-specific API endpoints |
| [Tools/Chat/Controllers/WebhooksController.cs](../../../src/backend/CobraAPI/Tools/Chat/Controllers/WebhooksController.cs) | Inbound webhook handler |
| [Tools/Chat/Services/ExternalMessagingService.cs](../../../src/backend/CobraAPI/Tools/Chat/Services/ExternalMessagingService.cs) | Outbound messaging to TeamsBot |
| [Tools/Chat/Models/Entities/ExternalChannelMapping.cs](../../../src/backend/CobraAPI/Tools/Chat/Models/Entities/ExternalChannelMapping.cs) | Database entity with Teams fields |

**Database Schema (ExternalChannelMapping):**
```sql
-- Teams-specific columns added in migration 20251204180510
ConversationReferenceJson  NVARCHAR(MAX)  NULL  -- Serialized Bot Framework ConversationReference
TenantId                   NVARCHAR(100)  NULL  -- Microsoft 365 tenant ID
LastActivityAt             DATETIME2      NULL  -- Last message timestamp
InstalledByName            NVARCHAR(200)  NULL  -- User who installed the bot
IsEmulator                 BIT            DEFAULT 0  -- Flag for dev connections
```

### Frontend Components

| File | Purpose |
|------|---------|
| [tools/chat/components/TeamsChannelDialog.tsx](../../../src/frontend/src/tools/chat/components/TeamsChannelDialog.tsx) | Channel linking UI |
| [admin/components/TeamsConnectorManagement.tsx](../../../src/frontend/src/admin/components/TeamsConnectorManagement.tsx) | Connector admin panel |

---

## Architecture Diagram

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│  Microsoft      │         │   TeamsBot      │         │   CobraAPI      │
│  Teams          │         │  (Port 3978)    │         │  (Port 5000)    │
│                 │         │                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │         │  ┌───────────┐  │
│  │ Channel   │──┼────────►│  │ /api/     │──┼────────►│  │ /api/     │  │
│  │ Message   │  │  HTTP   │  │ messages  │  │  HTTP   │  │ webhooks/ │  │
│  └───────────┘  │         │  └───────────┘  │  POST   │  │ teams/    │  │
│                 │         │                 │         │  └───────────┘  │
│  ┌───────────┐  │         │  ┌───────────┐  │         │        │        │
│  │ Bot       │◄─┼─────────│  │ /api/     │◄─┼─────────│  ExternalMsg   │
│  │ Message   │  │  Bot    │  │ internal/ │  │  HTTP   │  Service       │
│  └───────────┘  │  API    │  │ send      │  │  POST   │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │                           │
                                    │                           │
                            ConversationReference         SQL Server DB
                            stored in CobraAPI            (source of truth)
```

---

## Configuration Files

### TeamsBot appsettings.json
```json
{
  "MicrosoftAppType": "",
  "MicrosoftAppId": "",
  "MicrosoftAppPassword": "",
  "MicrosoftAppTenantId": "",
  "Bot": {
    "DisplayName": "COBRA Teams Bot",
    "Description": "COBRA Event Management Bot"
  },
  "CobraApi": {
    "BaseUrl": "http://localhost:5000",
    "ApiKey": "dev-teams-bot-key-12345"
  }
}
```

### CobraAPI appsettings.json (TeamsBot section)
```json
{
  "TeamsBot": {
    "BaseUrl": "http://localhost:3978",
    "ApiKey": "dev-teams-bot-key-12345",
    "Enabled": true
  }
}
```

---

## Known Issues & Quirks

### 1. Bot Framework Emulator Session Expiration
**Issue:** Each emulator session creates a new local HTTP server on a random port. When the session ends, the stored `ConversationReference.ServiceUrl` becomes stale.

**Workaround:** Reconnect emulator and send a message FROM emulator before sending FROM COBRA.

**Production Impact:** None - real Teams uses stable Azure ServiceUrls.

### 2. API Key Security (POC Only)
**Current:** Simple shared API key between TeamsBot and CobraAPI.

**Production:** Should use Azure AD service-to-service auth or managed identity.

### 3. Missing Retry Logic
**Current:** Single attempt for outbound messages.

**Needed:** Exponential backoff for transient Teams API failures.

---

## Microsoft 365 Agents SDK Migration

Microsoft is modernizing the Bot Framework SDK to the "Microsoft 365 Agents SDK." This is a **namespace and architecture change**, not a complete rewrite.

### Key Changes Required

| Bot Framework SDK | Agents SDK |
|-------------------|------------|
| `Microsoft.Bot.Builder` | `Microsoft.Agents.Builder` |
| `Microsoft.Bot.Schema` | `Microsoft.Agents.Core.Models` |
| `Microsoft.Bot.Connector.Authentication` | `Microsoft.Agents.Connector` |
| `BotState` | `AgentState` |
| `IBotFrameworkHttpAdapter` | `IAgentHttpAdapter` |
| Newtonsoft.Json | System.Text.Json |

### Migration Scope

**Low Effort (namespace changes):**
- Import statements
- Type references
- Serialization attributes

**Medium Effort (code changes):**
- Authentication setup in Program.cs
- State access patterns (`.Services.Get<T>()` instead of `.TurnState.Get<T>()`)
- appsettings.json structure

**No Change:**
- Azure Bot Service registration (same App ID/Password)
- ConversationReference concept
- Basic message handling flow
- Proactive messaging pattern

### Migration Reference
- [Official Migration Guide](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/bf-migration-dotnet)
- [Microsoft Agents SDK Documentation](https://learn.microsoft.com/en-us/microsoft-365/agents-sdk/)

---

## Files to Modify for Migration

### TeamsBot Project

1. **CobraAPI.TeamsBot.csproj**
   - Remove: `Microsoft.Bot.*` packages
   - Add: `Microsoft.Agents.*` packages

2. **Program.cs**
   - Replace: Bot Framework DI registration
   - With: `builder.AddAgent<CobraTeamsBot>()`

3. **Bots/CobraTeamsBot.cs**
   - Update: Namespace imports
   - Update: Base class (if changed)
   - Update: State access patterns

4. **Controllers/BotController.cs**
   - Update: Adapter injection type

5. **Models/*.cs**
   - Update: JSON serialization attributes (System.Text.Json)

### CobraAPI Project (Minimal)

1. **ExternalMessagingService.cs**
   - Verify: ConversationReference serialization compatible

---

## Prompt for Continuing Work

Use this context when asking an AI assistant to continue the Teams integration:

```
I'm working on COBRA's Microsoft Teams integration. The current implementation uses
Bot Framework SDK v4 and is substantially complete at the POC level.

Current state:
- TeamsBot project exists at src/backend/CobraAPI.TeamsBot/
- Bi-directional messaging works (Teams ↔ COBRA)
- Stateless architecture with ConversationReferences stored in CobraAPI database
- Admin UI for connector management exists
- Local testing via Bot Framework Emulator works

Key files:
- TeamsBot: Bots/CobraTeamsBot.cs, Controllers/InternalController.cs
- CobraAPI: Tools/Chat/Services/ExternalMessagingService.cs, Controllers/TeamsController.cs
- Entity: Tools/Chat/Models/Entities/ExternalChannelMapping.cs

Migration consideration:
Microsoft is transitioning to "Microsoft 365 Agents SDK" which changes namespaces from
Microsoft.Bot.* to Microsoft.Agents.*. This is a modernization, not a rewrite.

What I need help with:
[YOUR SPECIFIC REQUEST HERE]

Relevant documentation:
- docs/UnifiedChat/TeamsIntegration/TEAMS-INTEGRATION-USER-STORIES.md
- docs/UnifiedChat/TeamsIntegration/TEAMS-DEVELOPER-DOCUMENTATION.md
- docs/UnifiedChat/TeamsIntegration/TEAMS-MIGRATION-STATUS.md (this file)
```

---

## Outstanding Work

### High Priority (Before Production)
- [ ] Azure Bot Service registration (UC-TI-002/003)
- [ ] Create Teams app manifest package (UC-TI-005)
- [x] Implement retry logic for transient failures (UC-TI-024) ✅ **COMPLETE**
- [ ] Test with real Microsoft Teams (not just emulator)

### Medium Priority
- [ ] Complete channel-to-event linking flow (UC-TI-019)
- [x] Handle conversation reference expiration (UC-TI-025) ✅ **COMPLETE**
- [x] Announcements broadcast to Teams (UC-TI-012) ✅ **COMPLETE**
- [x] Bot removal detection (UC-TI-021) ✅ **COMPLETE**

### Future (Post-POC)
- [x] Microsoft 365 Agents SDK migration ✅ **COMPLETE** (branch: feature/agents-sdk-migration)
- [ ] Adaptive Cards for rich formatting
- [ ] File import from Teams messages
- [ ] Embedded Teams tab for COBRA UI

---

## Version History

| Date | Change |
|------|--------|
| 2025-12-04 | Initial migration status document created |
| 2025-12-04 | UC-TI-029 (Stateless Bot) and UC-TI-030 (Admin UI) completed |
| 2025-12-04 | API key authentication added between services |
| 2025-12-04 | Microsoft 365 Agents SDK migration completed (branch: feature/agents-sdk-migration) |
| 2025-12-04 | Retry logic for transient failures implemented (UC-TI-024) |
| 2025-12-04 | Conversation reference expiration handling (UC-TI-025) - validator, HTTP 410 responses |
| 2025-12-04 | Production readiness improvements: health checks, diagnostics security, dependency checks |
| 2025-12-04 | OpenTelemetry observability: Application Insights, request logging, metrics endpoints |
| 2025-12-04 | Announcements broadcast to Teams (UC-TI-012) - API endpoint and service method |
| 2025-12-04 | Unit tests for TeamsBot services (61 tests) |
| 2025-12-04 | Bot removal detection (UC-TI-021) - deactivates ExternalChannelMapping when bot is removed |

# Microsoft Teams Integration - User Stories

## Epic: Microsoft Teams Bot Integration

**Epic ID Prefix:** UC-TI (Unified Communications - Teams Integration)

**Epic Description:** As a COBRA platform, I need to integrate with Microsoft Teams through a custom bot application, enabling bi-directional messaging between COBRA event channels and Teams channels. This integration serves enterprise customers who use Microsoft 365 as their primary collaboration platform, allowing emergency communications to flow seamlessly between COBRA's unified communications system and Teams.

**Business Value:** Many COBRA customers, particularly enterprise and government organizations, standardize on Microsoft 365 and Teams for daily collaboration. During emergencies, responders naturally gravitate toward familiar tools. This integration ensures critical communications flow between COBRA's formal incident management and Teams channels where stakeholders already collaborate, without requiring users to switch platforms or learn new tools.

**Technical Approach:** Build a Microsoft Teams bot using Bot Framework SDK v4 (.NET), register it with Azure Bot Service, and integrate it with the existing Unified Communications (UC) POC infrastructure. The bot will use Resource-Specific Consent (RSC) permissions to receive all channel messages without requiring @mentions.

**Dependencies:** 
- UC POC infrastructure (UC-001 through UC-025)
- Azure subscription (free tier sufficient for registration)
- Microsoft 365 tenant for testing

---

## Feature: Bot Development & Infrastructure

### UC-TI-001: Create Teams Bot Project

**Title:** Create Bot Framework SDK project for Teams integration

**As a** COBRA developer  
**I want** a Bot Framework SDK project configured for Microsoft Teams  
**So that** I have a foundation for building the Teams integration

**Acceptance Criteria:**
- [ ] Create ASP.NET Core project with Bot Framework SDK v4 NuGet packages
- [ ] Configure `BotController` with `/api/messages` endpoint
- [ ] Implement `ActivityHandler` base class for message handling
- [ ] Configure dependency injection for bot services
- [ ] Add configuration for `MicrosoftAppId` and `MicrosoftAppPassword`
- [ ] Add Teams-specific middleware and extensions
- [ ] Project builds and runs locally
- [ ] Bot responds to basic messages in Bot Framework Emulator
- [ ] Code follows COBRA coding standards with XML documentation

**Dependencies:** None

**Technical Notes:**
- Use `Microsoft.Bot.Builder` and `Microsoft.Bot.Builder.Integration.AspNet.Core` packages
- Target .NET 8 to align with existing COBRA infrastructure
- Consider hosting in same solution as UC POC or as separate deployable

---

### UC-TI-002: Register Azure Bot Service

**Title:** Register bot with Azure Bot Service

**As a** COBRA administrator  
**I want** the bot registered with Azure Bot Service  
**So that** it can communicate with Microsoft Teams

**Acceptance Criteria:**
- [ ] Create Azure Bot resource in Azure portal (Bot Channels Registration - free tier)
- [ ] Configure messaging endpoint URL
- [ ] Enable Microsoft Teams channel
- [ ] Generate and securely store App ID and App Password
- [ ] Configure OAuth connection settings if needed
- [ ] Document all Azure resource configurations
- [ ] Verify bot appears in Azure Bot Service dashboard

**Dependencies:** UC-TI-001, Azure subscription

**Technical Notes:**
- Use "Bot Channels Registration" option (not Web App Bot) - this is free
- Bot code can be hosted anywhere (Azure, AWS, on-premises)
- Store credentials in Azure Key Vault for production

---

### UC-TI-003: Create Azure AD App Registration

**Title:** Register application in Azure Active Directory

**As a** COBRA administrator  
**I want** an Azure AD app registration for the bot  
**So that** the bot can authenticate with Microsoft services

**Acceptance Criteria:**
- [ ] Create app registration in Azure AD portal
- [ ] Configure supported account types (single tenant or multi-tenant based on deployment model)
- [ ] Generate client secret and document expiration date
- [ ] Configure API permissions (Microsoft Graph - User.Read minimum)
- [ ] Document Application (client) ID and Directory (tenant) ID
- [ ] Set up redirect URIs if OAuth flows are needed
- [ ] Grant admin consent for required permissions

**Dependencies:** Azure subscription, Azure AD access

**Technical Notes:**
- Multi-tenant bots can be installed in any O365 tenant
- Single-tenant limits to one organization but may be simpler for initial POC
- Client secrets expire - document renewal process

---

### UC-TI-004: Configure RSC Permissions for All Messages

**Title:** Enable Resource-Specific Consent to receive all channel messages

**As a** COBRA developer  
**I want** the bot to receive all channel messages without @mentions  
**So that** we capture the full conversation for situational awareness

**Acceptance Criteria:**
- [ ] Add `webApplicationInfo` section to Teams app manifest
- [ ] Configure `ChannelMessage.Read.Group` RSC permission
- [ ] Configure `ChatMessage.Read.Chat` RSC permission for group chats (if needed)
- [ ] Add `authorization.permissions.resourceSpecific` array to manifest
- [ ] Test that bot receives messages without being @mentioned
- [ ] Implement message filtering option to ignore non-relevant messages
- [ ] Document RSC permission requirements for customer installation

**Dependencies:** UC-TI-001, UC-TI-002, UC-TI-003

**Technical Notes:**
- RSC permissions are granted at app installation time by team owner
- Different from Azure AD permissions - these are Teams-specific
- Some organizations may have policies restricting RSC apps

**Manifest Example:**
```json
"webApplicationInfo": {
    "id": "{{BOT_APP_ID}}",
    "resource": "https://RscBasedStoreApp"
},
"authorization": {
    "permissions": {
        "resourceSpecific": [
            {
                "name": "ChannelMessage.Read.Group",
                "type": "Application"
            }
        ]
    }
}
```

---

### UC-TI-005: Create Teams App Manifest

**Title:** Create and configure Teams app manifest package

**As a** COBRA developer  
**I want** a complete Teams app manifest  
**So that** the bot can be installed in Microsoft Teams

**Acceptance Criteria:**
- [ ] Create `manifest.json` with required fields (id, version, name, description)
- [ ] Configure bot section with bot ID and scopes (team, groupchat)
- [ ] Add appropriate icons (color: 192x192, outline: 32x32)
- [ ] Configure valid domains for any web content
- [ ] Include RSC permissions from UC-TI-004
- [ ] Set appropriate `accentColor` matching COBRA branding
- [ ] Create ZIP package with manifest.json and icons
- [ ] Validate manifest using Teams Developer Portal or App Studio
- [ ] Document manifest customization points for white-label scenarios

**Dependencies:** UC-TI-002, UC-TI-003, UC-TI-004

**Technical Notes:**
- Manifest schema version should be 1.16 or later for RSC support
- Bot ID in manifest must match Azure Bot registration
- Package structure: manifest.json, color.png, outline.png

---

### UC-TI-006: Implement Local Development Environment

**Title:** Configure local development and debugging environment

**As a** COBRA developer  
**I want** to debug the bot locally  
**So that** I can develop and test efficiently

**Acceptance Criteria:**
- [ ] Document ngrok or dev tunnel setup for local HTTPS endpoint
- [ ] Configure `appsettings.Development.json` for local credentials
- [ ] Create PowerShell/bash script to start ngrok with correct port
- [ ] Document process to update Azure Bot messaging endpoint for local testing
- [ ] Verify bot receives messages when running locally
- [ ] Configure Bot Framework Emulator for local testing
- [ ] Document switching between local and deployed endpoints

**Dependencies:** UC-TI-001, UC-TI-002

**Technical Notes:**
- ngrok free tier generates new URL each restart - paid tier recommended
- Azure Dev Tunnels is an alternative to ngrok
- Keep separate manifest packages for dev vs production

---

## Feature: COBRA Integration

### UC-TI-007: Integrate Bot with CobraAPI via Webhooks

**Title:** Connect Teams bot to CobraAPI using webhook pattern (mirrors GroupMe)

**As a** COBRA developer
**I want** the Teams bot to communicate with CobraAPI via HTTP webhooks
**So that** Teams messages flow through the same infrastructure as GroupMe

**Acceptance Criteria:**
- [ ] TeamsBot forwards inbound messages to CobraAPI webhook endpoint
- [ ] Add `POST /api/webhooks/teams/{mappingId}` endpoint to CobraAPI (WebhooksController)
- [ ] Add `ProcessTeamsWebhookAsync()` method to `ExternalMessagingService`
- [ ] Create `TeamsWebhookPayload` DTO for inbound message data
- [ ] Map Teams message data to `ChatMessage` entities via existing `ChatService`
- [ ] Populate `ExternalSource`, `ExternalMessageId`, `ExternalSenderName` fields
- [ ] Store `ExternalPlatform.Teams` for platform identification
- [ ] Log integration events for debugging

**Dependencies:** UC-TI-001, UC POC webhook infrastructure (GroupMe pattern)

**Technical Notes:**
- **Architecture mirrors GroupMe integration** - bot is a bridge/adapter, CobraAPI owns data
- TeamsBot calls CobraAPI webhook endpoint (no direct DB access from bot)
- Reuse existing `ExternalMessagingService` pattern from GroupMe
- For POC: trust network boundary or use simple API key (no OAuth needed)
- Extend `IExternalMessagingService` interface for Teams support

**Message Flow (Inbound - Teams to COBRA):**
```
Teams --> TeamsBot /api/messages --> HTTP POST --> CobraAPI /api/webhooks/teams/{mappingId}
                                                           |
                                         ExternalMessagingService.ProcessTeamsWebhookAsync()
                                                           |
                                                 ChatService --> DB + SignalR --> COBRA UI
```

---

### UC-TI-008: Store Conversation References for Proactive Messaging

**Title:** Persist Teams conversation references for outbound messages

**As a** COBRA system  
**I want** to store conversation references when the bot is installed  
**So that** I can send proactive messages to Teams channels

**Acceptance Criteria:**
- [ ] Create storage mechanism for `ConversationReference` objects
- [ ] Capture conversation reference on `OnMembersAddedAsync` (bot installation)
- [ ] Update conversation reference on each incoming message (service URL may change)
- [ ] Associate conversation reference with COBRA event/channel mapping
- [ ] Handle multiple Teams channels per COBRA event
- [ ] Implement reference cleanup when bot is removed from team
- [ ] Secure storage of conversation references

**Dependencies:** UC-TI-007

**Technical Notes:**
- `ConversationReference` contains: ServiceUrl, ChannelId, Conversation.Id, Bot info
- Service URL can vary by tenant geography - always use latest
- References are required for proactive (outbound) messaging

---

### UC-TI-009: Implement Inbound Message Handler

**Title:** Process incoming Teams messages via webhook to CobraAPI

**As a** COBRA system
**I want** to receive Teams messages and forward them to CobraAPI via webhooks
**So that** they appear in COBRA's unified chat view using existing infrastructure

**Acceptance Criteria:**
- [ ] Override `OnMessageActivityAsync` in TeamsBot handler
- [ ] Extract message content, sender info, timestamp, channel info
- [ ] Build `TeamsWebhookPayload` DTO with message data
- [ ] HTTP POST payload to CobraAPI `/api/webhooks/teams/{mappingId}`
- [ ] Filter out bot's own messages before forwarding (prevent echo)
- [ ] Handle text messages, mentions, and basic formatting
- [ ] Process image attachments (include URLs in payload)
- [ ] Handle message edits (`OnMessageUpdateActivityAsync`) - forward as update
- [ ] Handle message deletes (`OnMessageDeleteActivityAsync`) - forward as delete
- [ ] Log all inbound activity for debugging
- [ ] Handle CobraAPI webhook failures gracefully (log, don't crash)

**Dependencies:** UC-TI-007, UC-TI-008

**Technical Notes:**
- **Bot does NOT call ChatService or SignalR directly** - CobraAPI handles that
- Check `Activity.From.Id` to filter bot's own messages
- Teams message edits/deletes come as separate activities
- Attachments may be links or inline content
- Lookup `mappingId` from stored conversation reference associations
- For POC: if no mappingId, log warning and skip (channel not linked)

**Message Flow:**
```
Teams Message --> TeamsBot.OnMessageActivityAsync()
                         |
                  Build TeamsWebhookPayload
                         |
                  HTTP POST /api/webhooks/teams/{mappingId}
                         |
        ExternalMessagingService.ProcessTeamsWebhookAsync()
                         |
                ChatService.SaveMessageAsync() + SignalR broadcast
```

---

### UC-TI-010: Implement Outbound Proactive Messaging

**Title:** Send COBRA messages to Teams via CobraAPI webhook to TeamsBot

**As a** COBRA user
**I want** my messages in Teams-linked channels to appear in Teams
**So that** Teams users see COBRA communications

**Acceptance Criteria:**
- [ ] Add `POST /api/internal/send` endpoint to TeamsBot for receiving outbound requests
- [ ] Create `TeamsSendRequest` DTO (conversationId, message, senderName, etc.)
- [ ] Retrieve stored `ConversationReference` for target conversation
- [ ] Use `ContinueConversationAsync` for proactive messaging
- [ ] Format messages with sender attribution: "[Name] message content"
- [ ] Support Adaptive Cards for rich message formatting
- [ ] Return success/failure response to CobraAPI
- [ ] Implement retry logic for transient failures
- [ ] Respect Teams API rate limits
- [ ] Add `ITeamsApiClient` to CobraAPI for calling TeamsBot endpoints
- [ ] Extend `ExternalMessagingService.BroadcastToExternalChannelsAsync()` for Teams

**Dependencies:** UC-TI-008, UC-TI-009

**Technical Notes:**
- **CobraAPI calls TeamsBot** (not direct Bot Framework calls from CobraAPI)
- Proactive messaging requires valid `ConversationReference` stored in TeamsBot
- Rate limit: ~50 messages per second per bot per channel
- Fire-and-forget from CobraAPI perspective to not block COBRA UI
- For POC: simple API key or trust network boundary for auth

**Message Flow (Outbound - COBRA to Teams):**
```
COBRA UI --> ChatService.SaveMessageAsync()
                    |
         ExternalMessagingService.BroadcastToExternalChannelsAsync()
                    |
         HTTP POST to TeamsBot /api/internal/send
                    |
         TeamsBot.ContinueConversationAsync() --> Teams API --> Teams Channel
```

---

### UC-TI-011: Create External Channel Mapping for Teams

**Title:** Link Teams channels to COBRA events

**As a** COBRA administrator  
**I want** to associate Teams channels with COBRA events  
**So that** messages flow between the correct destinations

**Acceptance Criteria:**
- [ ] Extend `ExternalChannelMapping` entity for Teams-specific data
- [ ] Store Teams tenant ID, team ID, channel ID
- [ ] Store conversation reference JSON
- [ ] Support multiple Teams channels per COBRA event
- [ ] Create mapping when bot is installed in team (via activity handler)
- [ ] Provide UI to select which COBRA event to link
- [ ] Display Teams channel name in COBRA channel list
- [ ] Show Teams icon indicator for Teams channels
- [ ] Handle bot removal (deactivate mapping)

**Dependencies:** UC-TI-008, UC POC ExternalChannelMapping

**Technical Notes:**
- Bot receives team/channel info in `OnMembersAddedAsync`
- May need to prompt user to select COBRA event after installation
- Consider Adaptive Card for event selection flow

---

### UC-TI-012: Integrate with Announcements Broadcast

**Title:** Include Teams channels in Announcements broadcast

**As a** COBRA user with Manage permissions  
**I want** Announcements to broadcast to Teams channels  
**So that** critical information reaches all stakeholders

**Acceptance Criteria:**
- [ ] Modify Announcements channel logic to include Teams channels
- [ ] Send Announcements as Adaptive Cards for visual impact
- [ ] Include "via COBRA Announcements" attribution
- [ ] Handle partial failures (some channels succeed, some fail)
- [ ] Log broadcast results per channel
- [ ] Show broadcast status in COBRA UI

**Dependencies:** UC-TI-010, UC-TI-011, UC-015 (Announcements)

---

## Feature: Customer Installation & Onboarding

### UC-TI-013: Create Customer Installation Guide

**Title:** Document end-to-end installation process for customers

**As a** COBRA customer administrator  
**I want** clear installation instructions  
**So that** I can deploy the Teams integration in my organization

**Acceptance Criteria:**
- [ ] Document prerequisites (O365 license, Teams admin access, etc.)
- [ ] Explain permission levels required for installation
- [ ] Step-by-step guide with screenshots for:
  - Obtaining the Teams app package
  - Uploading to Teams Admin Center or sideloading
  - Approving RSC permissions
  - Installing in specific teams
  - Linking to COBRA events
- [ ] Troubleshooting section for common issues
- [ ] FAQ section
- [ ] Version for IT administrators vs end users
- [ ] PDF and online (markdown) formats

**Dependencies:** UC-TI-005, UC-TI-014, UC-TI-015

---

### UC-TI-014: Document O365 Tenant Permission Requirements

**Title:** Document required permissions and admin consent

**As a** COBRA customer IT administrator  
**I want** to understand what permissions the bot requires  
**So that** I can evaluate security implications and obtain approvals

**Acceptance Criteria:**
- [ ] List all Azure AD permissions with descriptions
- [ ] List all RSC permissions with descriptions
- [ ] Explain what data the bot accesses and why
- [ ] Document data flow (where messages go, what's stored)
- [ ] Explain multi-tenant vs single-tenant implications
- [ ] Provide security review checklist
- [ ] Document compliance considerations (GDPR, HIPAA, etc.)
- [ ] Include sample approval request for IT security teams

**Dependencies:** UC-TI-003, UC-TI-004

**Permission Summary Template:**

| Permission | Type | Purpose | Data Access |
|------------|------|---------|-------------|
| `User.Read` | Azure AD | Identify signed-in user | Basic profile |
| `ChannelMessage.Read.Group` | RSC | Receive channel messages | Message content in installed teams |

---

### UC-TI-015: Document Teams Admin Center Deployment

**Title:** Guide for deploying via Teams Admin Center

**As a** COBRA customer IT administrator  
**I want** to deploy the bot organization-wide via Teams Admin Center  
**So that** I can manage the rollout centrally

**Acceptance Criteria:**
- [ ] Document uploading custom app to org app catalog
- [ ] Explain app setup policies for controlled rollout
- [ ] Guide for pre-pinning app for specific user groups
- [ ] Document permission policies that may block installation
- [ ] Explain how to allow RSC apps in tenant settings
- [ ] Guide for monitoring app usage and adoption
- [ ] Document app update process

**Dependencies:** UC-TI-005

**Admin Center Sections to Cover:**
- Teams apps > Manage apps
- Teams apps > Setup policies
- Teams apps > Permission policies
- Org-wide settings > Custom apps

---

### UC-TI-016: Document Sideloading for Testing

**Title:** Guide for sideloading app during testing/POC

**As a** COBRA customer evaluator  
**I want** to test the bot without org-wide deployment  
**So that** I can evaluate before full rollout

**Acceptance Criteria:**
- [ ] Document enabling custom app sideloading in tenant
- [ ] Step-by-step for uploading app to specific team
- [ ] Explain limitations of sideloaded apps
- [ ] Guide for Teams Developer Portal alternative
- [ ] Document how to remove sideloaded app
- [ ] Security considerations for sideloading policies

**Dependencies:** UC-TI-005

**Tenant Setting Path:**
Teams Admin Center > Teams apps > Permission policies > Org-wide settings > Custom apps

---

### UC-TI-017: Create In-App Onboarding Flow

**Title:** Guide users through initial setup after bot installation

**As a** COBRA user  
**I want** the bot to guide me through linking to COBRA  
**So that** I can complete setup without reading documentation

**Acceptance Criteria:**
- [ ] Bot sends welcome message when installed in team
- [ ] Welcome message explains bot purpose and capabilities
- [ ] Provide Adaptive Card with setup options
- [ ] Guide user to link channel to COBRA event
- [ ] Confirm successful linkage with summary
- [ ] Provide help command for ongoing assistance
- [ ] Handle cases where user doesn't have COBRA access

**Dependencies:** UC-TI-009, UC-TI-011

**Welcome Flow:**
1. Bot installed → Welcome Adaptive Card
2. User clicks "Link to COBRA Event"
3. Card shows event selection (or prompts to log in)
4. User selects event
5. Confirmation message with next steps

---

## Feature: Channel Selection & Management

### UC-TI-018: List Available Teams for Linking

**Title:** Display Teams where bot is installed for channel selection

**As a** COBRA administrator  
**I want** to see which Teams have the bot installed  
**So that** I can link the correct channels to events

**Acceptance Criteria:**
- [ ] Query stored conversation references for available teams
- [ ] Display team name, channel name, installation date
- [ ] Show current link status (linked/unlinked, which event)
- [ ] Filter by linked/unlinked status
- [ ] Support search by team/channel name
- [ ] Refresh list on demand

**Dependencies:** UC-TI-008, UC-TI-011

---

### UC-TI-019: Link Teams Channel to COBRA Event

**Title:** Associate a Teams channel with a COBRA event

**As a** COBRA administrator  
**I want** to link a Teams channel to a COBRA event  
**So that** messages flow between them

**Acceptance Criteria:**
- [ ] UI to select Teams channel from available list
- [ ] UI to select target COBRA event
- [ ] Create ExternalChannelMapping record
- [ ] Option to import historical messages (with date range)
- [ ] Display confirmation with channel details
- [ ] Update COBRA event channel list to show Teams channel
- [ ] Log linking action for audit

**Dependencies:** UC-TI-011, UC-TI-018

---

### UC-TI-020: Unlink Teams Channel from COBRA Event

**Title:** Remove association between Teams channel and COBRA event

**As a** COBRA administrator  
**I want** to unlink a Teams channel from an event  
**So that** I can stop message flow when no longer needed

**Acceptance Criteria:**
- [ ] UI to select linked Teams channel
- [ ] Confirmation dialog before unlinking
- [ ] Soft delete of ExternalChannelMapping (preserve history)
- [ ] Historical messages remain in COBRA
- [ ] Option to notify Teams channel of disconnection
- [ ] Update COBRA event channel list
- [ ] Log unlinking action for audit

**Dependencies:** UC-TI-011, UC-TI-019

---

### UC-TI-021: Handle Bot Removal from Team

**Title:** Gracefully handle when bot is removed from Teams

**As a** COBRA system  
**I want** to detect when the bot is removed from a team  
**So that** I can update channel status accordingly

**Acceptance Criteria:**
- [ ] Implement `OnMembersRemovedAsync` handler
- [ ] Detect when removed member is the bot itself
- [ ] Deactivate associated ExternalChannelMapping records
- [ ] Update COBRA UI to show disconnected status
- [ ] Log removal event
- [ ] Optionally notify COBRA administrators

**Dependencies:** UC-TI-008, UC-TI-011

---

## Feature: Message Display & UX

### UC-TI-022: Display Teams Messages in COBRA UI

**Title:** Show Teams messages with appropriate visual treatment

**As a** COBRA user  
**I want** Teams messages to be visually distinct  
**So that** I can identify their source at a glance

**Acceptance Criteria:**
- [ ] Display Teams icon on Teams-sourced messages
- [ ] Show "via Teams" indicator
- [ ] Display sender's Teams display name
- [ ] Show Teams channel name in unified view
- [ ] Handle Teams @mentions display
- [ ] Render Teams message formatting (bold, italic, etc.)
- [ ] Display Teams message attachments (images, files)
- [ ] Show message edit indicator if edited in Teams

**Dependencies:** UC-TI-009, UC-016 (External Message Visual Indicators)

---

### UC-TI-023: Display Teams Channels in Channel List

**Title:** Show linked Teams channels in COBRA channel list

**As a** COBRA user  
**I want** to see Teams channels in the channel list  
**So that** I know which Teams channels are linked

**Acceptance Criteria:**
- [ ] Teams channels appear in sidebar accordion
- [ ] Teams channels appear in full-page channel tabs
- [ ] Teams icon distinguishes from other channel types
- [ ] Channel name shows Teams channel name
- [ ] Tooltip shows team name and connection status
- [ ] Unread count for Teams channels
- [ ] Connection status indicator (connected/disconnected)

**Dependencies:** UC-TI-011, UC-012 (Channel Accordion Sidebar)

---

## Feature: Error Handling & Resilience

### UC-TI-024: Handle Teams API Failures

**Title:** Gracefully handle Teams/Bot Service failures

**As a** COBRA system  
**I want** to handle Teams API failures gracefully  
**So that** COBRA functionality isn't disrupted

**Acceptance Criteria:**
- [ ] Catch and log Teams API exceptions
- [ ] Don't block COBRA save on outbound failure
- [ ] Retry transient failures with exponential backoff
- [ ] Mark channel as disconnected after repeated failures
- [ ] Alert administrators of persistent issues
- [ ] Provide user feedback when Teams send fails
- [ ] Queue messages for retry when appropriate

**Dependencies:** UC-TI-010

---

### UC-TI-025: Handle Conversation Reference Expiration

**Title:** Manage stale or invalid conversation references

**As a** COBRA system  
**I want** to detect and handle invalid conversation references  
**So that** outbound messaging remains reliable

**Acceptance Criteria:**
- [ ] Detect `ConversationNotFound` or similar errors
- [ ] Mark channel mapping as needing refresh
- [ ] Attempt to refresh reference on next inbound message
- [ ] Notify administrators if reference cannot be refreshed
- [ ] Clean up orphaned references periodically
- [ ] Log reference lifecycle events

**Dependencies:** UC-TI-008, UC-TI-024

---

## Feature: Documentation & Training

### UC-TI-026: Create Developer Documentation

**Title:** Document technical implementation for COBRA developers

**As a** COBRA developer  
**I want** comprehensive technical documentation  
**So that** I can maintain and extend the Teams integration

**Acceptance Criteria:**
- [ ] Architecture overview with diagrams
- [ ] Message flow documentation (inbound/outbound)
- [ ] Authentication and authorization explanation
- [ ] Configuration reference (all settings)
- [ ] Troubleshooting guide
- [ ] API reference for new services
- [ ] Database schema additions
- [ ] Deployment guide (Azure, self-hosted)

**Dependencies:** All TI development stories

---

### UC-TI-027: Create End User Guide

**Title:** Document Teams integration for COBRA end users

**As a** COBRA end user  
**I want** to understand how Teams integration works  
**So that** I can use it effectively during incidents

**Acceptance Criteria:**
- [ ] Explain what Teams integration does
- [ ] How to identify Teams messages in COBRA
- [ ] How to send messages to Teams from COBRA
- [ ] Limitations and expectations
- [ ] Tips for effective cross-platform communication
- [ ] Quick reference card / cheat sheet

**Dependencies:** UC-TI-022, UC-TI-023

---

### UC-TI-028: Create Video Walkthrough

**Title:** Create video demonstration of Teams integration

**As a** COBRA customer  
**I want** to see the Teams integration in action  
**So that** I can evaluate it and train my team

**Acceptance Criteria:**
- [ ] Demo video showing complete message flow
- [ ] Installation walkthrough video
- [ ] Configuration walkthrough video
- [ ] Troubleshooting tips video
- [ ] Videos hosted on accessible platform
- [ ] Captioned for accessibility

**Dependencies:** UC-TI-013, UC-TI-027

**Note:** Future enhancement - not required for initial POC

---

## Summary

| Category | Stories |
|----------|---------|
| Bot Development & Infrastructure | UC-TI-001 to UC-TI-006 |
| COBRA Integration | UC-TI-007 to UC-TI-012 |
| Customer Installation & Onboarding | UC-TI-013 to UC-TI-017 |
| Channel Selection & Management | UC-TI-018 to UC-TI-021 |
| Message Display & UX | UC-TI-022, UC-TI-023 |
| Error Handling & Resilience | UC-TI-024, UC-TI-025 |
| Documentation & Training | UC-TI-026 to UC-TI-028 |
| **Total** | **28 stories** |

---

## Suggested Implementation Phases

### Phase 1: Bot Foundation
*Get bot running and receiving messages*

- UC-TI-001: Create Teams Bot Project
- UC-TI-002: Register Azure Bot Service
- UC-TI-003: Create Azure AD App Registration
- UC-TI-006: Implement Local Development Environment
- UC-TI-005: Create Teams App Manifest

### Phase 2: Basic Integration
*Connect bot to COBRA via webhooks (mirrors GroupMe pattern)*

- UC-TI-007: Integrate Bot with CobraAPI via Webhooks
- UC-TI-008: Store Conversation References
- UC-TI-009: Implement Inbound Message Handler (webhook to CobraAPI)
- UC-TI-010: Implement Outbound Proactive Messaging (CobraAPI to TeamsBot)
- UC-TI-011: Create External Channel Mapping for Teams

### Phase 3: RSC & Full Bi-Directional
*Enable receiving all messages without @mention*

- UC-TI-004: Configure RSC Permissions
- UC-TI-022: Display Teams Messages in COBRA UI
- UC-TI-023: Display Teams Channels in Channel List
- UC-TI-012: Integrate with Announcements Broadcast

### Phase 4: Channel Management
*UI for linking/unlinking channels*

- UC-TI-018: List Available Teams for Linking
- UC-TI-019: Link Teams Channel to COBRA Event
- UC-TI-020: Unlink Teams Channel from COBRA Event
- UC-TI-021: Handle Bot Removal from Team
- UC-TI-017: Create In-App Onboarding Flow

### Phase 5: Customer Deployment & Documentation
*Enable customer self-service installation*

- UC-TI-013: Create Customer Installation Guide
- UC-TI-014: Document O365 Tenant Permission Requirements
- UC-TI-015: Document Teams Admin Center Deployment
- UC-TI-016: Document Sideloading for Testing
- UC-TI-026: Create Developer Documentation
- UC-TI-027: Create End User Guide

### Phase 6: Hardening
*Production readiness*

- UC-TI-024: Handle Teams API Failures
- UC-TI-025: Handle Conversation Reference Expiration
- UC-TI-028: Create Video Walkthrough (optional)

---

## Import Notes

### For GitHub Issues

Each user story can be created as an issue with:
- **Title:** UC-TI-XXX: {Story Title}
- **Labels:** `enhancement`, `teams-integration`, `bot`
- **Milestone:** Teams Integration

### For Azure DevOps

Each user story maps to a Work Item:
- **Work Item Type:** User Story
- **Title:** {Story Title}
- **Acceptance Criteria:** Copy from above
- **Tags:** `teams`, `bot`, `integration`

---

## Appendix A: Teams App Manifest Template

```json
{
    "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
    "manifestVersion": "1.16",
    "version": "1.0.0",
    "id": "{{BOT_APP_ID}}",
    "packageName": "com.cobra.teams.bot",
    "developer": {
        "name": "COBRA5",
        "websiteUrl": "https://www.yourcompany.com",
        "privacyUrl": "https://www.yourcompany.com/privacy",
        "termsOfUseUrl": "https://www.yourcompany.com/terms"
    },
    "name": {
        "short": "COBRA Communications",
        "full": "COBRA Emergency Communications Integration"
    },
    "description": {
        "short": "Connect COBRA events to Teams channels",
        "full": "Bridge emergency communications between COBRA incident management and Microsoft Teams. Enables bi-directional messaging, announcements, and unified situational awareness."
    },
    "icons": {
        "color": "color.png",
        "outline": "outline.png"
    },
    "accentColor": "#0020C2",
    "bots": [
        {
            "botId": "{{BOT_APP_ID}}",
            "scopes": ["team", "groupchat"],
            "supportsFiles": false,
            "isNotificationOnly": false,
            "commandLists": [
                {
                    "scopes": ["team"],
                    "commands": [
                        {
                            "title": "help",
                            "description": "Show available commands"
                        },
                        {
                            "title": "status",
                            "description": "Show connection status"
                        },
                        {
                            "title": "link",
                            "description": "Link this channel to a COBRA event"
                        }
                    ]
                }
            ]
        }
    ],
    "permissions": ["identity", "messageTeamMembers"],
    "validDomains": ["*.azurewebsites.net", "*.cobra5.com"],
    "webApplicationInfo": {
        "id": "{{BOT_APP_ID}}",
        "resource": "https://RscBasedStoreApp"
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

---

## Appendix B: Required Permissions Reference

### Azure AD Permissions

| Permission | Type | Admin Consent | Purpose |
|------------|------|---------------|---------|
| `User.Read` | Delegated | No | Read signed-in user's profile |

### RSC (Resource-Specific Consent) Permissions

| Permission | Type | Consent By | Purpose |
|------------|------|-----------|---------|
| `ChannelMessage.Read.Group` | Application | Team Owner | Receive all channel messages without @mention |
| `TeamSettings.Read.Group` | Application | Team Owner | Read team metadata (name, channels) |
| `ChatMessage.Read.Chat` | Application | Chat Member | Receive all group chat messages (optional) |

### Tenant Settings Required

| Setting | Location | Required Value |
|---------|----------|----------------|
| Custom apps | Teams Admin Center > Permission policies | Allow (or allow specific apps) |
| RSC for apps | Teams Admin Center > Org-wide settings | Enabled |
| Sideloading | Teams Admin Center > Setup policies | Enabled (for testing only) |

---

## Appendix C: Customer Pre-Installation Checklist

Before installing the COBRA Teams integration, verify:

- [ ] Microsoft 365 license includes Teams
- [ ] User has Teams Admin role or Global Admin
- [ ] Custom apps are allowed in tenant policy
- [ ] RSC permissions are enabled for apps
- [ ] Target team(s) identified for installation
- [ ] COBRA event(s) created to link to
- [ ] Security/compliance review completed (if required)
- [ ] Change management approval obtained (if required)

# COBRA Teams Integration - Extended Capabilities Analysis

## Overview

This document explores additional Teams bot capabilities beyond basic bi-directional messaging that could significantly enhance the COBRA integration.

---

## 1. Automatic Channel Creation

### Can the Bot Create Teams Channels for COBRA Events?

**Yes!** The bot can create new Teams channels programmatically using Microsoft Graph API.

### How It Works

```csharp
// Create a new channel in a team
POST https://graph.microsoft.com/v1.0/teams/{team-id}/channels
Content-Type: application/json

{
  "displayName": "COBRA: Hurricane Response 2024",
  "description": "Emergency communications channel linked to COBRA event",
  "membershipType": "standard"
}
```

### Permission Requirements

| Permission | Type | Consent Required |
|------------|------|------------------|
| `Channel.Create` | Application | Tenant Admin |
| `Channel.Create.Group` | RSC | Team Owner |

**Note:** The RSC permission `Channel.Create.Group` allows creation within teams where the bot is installed, without tenant-wide admin consent.

### Potential COBRA Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    COBRA Event Creation                          │
├─────────────────────────────────────────────────────────────────┤
│  1. User creates new COBRA event                                │
│  2. User selects "Create Teams channel" option                  │
│  3. User selects which Team to create the channel in            │
│  4. Bot creates channel: "COBRA: {Event Name}"                  │
│  5. Bot automatically links the new channel to the event        │
│  6. Bot posts welcome message with event details                │
│  7. All team members can immediately participate                │
└─────────────────────────────────────────────────────────────────┘
```

### Channel Types Supported

| Type | Description | Use Case |
|------|-------------|----------|
| **Standard** | Visible to all team members | General event communications |
| **Private** | Visible only to specified members | Sensitive operations, leadership |
| **Shared** | Can include users from other tenants | Multi-agency response |

### User Experience Improvements

**Current (Manual) Flow:**
1. User creates COBRA event
2. User manually creates Teams channel
3. User installs bot in channel
4. User runs `@COBRA Communications link`
5. User selects event to link

**Automated Flow:**
1. User creates COBRA event
2. User clicks "Create Teams Channel" button
3. Done - channel created, linked, and ready

### Implementation Considerations

- Bot needs to know which Teams the user belongs to (requires `Team.ReadBasic.All`)
- User must have permission to create channels in the target team
- Should validate team ownership/membership before attempting creation
- Consider naming conventions: "COBRA: {Event Name}" or "{Event Name} - COBRA"

---

## 2. Tab App - Embed COBRA UI in Teams

### What Is a Tab App?

Tabs are web pages embedded directly in Teams via `<iframe>`. You can embed the entire COBRA interface (or specific views) as a tab in Teams channels.

### Types of Tabs

| Tab Type | Location | Use Case |
|----------|----------|----------|
| **Personal Tab** | Left sidebar | User's personal COBRA dashboard |
| **Channel Tab** | Channel tab bar | Event-specific view for the team |
| **Configurable Tab** | Channel tab bar | Let user choose which event to display |

### What COBRA Views Could Be Embedded?

1. **Event Dashboard** - Full event overview with all widgets
2. **Logbook View** - Read-only or interactive logbook
3. **Map View** - Situational awareness map
4. **Resource Status** - Resource tracking (future)
5. **ICS Forms** - Form viewing/editing
6. **Unified Communications** - The chat view itself

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Microsoft Teams                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Channel: Hurricane Response                               │  │
│  │  ┌─────┬─────────┬────────────┬────────────────────────┐  │  │
│  │  │Posts│  Files  │ COBRA Event │ COBRA Logbook          │  │  │
│  │  └─────┴─────────┴────────────┴────────────────────────┘  │  │
│  │                        ▼                                   │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │              <iframe>                                │  │  │
│  │  │  ┌─────────────────────────────────────────────────┐│  │  │
│  │  │  │         COBRA Event Dashboard                   ││  │  │
│  │  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           ││  │  │
│  │  │  │  │ Summary │ │ Actions │ │Logbook  │           ││  │  │
│  │  │  │  │ Widget  │ │ Widget  │ │ Widget  │           ││  │  │
│  │  │  │  └─────────┘ └─────────┘ └─────────┘           ││  │  │
│  │  │  └─────────────────────────────────────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Requirements

1. **Content Security Policy:** COBRA must allow Teams domains
   ```
   Content-Security-Policy: frame-ancestors teams.microsoft.com *.teams.microsoft.com *.skype.com
   ```

2. **Teams JavaScript SDK:** Include for context awareness
   ```javascript
   import * as microsoftTeams from "@microsoft/teams-js";
   
   microsoftTeams.app.initialize().then(() => {
     microsoftTeams.app.getContext().then((context) => {
       // context.team.groupId - Team's M365 group ID
       // context.channel.id - Channel ID
       // context.user.id - User's AAD object ID
       // context.app.theme - 'default', 'dark', or 'contrast'
     });
   });
   ```

3. **SSO Integration:** Use Teams SSO to authenticate COBRA session
   ```javascript
   microsoftTeams.authentication.getAuthToken().then((token) => {
     // Exchange Teams token for COBRA session
   });
   ```

### User Experience

**Without Tab:**
- User sees message in Teams
- User clicks link to open COBRA in browser
- User switches between Teams and COBRA constantly

**With Tab:**
- User sees message in Teams
- User clicks COBRA tab in same channel
- Full COBRA experience without leaving Teams
- Can respond in Posts tab, check details in COBRA tab

### Manifest Configuration

```json
{
  "configurableTabs": [
    {
      "configurationUrl": "https://app.cobra5.com/teams/config",
      "canUpdateConfiguration": true,
      "scopes": ["team", "groupchat"]
    }
  ],
  "staticTabs": [
    {
      "entityId": "cobraDashboard",
      "name": "My Events",
      "contentUrl": "https://app.cobra5.com/teams/personal",
      "scopes": ["personal"]
    }
  ]
}
```

---

## 3. File Access & Transfer

### Can the Bot Access Files from Teams?

**Yes!** The bot can both receive and send files.

### Receiving Files from Teams

When a user attaches a file to a message in Teams:

```json
{
  "attachments": [{
    "contentType": "application/vnd.microsoft.teams.file.download.info",
    "contentUrl": "https://contoso.sharepoint.com/sites/Team/Documents/file.pdf",
    "name": "incident_report.pdf",
    "content": {
      "downloadUrl": "https://contoso.sharepoint.com/...",
      "uniqueId": "1150D938-8870-4044-9F2C-5BBDEBA70C8C",
      "fileType": "pdf"
    }
  }]
}
```

### Potential COBRA Use Cases

| Feature | Description | Value |
|---------|-------------|-------|
| **Auto-attach to Logbook** | Files shared in Teams automatically attached to COBRA logbook entries | Evidence preservation |
| **Import Photos** | Field photos from Teams → COBRA situational awareness | Real-time documentation |
| **ICS Form Attachments** | Attach PDFs, images to ICS forms | Compliance |
| **Import Situation Reports** | Word/PDF reports → COBRA | Documentation |
| **Map Overlays** | KML/KMZ files → COBRA map | Planning |

### Implementation Architecture

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Teams User  │────▶│  Teams Bot  │────▶│ File Service │────▶│ COBRA Store │
│ (shares file)│     │             │     │              │     │             │
└──────────────┘     └──────┬──────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  SharePoint  │
                    │  (file host) │
                    └──────────────┘
```

### File Access Flow

```csharp
// When bot receives message with attachment
protected override async Task OnMessageActivityAsync(
    ITurnContext<IMessageActivity> turnContext,
    CancellationToken cancellationToken)
{
    foreach (var attachment in turnContext.Activity.Attachments ?? [])
    {
        if (attachment.ContentType == "application/vnd.microsoft.teams.file.download.info")
        {
            var fileInfo = JsonSerializer.Deserialize<FileDownloadInfo>(attachment.Content);
            
            // Download file content
            using var httpClient = new HttpClient();
            var fileBytes = await httpClient.GetByteArrayAsync(fileInfo.DownloadUrl);
            
            // Save to COBRA
            await _cobraFileService.SaveAttachmentAsync(
                eventId: linkedEventId,
                fileName: attachment.Name,
                content: fileBytes,
                uploadedBy: turnContext.Activity.From.Name,
                source: "Teams"
            );
        }
    }
}
```

### Sending Files to Teams

The bot can also upload files back to Teams:

```csharp
// Request user consent to upload file
var consentCard = new FileConsentCard
{
    Description = "ICS-214 Activity Log from COBRA",
    SizeInBytes = fileSize,
    AcceptContext = new { filename = "ICS-214.pdf", eventId = eventId },
    DeclineContext = new { filename = "ICS-214.pdf" }
};

var attachment = new Attachment
{
    ContentType = FileConsentCard.ContentType,
    Content = consentCard,
    Name = "ICS-214.pdf"
};

await turnContext.SendActivityAsync(MessageFactory.Attachment(attachment));
```

### Permissions Required

| Permission | Purpose |
|------------|---------|
| `supportsFiles: true` | Enable file handling in manifest |
| `Files.Read.All` | Read files from SharePoint/OneDrive (optional) |
| `Files.ReadWrite.All` | Write files to SharePoint/OneDrive (optional) |

---

## 4. Message Extensions - Search COBRA from Teams

### What Are Message Extensions?

Message extensions let users interact with COBRA directly from the Teams compose box or message context menu.

### Types of Message Extensions

| Type | Trigger | Use Case |
|------|---------|----------|
| **Search Command** | Type in compose box | Find COBRA events, logbook entries |
| **Action Command** | Right-click message | Promote message to logbook entry |
| **Link Unfurling** | Paste COBRA URL | Preview COBRA content in Teams |

### Search Command Example

User types `@COBRA search hurricane` in compose box:

```
┌─────────────────────────────────────────────────────────────────┐
│  Compose message                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ @COBRA search hurricane                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Search Results                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 🌀 Hurricane Response 2024                           │  │  │
│  │  │    Active | Started: Nov 15 | Lead: J. Smith        │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ 🌀 Hurricane Prep Exercise                          │  │  │
│  │  │    Closed | Oct 2024 | Type: Exercise               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

User selects an event, and a rich card is inserted into their message:

```
┌─────────────────────────────────────────────────────────────────┐
│  🌀 Hurricane Response 2024                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Status: Active                                                  │
│  Lead: John Smith                                                │
│  Started: November 15, 2024                                      │
│  Logbook Entries: 156                                            │
│                                                                  │
│  [Open in COBRA]  [View Logbook]                                │
└─────────────────────────────────────────────────────────────────┘
```

### Action Command Example - "Promote to Logbook"

User right-clicks a message in Teams and selects "Add to COBRA Logbook":

```
┌─────────────────────────────────────────────────────────────────┐
│  Message from Field Team Lead:                                   │
│  "Evacuation of Zone 3 complete. 47 residents relocated."       │
│                                                                  │
│  ┌─────────────────────────────┐                                │
│  │ 📋 Copy                      │                                │
│  │ 📌 Pin                       │                                │
│  │ ↩️ Reply                     │                                │
│  │ ─────────────────────────── │                                │
│  │ 📝 Add to COBRA Logbook  ◀──┼── Message Extension Action     │
│  │ 🔗 Link to COBRA Event      │                                │
│  └─────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────┘
```

A dialog appears to select the event and add context:

```
┌─────────────────────────────────────────────────────────────────┐
│  Add to COBRA Logbook                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Event: [Hurricane Response 2024        ▼]                      │
│                                                                  │
│  Category: [Operations                  ▼]                      │
│                                                                  │
│  Message:                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Evacuation of Zone 3 complete. 47 residents relocated.    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Additional Notes:                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                              [Cancel]  [Add to Logbook]         │
└─────────────────────────────────────────────────────────────────┘
```

### Link Unfurling Example

When someone pastes a COBRA URL in Teams, the bot can automatically expand it:

**User pastes:** `https://app.cobra5.com/events/abc123/logbook/entry/456`

**Teams displays:**
```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Logbook Entry #456                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Event: Hurricane Response 2024                                  │
│  Author: John Smith                                              │
│  Time: 14:32 UTC                                                 │
│                                                                  │
│  "All evacuation routes confirmed clear. Traffic control        │
│   points established at intersections A, B, and C."             │
│                                                                  │
│  [View Full Entry]                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Manifest Configuration

```json
{
  "composeExtensions": [
    {
      "botId": "{{BOT_APP_ID}}",
      "commands": [
        {
          "id": "searchEvents",
          "type": "query",
          "title": "Search Events",
          "description": "Search COBRA events",
          "initialRun": true,
          "parameters": [
            {
              "name": "query",
              "title": "Search",
              "description": "Search for events by name or keyword"
            }
          ]
        },
        {
          "id": "addToLogbook",
          "type": "action",
          "title": "Add to COBRA Logbook",
          "description": "Promote this message to a COBRA logbook entry",
          "context": ["message"],
          "fetchTask": true
        }
      ],
      "messageHandlers": [
        {
          "type": "link",
          "value": {
            "domains": ["app.cobra5.com", "cobra5.com"]
          }
        }
      ]
    }
  ]
}
```

---

## 5. Adaptive Cards - Rich Interactive Messages

### Beyond Simple Text

Instead of plain text messages, the bot can send rich, interactive Adaptive Cards.

### Example: Event Status Card

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "Container",
      "style": "emphasis",
      "items": [
        {
          "type": "ColumnSet",
          "columns": [
            {
              "type": "Column",
              "width": "auto",
              "items": [
                {
                  "type": "Image",
                  "url": "https://app.cobra5.com/icons/event-active.png",
                  "size": "Small"
                }
              ]
            },
            {
              "type": "Column",
              "width": "stretch",
              "items": [
                {
                  "type": "TextBlock",
                  "text": "Hurricane Response 2024",
                  "weight": "Bolder",
                  "size": "Large"
                },
                {
                  "type": "TextBlock",
                  "text": "Status: ACTIVE | Operational Period: 3",
                  "spacing": "None",
                  "isSubtle": true
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Lead:", "value": "John Smith" },
        { "title": "Started:", "value": "Nov 15, 2024 08:00 UTC" },
        { "title": "Logbook Entries:", "value": "156" },
        { "title": "Active Users:", "value": "23" }
      ]
    },
    {
      "type": "TextBlock",
      "text": "Latest Update",
      "weight": "Bolder",
      "spacing": "Medium"
    },
    {
      "type": "TextBlock",
      "text": "Evacuation of Zone 3 complete. Moving to Zone 4.",
      "wrap": true
    }
  ],
  "actions": [
    {
      "type": "Action.OpenUrl",
      "title": "Open in COBRA",
      "url": "https://app.cobra5.com/events/abc123"
    },
    {
      "type": "Action.Submit",
      "title": "Quick Update",
      "data": { "action": "quickUpdate", "eventId": "abc123" }
    }
  ]
}
```

### Rendered Card

```
┌─────────────────────────────────────────────────────────────────┐
│  [🔴]  Hurricane Response 2024                                   │
│        Status: ACTIVE | Operational Period: 3                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Lead:              John Smith                                   │
│  Started:           Nov 15, 2024 08:00 UTC                      │
│  Logbook Entries:   156                                         │
│  Active Users:      23                                          │
│                                                                  │
│  Latest Update                                                   │
│  Evacuation of Zone 3 complete. Moving to Zone 4.               │
│                                                                  │
│  [Open in COBRA]  [Quick Update]                                │
└─────────────────────────────────────────────────────────────────┘
```

### Interactive Cards with Actions

Users can interact with cards directly in Teams:

1. **Action.Submit** - Send data back to bot (e.g., acknowledge, approve)
2. **Action.OpenUrl** - Open COBRA in browser
3. **Action.ShowCard** - Expand additional content
4. **Action.ToggleVisibility** - Show/hide sections

---

## 6. Meeting Integration

### Can the Bot Join Meetings?

**Yes!** With additional permissions, the bot can:

- Join scheduled meetings
- Receive real-time transcription
- Record meetings (with consent)
- Post to meeting chat

### Emergency Management Use Cases

| Feature | Use Case |
|---------|----------|
| **Auto-join briefings** | Bot joins scheduled COBRA briefing meetings |
| **Transcription → Logbook** | Meeting notes automatically become logbook entries |
| **Attendance tracking** | Record who attended briefings |
| **Action item extraction** | AI identifies and tracks action items |

### Permissions Required

| Permission | Purpose |
|------------|---------|
| `Calls.JoinGroupCall.All` | Join meetings |
| `Calls.AccessMedia.All` | Access audio/video streams |
| `OnlineMeetings.Read.All` | Read meeting details |

**Note:** Meeting integration requires significant additional infrastructure (media hosting) and is more complex than messaging integration.

---

## 7. Notifications & Proactive Messaging

### Beyond Response - Proactive Alerts

The bot can proactively notify Teams users about COBRA events:

| Trigger | Notification |
|---------|--------------|
| New event created | "@channel: New event 'Hurricane Response' has been activated" |
| Logbook milestone | "Logbook has reached 100 entries" |
| Status change | "Event status changed from Monitoring to Active" |
| Shift change | "Operational Period 3 has begun" |
| Resource request | "Resource request pending approval: 5 ambulances" |

### Activity Feed Notifications

Beyond channel messages, the bot can send notifications to users' Activity Feed:

```csharp
// Send to user's Activity Feed
await _graphClient.Users[userId].Teamwork
    .SendActivityNotification
    .PostAsync(new SendActivityNotificationPostRequestBody
    {
        Topic = new TeamworkActivityTopic
        {
            Source = TeamworkActivityTopicSource.Text,
            Value = "COBRA Alert"
        },
        ActivityType = "eventStatusChange",
        PreviewText = new ItemBody
        {
            Content = "Hurricane Response status changed to ACTIVE"
        }
    });
```

---

## 8. Deep Links

### Link Directly to COBRA Content from Teams

Generate deep links that open specific COBRA views:

```
https://teams.microsoft.com/l/entity/{appId}/cobraTab?
  webUrl=https://cobra-poc.azurewebsites.net/events/abc123&
  label=Hurricane%20Response
```

Users can:
- Click link in Teams message
- Opens COBRA tab directly to that event
- No context switching to browser

---

## Capability Priority Matrix

| Capability | Value | Complexity | Recommended Phase |
|------------|-------|------------|-------------------|
| Bi-directional messaging | ⭐⭐⭐⭐⭐ | Medium | Phase 1 (Current) |
| Tab App (embed COBRA) | ⭐⭐⭐⭐⭐ | Medium | Phase 2 |
| Auto channel creation | ⭐⭐⭐⭐ | Low | Phase 2 |
| File import to COBRA | ⭐⭐⭐⭐ | Medium | Phase 2 |
| Message Extension (search) | ⭐⭐⭐⭐ | Medium | Phase 3 |
| Message Extension (promote) | ⭐⭐⭐⭐⭐ | Medium | Phase 3 |
| Link unfurling | ⭐⭐⭐ | Low | Phase 3 |
| Activity feed notifications | ⭐⭐⭐ | Low | Phase 3 |
| Adaptive Cards (rich) | ⭐⭐⭐ | Low | Phase 2 |
| Meeting integration | ⭐⭐⭐ | High | Future |

---

## Recommended "Phase 2" Features

Based on value vs. complexity, these features should be prioritized after basic messaging:

### 1. Tab App - Embed COBRA Dashboard
- Highest impact for user experience
- Users never leave Teams
- Moderate complexity (CSP headers, Teams SDK)

### 2. Auto Channel Creation
- Streamlines onboarding
- Low complexity
- Requires one additional permission

### 3. "Promote to Logbook" Action
- Critical for field personnel
- Natural workflow extension
- Moderate complexity

### 4. File Import
- Automatic evidence capture
- Compliance benefit
- Moderate complexity

---

## User Experience Comparison

### Current: Bot-Only Integration

```
User in Teams                           User needs COBRA details
     │                                           │
     ▼                                           ▼
┌─────────────┐                          ┌─────────────┐
│   Teams     │                          │   Browser   │
│   Channel   │  ◄─────────────────────▶ │   COBRA     │
│  (messages) │      context switch      │ (full app)  │
└─────────────┘                          └─────────────┘
```

### Enhanced: Full Integration

```
User in Teams (never leaves)
     │
     ▼
┌─────────────────────────────────────────────────────┐
│                    Microsoft Teams                   │
│  ┌────────┬──────────┬───────────────────────────┐  │
│  │ Posts  │  Files   │  COBRA Dashboard (Tab)    │  │
│  │        │          │  ┌─────────────────────┐  │  │
│  │ Chat   │ Shared   │  │ Full COBRA UI       │  │  │
│  │ with   │ files    │  │ - Event details     │  │  │
│  │ COBRA  │ auto-    │  │ - Logbook           │  │  │
│  │ bridge │ imported │  │ - Map               │  │  │
│  │        │ to COBRA │  │ - Resources         │  │  │
│  └────────┴──────────┴──┴─────────────────────┴──┘  │
│                                                      │
│  [Compose] @COBRA search events...                  │
│  [Right-click message] → "Add to COBRA Logbook"     │
└──────────────────────────────────────────────────────┘
```

---

## Summary

The Microsoft Teams platform offers significant capabilities beyond basic messaging that could transform COBRA's Teams integration from a "communication bridge" to a "complete emergency management interface within Teams."

**Most Valuable Additions:**
1. **Tab App** - Embed COBRA UI directly in Teams
2. **Auto Channel Creation** - Streamline event setup
3. **Promote to Logbook** - Critical field workflow
4. **File Import** - Automatic evidence capture

These features would position COBRA as a deeply integrated Teams solution rather than just a messaging connector.

---

*Document Version: 1.0*  
*Last Updated: December 2025*

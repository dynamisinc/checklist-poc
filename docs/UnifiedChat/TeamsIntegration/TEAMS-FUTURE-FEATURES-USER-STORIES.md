# Microsoft Teams Integration - Future Features User Stories

## Epic: Teams Advanced Integration Features

**Epic ID Prefix:** UC-TI (Unified Communications - Teams Integration)

**Story Range:** UC-TI-029 through UC-TI-045

**Epic Description:** As a COBRA platform, I need advanced Teams integration features that go beyond bi-directional messaging, including the ability to import files shared in Teams directly into COBRA events and promote informal Teams messages to formal logbook entries. These features bridge the gap between informal field communications and formal incident documentation.

**Business Value:** During emergency response, field personnel naturally share photos, documents, and status updates through familiar tools like Teams. Currently, this valuable information must be manually transferred to COBRA for formal documentation and compliance. These features automate that bridge, ensuring critical information flows into the official record with minimal friction while preserving attribution and timestamps for audit compliance.

**Technical Approach:** Extend the existing Teams bot with message extension capabilities (action commands), file attachment handling, and event context resolution logic. Leverage Adaptive Cards for rich user interactions and the Microsoft Graph API for file access.

**Dependencies:**

- UC-TI-001 through UC-TI-028 (Core Teams Bot Integration)
- COBRA Logbook API endpoints
- COBRA File/Attachment storage infrastructure

**Target Release:** Future (Post-Phase 1)

---

## Feature: Event Context Resolution

_These stories establish the foundation for determining which COBRA event to associate with Teams actions._

---

### UC-TI-029: Query User's Accessible Events

**Title:** Retrieve user's accessible COBRA events for Teams actions

**As a** COBRA Teams bot  
**I want** to query which COBRA events a Teams user has access to  
**So that** I can present appropriate event options for file import and logbook promotion

**Acceptance Criteria:**

- [ ] Bot can authenticate to COBRA API using user's linked identity
- [ ] API endpoint returns events filtered by user access permissions
- [ ] Response includes event ID, name, status, user's role, and last accessed timestamp
- [ ] Results ordered by: Active status, then last accessed date (descending)
- [ ] Closed events included but visually distinguished
- [ ] API response cached for reasonable duration (5 minutes) to reduce latency
- [ ] Handles case where user has no COBRA account linked

**Technical Notes:**

```
GET /api/users/{teamsAadObjectId}/events
    ?status=active,closed
    &include=role,lastAccessed
    &orderBy=lastAccessed desc
```

**Dependencies:** UC-TI-003 (Azure AD App Registration), COBRA API

**Story Points:** 3

---

### UC-TI-030: Resolve Event from Linked Channel

**Title:** Automatically resolve event context from linked Teams channel

**As a** COBRA Teams bot  
**I want** to automatically determine the COBRA event when a user acts in a linked channel  
**So that** file imports and logbook promotions require minimal user interaction

**Acceptance Criteria:**

- [ ] Bot checks TeamsChannelMappings table for channel-event link
- [ ] If linked, event ID returned without user prompt
- [ ] Lookup completes in < 100ms
- [ ] Returns null if channel is not linked (triggers fallback flow)
- [ ] Handles soft-deleted/inactive mappings appropriately

**Technical Notes:**

```csharp
var mapping = await _context.TeamsChannelMappings
    .Where(m => m.TeamsChannelId == channelId && m.IsActive)
    .Select(m => new { m.CobraEventId, m.CobraEvent.Name })
    .FirstOrDefaultAsync();
```

**Dependencies:** UC-TI-011 (External Channel Mapping)

**Story Points:** 2

---

### UC-TI-031: Store Channel-Event Usage Memory

**Title:** Remember which event was used in unlinked channels

**As a** COBRA Teams bot  
**I want** to remember which COBRA event a user associated with a specific channel  
**So that** subsequent actions in that channel can pre-select the same event

**Acceptance Criteria:**

- [ ] After successful file import or logbook promotion, store channel-event association
- [ ] Storage includes: channelId, eventId, userId, timestamp, usageCount
- [ ] On subsequent actions, retrieve and use as default selection
- [ ] Memory expires after 7 days of inactivity
- [ ] Per-user memory (different users in same channel may have different defaults)
- [ ] Does not override explicit channel links

**Database Schema:**

```sql
CREATE TABLE TeamsChannelEventMemory (
    Id UNIQUEIDENTIFIER PRIMARY KEY,
    TeamsChannelId NVARCHAR(100) NOT NULL,
    TeamsUserId NVARCHAR(100) NOT NULL,
    CobraEventId UNIQUEIDENTIFIER NOT NULL,
    UsageCount INT NOT NULL DEFAULT 1,
    LastUsedAt DATETIME2 NOT NULL,
    CreatedAt DATETIME2 NOT NULL,
    INDEX IX_ChannelUser (TeamsChannelId, TeamsUserId)
);
```

**Dependencies:** UC-TI-029

**Story Points:** 3

---

### UC-TI-032: Suggest Channel Linking After Repeated Use

**Title:** Prompt to link channel after repeated event associations

**As a** COBRA user  
**I want** the bot to suggest linking a channel after I've used it multiple times for the same event  
**So that** I can enable automatic message bridging and streamline future actions

**Acceptance Criteria:**

- [ ] After 3 successful actions to the same event from an unlinked channel, show suggestion
- [ ] Suggestion appears as Adaptive Card with "Link Channel" and "Not Now" options
- [ ] "Not Now" suppresses suggestion for 24 hours
- [ ] "Link Channel" triggers existing channel linking flow (UC-TI-019)
- [ ] Only suggest if user has permission to link channels
- [ ] Track suggestion dismissals to avoid annoyance

**User Experience:**

```
🤖 COBRA Communications

You've shared 3 items from this channel to "Hurricane Response 2024"

Would you like to link this channel to that event?
This enables automatic message bridging.

[Not Now]  [Link Channel]
```

**Dependencies:** UC-TI-031, UC-TI-019

**Story Points:** 2

---

### UC-TI-033: Build Event Selection Adaptive Card

**Title:** Create reusable event selection Adaptive Card component

**As a** COBRA developer  
**I want** a reusable Adaptive Card component for event selection  
**So that** file import and logbook promotion flows have consistent UX

**Acceptance Criteria:**

- [ ] Card displays list of events with visual status indicators (🔴 Active, 🟡 Monitoring, ⚪ Closed)
- [ ] Shows user's role in each event
- [ ] Shows "last active" relative time
- [ ] Pre-selects recommended event based on context resolution
- [ ] Includes category dropdown (Operations, Planning, Logistics, Finance, Documentation)
- [ ] Supports single-select radio button style
- [ ] Mobile-friendly layout
- [ ] Includes Cancel and Submit actions

**Dependencies:** UC-TI-029

**Story Points:** 3

---

## Feature: File Import from Teams

_These stories enable importing files shared in Teams channels into COBRA events._

---

### UC-TI-034: Detect File Attachments in Messages

**Title:** Detect when users share files in Teams channels

**As a** COBRA Teams bot  
**I want** to detect when files are attached to messages in channels where I'm installed  
**So that** I can offer to import them to COBRA

**Acceptance Criteria:**

- [ ] Bot receives message activity with attachments via RSC permissions
- [ ] Detects attachment contentType of `application/vnd.microsoft.teams.file.download.info`
- [ ] Extracts file metadata: name, size, contentUrl, downloadUrl, fileType
- [ ] Ignores non-file attachments (cards, adaptive cards, etc.)
- [ ] Handles multiple attachments in single message
- [ ] Logs attachment detection for debugging

**Technical Notes:**

```csharp
foreach (var attachment in activity.Attachments ?? [])
{
    if (attachment.ContentType == "application/vnd.microsoft.teams.file.download.info")
    {
        var fileInfo = JsonSerializer.Deserialize<FileDownloadInfo>(attachment.Content);
        // Process file...
    }
}
```

**Dependencies:** UC-TI-004 (RSC Permissions), UC-TI-009 (Inbound Message Handler)

**Story Points:** 2

---

### UC-TI-035: Configure Channel File Import Behavior

**Title:** Allow configuration of automatic file import per channel

**As a** COBRA administrator  
**I want** to configure how file attachments are handled per linked channel  
**So that** I can control whether files auto-import, prompt, or are ignored

**Acceptance Criteria:**

- [ ] When linking channel, user selects file handling mode:
  - "Don't import files automatically" (default)
  - "Import all files automatically"
  - "Prompt for each file"
- [ ] Setting stored in TeamsChannelMappings table
- [ ] Setting can be changed after initial link
- [ ] Auto-import includes default category selection
- [ ] File size limit configurable (default: 100 MB)

**Database Addition:**

```sql
ALTER TABLE TeamsChannelMappings ADD
    FileImportMode NVARCHAR(20) NOT NULL DEFAULT 'none',
    -- Values: 'none', 'auto', 'prompt'
    DefaultFileCategory NVARCHAR(50) NULL,
    MaxFileSizeMB INT NOT NULL DEFAULT 100;
```

**Dependencies:** UC-TI-019 (Link Teams Channel)

**Story Points:** 3

---

### UC-TI-036: Auto-Import Files in Linked Channels

**Title:** Automatically import files when channel is configured for auto-import

**As a** COBRA user  
**I want** files I share in a linked Teams channel to automatically save to COBRA  
**So that** field documentation is captured without extra steps

**Acceptance Criteria:**

- [ ] When file detected in channel with FileImportMode = 'auto':
  - Download file from SharePoint URL
  - Save to COBRA event's attachments
  - Create logbook entry noting the import
  - Post confirmation message to channel
- [ ] Confirmation includes: filename, size, event name, category
- [ ] Confirmation includes "View in COBRA" link
- [ ] Files exceeding size limit show warning instead of importing
- [ ] Failed imports show error with retry option
- [ ] Original Teams message ID stored for reference

**User Experience:**

```
👤 Field Team Lead
Here's the damage assessment
📎 damage_zone3.jpg

🤖 COBRA Communications
✅ Saved damage_zone3.jpg to Hurricane Response 2024
   Category: Documentation | Size: 2.4 MB
   [View in COBRA]
```

**Dependencies:** UC-TI-034, UC-TI-035, UC-TI-030

**Story Points:** 5

---

### UC-TI-037: Prompt for File Import

**Title:** Show import prompt for files in prompt-mode channels or unlinked channels

**As a** COBRA user  
**I want** to be prompted when I share a file in Teams  
**So that** I can choose whether to import it to COBRA and select the appropriate event

**Acceptance Criteria:**

- [ ] When file detected in channel with FileImportMode = 'prompt' or unlinked channel:
  - Show Adaptive Card with import options
  - Pre-select event based on context resolution (UC-TI-030, UC-TI-031)
  - Allow event and category selection
  - Include file preview (name, size, type icon)
- [ ] "Import" button downloads and saves file
- [ ] "Skip" button dismisses without action
- [ ] Card auto-expires after 24 hours
- [ ] Only prompt the user who shared the file (not entire channel)

**User Experience:**

```
🤖 COBRA Communications (only visible to you)
┌─────────────────────────────────────────┐
│ 📎 Save to COBRA?                       │
│                                         │
│ File: incident_report.pdf (1.2 MB)      │
│                                         │
│ Event: [Hurricane Response 2024    ▼]   │
│ Category: [Documentation           ▼]   │
│                                         │
│ [Skip]  [Save to COBRA]                 │
└─────────────────────────────────────────┘
```

**Dependencies:** UC-TI-034, UC-TI-033, UC-TI-029

**Story Points:** 5

---

### UC-TI-038: Download File from SharePoint

**Title:** Download file content from SharePoint/OneDrive URL

**As a** COBRA Teams bot  
**I want** to download file content from the SharePoint URL provided by Teams  
**So that** I can store the file in COBRA's attachment system

**Acceptance Criteria:**

- [ ] Use downloadUrl from file attachment metadata
- [ ] Handle authentication (may require user token for some files)
- [ ] Support files up to configured size limit
- [ ] Detect and handle common file types (images, PDFs, Office docs)
- [ ] Timeout after 60 seconds for large files
- [ ] Return byte array and content type for storage
- [ ] Handle 403/404 errors gracefully with user message

**Technical Notes:**

```csharp
public async Task<(byte[] Content, string ContentType)> DownloadFileAsync(
    string downloadUrl,
    CancellationToken cancellationToken)
{
    using var httpClient = _httpClientFactory.CreateClient();
    var response = await httpClient.GetAsync(downloadUrl, cancellationToken);
    response.EnsureSuccessStatusCode();

    var content = await response.Content.ReadAsByteArrayAsync(cancellationToken);
    var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/octet-stream";

    return (content, contentType);
}
```

**Dependencies:** UC-TI-034

**Story Points:** 3

---

### UC-TI-039: Save File to COBRA Attachments

**Title:** Store imported file in COBRA's attachment system

**As a** COBRA Teams bot  
**I want** to save downloaded files to COBRA's attachment storage  
**So that** they are associated with the correct event and available in the COBRA UI

**Acceptance Criteria:**

- [ ] Create attachment record with:
  - EventId, FileName, ContentType, SizeBytes
  - UploadedBy (COBRA user ID mapped from Teams user)
  - Source = "Teams"
  - SourceMessageId = Teams message ID
  - Category (from user selection or default)
- [ ] Store file content in COBRA's blob storage
- [ ] Optionally create associated logbook entry
- [ ] Return attachment ID and URL for confirmation message
- [ ] Handle duplicate detection (same file from same message)

**Dependencies:** UC-TI-038, COBRA Attachment API

**Story Points:** 3

---

## Feature: Promote Message to Logbook

_These stories enable promoting Teams messages to COBRA logbook entries via message action._

---

### UC-TI-040: Register "Add to COBRA Logbook" Message Action

**Title:** Register message extension action command in Teams manifest

**As a** COBRA Teams bot  
**I want** to register a message action command  
**So that** users can right-click messages and select "Add to COBRA Logbook"

**Acceptance Criteria:**

- [ ] Manifest includes composeExtensions with action command
- [ ] Command appears in message context menu (right-click/long-press)
- [ ] Command titled "Add to COBRA Logbook" with appropriate icon
- [ ] Command available in team channels and group chats
- [ ] Command triggers fetchTask to show dialog

**Manifest Configuration:**

```json
{
  "composeExtensions": [
    {
      "botId": "{{BOT_APP_ID}}",
      "commands": [
        {
          "id": "addToLogbook",
          "type": "action",
          "title": "Add to COBRA Logbook",
          "description": "Promote this message to a COBRA logbook entry",
          "context": ["message"],
          "fetchTask": true
        }
      ]
    }
  ]
}
```

**Dependencies:** UC-TI-001, UC-TI-005

**Story Points:** 2

---

### UC-TI-041: Handle Promote to Logbook FetchTask

**Title:** Handle fetchTask invoke and build logbook entry dialog

**As a** COBRA Teams bot  
**I want** to handle the fetchTask invoke when a user selects "Add to COBRA Logbook"  
**So that** I can display a dialog with the message content and event selection

**Acceptance Criteria:**

- [ ] Receive composeExtension/fetchTask invoke activity
- [ ] Extract original message content from action.messagePayload
- [ ] Extract author name and timestamp from original message
- [ ] Resolve event context (UC-TI-030, UC-TI-031, UC-TI-029)
- [ ] Build Adaptive Card dialog with:
  - Event selector (pre-selected based on context)
  - Category dropdown
  - Editable message content (pre-populated)
  - Author attribution checkbox
  - Timestamp preservation checkbox
  - "Mark as significant" checkbox
- [ ] Return task module response with card

**Technical Notes:**

```csharp
protected override async Task<MessagingExtensionActionResponse>
    OnTeamsMessagingExtensionFetchTaskAsync(
        ITurnContext<IInvokeActivity> turnContext,
        MessagingExtensionAction action,
        CancellationToken cancellationToken)
{
    var messagePayload = action.MessagePayload;
    var messageText = StripHtml(messagePayload.Body.Content);
    var authorName = messagePayload.From.User.DisplayName;
    var timestamp = messagePayload.CreatedDateTime;

    var eventContext = await ResolveEventContextAsync(turnContext);
    var card = BuildPromoteToLogbookCard(messageText, authorName, timestamp, eventContext);

    return new MessagingExtensionActionResponse
    {
        Task = new TaskModuleContinueResponse
        {
            Value = new TaskModuleTaskInfo
            {
                Card = new Attachment
                {
                    ContentType = AdaptiveCard.ContentType,
                    Content = card
                },
                Title = "Add to COBRA Logbook",
                Height = 450,
                Width = 500
            }
        }
    };
}
```

**Dependencies:** UC-TI-040, UC-TI-030, UC-TI-033

**Story Points:** 5

---

### UC-TI-042: Build Promote to Logbook Adaptive Card

**Title:** Create Adaptive Card for logbook entry creation dialog

**As a** COBRA developer  
**I want** a well-designed Adaptive Card for the promote to logbook dialog  
**So that** users can review and customize the logbook entry before saving

**Acceptance Criteria:**

- [ ] Card displays original message in read-only format
- [ ] Editable text area with pre-populated content
- [ ] Event dropdown with user's accessible events
- [ ] Category dropdown (Operations, Planning, Logistics, Finance, Admin, Documentation)
- [ ] Checkbox: "Attribute to original author" (default: checked)
- [ ] Checkbox: "Preserve original timestamp" (default: checked)
- [ ] Checkbox: "Mark as significant entry" (default: unchecked)
- [ ] Preview section showing how entry will appear
- [ ] Cancel and "Add to Logbook" buttons
- [ ] Card follows C5 design principles where applicable

**Dependencies:** UC-TI-033

**Story Points:** 3

---

### UC-TI-043: Handle Promote to Logbook Submit

**Title:** Process logbook entry submission and create entry in COBRA

**As a** COBRA Teams bot  
**I want** to handle the submit action from the logbook dialog  
**So that** I can create the logbook entry in COBRA and confirm to the user

**Acceptance Criteria:**

- [ ] Receive composeExtension/submitAction invoke activity
- [ ] Extract form data: eventId, category, content, options
- [ ] Resolve COBRA user ID from Teams user
- [ ] Create logbook entry via COBRA API:
  - EventId from selection
  - Content from edited text
  - Category from selection
  - AuthorName based on attribution option
  - Timestamp based on preservation option
  - Source = "Teams"
  - SourceMessageId = original message ID
  - IsSignificant based on checkbox
- [ ] Return success response to close dialog
- [ ] Post confirmation card to channel
- [ ] Update channel-event memory (UC-TI-031)

**Technical Notes:**

```csharp
var entry = new CreateLogbookEntryRequest
{
    EventId = data.EventId,
    Category = data.Category,
    Content = data.Content,
    AuthorId = data.PreserveAuthor ? null : currentUserId,
    AuthorName = data.PreserveAuthor ? data.OriginalAuthor : null,
    AuthorNote = data.PreserveAuthor ? "(via Teams)" : null,
    Timestamp = data.PreserveTimestamp ? data.OriginalTimestamp : DateTime.UtcNow,
    Source = LogbookEntrySource.Teams,
    ExternalReferenceId = data.OriginalMessageId,
    IsSignificant = data.MarkSignificant
};

var result = await _logbookService.CreateEntryAsync(entry);
```

**Dependencies:** UC-TI-041, COBRA Logbook API

**Story Points:** 5

---

### UC-TI-044: Post Logbook Confirmation to Channel

**Title:** Send confirmation message after successful logbook entry creation

**As a** COBRA user  
**I want** to see a confirmation in Teams after promoting a message to the logbook  
**So that** I know the entry was created and can access it in COBRA

**Acceptance Criteria:**

- [ ] Confirmation appears as Adaptive Card in the channel
- [ ] Card shows:
  - Success indicator (✅)
  - Event name
  - Entry number/ID
  - Category
  - Timestamp
  - Brief preview of content (truncated)
- [ ] Includes "View in COBRA" button linking to entry
- [ ] Card is visible to all channel members (documents the action)
- [ ] Original message remains unchanged (no modification)

**User Experience:**

```
🤖 COBRA Communications

✅ Added to COBRA Logbook
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event: Hurricane Response 2024
Entry #157 | Operations | 14:32 UTC

"Zone 3 evacuation complete. 47 residents at Jefferson HS."

[View in COBRA]
```

**Dependencies:** UC-TI-043

**Story Points:** 2

---

### UC-TI-045: Handle Promote to Logbook with Attachments

**Title:** Include file attachments when promoting message to logbook

**As a** COBRA user  
**I want** files attached to a Teams message to be included when I promote it to the logbook  
**So that** supporting documentation is captured with the entry

**Acceptance Criteria:**

- [ ] When original message has attachments, detect and list them in dialog
- [ ] Checkbox for each attachment: "Include attachment" (default: checked)
- [ ] On submit, download selected attachments (UC-TI-038)
- [ ] Save attachments to COBRA (UC-TI-039)
- [ ] Link attachments to the created logbook entry
- [ ] Confirmation shows count of attached files
- [ ] Handle partial failures (entry created, some attachments failed)

**User Experience (Dialog):**

```
Attachments:
☑ damage_photo.jpg (2.4 MB)
☑ incident_report.pdf (1.1 MB)
☐ personal_notes.docx (45 KB)  [unchecked by user]
```

**Dependencies:** UC-TI-043, UC-TI-038, UC-TI-039

**Story Points:** 5

---

## Implementation Phases

### Phase 1: Foundation

| Story     | Title                               | Points |
| --------- | ----------------------------------- | ------ |
| UC-TI-029 | Query User's Accessible Events      | 3      |
| UC-TI-030 | Resolve Event from Linked Channel   | 2      |
| UC-TI-033 | Build Event Selection Adaptive Card | 3      |
| **Total** |                                     | **8**  |

### Phase 2: File Import

| Story     | Title                                  | Points |
| --------- | -------------------------------------- | ------ |
| UC-TI-034 | Detect File Attachments                | 2      |
| UC-TI-035 | Configure Channel File Import Behavior | 3      |
| UC-TI-038 | Download File from SharePoint          | 3      |
| UC-TI-039 | Save File to COBRA Attachments         | 3      |
| UC-TI-036 | Auto-Import Files in Linked Channels   | 5      |
| UC-TI-037 | Prompt for File Import                 | 5      |
| **Total** |                                        | **21** |

### Phase 3: Promote to Logbook

| Story     | Title                     | Points |
| --------- | ------------------------- | ------ |
| UC-TI-040 | Register Message Action   | 2      |
| UC-TI-041 | Handle FetchTask          | 5      |
| UC-TI-042 | Build Logbook Dialog Card | 3      |
| UC-TI-043 | Handle Submit             | 5      |
| UC-TI-044 | Post Confirmation         | 2      |
| **Total** |                           | **17** |

### Phase 4: Enhancements

| Story     | Title                         | Points |
| --------- | ----------------------------- | ------ |
| UC-TI-031 | Store Channel-Event Memory    | 3      |
| UC-TI-032 | Suggest Channel Linking       | 2      |
| UC-TI-045 | Handle Attachments in Promote | 5      |
| **Total** |                               | **10** |

---

## Appendix A: Required API Endpoints

### COBRA API Additions Needed

```
GET  /api/teams/users/{teamsAadObjectId}/events
     Returns events accessible to the Teams user

POST /api/events/{eventId}/attachments
     Creates attachment from uploaded file

POST /api/events/{eventId}/logbook
     Creates logbook entry (existing, may need extension for Teams metadata)

GET  /api/events/{eventId}/categories
     Returns available categories for the event
```

### New Database Tables

```sql
-- Channel-event usage memory for smart defaults
CREATE TABLE TeamsChannelEventMemory (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    TeamsChannelId NVARCHAR(100) NOT NULL,
    TeamsUserId NVARCHAR(100) NOT NULL,
    CobraEventId UNIQUEIDENTIFIER NOT NULL,
    UsageCount INT NOT NULL DEFAULT 1,
    LastUsedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    INDEX IX_ChannelUser (TeamsChannelId, TeamsUserId),
    FOREIGN KEY (CobraEventId) REFERENCES Events(Id)
);

-- File import configuration per channel
ALTER TABLE TeamsChannelMappings ADD
    FileImportMode NVARCHAR(20) NOT NULL DEFAULT 'none',
    DefaultFileCategory NVARCHAR(50) NULL,
    MaxFileSizeMB INT NOT NULL DEFAULT 100;
```

---

## Appendix B: Manifest Updates Required

```json
{
  "composeExtensions": [
    {
      "botId": "{{BOT_APP_ID}}",
      "commands": [
        {
          "id": "addToLogbook",
          "type": "action",
          "title": "Add to COBRA Logbook",
          "description": "Promote this message to a COBRA logbook entry",
          "context": ["message"],
          "fetchTask": true
        }
      ]
    }
  ],
  "bots": [
    {
      "botId": "{{BOT_APP_ID}}",
      "scopes": ["team", "groupchat"],
      "supportsFiles": true,
      "commandLists": [
        {
          "scopes": ["team"],
          "commands": [
            { "title": "help", "description": "Show available commands" },
            { "title": "status", "description": "Check connection status" },
            { "title": "link", "description": "Link to COBRA event" },
            {
              "title": "set-event",
              "description": "Set working event for this channel"
            }
          ]
        }
      ]
    }
  ]
}
```

---

_Document Version: 1.0_  
_Last Updated: December 2025_
_Story Range: UC-TI-029 through UC-TI-045_

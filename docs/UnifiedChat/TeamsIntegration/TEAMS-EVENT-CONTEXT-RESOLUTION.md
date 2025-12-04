# COBRA Teams Integration - Event Context Resolution

## The Core Challenge

When a user shares a file or wants to promote a message to the COBRA logbook, the bot needs to know:
1. **Which COBRA event** should this content be associated with?
2. **Which channel/category** within that event?
3. **What additional metadata** (if any) should be captured?

This document explores the options for resolving event context with minimal friction.

---

## Context Sources

The bot has several potential sources of context:

| Source | Availability | Reliability |
|--------|--------------|-------------|
| **Channel-Event Mapping** | If channel is linked | 100% - explicit link |
| **User's Active Events** | Query COBRA API | High - user has access |
| **User's Recent Events** | Query COBRA API | Medium - may not be current |
| **Conversation Context** | Parse messages | Low - requires NLP |
| **User Preference** | Stored setting | High - but may be stale |

---

## Scenario Analysis

### Scenario 1: Channel Already Linked to Event

**Context:** User is in a Teams channel that's already linked to a COBRA event via the messaging integration.

```
Teams Channel: "COBRA: Hurricane Response 2024"
    ↓
Linked to COBRA Event: "Hurricane Response 2024" (ID: abc123)
```

**Resolution:** Automatic - no user action needed.

```
User shares file in channel
    ↓
Bot detects attachment
    ↓
Bot looks up TeamsChannelMapping for this channel
    ↓
Mapping found → Event ID: abc123
    ↓
File saved to event abc123
    ↓
Bot confirms: "✅ Saved incident_photo.jpg to Hurricane Response 2024"
```

**User Experience:**
```
┌─────────────────────────────────────────────────────────────────┐
│  👤 Field Team Lead                                              │
│  Here's the damage assessment photo from Zone 3                  │
│  📎 damage_zone3.jpg                                             │
├─────────────────────────────────────────────────────────────────┤
│  🤖 COBRA Communications                                         │
│  ✅ Saved damage_zone3.jpg to Hurricane Response 2024           │
│     Category: Documentation | Size: 2.4 MB                      │
│     [View in COBRA]                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 2: Channel NOT Linked - User Has One Active Event

**Context:** User shares a file in an unlinked channel, but only has one active event in COBRA.

**Resolution:** Auto-suggest with one-click confirm.

```
User shares file in unlinked channel
    ↓
Bot queries COBRA: "What events does this user have access to?"
    ↓
Result: 1 active event (Hurricane Response 2024)
    ↓
Bot prompts with pre-selected suggestion
```

**User Experience:**
```
┌─────────────────────────────────────────────────────────────────┐
│  👤 Field Team Lead                                              │
│  Sharing the incident report                                     │
│  📎 incident_report.pdf                                          │
├─────────────────────────────────────────────────────────────────┤
│  🤖 COBRA Communications                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📎 Save to COBRA?                                          ││
│  │                                                              ││
│  │  File: incident_report.pdf (1.2 MB)                         ││
│  │  Event: Hurricane Response 2024  ✓                          ││
│  │  Category: [Documentation        ▼]                         ││
│  │                                                              ││
│  │  [Cancel]  [Save to COBRA]                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 3: Channel NOT Linked - User Has Multiple Active Events

**Context:** User shares a file in an unlinked channel and has multiple active events.

**Resolution:** Show event picker with smart ordering.

```
User shares file in unlinked channel
    ↓
Bot queries COBRA: "What events does this user have access to?"
    ↓
Result: 3 active events
    ↓
Bot shows picker, ordered by:
  1. Most recently accessed
  2. Events where user has a role
  3. Alphabetical
```

**User Experience:**
```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📎 Save to COBRA?                                          ││
│  │                                                              ││
│  │  File: situation_update.docx (845 KB)                       ││
│  │                                                              ││
│  │  Select Event:                                               ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ ○ Hurricane Response 2024        (Last active: 5m ago) │││
│  │  │ ○ Winter Storm Prep              (Last active: 2h ago) │││
│  │  │ ○ Annual Exercise 2024           (Last active: 3d ago) │││
│  │  └─────────────────────────────────────────────────────────┘││
│  │                                                              ││
│  │  Category: [Operations             ▼]                       ││
│  │                                                              ││
│  │  [Cancel]  [Save to COBRA]                                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

### Scenario 4: "Promote to Logbook" Message Action

**Context:** User right-clicks a message and selects "Add to COBRA Logbook."

**Resolution:** Same logic, but with message content pre-populated.

```
User right-clicks message
    ↓
Selects "Add to COBRA Logbook"
    ↓
Bot checks: Is this channel linked?
    ↓
If YES → Pre-select that event
If NO  → Show event picker
    ↓
Show dialog with message content
```

**User Experience (Linked Channel):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Add to COBRA Logbook                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Event: Hurricane Response 2024                    [Change]     │
│                                                                  │
│  Category: [Operations                          ▼]              │
│                                                                  │
│  Original Message:                                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ "Evacuation of Zone 3 complete. 47 residents relocated   │  │
│  │  to shelter at Jefferson High School."                    │  │
│  │                                              - Jane Smith │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Entry Content: (editable)                                       │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Evacuation of Zone 3 complete. 47 residents relocated    │  │
│  │ to shelter at Jefferson High School.                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☑ Include original author attribution (Jane Smith via Teams)  │
│  ☑ Include timestamp (Dec 3, 2024 14:32 UTC)                   │
│  ☐ Mark as significant                                          │
│                                                                  │
│                              [Cancel]  [Add to Logbook]         │
└─────────────────────────────────────────────────────────────────┘
```

**User Experience (Unlinked Channel - Multiple Events):**
```
┌─────────────────────────────────────────────────────────────────┐
│  Add to COBRA Logbook                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Select Event:                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  🔴 Hurricane Response 2024         Active | You: Ops Chief│  │
│  │  🟡 Winter Storm Prep               Active | You: Member   │  │
│  │  ⚪ Annual Exercise 2024            Closed | You: Observer │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Category: [Operations                          ▼]              │
│                                                                  │
│  ... (rest of form)                                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Smart Defaults & Preferences

### Option A: "Working Event" Preference

Users can set a "current working event" that becomes the default:

```
@COBRA Communications set-event Hurricane Response 2024
```

**Stored in:** User preferences (COBRA database or bot state)

**Benefit:** One-click actions without picking event each time

**Downside:** Users forget to change it; stale preference

---

### Option B: "Last Used" Memory

Bot remembers the last event the user interacted with:

```
User promoted message to "Hurricane Response" at 14:00
    ↓
User shares file at 14:30
    ↓
Bot suggests "Hurricane Response" as default
```

**Stored in:** Bot conversation state or COBRA user activity

**Benefit:** Natural workflow continuity

**Downside:** May suggest wrong event if user context-switched

---

### Option C: Channel-Based Memory

Even for unlinked channels, remember the last event used in THAT channel:

```
User in #field-team-alpha shared file to "Hurricane Response"
    ↓
Next file share in #field-team-alpha
    ↓
Bot suggests "Hurricane Response" for this channel
```

**Stored in:** TeamsChannelMappings (soft/suggested mapping)

**Benefit:** Team-specific context preserved

**Downside:** Requires additional storage

---

### Option D: "Link This Channel" Prompt

After using an unlinked channel twice, offer to link it:

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│                                                                  │
│  You've shared 3 items from this channel to "Hurricane Response"│
│                                                                  │
│  Would you like to link this channel to that event?             │
│  This will enable automatic message bridging too.               │
│                                                                  │
│  [Not Now]  [Link Channel]                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Recommended Approach: Layered Resolution

Combine multiple strategies in priority order:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Event Resolution Logic                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Is this channel explicitly linked to an event?              │
│     YES → Use that event (no prompt needed for files)           │
│      │    For "promote", still show confirm dialog              │
│      │                                                           │
│  2. Does user have a "working event" preference?                │
│     YES → Pre-select that event, allow change                   │
│      │                                                           │
│  3. Was an event used in this channel recently?                 │
│     YES → Pre-select that event, allow change                   │
│      │                                                           │
│  4. How many active events does user have access to?            │
│     ONE  → Pre-select it, show simple confirm                   │
│     MANY → Show picker, ordered by recency/role                 │
│     ZERO → Show message: "No active events. Create one?"        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### API Endpoints Needed

```
GET /api/users/{userId}/events
    ?status=active
    &include=role,lastAccessed
    
Response:
{
  "events": [
    {
      "id": "abc123",
      "name": "Hurricane Response 2024",
      "status": "Active",
      "userRole": "Operations Chief",
      "lastAccessedAt": "2024-12-03T14:30:00Z"
    },
    ...
  ]
}
```

### Bot State Storage

```csharp
public class UserEventContext
{
    public Guid UserId { get; set; }
    public string TeamsUserId { get; set; }
    
    // Global preference
    public Guid? WorkingEventId { get; set; }
    public DateTime? WorkingEventSetAt { get; set; }
    
    // Per-channel memory
    public Dictionary<string, ChannelEventMemory> ChannelMemory { get; set; }
}

public class ChannelEventMemory
{
    public string ChannelId { get; set; }
    public Guid LastUsedEventId { get; set; }
    public DateTime LastUsedAt { get; set; }
    public int UsageCount { get; set; }  // For "link suggestion" threshold
}
```

### Adaptive Card for Event Selection

```json
{
  "type": "AdaptiveCard",
  "version": "1.4",
  "body": [
    {
      "type": "TextBlock",
      "text": "Select COBRA Event",
      "weight": "Bolder",
      "size": "Medium"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "eventId",
      "style": "expanded",
      "choices": [
        {
          "title": "🔴 Hurricane Response 2024 (Active)",
          "value": "abc123"
        },
        {
          "title": "🟡 Winter Storm Prep (Active)",
          "value": "def456"
        }
      ],
      "value": "abc123"
    },
    {
      "type": "Input.ChoiceSet",
      "id": "category",
      "label": "Category",
      "style": "compact",
      "choices": [
        { "title": "Operations", "value": "operations" },
        { "title": "Planning", "value": "planning" },
        { "title": "Logistics", "value": "logistics" },
        { "title": "Finance", "value": "finance" },
        { "title": "Documentation", "value": "documentation" }
      ],
      "value": "operations"
    }
  ],
  "actions": [
    {
      "type": "Action.Submit",
      "title": "Save to COBRA",
      "data": { "action": "saveFile" }
    }
  ]
}
```

---

## File Import: Automatic vs. Prompted

### Option A: Always Prompt

Every file attachment triggers a prompt to save to COBRA.

**Pros:** User always in control
**Cons:** Annoying for casual file sharing; prompt fatigue

### Option B: Only in Linked Channels

Files in linked channels auto-import; unlinked channels ignored.

**Pros:** Clear behavior; no spam
**Cons:** Misses valuable files shared in unlinked channels

### Option C: Opt-In Auto-Import (Recommended)

When linking a channel, user chooses import behavior:

```
┌─────────────────────────────────────────────────────────────────┐
│  Link Teams Channel to COBRA Event                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Channel: #hurricane-response                                    │
│  Event: Hurricane Response 2024                                  │
│                                                                  │
│  File Handling:                                                  │
│  ○ Don't import files automatically                             │
│  ● Import all files to COBRA (category: Documentation)          │
│  ○ Prompt me for each file                                      │
│                                                                  │
│  [Cancel]  [Link Channel]                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Option D: Smart Detection

Use file type and context to decide:

| File Type | Default Action |
|-----------|----------------|
| Images (.jpg, .png) | Auto-import to Documentation |
| PDFs | Prompt (might be forms vs. reference) |
| Office docs | Prompt |
| Videos | Prompt (large files) |
| ZIP/archives | Ignore unless prompted |

---

## "Promote to Logbook" Flow Detail

### Step 1: User Right-Clicks Message

```
Message: "Zone 3 evacuation complete. 47 residents at Jefferson HS."
         - Jane Smith, 14:32

[Right-click menu]
├── 📋 Copy
├── 📌 Pin
├── ↩️ Reply
├── ─────────────
├── 📝 Add to COBRA Logbook    ← User clicks this
└── 🔗 Link to COBRA Event
```

### Step 2: Bot Receives Action Invoke

```csharp
protected override async Task<MessagingExtensionActionResponse> OnTeamsMessagingExtensionFetchTaskAsync(
    ITurnContext<IInvokeActivity> turnContext,
    MessagingExtensionAction action,
    CancellationToken cancellationToken)
{
    // Extract the original message
    var messagePayload = action.MessagePayload;
    var messageText = messagePayload.Body.Content;
    var authorName = messagePayload.From.User.DisplayName;
    var timestamp = messagePayload.CreatedDateTime;
    
    // Determine event context
    var channelId = turnContext.Activity.Conversation.Id;
    var userId = turnContext.Activity.From.AadObjectId;
    
    var eventContext = await ResolveEventContextAsync(channelId, userId);
    
    // Build the task module (dialog)
    return CreatePromoteToLogbookDialog(messageText, authorName, timestamp, eventContext);
}
```

### Step 3: Show Dialog with Pre-Populated Content

```
┌─────────────────────────────────────────────────────────────────┐
│  Add to COBRA Logbook                                     [X]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│  Event:    [Hurricane Response 2024              ▼]             │
│  Category: [Operations                           ▼]             │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Zone 3 evacuation complete. 47 residents at Jefferson HS.│  │
│  │                                                            │  │
│  │ (You can edit this text before saving)                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ☑ Attribute to: Jane Smith (via Teams)                        │
│  ☑ Preserve timestamp: Dec 3, 2024 14:32 UTC                   │
│  ☐ Mark as significant entry                                    │
│                                                                  │
│  ───────────────────────────────────────────────────────────── │
│  Preview:                                                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📋 14:32 | Jane Smith (via Teams) | Operations            │  │
│  │ Zone 3 evacuation complete. 47 residents at Jefferson HS. │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│                              [Cancel]  [Add to Logbook]         │
└─────────────────────────────────────────────────────────────────┘
```

### Step 4: Save to COBRA

```csharp
protected override async Task<MessagingExtensionActionResponse> OnTeamsMessagingExtensionSubmitActionAsync(
    ITurnContext<IInvokeActivity> turnContext,
    MessagingExtensionAction action,
    CancellationToken cancellationToken)
{
    var data = JsonSerializer.Deserialize<PromoteToLogbookData>(action.Data);
    
    // Create logbook entry in COBRA
    var entry = new LogbookEntry
    {
        EventId = data.EventId,
        Category = data.Category,
        Content = data.Content,
        AuthorName = data.PreserveAuthor ? data.OriginalAuthor : currentUser.Name,
        AuthorNote = data.PreserveAuthor ? "(via Teams)" : null,
        Timestamp = data.PreserveTimestamp ? data.OriginalTimestamp : DateTime.UtcNow,
        Source = "Teams",
        SourceMessageId = data.OriginalMessageId,
        IsSignificant = data.MarkSignificant
    };
    
    await _logbookService.CreateEntryAsync(entry);
    
    // Post confirmation to channel
    var confirmCard = CreateConfirmationCard(entry);
    await turnContext.SendActivityAsync(MessageFactory.Attachment(confirmCard));
    
    return new MessagingExtensionActionResponse();
}
```

### Step 5: Confirmation in Channel

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│                                                                  │
│  ✅ Added to COBRA Logbook                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Event: Hurricane Response 2024                                  │
│  Entry #157 | Operations | 14:32 UTC                            │
│                                                                  │
│  "Zone 3 evacuation complete. 47 residents at Jefferson HS."    │
│                                                                  │
│  [View in COBRA]                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edge Cases

### User Has No COBRA Access

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│                                                                  │
│  ⚠️ Unable to save to COBRA                                     │
│                                                                  │
│  You don't appear to have an active COBRA account linked to     │
│  your Teams identity.                                            │
│                                                                  │
│  [Link COBRA Account]  [Learn More]                             │
└─────────────────────────────────────────────────────────────────┘
```

### User Has No Active Events

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│                                                                  │
│  ⚠️ No Active Events                                            │
│                                                                  │
│  You don't have any active COBRA events to save this to.        │
│                                                                  │
│  [Create New Event]  [View Closed Events]                       │
└─────────────────────────────────────────────────────────────────┘
```

### File Too Large

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 COBRA Communications                                         │
│                                                                  │
│  ⚠️ File Too Large                                              │
│                                                                  │
│  video_recording.mp4 (2.1 GB) exceeds the maximum size          │
│  for automatic import (100 MB).                                  │
│                                                                  │
│  [Upload via COBRA instead]                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Summary: How the Bot Knows Which Event

| Scenario | Resolution |
|----------|------------|
| Channel is linked | Use linked event (automatic) |
| User has working event set | Pre-select, allow change |
| Channel used for this event before | Pre-select, allow change |
| User has 1 active event | Pre-select, quick confirm |
| User has multiple events | Show picker, ordered by recency |
| User has no events | Prompt to create or error |

**The key insight:** Most users will be in linked channels during active events, making the experience mostly automatic. The fallback flows handle edge cases gracefully.

---

*Document Version: 1.0*  
*Last Updated: December 2024*

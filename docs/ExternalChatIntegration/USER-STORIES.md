# External Messaging Integration - User Stories (v2)

## Epic: Unified Event Communications

**Epic ID Prefix:** UC (Unified Communications)

**Epic Description:** As a COBRA platform, I need to provide unified event communications through a channel-based architecture that supports both internal COBRA conversations and bi-directional integration with external messaging platforms (starting with GroupMe), ensuring emergency responders can communicate through their preferred tools while maintaining situational awareness and audit compliance.

**Business Value:** Emergency responders often use consumer messaging apps (GroupMe, WhatsApp, Signal, Teams) for quick coordination. This integration bridges the gap between informal field communication and COBRA's formal incident management, ensuring all communications are captured for situational awareness, after-action reviews, and FEMA compliance. The channel-based architecture prevents accidental disclosure of internal coordination to external parties while enabling seamless monitoring of all communication streams.

---

## Feature: Channel Architecture & Defaults

### UC-001: Auto-Create Default Channels on Event Creation

**Title:** Auto-create Internal and Announcements channels when event is created

**As a** COBRA administrator  
**I want** default communication channels to be automatically created when I create an event  
**So that** my team has immediate, organized communication infrastructure

**Acceptance Criteria:**
- [ ] When a new event is created, an "Internal" channel is automatically created
- [ ] When a new event is created, an "Announcements" channel is automatically created
- [ ] Internal channel is accessible to all COBRA users with event access
- [ ] Internal channel messages never bridge to external platforms
- [ ] Announcements channel is read-only for standard users
- [ ] Announcements channel is writable only by users with Manage permissions
- [ ] Both channels appear in the sidebar accordion and full-page channel tabs
- [ ] Channel creation is logged for verification

**Dependencies:** None

---

### UC-002: Create External GroupMe Channel on Event Creation

**Title:** Optionally create a GroupMe channel when creating an event

**As a** COBRA administrator  
**I want** to optionally create a linked GroupMe group when I create an event  
**So that** external participants have an immediate communication channel tied to the event

**Acceptance Criteria:**
- [ ] Event creation form includes a checkbox: "Create GroupMe channel for external communications"
- [ ] When checked, a GroupMe group is created with name "COBRA: {Event Name}"
- [ ] A COBRA bot is registered in the GroupMe group for sending/receiving messages
- [ ] The webhook callback URL is configured to route messages to the correct event
- [ ] The GroupMe share URL is stored and accessible for inviting external participants
- [ ] An external channel mapping record is created linking the event to the GroupMe group
- [ ] The channel appears in the sidebar accordion with a GroupMe icon indicator
- [ ] If checkbox is unchecked, no external channel is created (can be added later)
- [ ] If GroupMe API fails, the event creation still succeeds (graceful degradation)
- [ ] Channel creation is logged for verification

**Dependencies:** GroupMe API credentials configured in application settings

---

### UC-003: Associate Existing GroupMe Group with Event

**Title:** Link an existing GroupMe group to a COBRA event

**As an** event administrator  
**I want** to associate an existing GroupMe group with my event  
**So that** I can integrate communications from groups that were created outside of COBRA

**Acceptance Criteria:**
- [ ] Admin can enter an existing GroupMe group ID to associate with an event
- [ ] System validates the group ID exists and is accessible
- [ ] A COBRA bot is registered in the existing group for sending/receiving messages
- [ ] The webhook callback URL is configured for the existing group
- [ ] Channel is named "GroupMe: {Original Group Name}" (platform prefix)
- [ ] Channel displays a GroupMe icon indicator distinguishing it from COBRA-created channels
- [ ] User is presented with option to import recent message history (default: enabled)
- [ ] Configurable lookback period (default: 7 days, max: 30 days)
- [ ] Historical messages are imported with their original timestamps
- [ ] Historical messages are visually consistent with real-time external messages
- [ ] Progress indicator shown during history import
- [ ] Import runs asynchronously; association completes immediately
- [ ] The action is logged for verification
- [ ] Error handling for invalid group IDs or permission issues

**Dependencies:** GroupMe API credentials configured, user has access to the GroupMe group

**Notes:** Platform prefix + icon approach allows future evolution to icon-only display.

---

### UC-004: Manually Create Internal Channel

**Title:** Create additional internal channels for an event

**As a** user with Manage permissions  
**I want** to create additional internal channels  
**So that** I can organize conversations by topic, section, or team

**Acceptance Criteria:**
- [ ] User with Manage permissions can create new internal channels
- [ ] Channel name is required and must be unique within the event
- [ ] Optional channel description field
- [ ] New channel appears in sidebar accordion and full-page tabs
- [ ] New internal channels never bridge to external platforms
- [ ] Channel creation is logged for verification

**Dependencies:** UC-001

**Notes:** Examples: "Operations", "Logistics", "Safety", "Structure Fire - 123 Main St"

---

### UC-005: Manually Create External GroupMe Channel

**Title:** Create a new GroupMe channel for an existing event

**As a** user with Manage permissions  
**I want** to create a new linked GroupMe group for an existing event  
**So that** I can add external communication channels as needs evolve

**Acceptance Criteria:**
- [ ] User with Manage permissions can create new external GroupMe channels
- [ ] User can provide a custom group name (defaults to "COBRA: {Event Name}")
- [ ] System creates the GroupMe group, bot, and channel mapping
- [ ] The channel appears with GroupMe icon indicator
- [ ] Share URL is immediately available for distribution
- [ ] Success/failure feedback is displayed to the user
- [ ] Channel creation is logged for verification

**Dependencies:** UC-001, GroupMe API credentials configured

---

### UC-006: View Channel Connection Status

**Title:** View all channels and their connection status for an event

**As an** Incident Commander  
**I want** to see all communication channels and their status  
**So that** I know where communications are flowing

**Acceptance Criteria:**
- [ ] Channel list displays all internal and external channels
- [ ] Each channel shows: name, type (internal/external), platform icon (if external)
- [ ] External channels show connection status (connected/disconnected)
- [ ] External channels show share URL for copying/distribution
- [ ] Users can see when each channel was created
- [ ] Channel list is accessible from both sidebar and full-page views

**Dependencies:** UC-001

---

### UC-007: Disconnect External Channel

**Title:** Disconnect an external channel from an event

**As a** user with Manage permissions  
**I want** to disconnect an external channel from an event  
**So that** I can stop message flow when no longer needed

**Acceptance Criteria:**
- [ ] User with Manage permissions can deactivate an external channel
- [ ] Option to archive the external group on the platform (optional)
- [ ] Deactivated channels stop receiving/sending messages
- [ ] Historical messages from the channel remain in COBRA
- [ ] Deactivated channel visual indicator (grayed out, "Disconnected" badge)
- [ ] Option to reconnect a previously disconnected channel
- [ ] The action is logged for verification

**Dependencies:** UC-002 or UC-003

---

### UC-008: Delete/Archive Internal Channel

**Title:** Delete or archive an internal channel

**As a** user with Manage permissions  
**I want** to delete or archive internal channels that are no longer needed  
**So that** the channel list remains organized and relevant

**Acceptance Criteria:**
- [ ] User with Manage permissions can archive an internal channel
- [ ] Archived channels are hidden from active channel list
- [ ] Archived channel messages remain accessible for audit/review
- [ ] Default channels (Internal, Announcements) cannot be archived
- [ ] Confirmation dialog before archiving
- [ ] The action is logged for verification

**Dependencies:** UC-004

---

## Feature: Bi-Directional Chat Integration

### UC-009: Receive External Messages in COBRA

**Title:** Display external platform messages in COBRA channels

**As a** COBRA user  
**I want** to see messages from external platforms in their respective COBRA channels  
**So that** I have visibility into all event communications

**Acceptance Criteria:**
- [ ] Messages posted in external groups appear in their linked COBRA channel in real-time
- [ ] External messages display the sender's external platform display name
- [ ] External messages are visually distinguished (platform icon, "via GroupMe" indicator)
- [ ] Message timestamps reflect when sent on the external platform
- [ ] Image attachments from external platforms are displayed inline
- [ ] Bot messages from external platforms are filtered out (prevent loops)
- [ ] Duplicate webhook deliveries are handled (deduplication)
- [ ] Inbound messages are logged for verification

**Dependencies:** UC-002 or UC-003, Webhook endpoint configured

---

### UC-010: Send Channel Messages to External Platform

**Title:** Send COBRA channel messages to linked external groups

**As a** COBRA user  
**I want** my messages in external-linked channels to be sent to the external group  
**So that** external participants see my communications

**Acceptance Criteria:**
- [ ] Messages sent in external-linked channels are posted to the linked external group
- [ ] Messages are formatted as "[Sender Name] Message content"
- [ ] Failed sends to external platform do not block the COBRA message from being saved
- [ ] Failed sends are logged for troubleshooting
- [ ] Messages sent in Internal channel are never sent externally
- [ ] Messages sent in Announcements channel are sent to ALL external channels

**Dependencies:** UC-002 or UC-003, UC-009

---

### UC-011: Real-Time Message Updates via SignalR

**Title:** Receive real-time chat updates without page refresh

**As a** COBRA user  
**I want** to see new messages appear automatically across all channels  
**So that** I don't have to refresh to see the latest communications

**Acceptance Criteria:**
- [ ] SignalR connection is established when user opens chat
- [ ] New messages appear instantly in their respective channels
- [ ] New messages from external webhooks appear instantly
- [ ] Unified view updates in real-time
- [ ] Connection status is indicated in the UI
- [ ] Graceful reconnection on connection loss
- [ ] Unread message indicators update in real-time per channel

**Dependencies:** UC-009, UC-010

---

## Feature: Chat User Interface - Sidebar

### UC-012: Channel Accordion Sidebar

**Title:** Access event channels via accordion sidebar

**As a** COBRA user  
**I want** to access event channels from an accordion-style sidebar  
**So that** I can monitor and participate in communications without leaving my current page

**Acceptance Criteria:**
- [ ] Chat sidebar is accessible from main navigation or event header
- [ ] Each channel is displayed as an expandable accordion section
- [ ] Expanding a channel shows recent messages and compose input
- [ ] Compose input is contextual - sending goes to the expanded channel
- [ ] Internal channels display without platform indicator
- [ ] External channels display platform icon (e.g., GroupMe icon)
- [ ] Announcements channel shows visual indicator of broadcast behavior
- [ ] Unread message count badge per channel
- [ ] Sidebar can be collapsed/hidden
- [ ] Sidebar state persists during session

**Dependencies:** UC-001, UC-009

---

### UC-013: Unified View in Sidebar

**Title:** View all channel messages in unified stream

**As an** Incident Commander  
**I want** to see all messages across all channels in a single unified view  
**So that** I can maintain situational awareness without switching channels

**Acceptance Criteria:**
- [ ] Unified view accordion/section shows messages from all channels
- [ ] Each message displays source channel indicator (name and/or icon)
- [ ] Unified view is read-only by default (no direct compose)
- [ ] Reply-in-context: clicking a message opens compose in that message's source channel
- [ ] User with Manage permissions can remove channels from unified view
- [ ] Channel visibility preferences persist per user
- [ ] Messages are displayed in chronological order across all channels
- [ ] Unified view updates in real-time

**Dependencies:** UC-012

---

## Feature: Chat User Interface - Full Page

### UC-014: Full-Page Chat View with Channel Tabs

**Title:** Full-page chat view with tabbed channels

**As a** COBRA user  
**I want** a dedicated full-page chat view with channel tabs  
**So that** I can focus on communications during active incidents

**Acceptance Criteria:**
- [ ] Dedicated route/page for event chat (e.g., /events/{id}/chat)
- [ ] Channels displayed as tabs across the top
- [ ] Tab icons indicate channel type (internal, external platform, announcements)
- [ ] Active tab shows full message history with compose input
- [ ] Compose input sends to the active tab's channel
- [ ] Unified view available as a tab option
- [ ] Load earlier messages via pagination/infinite scroll
- [ ] Unread indicators on inactive tabs
- [ ] Navigation back to other event pages

**Dependencies:** UC-012

---

### UC-015: Announcements Channel Broadcast Behavior

**Title:** Announcements channel broadcasts to all channels

**As a** user with Manage permissions  
**I want** messages I post in Announcements to be broadcast to all channels including external  
**So that** I can send critical information to everyone with a single message

**Acceptance Criteria:**
- [ ] Only users with Manage permissions can compose in Announcements channel
- [ ] Clear visual indicator that messages will broadcast to all channels
- [ ] Confirmation prompt before sending (optional, configurable)
- [ ] Message is saved to Announcements channel
- [ ] Message is cross-posted to all active internal channels
- [ ] Message is sent to all connected external platform groups
- [ ] Cross-posted messages show "via Announcements" indicator in other channels
- [ ] Failed external sends are logged but don't block internal delivery

**Dependencies:** UC-001, UC-010

---

### UC-016: External Message Visual Indicators

**Title:** Visually distinguish external messages and channels

**As a** COBRA user  
**I want** to easily identify external channels and messages  
**So that** I understand the source and destination of communications

**Acceptance Criteria:**
- [ ] External channels display platform icon in sidebar accordion header
- [ ] External channels display platform icon on full-page tab
- [ ] External messages show platform badge/icon inline
- [ ] External messages show "via {Platform}" text indicator
- [ ] External sender names are clearly labeled (not confused with COBRA users)
- [ ] COBRA-created external channels (COBRA: {name}) distinguished from associated channels (GroupMe: {name})

**Dependencies:** UC-009

---

## Feature: Message Management

### UC-017: Edit Own Messages

**Title:** Edit my own chat messages

**As a** COBRA user  
**I want** to edit messages I've sent  
**So that** I can correct mistakes or update information

**Acceptance Criteria:**
- [ ] Users can edit their own messages
- [ ] Edit history is preserved (previous versions accessible)
- [ ] Edited messages show "edited" indicator with timestamp
- [ ] Edit is reflected in real-time for other users via SignalR
- [ ] Edits to messages in external-linked channels are noted but NOT synced to external platform (GroupMe doesn't support edit)
- [ ] Edit action is logged for verification

**Dependencies:** UC-011

**Notes:** External platforms generally don't support edit - COBRA edit is local only.

---

### UC-018: Delete Own Messages (Soft Delete)

**Title:** Delete my own chat messages

**As a** COBRA user  
**I want** to delete messages I've sent  
**So that** I can remove erroneous or inappropriate content

**Acceptance Criteria:**
- [ ] Users can delete their own messages
- [ ] Delete is a soft delete - message content is preserved in database
- [ ] Deleted messages show "message deleted" placeholder in UI
- [ ] Delete is reflected in real-time for other users via SignalR
- [ ] Deletes in external-linked channels are noted but NOT synced to external platform
- [ ] Delete action is logged for verification
- [ ] Users with Manage permissions can view deleted message content

**Dependencies:** UC-011

---

### UC-019: Admin Message Management

**Title:** Manage messages as administrator

**As a** user with Manage permissions  
**I want** to manage messages across channels  
**So that** I can maintain appropriate communications and handle compliance needs

**Acceptance Criteria:**
- [ ] Users with Manage permissions can view deleted message content
- [ ] Users with Manage permissions can permanently delete individual messages
- [ ] Users with Manage permissions can bulk delete/clear messages in a channel
- [ ] Users with Manage permissions can delete other users' messages (soft delete)
- [ ] Permanent delete removes message from database (audit log entry retained)
- [ ] Bulk clear shows confirmation with message count
- [ ] All admin actions are logged for verification

**Dependencies:** UC-017, UC-018

---

## Feature: Message Promotion to Logbook

### UC-020: Promote Chat Message to Logbook Entry

**Title:** Create logbook entry from any chat message

**As an** Operations Section Chief  
**I want** to promote important chat messages to formal logbook entries  
**So that** critical information is captured in the official event record

**Acceptance Criteria:**
- [ ] Context menu action "Create Logbook Entry" available on any chat message
- [ ] Action opens a dialog to add notes and select category
- [ ] Original message content is preserved with sender attribution
- [ ] For external messages, attribution shows "{Name} (via {Platform})"
- [ ] Link is maintained between chat message and logbook entry
- [ ] Chat message shows indicator that it was promoted (e.g., "In Logbook" badge)
- [ ] The action is logged for verification

**Dependencies:** UC-009, Logbook feature exists

---

### UC-021: View Promoted Message Status

**Title:** See which chat messages have been promoted to logbook

**As a** COBRA user  
**I want** to see which chat messages have already been added to the logbook  
**So that** I don't create duplicate entries

**Acceptance Criteria:**
- [ ] Promoted messages display a visual indicator (badge, icon, or text)
- [ ] Indicator is visible without opening context menu
- [ ] Click indicator to navigate to associated logbook entry (future enhancement)

**Dependencies:** UC-020

---

## Feature: Configuration & Administration

### UC-022: Configure External Platform API Credentials

**Title:** Configure external platform integration settings

**As a** system administrator  
**I want** to configure external platform API credentials  
**So that** integrations can communicate with external platforms

**Acceptance Criteria:**
- [ ] GroupMe Access Token configurable via application settings
- [ ] Webhook base URL configurable (for different environments)
- [ ] Configuration can be updated without code deployment
- [ ] Invalid/missing configuration results in graceful error messages
- [ ] Future: Support for additional platform credentials (Teams, Signal)

**Dependencies:** None (infrastructure setup)

---

### UC-023: Webhook Health Check

**Title:** Verify webhook endpoint is accessible

**As a** system administrator  
**I want** a health check endpoint for the webhook receiver  
**So that** I can verify integrations are properly configured

**Acceptance Criteria:**
- [ ] GET /api/webhooks/health returns 200 OK when service is running
- [ ] Response includes timestamp for freshness verification
- [ ] Can be used by monitoring tools

**Dependencies:** None

---

## Non-Functional Requirements

### UC-024: Webhook Performance

**Title:** Handle webhook requests efficiently

**As the** COBRA system  
**I want** webhook requests processed quickly  
**So that** external platforms don't retry or timeout

**Acceptance Criteria:**
- [ ] Webhook endpoint returns 200 OK within 1 second
- [ ] Message processing happens asynchronously after response
- [ ] Failed processing doesn't affect webhook response
- [ ] Errors are logged for troubleshooting

**Dependencies:** UC-009

---

### UC-025: External API Resilience

**Title:** Handle external platform API failures gracefully

**As a** COBRA user  
**I want** the system to handle external API failures gracefully  
**So that** my COBRA experience isn't disrupted by external issues

**Acceptance Criteria:**
- [ ] External API timeouts don't block COBRA operations
- [ ] Failed outbound messages are logged but don't fail the COBRA save
- [ ] Visual indicator when external channel has connectivity issues
- [ ] Retry logic for transient failures (future enhancement)

**Dependencies:** UC-010

---

## Future Enhancements

*These stories are documented for future consideration and are not part of the core POC scope.*

### UC-FUT-001: Listen-Only External Channels

**Title:** Create listen-only external channel connections

**As an** event administrator  
**I want** to create a listen-only connection to an external group  
**So that** I can monitor external communications without sending COBRA messages to that group

**Acceptance Criteria:**
- [ ] Option to mark external channel as "listen-only" during creation/association
- [ ] Listen-only channels receive external messages but don't send COBRA messages
- [ ] Visual indicator distinguishes listen-only from bi-directional channels
- [ ] Users can still compose in the COBRA channel (messages stay in COBRA only)
- [ ] Can convert listen-only to bi-directional (and vice versa)

**Dependencies:** UC-003

**Status:** Future Enhancement

---

### UC-FUT-002: Message Reactions and Acknowledgments

**Title:** React to and acknowledge chat messages

**As a** COBRA user  
**I want** to react to messages with acknowledgments or emoji  
**So that** I can quickly indicate receipt or agreement without typing a response

**Acceptance Criteria:**
- [ ] Users can add reactions to messages (thumbs up, checkmark, etc.)
- [ ] Reactions are visible to all users in the channel
- [ ] Reaction counts displayed on messages
- [ ] "Acknowledged" reaction serves as read receipt for critical messages
- [ ] Reactions sync in real-time via SignalR
- [ ] Reactions do NOT sync to external platforms

**Dependencies:** UC-011

**Status:** Future Enhancement

---

### UC-FUT-003: Mobile-Optimized Chat Interface

**Title:** Mobile-responsive chat experience

**As a** COBRA user on a mobile device  
**I want** a mobile-optimized chat interface  
**So that** I can communicate effectively from the field

**Acceptance Criteria:**
- [ ] Chat interface is fully functional on mobile devices
- [ ] Touch-friendly compose and message interactions
- [ ] Swipe gestures for channel navigation
- [ ] Push notifications for new messages (future)
- [ ] Offline message queuing (future)

**Dependencies:** UC-012, UC-014

**Status:** Future Consideration

---

### UC-FUT-004: Microsoft Teams Integration

**Title:** Integrate with Microsoft Teams channels

**As a** COBRA administrator  
**I want** to connect COBRA events to Microsoft Teams channels  
**So that** organizations using M365 can integrate their existing communication tools

**Acceptance Criteria:**
- [ ] Create linked Teams channel on event creation (optional)
- [ ] Associate existing Teams channel with event
- [ ] Bi-directional message flow (same as GroupMe)
- [ ] Teams icon indicator for Teams channels
- [ ] Support for Teams webhook-based integration

**Dependencies:** UC-001, Teams API configuration

**Status:** Future Enhancement - Priority after GroupMe POC

---

## Summary

| Category | Stories |
|----------|---------|
| Channel Architecture & Defaults | UC-001 to UC-008 |
| Bi-Directional Chat Integration | UC-009 to UC-011 |
| Chat UI - Sidebar | UC-012 to UC-013 |
| Chat UI - Full Page | UC-014 to UC-016 |
| Message Management | UC-017 to UC-019 |
| Message Promotion | UC-020, UC-021 |
| Configuration | UC-022, UC-023 |
| Non-Functional | UC-024, UC-025 |
| **Core Total** | **25 stories** |
| Future Enhancements | UC-FUT-001 to UC-FUT-004 |

---

## Import Notes

### For GitHub Issues

Each user story can be created as an issue with:
- **Title:** UC-XXX: {Story Title}
- **Labels:** `enhancement`, `chat`, `channels`, `poc`
- **Milestone:** Event Communications POC
- **Future stories:** Add label `future-enhancement`

### For Azure DevOps

Each user story maps to a Work Item:
- **Work Item Type:** User Story
- **Title:** {Story Title}
- **Acceptance Criteria:** Copy from above
- **Tags:** `chat`, `channels`, `poc`, `groupme`
- **Future stories:** Add tag `future-enhancement`

---

## Suggested Implementation Phases

### Phase 1 - Foundation
*Core channel infrastructure and internal chat*

- UC-001: Auto-Create Default Channels on Event Creation
- UC-022: Configure External Platform API Credentials
- UC-023: Webhook Health Check
- UC-012: Channel Accordion Sidebar (internal channels only)
- UC-011: Real-Time Message Updates via SignalR

### Phase 2 - External Integration
*GroupMe bi-directional messaging*

- UC-002: Create External GroupMe Channel on Event Creation
- UC-009: Receive External Messages in COBRA
- UC-010: Send Channel Messages to External Platform
- UC-016: External Message Visual Indicators
- UC-024: Webhook Performance
- UC-025: External API Resilience

### Phase 3 - Full Chat Experience
*Complete UI and unified view*

- UC-014: Full-Page Chat View with Channel Tabs
- UC-013: Unified View in Sidebar
- UC-015: Announcements Channel Broadcast Behavior
- UC-004: Manually Create Internal Channel
- UC-006: View Channel Connection Status

### Phase 4 - Channel Management
*Advanced channel operations*

- UC-003: Associate Existing GroupMe Group with Event
- UC-005: Manually Create External GroupMe Channel
- UC-007: Disconnect External Channel
- UC-008: Delete/Archive Internal Channel

### Phase 5 - Message Management & Promotion
*Edit, delete, and logbook integration*

- UC-017: Edit Own Messages
- UC-018: Delete Own Messages (Soft Delete)
- UC-019: Admin Message Management
- UC-020: Promote Chat Message to Logbook Entry
- UC-021: View Promoted Message Status

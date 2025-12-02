# External Messaging Integration - User Stories

## Epic: External Messaging Integration

**Epic Description:** As a COBRA platform, I need to integrate with external group messaging platforms (starting with GroupMe) so that emergency responders can communicate through their preferred tools while maintaining a unified view in COBRA.

**Business Value:** Emergency responders often use consumer messaging apps (GroupMe, WhatsApp, Signal) for quick coordination. This integration bridges the gap between informal field communication and COBRA's formal incident management, ensuring all communications are captured for situational awareness, after-action reviews, and FEMA compliance.

---

## Feature: External Channel Management

### US-001: Auto-Create GroupMe Group on Event Creation

**Title:** Auto-create GroupMe group when named event is created

**As a** COBRA administrator  
**I want** a GroupMe group to be automatically created when I create a named event  
**So that** external participants have an immediate communication channel tied to the event

**Acceptance Criteria:**
- [ ] When a new named event is created, a corresponding GroupMe group is automatically created
- [ ] The GroupMe group name follows the convention: "COBRA: {Event Name}"
- [ ] A COBRA bot is registered in the GroupMe group for sending/receiving messages
- [ ] The webhook callback URL is configured to route messages to the correct event
- [ ] The GroupMe share URL is stored and accessible for inviting external participants
- [ ] An ExternalChannelMapping record is created linking the event to the GroupMe group
- [ ] The action is logged for verification
- [ ] If GroupMe API fails, the event creation still succeeds (graceful degradation)

**Dependencies:** GroupMe API credentials configured in application settings

---

### US-002: Associate Existing GroupMe Group with Event

**Title:** Link an existing GroupMe group to a COBRA event

**As an** event administrator  
**I want** to associate an existing GroupMe group with my event  
**So that** I can integrate communications from groups that were created outside of COBRA

**Acceptance Criteria:**
- [ ] Admin can enter an existing GroupMe group ID to associate with an event
- [ ] System validates the group ID exists and is accessible
- [ ] A COBRA bot is registered in the existing group for sending/receiving messages
- [ ] The webhook callback URL is configured for the existing group
- [ ] An ExternalChannelMapping record is created linking the event to the group
- [ ] User is presented with option to import recent message history (default: enabled)
- [ ] Configurable lookback period (default: 7 days, max: 30 days)
- [ ] Historical messages are imported with their original timestamps
- [ ] Historical messages are visually consistent with real-time external messages
- [ ] Progress indicator shown during history import
- [ ] Import runs asynchronously; association completes immediately
- [ ] The action is logged for verification
- [ ] Error handling for invalid group IDs or permission issues

**Dependencies:** GroupMe API credentials configured, user has access to the GroupMe group

**Notes:** This supports scenarios where field teams already have a GroupMe group established before COBRA event creation.

---

### US-003: Manually Create GroupMe Group for Existing Event

**Title:** Manually create a new GroupMe group for an existing event

**As an** event administrator  
**I want** to manually create a GroupMe group connection for an existing event  
**So that** I can add external messaging to events created before this feature existed

**Acceptance Criteria:**
- [ ] Admin can trigger GroupMe group creation from event settings
- [ ] Admin can provide a custom group name (optional, defaults to event name)
- [ ] System creates the group, bot, and channel mapping
- [ ] Success/failure feedback is displayed to the user
- [ ] The action is logged for verification

**Dependencies:** US-001

---

### US-004: View External Channel Connection Status

**Title:** View connected external messaging channels for an event

**As an** Incident Commander  
**I want** to see which external messaging platforms are connected to my event  
**So that** I know where external communications are flowing

**Acceptance Criteria:**
- [ ] The chat UI displays indicators showing connected external channels
- [ ] Each connected channel shows: platform name, group name, connection status
- [ ] The GroupMe share URL is accessible for copying/sharing with external participants
- [ ] Users can see when the channel was connected

**Dependencies:** US-001 or US-002

---

### US-005: Disconnect External Channel

**Title:** Disconnect a GroupMe group from an event

**As an** event administrator  
**I want** to disconnect a GroupMe group from an event  
**So that** I can stop message flow when no longer needed

**Acceptance Criteria:**
- [ ] Admin can deactivate an external channel mapping
- [ ] Option to archive the GroupMe group on the platform (optional)
- [ ] Deactivated channels stop receiving/sending messages
- [ ] Historical messages from the channel remain in COBRA
- [ ] The action is logged for verification

**Dependencies:** US-001 or US-002

---

## Feature: Bi-Directional Chat Integration

### US-006: Receive GroupMe Messages in COBRA Chat

**Title:** Display GroupMe messages in COBRA event chat

**As a** COBRA user  
**I want** to see messages from GroupMe in the COBRA chat interface  
**So that** I have a unified view of all event communications

**Acceptance Criteria:**
- [ ] Messages posted in GroupMe appear in COBRA's event chat in real-time
- [ ] External messages display the sender's GroupMe display name
- [ ] External messages are visually distinguished from native COBRA messages
- [ ] External messages show a platform indicator (e.g., "GroupMe" chip/badge)
- [ ] Message timestamps reflect when sent on GroupMe
- [ ] Image attachments from GroupMe are displayed inline
- [ ] Bot messages from GroupMe are filtered out (prevent loops)
- [ ] Duplicate webhook deliveries are handled (deduplication)
- [ ] Inbound messages are logged for verification

**Dependencies:** US-001 or US-002, Webhook endpoint configured

---

### US-007: Send COBRA Messages to GroupMe

**Title:** Broadcast COBRA chat messages to connected GroupMe groups

**As a** COBRA user  
**I want** my chat messages to be sent to the connected GroupMe group  
**So that** external participants see my communications

**Acceptance Criteria:**
- [ ] Messages sent in COBRA chat are automatically posted to connected GroupMe groups
- [ ] Messages are formatted as "[Sender Name] Message content"
- [ ] Failed sends to GroupMe do not block the COBRA message from being saved
- [ ] Failed sends are logged for troubleshooting
- [ ] Messages are sent to all active external channels for the event

**Dependencies:** US-001 or US-002, US-006

---

### US-008: Real-Time Message Updates via SignalR

**Title:** Receive real-time chat updates without page refresh

**As a** COBRA user  
**I want** to see new messages (both native and external) appear automatically  
**So that** I don't have to refresh to see the latest communications

**Acceptance Criteria:**
- [ ] SignalR connection is established when user opens chat
- [ ] New native COBRA messages appear instantly for all connected users
- [ ] New external messages (from webhooks) appear instantly for all connected users
- [ ] Connection status is indicated in the UI
- [ ] Graceful reconnection on connection loss

**Dependencies:** US-006, US-007

---

## Feature: Chat UI

### US-009: Chat Flyout Sidebar

**Title:** Access event chat via flyout sidebar

**As a** COBRA user  
**I want** to access the event chat from a flyout sidebar  
**So that** I can monitor communications without leaving my current page

**Acceptance Criteria:**
- [ ] Chat icon/button is visible in the main navigation or event header
- [ ] Clicking the button opens a flyout sidebar with the chat interface
- [ ] Flyout can be closed without losing chat state
- [ ] Unread message indicator shows count of new messages
- [ ] Flyout is responsive and works on tablet-sized screens

**Dependencies:** US-006, US-007, US-008

---

### US-010: Dedicated Chat Page

**Title:** Full-page chat view for extended conversations

**As a** COBRA user  
**I want** a dedicated full-page chat view  
**So that** I can focus on communications during active incidents

**Acceptance Criteria:**
- [ ] Dedicated route/page for event chat (e.g., /events/{id}/chat)
- [ ] Full message history with infinite scroll/pagination
- [ ] Load earlier messages button/trigger
- [ ] All flyout functionality available in full-page view
- [ ] Navigation back to other event pages

**Dependencies:** US-009

---

### US-011: External Message Visual Indicators

**Title:** Visually distinguish external messages in chat

**As a** COBRA user  
**I want** to easily identify which messages came from external platforms  
**So that** I understand the source of each communication

**Acceptance Criteria:**
- [ ] External messages have a distinct visual treatment (subtle background tint or border)
- [ ] Platform icon or badge displayed (e.g., GroupMe logo/icon)
- [ ] Platform name shown in message metadata (e.g., "via GroupMe")
- [ ] External sender avatars use platform-specific colors
- [ ] Hover/tooltip shows additional external message details

**Dependencies:** US-006

---

## Feature: Message Promotion to Logbook

### US-012: Promote Chat Message to Logbook Entry

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

**Dependencies:** US-006, Logbook feature exists

---

### US-013: View Promoted Message Status

**Title:** See which chat messages have been promoted to logbook

**As a** COBRA user  
**I want** to see which chat messages have already been added to the logbook  
**So that** I don't create duplicate entries

**Acceptance Criteria:**
- [ ] Promoted messages display a visual indicator (badge, icon, or text)
- [ ] Indicator is visible without opening context menu
- [ ] Users can click to navigate to the associated logbook entry (future enhancement)

**Dependencies:** US-012

---

## Feature: Configuration & Administration

### US-014: Configure GroupMe API Credentials

**Title:** Configure GroupMe integration settings

**As a** system administrator  
**I want** to configure GroupMe API credentials  
**So that** the integration can communicate with GroupMe

**Acceptance Criteria:**
- [ ] GroupMe Access Token configurable via application settings
- [ ] Webhook base URL configurable (for different environments)
- [ ] Configuration can be updated without code deployment
- [ ] Invalid/missing configuration results in graceful error messages

**Dependencies:** None (infrastructure setup)

---

### US-015: Webhook Health Check

**Title:** Verify webhook endpoint is accessible

**As a** system administrator  
**I want** a health check endpoint for the webhook receiver  
**So that** I can verify the integration is properly configured

**Acceptance Criteria:**
- [ ] GET /api/webhooks/health returns 200 OK when service is running
- [ ] Response includes timestamp for freshness verification
- [ ] Can be used by monitoring tools

**Dependencies:** None

---

## Non-Functional Requirements

### US-016: Webhook Performance

**Title:** Handle webhook requests efficiently

**As the** COBRA system  
**I want** webhook requests processed quickly  
**So that** GroupMe doesn't retry or timeout

**Acceptance Criteria:**
- [ ] Webhook endpoint returns 200 OK within 1 second
- [ ] Message processing happens asynchronously after response
- [ ] Failed processing doesn't affect webhook response
- [ ] Errors are logged for troubleshooting

**Dependencies:** US-006

---

### US-017: External API Resilience

**Title:** Handle GroupMe API failures gracefully

**As a** COBRA user  
**I want** the system to handle GroupMe API failures gracefully  
**So that** my COBRA experience isn't disrupted by external issues

**Acceptance Criteria:**
- [ ] GroupMe API timeouts don't block COBRA operations
- [ ] Failed outbound messages are logged but don't fail the COBRA save
- [ ] Users are notified of persistent connection issues (future enhancement)
- [ ] Retry logic for transient failures (future enhancement)

**Dependencies:** US-007

---

## Summary

| Category | Stories |
|----------|---------|
| External Channel Management | US-001 to US-005 |
| Bi-Directional Chat | US-006 to US-008 |
| Chat UI | US-009 to US-011 |
| Message Promotion | US-012, US-013 |
| Configuration | US-014, US-015 |
| Non-Functional | US-016, US-017 |
| **Total** | **17 stories** |

---

## Import Notes

### For GitHub Issues

Each user story can be created as an issue with:
- **Title:** US-XXX: {Story Title}
- **Labels:** `enhancement`, `external-messaging`, `poc`
- **Milestone:** External Messaging POC

### For Azure DevOps

Each user story maps to a Work Item:
- **Work Item Type:** User Story
- **Title:** {Story Title}
- **Acceptance Criteria:** Copy from above
- **Tags:** `external-messaging`, `poc`, `groupme`

### Suggested Implementation Order

**Phase 1 - Foundation:**
- US-014: Configure GroupMe API Credentials
- US-015: Webhook Health Check
- US-001: Auto-Create GroupMe Group on Event Creation
- US-006: Receive GroupMe Messages in COBRA Chat

**Phase 2 - Core Chat:**
- US-007: Send COBRA Messages to GroupMe
- US-008: Real-Time Message Updates via SignalR
- US-011: External Message Visual Indicators
- US-009: Chat Flyout Sidebar

**Phase 3 - Channel Management:**
- US-002: Associate Existing GroupMe Group with Event
- US-003: Manually Create GroupMe Group for Existing Event
- US-004: View External Channel Connection Status
- US-005: Disconnect External Channel

**Phase 4 - Promotion & Polish:**
- US-010: Dedicated Chat Page
- US-012: Promote Chat Message to Logbook Entry
- US-013: View Promoted Message Status
- US-016: Webhook Performance
- US-017: External API Resilience

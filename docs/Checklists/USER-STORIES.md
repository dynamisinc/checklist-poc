# COBRA Checklist Tool - User Stories

> **Last Updated:** 2025-12-03
> **Status:** Active
> **Scope:** Checklist tool specific features
> **Version:** 3.0.0 - Added CHK-XX story prefixes, new import/integration stories

## Overview

This document contains user stories specific to the **Checklist Tool**. For platform-level features that apply across all tools, see:

- [Core Platform User Stories](../Core/USER-STORIES.md) - Authentication, permissions, observability
- [Core Platform NFRs](../Core/NFR.md) - Performance, accessibility, security standards
- [Checklist Roadmap](./CHECKLIST_ROADMAP.md) - Medium-term, long-term, and future vision stories

### Cross-References to Core Platform

The following features are defined at the platform level and extended by this tool:

| Core Story | Checklist Extension |
|------------|---------------------|
| Core-1: Role-Based Permissions | CHK-2.6 adds ownership-based archive permission for Contributors |
| Core-2: Profile Management | Used for position context in smart suggestions (CHK-1.7) |
| Core-4: Readonly Visual Indicators | Applied to checklist items, buttons, and forms |
| Core-5: Application Insights | Checklist events: `ChecklistCreated`, `ItemCompleted`, `TemplateCreated` |
| Core-9: Demo Seed Data | 3 sample templates (Safety, ICS Forms, Logistics) |

### Role-Based Navigation (Checklist-Specific)

Navigation items visible by role:

| Navigation Item | Readonly | Contributor | Manage |
|-----------------|----------|-------------|--------|
| My Checklists | ✅ | ✅ | ✅ |
| Template Library | ❌ | ❌ | ✅ |
| Item Library | ❌ | ❌ | ✅ |
| Analytics | ❌ | ❌ | ✅ |

**Key UX Principle:** Contributors see simplified navigation (only "My Checklists") with the "Create Checklist" button providing direct access to templates via smart suggestions - no need to browse the full Template Library.

---

## Story Prefix Convention

All checklist stories use the **CHK-X.Y** prefix where:
- **X** = Epic number (1-12+)
- **Y** = Story number within epic

| Epic | Name | Stories |
|------|------|---------|
| 1 | Template Management | CHK-1.1 - CHK-1.9 |
| 2 | Instance Management | CHK-2.0 - CHK-2.7 |
| 3 | Item Interaction | CHK-3.1 - CHK-3.7 |
| 4 | Permissions & Access | CHK-4.1 - CHK-4.4 |
| 5 | Analytics & Reporting | CHK-5.1 - CHK-5.3 |
| 6 | Integration & Context | CHK-6.1 - CHK-6.6 |
| 7 | User Experience | CHK-7.1 - CHK-7.6 |
| 8 | Advanced Features | CHK-8.1 - CHK-8.6 |
| 9 | Performance & Technical | CHK-9.1 - CHK-9.3 |
| 10 | Administration | CHK-10.1 - CHK-10.3 |
| 11 | Import & Migration | CHK-11.1 - CHK-11.3 |
| 12 | COBRA Deep Integration | CHK-12.1 - CHK-12.5 |

---

## Epic 1: Checklist Template Management

### CHK-1.1: Create Checklist Template
**As a** COBRA administrator  
**I want to** create reusable checklist templates  
**So that** operational teams can quickly instantiate standardized checklists for common incident types

**Acceptance Criteria:**
- Template creation form includes: template name (required), description, category/tags, and active/inactive status
- Can add multiple checklist items to template
- Each item has: item text (required), item type (checkbox or status dropdown), display order, required flag, and optional notes
- Status dropdown items can have custom status options (e.g., "Completed", "In Progress", "Not Started", "N/A", "Blocked")
- Default status options provided but can be customized per template
- Template saves to database with creator attribution and timestamp
- Success toast notification displays: "Template saved successfully"
- Cancel button returns to template list without saving
- Form follows C5 button guidelines (Save Template on right, Cancel on left, both 48x48 minimum)
- Uses Roboto font throughout
- Validation prevents saving template without name or without at least one item
- **Validation rules:**
  - Template name: required, max 200 characters
  - Template description: optional, max 1000 characters
  - Category: required, max 50 characters
  - Item text: required, max 200 characters
  - Item notes: optional, max 1000 characters
  - ItemType: must be "checkbox" (0) or "status" (1)
  - DisplayOrder: required, must be positive integer
  - Status options (for dropdown): JSON array, each option max 50 characters

**Technical Notes:**
- API Endpoint: `POST /api/checklists/templates`
- Request body includes template metadata and array of items
- Returns template ID on successful creation
- Consider soft delete for templates (IsActive flag rather than hard delete)
- Data annotations on DTOs enforce validation server-side

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: TemplateEditorPage.tsx
- Backend: POST /api/templates
- All acceptance criteria met

---

### CHK-1.2: Edit Existing Template
**As a** COBRA administrator  
**I want to** modify existing checklist templates  
**So that** I can improve templates based on operational feedback

**Acceptance Criteria:**
- Load existing template data into edit form
- Can modify template name, description, category/tags, and active status
- Can add new items, edit existing items, remove items (with confirmation), and reorder items
- Removing an item shows confirmation dialog: "Are you sure you want to remove this item?"
- Save updates timestamp and modifying user attribution
- "Save and Close" returns to template list
- "Save and Continue" remains in edit mode with success notification
- Cannot edit templates that have active instances (show warning message)
- Disabled templates show as inactive in template list but remain editable

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/templates/{templateId}`
- Check for active instances before allowing structural changes
- Consider versioning strategy for templates with active instances

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: TemplateEditorPage.tsx (edit mode)
- Backend: PUT /api/templates/{id}
- All acceptance criteria met

---

### CHK-1.3: View Template Library
**As a** COBRA user  
**I want to** browse available checklist templates  
**So that** I can find and instantiate the right template for my needs

**Acceptance Criteria:**
- Grid displays templates with columns: name, description, category, item count, last modified date, created by
- Filter by category/tags (multi-select dropdown)
- Filter by active/inactive status
- Search by template name or description
- Sort by any column (ascending/descending)
- Click row to view template details (read-only view)
- "Create Instance" button (Cobalt Blue filled button) available for active templates
- Admin users see "Edit" and "Archive" buttons for each template
- Pagination if more than 50 templates
- Empty state shows: "No templates found. Create your first template to get started."

**Technical Notes:**
- API Endpoint: `GET /api/checklists/templates?category={cat}&status={status}&search={query}`
- Use AgGrid or Material-UI DataGrid for consistent COBRA grid experience
- Consider caching template list for performance

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: TemplateLibraryPage.tsx
- Backend: GET /api/templates, GET /api/templates/category/{category}
- All acceptance criteria met

---

### CHK-1.4: Duplicate Template
**As a** COBRA administrator  
**I want to** duplicate an existing template  
**So that** I can create variations without starting from scratch

**Acceptance Criteria:**
- "Duplicate" action available on template list and detail view
- Duplicated template opens in edit mode with "(Copy)" appended to name
- All items, settings, and configurations copied
- User prompted to rename before saving
- New template gets new ID and creation metadata
- Original template remains unchanged

**Technical Notes:**
- API Endpoint: `POST /api/checklists/templates/{templateId}/duplicate`
- Consider deep copy of all related entities

**Story Points:** 2

**Implementation Status:** ✅ Complete
- Frontend: TemplateLibraryPage.tsx, TemplateEditorPage.tsx
- Backend: POST /api/templates/{id}/duplicate
- All acceptance criteria met

---

### CHK-1.5: Archive Template
**As a** COBRA administrator  
**I want to** archive obsolete templates  
**So that** users don't see outdated templates but historical data is preserved

**Acceptance Criteria:**
- "Archive" button (outline secondary button) available on template list and edit view
- Confirmation dialog: "Archive this template? It will no longer appear in the active template list but existing instances will remain accessible."
- Archived templates removed from default template library view
- Toggle to "Show Archived" displays archived templates in grayed-out state
- Cannot create new instances from archived templates
- Can restore archived templates back to active status
- Existing checklist instances created from archived templates remain fully functional

**Technical Notes:**
- Soft delete using IsArchived flag and ArchivedDate fields
- API Endpoint: `POST /api/checklists/templates/{templateId}/archive`
- Restore endpoint: `POST /api/checklists/templates/{templateId}/restore`

**Story Points:** 2

**Implementation Status:** ✅ Complete
- Frontend: TemplateLibraryPage.tsx
- Backend: DELETE /api/templates/{id}, GET /api/templates/archived, POST /api/templates/{id}/restore, DELETE /api/templates/{id}/permanent
- All acceptance criteria met including soft delete pattern

---

### CHK-1.6: Template Categories and Tags
**As a** COBRA administrator
**I want to** organize templates with categories and tags
**So that** users can quickly find relevant templates for their incident type

**Acceptance Criteria:**
- Predefined categories: "ICS Forms", "Safety", "Operations", "Planning", "Logistics", "Finance/Admin", "Communications", "General"
- Can assign multiple tags to template (e.g., "Hurricane", "Shelter", "Evacuation", "Wildfire", "Flood")
- Tag autocomplete suggests existing tags as user types
- Can create new tags on the fly
- Template list filters by category (single select) and tags (multi-select)
- Category and tags displayed as chips in template list

**Technical Notes:**
- Categories stored as enum or reference table
- Tags stored in separate TagTable with many-to-many relationship
- API returns distinct tag list for autocomplete

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: TemplateLibraryPage.tsx with category filtering
- Backend: GET /api/templates/category/{category}
- Category enum and filtering implemented

---

### CHK-1.7: Smart Template Suggestions
**As a** COBRA operational user
**I want to** see intelligent template recommendations based on my position and context
**So that** I can quickly find the right template without searching through dozens of options

**Acceptance Criteria:**
- Template picker displays smart suggestions organized into sections:
  - **⭐ Recommended for You** - Templates matching user's ICS position
  - **🕒 Recently Used** - Templates used within last 30 days
  - **💡 Other Suggestions** - Popular and event-category-matched templates
  - **📋 All Templates** - Full alphabetical list (collapsed by default)
- Multi-factor scoring algorithm prioritizes templates:
  ```
  Score = PositionMatch + EventCategoryMatch + RecentlyUsed + Popularity

  Where:
    PositionMatch    = +1000 points (if template.RecommendedPositions contains user's position)
    EventCategoryMatch = +500 points (if template.EventCategories matches current event)
    RecentlyUsed     = 0-200 points (scaled: 30 days ago=0, today=200)
    Popularity       = 0-100 points (capped at 50 uses, 2 points per use)
  ```
  - **Position match (+1000):** Highest priority - matches RecommendedPositions array
  - **Event category match (+500):** Matches EventCategories to current event type
  - **Recently used (+0-200):** Linear decay over 30 days: `(30 - daysAgo) / 30 * 200`
  - **Popularity (+0-100):** `Math.Min(usageCount * 2, 100)` - capped to prevent runaway effect
  - **Seasonal relevance:** Future enhancement - hurricane season Jun-Nov, winter Dec-Mar
- Visual badges explain why template is suggested:
  - 📍 "Recommended for [Position]" (blue badge)
  - 🔥 "Popular (X uses)" (green badge)
  - 🕒 "Last used X days ago" (orange badge)
  - ⚡ "Auto-creates for [Event]" (purple badge)
  - 🔁 "Auto-creates [frequency]" (cyan badge)
- System automatically tracks template usage:
  - UsageCount increments when checklist created
  - LastUsedAt updates to current timestamp
  - No user action required
- API endpoint: `GET /api/templates/suggestions?position={position}&eventCategory={category}&limit={limit}`
- **Auto-detection:** System automatically detects event category from user's current event context when available
- Templates in "Recommended" section appear first (user sees best matches immediately)
- "All Templates" section allows browsing if suggestions don't match need
- Search filter works across all sections
- Section headers show count: "Recommended for You (3)"
- Empty sections automatically collapse (don't show "0 templates")
- Typical usage: User finds right template in 10-15 seconds (vs. 2-3 minutes previously)

**Technical Notes:**
- Backend: New fields on Template entity:
  - RecommendedPositions (JSON array of position names)
  - EventCategories (JSON array of event types)
  - UsageCount (INT, default 0)
  - LastUsedAt (DATETIME2, nullable)
- Migration: `20251121040000_AddTemplateSuggestionsMetadata.cs`
- Indexes: IX_Templates_UsageCount, IX_Templates_LastUsedAt
- API scoring algorithm in TemplateService.GetTemplateSuggestionsAsync()
- Automatic usage tracking in ChecklistService.CreateFromTemplateAsync()
- Frontend: TemplatePickerDialog categorizes and displays suggestions
- Badge rendering based on template metadata
- Position extracted from user profile (localStorage in POC, JWT in production)

**Story Points:** 8

**Implementation Status:** ✅ Complete (Phase 2)

---

### CHK-1.8: Template Preview
**As a** COBRA operational user
**I want to** preview a template's structure and items before creating a checklist from it
**So that** I can verify it's the right template for my needs without creating an instance

**Acceptance Criteria:**
- "Preview" button available on template library list and template detail view
- Preview opens in read-only mode showing:
  - Template name, description, and category
  - All template items in display order
  - Item types (checkbox vs. status dropdown)
  - Required item indicators
  - Item notes/instructions
- Cannot edit template in preview mode
- "Create Checklist" button available in preview to quickly instantiate
- "Close" button returns to template library
- Mobile-responsive preview layout
- Preview accessible to all roles (not just Manage role)

**Technical Notes:**
- Frontend: TemplatePreviewPage.tsx
- Backend: GET /api/templates/{id} (read-only access)
- Route: `/templates/{templateId}/preview`
- Uses same template DTO as editor but renders in read-only mode
- Contributors and Readonly users can preview but not edit

**Story Points:** 2

**Implementation Status:** ✅ Complete
- Frontend: TemplatePreviewPage.tsx
- Backend: GET /api/templates/{id}
- All acceptance criteria met

---

### CHK-1.9: Item Library
**As a** COBRA administrator
**I want to** maintain a library of reusable checklist items
**So that** I can quickly build templates from pre-defined, standardized items

**Acceptance Criteria:**
- **Item Library Page** accessible from main navigation (Manage role only)
- **List view** displays all library items with columns:
  - Item text
  - Item type (Checkbox/Status Dropdown)
  - Category
  - Usage count (how many templates use this item)
  - Last modified date
- **Create new library item** with:
  - Item text (required, max 500 characters)
  - Item type selection (Checkbox or Status Dropdown)
  - Category (single select from predefined list)
  - Default notes/instructions
  - Status options (if dropdown type)
- **Edit existing library item**:
  - Modify all fields
  - Track modification history
  - Show usage count (templates using this item)
- **Delete library item** (soft delete):
  - Archive item instead of hard delete
  - Archived items hidden from default view
  - Can restore archived items
  - Cannot delete items currently in use by active templates (show warning)
- **Search and filter**:
  - Search by item text
  - Filter by category
  - Filter by item type
  - Sort by usage count, last modified, or name
- **Drag-and-drop to templates**:
  - Drag library item into template editor
  - Item automatically inserted with all configured properties
- **Usage tracking**:
  - Usage count increments when item added to template
  - "View Usage" shows which templates use this item
- **Empty state**: "No library items found. Create your first reusable item to get started."

**Technical Notes:**
- Frontend: ItemLibraryPage.tsx
- Backend:
  - GET /api/itemlibrary - List all library items
  - GET /api/itemlibrary/{id} - Get single library item
  - POST /api/itemlibrary - Create library item
  - PUT /api/itemlibrary/{id} - Update library item
  - DELETE /api/itemlibrary/{id} - Archive library item (soft delete)
  - POST /api/itemlibrary/{id}/restore - Restore archived item
  - DELETE /api/itemlibrary/{id}/permanent - Permanent delete (admin only)
  - POST /api/itemlibrary/{id}/increment-usage - Track usage
- Database: ItemLibrary table with:
  - Id, ItemText, ItemType, Category, DefaultNotes
  - StatusOptions (JSON for dropdown items)
  - UsageCount, IsArchived, CreatedBy, CreatedAt, ModifiedBy, ModifiedAt
- Permission: Only Manage role can access Item Library
- Drag-and-drop integration with template editor

**Story Points:** 8

**Implementation Status:** ✅ Complete
- Frontend: ItemLibraryPage.tsx
- Backend: Full ItemLibraryController with 8 endpoints
- All acceptance criteria met

---

## Epic 2: Checklist Instance Management

### CHK-2.0: Quick Checklist Creation from My Checklists
**As a** COBRA contributor or manager
**I want to** quickly create a new checklist from the My Checklists page
**So that** I don't have to navigate through multiple pages to start working

**Acceptance Criteria:**
- **"Create Checklist" button** prominently displayed on My Checklists page
  - Location: Page header (top-right area)
  - Style: Filled Cobalt Blue button (#0020C2)
  - Icon: Plus icon (+) with "Create Checklist" label
  - Minimum size: 48x48 pixels for touch
- **Permission gating:**
  - Button visible for: Contributor, Manage roles
  - Button hidden for: None, Readonly roles
  - Uses usePermissions hook: `canCreateInstance` check
- **Click behavior:**
  - Opens TemplatePickerDialog with smart suggestions
  - Dialog pre-filtered to show only MANUAL templates (excludes auto-create/recurring)
  - User's position automatically detected from profile
  - Smart suggestions prioritize relevant templates
- **User flow:**
  1. User clicks "Create Checklist" button
  2. Template picker opens (Dialog on desktop, BottomSheet on mobile)
  3. User sees smart suggestions based on their position
  4. User selects template
  5. Dialog closes and next step begins (out of scope: checklist form)
- **Empty state integration:**
  - If user has no checklists, button provides clear call-to-action
  - Empty state message encourages using the button
  - No confusion about how to get started
- **Mobile optimization:**
  - Button sized for touch (48x48 minimum)
  - Prominent placement above checklist list
  - Works seamlessly with BottomSheet picker on mobile
- **Typical usage time:** 15-20 seconds from My Checklists page to template selected

**Technical Notes:**
- Button rendered conditionally: `{canCreateInstance && <Button>...}`
- Opens TemplatePickerDialog component with smart suggestions
- Position passed from user profile (localStorage in POC)
- Template type filtering: Only show MANUAL templates (templateType === 0)
- Foundation for full checklist creation workflow
- Reduces friction: No need to navigate to separate "Create" page

**Story Points:** 2

**Implementation Status:** ✅ Complete (Phase 1)

---

### CHK-2.1: Create Checklist Instance from Template
**As a** COBRA operational user
**I want to** create a checklist instance from a template
**So that** I can track completion of required tasks during an incident

**Acceptance Criteria:**
- "Create Instance" button available from template detail view
- Instance creation form requires: instance name, associated event (dropdown from user's active events), associated operational period (optional), assigned positions (multi-select)
- Instance copies all items from template with status initialized (checkboxes unchecked, dropdowns to first option or "Not Started")
- Instance saves with creator attribution and creation timestamp
- User redirected to checklist instance detail view after creation
- Real-time notification sent to all assigned positions
- Instance appears in "My Checklists" view immediately

**Technical Notes:**
- API Endpoint: `POST /api/checklists/instances`
- Request includes templateId, eventId, operationalPeriodId (optional), assignedPositions[]
- WebSocket notification to assigned users
- Consider EventId as required foreign key for audit compliance

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: TemplatePickerDialog.tsx, MyChecklistsPage.tsx
- Backend: POST /api/checklists
- All acceptance criteria met

---

### CHK-2.2: Create Checklist Instance from Multiple Templates
**As a** COBRA operational user  
**I want to** create a single checklist instance from multiple templates  
**So that** I can combine related checklists (e.g., "Hurricane Response" + "Shelter Operations")

**Acceptance Criteria:**
- "Create Combined Instance" option in template library
- Multi-select templates (with visual indicator of selected templates)
- Preview shows all items from all selected templates with template name grouping
- Can reorder template groups before finalizing
- Instance creation includes combined instance name and standard metadata
- Items maintain reference to source template for reporting
- All items from all templates appear in single instance with section headers

**Technical Notes:**
- Consider max template limit (e.g., 5 templates per combined instance)
- API Endpoint: `POST /api/checklists/instances/combined`
- Request includes array of templateIds with order preference

**Story Points:** 8

---

### CHK-2.3: View My Checklists
**As a** COBRA operational user  
**I want to** view all checklist instances assigned to me or my position  
**So that** I can track my responsibilities

**Acceptance Criteria:**
- "My Checklists" view shows instances where user's current position is assigned
- Grid displays: checklist name, event name, progress percentage, last updated, assigned positions, unread change count (badge)
- Filter by event, operational period, completion status (all, in progress, completed)
- Sort by progress, last updated, or name
- Click row to open checklist detail view
- Badge shows count of items changed since last view (per-user tracking)
- Progress bar visual (Material-UI LinearProgress) shows completion percentage
- Color coding: 0-33% = red, 34-66% = yellow, 67-99% = blue, 100% = green

**Technical Notes:**
- API Endpoint: `GET /api/checklists/instances/my-checklists`
- Query by user's current position in current event
- Consider caching user's last viewed timestamp per instance for badge calculation
- Use C5 color palette (Lava Red #E42217, Canary Yellow #FFEF00, Cobalt Blue #0020C2, Green #008000)

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: MyChecklistsPage.tsx with operational period grouping
- Backend: GET /api/checklists/my-checklists
- All acceptance criteria met

---

### CHK-2.4: View Checklist Instance Detail
**As a** COBRA operational user  
**I want to** view all items in a checklist instance  
**So that** I can see what needs to be completed

**Acceptance Criteria:**
- Header shows: checklist name, event name, operational period, progress percentage, assigned positions, created by/date
- Items displayed in order with: checkbox/dropdown, item text, status, completed by (user + position), completed timestamp, notes
- Items grouped by source template if created from multiple templates
- Filter items by status (all, completed, incomplete, specific status values)
- Search within checklist items
- Recent changes highlighted (items modified in last 30 minutes shown with subtle background color #EAF2FB)
- Refresh button to manually fetch latest updates (in case WebSocket fails)
- Real-time updates appear without page refresh when other users make changes

**Technical Notes:**
- API Endpoint: `GET /api/checklists/instances/{instanceId}`
- WebSocket connection for real-time updates
- Consider polling fallback every 30 seconds if WebSocket unavailable
- Use White Blue #DBE9FA for selected/recently changed items

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: ChecklistDetailPage.tsx with full item display and interaction
- Backend: GET /api/checklists/{id}
- All acceptance criteria met (real-time updates not yet implemented - see CHK-2.7)

---

### CHK-2.5: Clone Checklist Instance
**As a** COBRA operational user  
**I want to** clone an existing checklist instance  
**So that** I can replicate checklists across operational periods or similar incidents

**Acceptance Criteria:**
- "Clone" button available on instance detail view (outline secondary button)
- Clone dialog prompts for: new instance name, target event, target operational period, reset completion status (checkbox)
- If reset selected, all items return to initial state (unchecked/not started)
- If reset not selected, items maintain current completion status
- Clone preserves item notes but clears completion user/timestamp if reset
- User redirected to new instance after creation
- Original instance unchanged

**Technical Notes:**
- API Endpoint: `POST /api/checklists/instances/{instanceId}/clone`
- Consider copying vs. referencing template (recommend maintain template reference)

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: ChecklistDetailPage.tsx with clone functionality
- Backend: POST /api/checklists/{id}/clone
- All acceptance criteria met

---

### CHK-2.6: Archive Checklist Instance
**As a** COBRA operational user
**I want to** archive completed checklist instances
**So that** my active checklist view stays focused on current work

**Acceptance Criteria:**
- "Archive" button available on instance detail view
- Confirmation dialog if instance is not 100% complete: "This checklist is not fully complete. Archive anyway?"
- Archived instances removed from "My Checklists" default view
- Toggle "Show Archived" displays archived instances
- Can restore archived instances (Manage role only)
- Archive action recorded in instance history with user attribution
- **Permission-based archiving:**
  - **Contributor role:** Can only archive checklists they created (ownership check)
  - **Manage role:** Can archive any checklist
  - **Readonly role:** Cannot archive any checklists
- Archive button visibility adapts based on user's role and checklist ownership

**Technical Notes:**
- API Endpoint: `DELETE /api/checklists/{id}` (soft delete)
- Soft delete using IsArchived flag
- Service layer checks `CreatedBy` field against `UserContext.Email` for Contributors
- Controller returns 403 Forbidden if Contributor attempts to archive another user's checklist
- Return values: `null` = not found, `false` = not authorized, `true` = success

**Story Points:** 2

**Implementation Status:** ✅ Complete
- Frontend: MyChecklistsPage.tsx with archive toggle, ChecklistDetailPage.tsx with ownership-aware archive button
- Backend: DELETE /api/checklists/{id}, POST /api/checklists/{id}/restore, GET /api/checklists/archived
- All acceptance criteria met with soft delete pattern and role-based permissions

---

### CHK-2.7: Real-time Change Notifications
**As a** COBRA operational user  
**I want to** be notified when someone updates a checklist I'm not currently viewing  
**So that** I stay aware of checklist progress

**Acceptance Criteria:**
- Badge counter appears on "My Checklists" card/menu item showing total unread changes across all instances
- Badge counter appears on each instance row showing unread changes for that instance
- Badge clears when user views instance detail
- Toast notification appears (bottom-right, 5 second duration) when change occurs: "[User Name] updated [Checklist Name]"
- Toast dismissed on click or timeout
- Notifications respect position visibility (don't show changes to checklists user doesn't have access to)

**Technical Notes:**
- WebSocket events for instance updates
- Track per-user-per-instance LastViewedTimestamp
- API to mark instance as viewed: `POST /api/checklists/instances/{instanceId}/mark-viewed`

**Story Points:** 5

---

## Epic 3: Checklist Item Interaction

### CHK-3.1: Complete Checkbox Item
**As a** COBRA operational user  
**I want to** mark checkbox items as complete  
**So that** I can track task completion

**Acceptance Criteria:**
- Click checkbox to toggle complete/incomplete status
- Completion immediately updates with user attribution (name + position) and timestamp
- Completed item shows checkmark with visual styling (strikethrough text optional based on UX preference)
- Completion information displayed: "Completed by [Name] ([Position]) at [Time]"
- Real-time update broadcasts to all users viewing the instance
- Progress percentage recalculates immediately
- Optimistic UI update (don't wait for server response) with rollback on error
- Can toggle back to incomplete if needed (records who uncompleted and when)

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/instances/{instanceId}/items/{itemId}/complete`
- WebSocket broadcast of change to all connected users for this instance
- Store completion history (completed, uncompleted, re-completed) for audit

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: ChecklistDetailPage.tsx with checkbox toggle
- Backend: PATCH /api/checklists/{checklistId}/items/{itemId}/completion
- All acceptance criteria met (real-time broadcast not yet implemented - see CHK-2.7)

---

### CHK-3.2: Update Status Dropdown Item
**As a** COBRA operational user  
**I want to** update status dropdown items  
**So that** I can track task progress through multiple states

**Acceptance Criteria:**
- Dropdown displays available status options (configured in template)
- Select new status updates item immediately with user attribution and timestamp
- Status change history preserved (can see all previous status changes)
- Real-time update broadcasts to all users
- Progress calculation considers configurable "completed" statuses (e.g., "Completed" and "N/A" count toward completion)
- Status change information displayed: "Changed to [Status] by [Name] ([Position]) at [Time]"
- Can change status multiple times with full history

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/instances/{instanceId}/items/{itemId}/status`
- Consider separate CompletedStatuses configuration per template to control progress calculation
- Store status change history in ItemStatusHistory table

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: ChecklistDetailPage.tsx with status dropdown
- Backend: PATCH /api/checklists/{checklistId}/items/{itemId}/status
- All acceptance criteria met (real-time broadcast not yet implemented - see CHK-2.7)

---

### CHK-3.3: Add Notes to Checklist Item
**As a** COBRA operational user  
**I want to** add notes or comments to checklist items  
**So that** I can provide context or additional information

**Acceptance Criteria:**
- "Add Note" button or expandable notes section below each item
- Notes field supports multi-line text (minimum 3 rows, auto-expand)
- Character limit: 1000 characters with counter
- Save notes with user attribution and timestamp
- Notes display chronologically (newest first) with full timestamp and user/position
- Can edit own notes within 5 minutes of posting (edit shows "edited" indicator)
- Cannot edit other users' notes
- Real-time updates when others add notes
- Notes included in checklist exports/prints

**Technical Notes:**
- API Endpoint: `POST /api/checklists/instances/{instanceId}/items/{itemId}/notes`
- PUT endpoint for edits with EditedTimestamp tracking
- Consider notification preference for note additions

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: ChecklistDetailPage.tsx with notes dialog
- Backend: PATCH /api/checklists/{checklistId}/items/{itemId}/notes
- All acceptance criteria met (real-time updates not yet implemented - see CHK-2.7)

---

### CHK-3.4: Bulk Complete Items
**As a** COBRA operational user  
**I want to** mark multiple items complete at once  
**So that** I can efficiently update checklists

**Acceptance Criteria:**
- Checkbox appears next to each item when in "Bulk Edit" mode
- "Bulk Edit" toggle button (outline secondary) in checklist header
- Select multiple items via checkbox
- Bulk actions toolbar appears when items selected: "Mark Complete", "Mark Incomplete", "Change Status" (for dropdown items)
- Confirmation shows count: "Mark 5 items complete?"
- All selected items update with single user attribution and timestamp
- Cannot bulk edit items of mixed types (checkbox vs dropdown)
- Bulk edit mode dismissed after action completes
- Real-time broadcast of all changes

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/instances/{instanceId}/items/bulk-update`
- Request includes array of itemIds and target status
- Consider performance implications of large batch updates

**Story Points:** 5

---

### CHK-3.5: Reorder Checklist Items
**As a** COBRA operational user with edit permissions  
**I want to** reorder items in a checklist instance  
**So that** I can organize items logically for current operations

**Acceptance Criteria:**
- Drag handle icon (FontAwesome `fa-grip-vertical`) appears on left of each item in edit mode
- Drag and drop to reorder items
- Order persists to database immediately
- Visual feedback during drag (item elevation/shadow)
- Reorder action does not affect completion status
- Reorder available only to users with edit permissions
- Changes broadcast in real-time to other users

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/instances/{instanceId}/items/reorder`
- Request includes ordered array of itemIds
- Consider disabling reorder for locked/completed checklists

**Story Points:** 3

---

### CHK-3.6: Item Dependencies
**As a** COBRA operational user  
**I want to** see when items depend on completion of other items  
**So that** I follow the correct sequence of operations

**Acceptance Criteria:**
- Dependent items show lock icon and gray-out visual state when dependencies incomplete
- Tooltip on hover explains: "Complete [Item Name] before this item"
- Attempting to complete dependent item shows error toast: "Cannot complete. Prerequisite items required."
- Dependencies configured in template or instance settings
- Can create simple dependencies (Item B depends on Item A) or complex (Item C depends on Items A AND B)
- Dependency chain visualized (e.g., "3 dependencies")
- Dependencies respect position permissions (can't block if dependent item not visible to user)

**Technical Notes:**
- API stores dependencies as graph structure (ItemDependencies table with ItemId, DependsOnItemId)
- Complex dependency logic: evaluate AND/OR conditions
- Consider preventing circular dependencies at save time

**Story Points:** 8

---

### CHK-3.7: Required Items
**As a** COBRA administrator  
**I want to** mark checklist items as required  
**So that** critical tasks must be completed before closing checklist

**Acceptance Criteria:**
- Required items show asterisk (*) or "REQUIRED" badge
- Cannot archive checklist if required items incomplete
- Attempting to archive with incomplete required items shows dialog: "X required items incomplete. Complete required items or mark as N/A before archiving."
- Required status configured per item in template
- Required items highlighted in different color (FireBrick #B22222 border or background tint)
- Progress calculation weighs required items (option to show "Required: X/Y Complete")

**Technical Notes:**
- Add IsRequired boolean to item configuration
- Validation on archive action checks all required items
- Consider separate progress indicators: "Overall: 80% | Required: 100%"

**Story Points:** 3

---

## Epic 4: Permissions and Position-Based Access

> **Note:** Core permission system stories (4.0, 4.0b) have been moved to [Core Platform User Stories](../Core/USER-STORIES.md).
> This section contains **checklist-specific** permission extensions.

### CHK-4.1: Position-Based Checklist Visibility
**As a** COBRA operational user  
**I want to** see only checklists relevant to my current position  
**So that** I'm not overwhelmed with irrelevant information

**Acceptance Criteria:**
- Checklists assigned to specific ICS positions during instance creation
- User sees only checklists assigned to their current position in current event
- Users can always view checklists they created, regardless of position assignment
- Switching positions immediately updates checklist visibility
- Position assignments displayed clearly on checklist instance detail
- Manage role users can view all checklists regardless of position assignment (for oversight)
- Unassigned checklists (no specific positions) visible to all users in event

**Technical Notes:**
- Many-to-many relationship: ChecklistInstances <-> Positions
- Query checklists by user's current position context
- API filters results based on user's position claim in JWT token

**Story Points:** 5

---

### CHK-4.2: Edit Permissions by Position
**As a** COBRA administrator  
**I want to** control which positions can edit specific checklist items  
**So that** only authorized personnel modify critical information

**Acceptance Criteria:**
- Template configuration allows restricting items to specific positions
- Users can view but not edit items restricted to other positions
- Restricted items show lock icon with tooltip: "Only [Position Name] can edit this item"
- Attempting to edit restricted item shows error: "You don't have permission to edit this item"
- Admin users override position restrictions
- Edit permissions displayed clearly in item configuration

**Technical Notes:**
- ItemPositionRestrictions table with ItemId and PositionId
- Client-side UI disables controls, server-side API enforces permission check
- Consider "view-only" permission level vs. "no access"

**Story Points:** 5

---

### CHK-4.3: Delegate Checklist Item
**As a** COBRA operational user  
**I want to** assign specific checklist items to specific people  
**So that** responsibilities are clearly distributed

**Acceptance Criteria:**
- "Assign" action available on each item (icon button)
- Assign dialog shows users with access to this checklist (by position)
- Select user and save assignment
- Assigned items show assignee name with avatar/initials
- Assigned user receives notification: "[User] assigned you [Item Name] in [Checklist Name]"
- Filter "My Checklists" to show "Assigned to Me" items
- Can reassign or unassign items
- Assignment history tracked for audit

**Technical Notes:**
- API Endpoint: `PUT /api/checklists/instances/{instanceId}/items/{itemId}/assign`
- Request includes targetUserId
- WebSocket notification to assignee

**Story Points:** 5

---

### CHK-4.4: Read-Only Mode After Operational Period Close
**As a** COBRA administrator  
**I want to** automatically lock checklists when operational period closes  
**So that** historical records remain unchanged

**Acceptance Criteria:**
- Checklists associated with closed operational periods become read-only
- All edit controls disabled (grayed out) with lock icon in header
- Attempting to edit shows message: "This checklist is locked because the operational period has closed"
- Can still view all data, notes, history, and export
- System administrators can override lock if needed (with audit log entry)
- Lock status clearly indicated in checklist header with closed date

**Technical Notes:**
- Query operational period status before allowing edits
- API enforces read-only based on operational period IsActive flag
- Consider grace period (e.g., 24 hours after close) before hard lock

**Story Points:** 3

---

## Epic 5: Analytics and Reporting

### CHK-5.1: Checklist Progress Dashboard
**As a** COBRA command staff  
**I want to** view progress across all checklists in my incident  
**So that** I can identify bottlenecks and ensure critical tasks complete on time

**Acceptance Criteria:**
- Dashboard shows all active checklists in current event
- Progress visualization options: list view with progress bars, grid of cards, Gantt-style timeline
- Sort by: progress (least to most complete), last updated, priority
- Filter by: position, operational period, completion status, template category
- Click checklist to drill down to detail view
- Export dashboard data to CSV or PDF
- Refresh button updates all data
- Color-coded progress indicators (red <33%, yellow 33-66%, blue 67-99%, green 100%)

**Technical Notes:**
- API Endpoint: `GET /api/checklists/analytics/progress?eventId={id}&opPeriodId={id}`
- Consider caching aggregated data for performance
- Real-time updates optional (WebSocket overhead may be high for dashboard)

**Story Points:** 5

---

### CHK-5.2: Completion Trend Analysis
**As a** COBRA planning section chief  
**I want to** analyze historical checklist completion trends  
**So that** I can improve future planning and resource allocation

**Acceptance Criteria:**
- Report shows average time to complete checklists by template type
- Identify items that consistently take longest or get blocked
- Compare completion rates across operational periods
- Filter by: incident type, date range, template category, position
- Visualizations: bar charts, line graphs, heat maps
- Export to Excel with raw data and charts
- Insights: "Safety checklists take 23% longer during night shifts"

**Technical Notes:**
- API Endpoint: `GET /api/checklists/analytics/trends`
- Requires significant historical data collection
- Consider pre-aggregating data nightly for performance

**Story Points:** 8

---

### CHK-5.3: Position Workload Report
**As a** COBRA incident commander  
**I want to** see checklist workload distribution across positions  
**So that** I can balance responsibilities and prevent burnout

**Acceptance Criteria:**
- Report shows checklist count and item count per position
- Average completion time per position
- Overdue items per position (if due dates implemented)
- Filter by: operational period, incident type, date range
- Compare positions side-by-side
- Identify positions with disproportionate workload
- Export to PDF for briefings

**Technical Notes:**
- Aggregate data by position assignments
- Consider active user count per position for normalized metrics

**Story Points:** 5

---

## Epic 6: Integration and Context

### CHK-6.1: Event Association Required
**As a** COBRA system administrator  
**I want to** require all checklist instances to associate with an event  
**So that** audit trails maintain FEMA compliance

**Acceptance Criteria:**
- Event selection required when creating checklist instance (no default/null)
- Dropdown shows only events where user has active position assignment
- Cannot create checklist without event association
- Event name displayed prominently in checklist header
- Switching events requires creating new checklist instance
- Event association immutable after creation (cannot change)

**Technical Notes:**
- EventId as required foreign key in ChecklistInstances table
- API validation enforces non-null EventId
- Consider showing event status (active/closed) in dropdown

**Story Points:** 2

---

### CHK-6.2: Operational Period Association
**As a** COBRA operational user  
**I want to** associate checklists with operational periods  
**So that** I can organize checklists by time-based operational phases

**Acceptance Criteria:**
- Optional operational period selection during instance creation
- Dropdown shows operational periods for selected event
- Can create checklist without operational period (incident-level checklists)
- Filter "My Checklists" by operational period
- Operational period displayed in checklist header
- Auto-suggest current active operational period as default
- Can reassign checklist to different operational period if needed

**Technical Notes:**
- OperationalPeriodId as nullable foreign key
- API Endpoint to reassign: `PUT /api/checklists/instances/{id}/operational-period`

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: MyChecklistsPage.tsx with operational period grouping and filtering
- Backend: GET /api/operationalperiods, POST /api/operationalperiods, POST /api/operationalperiods/{id}/set-current, DELETE /api/operationalperiods/{id}
- Full operational period management system implemented

---

### CHK-6.3: Link Checklist Item to Resource
**As a** COBRA logistics section chief  
**I want to** link checklist items to COBRA resources  
**So that** I can track resource-related tasks

**Acceptance Criteria:**
- "Link Resource" action on checklist items
- Search and select from available resources in event
- Multiple resources can link to single item
- Linked resources display as chips with resource name and type
- Click resource chip to navigate to resource detail page
- Remove resource link without affecting resource or checklist item
- Resource link history tracked for audit

**Technical Notes:**
- Many-to-many: ChecklistItems <-> Resources
- API Endpoint: `POST /api/checklists/instances/{instanceId}/items/{itemId}/resources`
- Consider reciprocal view: "View Checklists" from Resource detail page

**Story Points:** 5

---

### CHK-6.4: Link Checklist Item to Logbook Entry
**As a** COBRA operational user  
**I want to** create logbook entries directly from checklist items  
**So that** important completions are documented in the official logbook

**Acceptance Criteria:**
- "Create Logbook Entry" action button on each checklist item
- Pre-populates logbook entry form with: item text, completion information, timestamp, user/position
- User can edit logbook entry before saving
- Link between checklist item and logbook entry maintained
- Logbook entry icon appears on item when linked
- Click icon to view linked logbook entry
- Multiple logbook entries can link to single item

**Technical Notes:**
- API creates logbook entry with reference to ChecklistItemId
- Bidirectional reference for easy navigation
- Endpoint: `POST /api/logbook/entries/from-checklist-item`

**Story Points:** 5

---

### CHK-6.5: Auto-Create Checklists on Incident Type Change
**As a** COBRA system administrator  
**I want to** automatically create checklist instances when incident type changes  
**So that** users don't forget critical checklists for specific incident types

**Acceptance Criteria:**
- Configure templates with "Auto-Create" trigger on specific incident types
- When event's incident type changes to matching type, system creates instance automatically
- Auto-created instances assigned to default positions (configurable per template)
- Notification sent to assigned positions: "New checklist auto-created: [Name]"
- Can disable auto-create feature per event or system-wide
- Duplicate prevention: don't auto-create if instance from same template already exists
- Audit log records auto-creation event

**Technical Notes:**
- Event system publishes IncidentTypeChanged event
- Checklist service subscribes to event and evaluates triggers
- API Endpoint for configuration: `PUT /api/checklists/templates/{id}/auto-create-config`

**Story Points:** 8

---

### CHK-6.6: Export Checklist to IAP
**As a** COBRA planning section chief  
**I want to** export checklist status to Incident Action Plan format  
**So that** checklist progress appears in official IAP documentation

**Acceptance Criteria:**
- "Export to IAP" button on checklist detail view
- Export format: ICS-204 style format with checklist items as assignments
- Include: checklist name, progress percentage, completed items, incomplete items, assigned positions
- PDF export with COBRA branding and event header
- Include completion timestamps and user attribution for completed items
- Option to include notes in export
- Export respects position visibility (only export items user can see)

**Technical Notes:**
- PDF generation using existing COBRA IAP templates
- API Endpoint: `GET /api/checklists/instances/{id}/export/iap`
- Returns PDF binary or URL to generated file

**Story Points:** 8

---

## Epic 7: User Experience Enhancements

### CHK-7.1: Mobile-Optimized Checklist View
**As a** COBRA field operations user
**I want to** use checklists on mobile devices
**So that** I can update checklists from the field without returning to command post

**Acceptance Criteria:**
- All buttons minimum 48x48 pixels (C5 mobile standard)
- Touch-friendly checkbox/dropdown controls (larger touch targets)
- Responsive layout adapts to mobile screen sizes
- Swipe actions: swipe right to complete, swipe left for options menu
- Mobile-optimized filters (bottom sheet instead of sidebar)
- Minimize data transfer for low-bandwidth situations
- Offline detection with warning message
- Quick-add note button prominent on mobile

**Technical Notes:**
- Use Material-UI responsive breakpoints
- Test on iOS Safari and Android Chrome
- Consider PWA capabilities for offline support

**Story Points:** 8

---

### CHK-7.1b: Mobile-Optimized Template Picker
**As a** COBRA field operations user
**I want to** select templates using a mobile-native interface
**So that** I can create checklists quickly from my phone or tablet

**Acceptance Criteria:**
- **Responsive rendering based on screen size:**
  - Mobile (<600px): Bottom sheet drawer slides up from bottom
  - Desktop/Tablet (≥600px): Standard dialog centered on screen
- **Bottom sheet features (mobile only):**
  - Slides up from bottom with smooth animation
  - Drag handle at top (40px wide, 4px height, gray)
  - Swipe down to dismiss gesture
  - Tap backdrop to close
  - Rounded top corners (16px border radius)
  - Max height: 90% of viewport
  - Close button (X) in header
- **Touch optimization:**
  - All buttons minimum 48x48 pixels
  - Template list items minimum 56px height
  - Entire list item row is clickable (not just text)
  - Adequate spacing between interactive elements (16px minimum)
- **No auto-focus on mobile:**
  - Search field does NOT auto-focus on mobile (prevents unwanted keyboard)
  - User can manually tap search if needed
  - Desktop still auto-focuses for keyboard users
- **Responsive section heights:**
  - Mobile: Recommended section max 200px, Other sections max 150px
  - Desktop: Recommended section max 250px, Other sections max 200px
  - All sections scrollable independently
- **Consistent behavior across devices:**
  - Same content rendered in both mobile and desktop views
  - Same smart suggestions algorithm
  - Same search/filter functionality
  - Same badge indicators
- **Native app-like feel on mobile:**
  - Familiar gesture patterns (swipe to dismiss)
  - Smooth animations
  - No jarring transitions
  - Feels like built-in iOS/Android app
- **Tested on:**
  - iOS Safari (iPhone 12+)
  - Chrome Android (Samsung Galaxy, Pixel)
  - Desktop Chrome (responsive mode)

**Technical Notes:**
- New component: `BottomSheet.tsx` (reusable mobile drawer)
- Uses Material-UI `SwipeableDrawer` component
- Responsive detection: `useMediaQuery(theme.breakpoints.down('sm'))`
- Conditional rendering: `isMobile ? <BottomSheet> : <Dialog>`
- Shared content function for DRY principle
- No code duplication between mobile/desktop views
- Touch targets verified with browser dev tools
- Gestures tested on physical devices

**Story Points:** 5

**Implementation Status:** ✅ Complete (Phase 3)

---

### CHK-7.2: Keyboard Shortcuts
**As a** COBRA console operator  
**I want to** keyboard shortcuts for common checklist actions  
**So that** I can work more efficiently

**Acceptance Criteria:**
- Shortcuts displayed in help dialog (? key or F1)
- Arrow keys navigate between items
- Space bar toggles checkbox complete/incomplete
- Enter opens status dropdown or note editor
- Ctrl/Cmd + S saves notes
- Escape closes dialogs
- Numbers 1-9 filter by status (if less than 10 status options)
- Tab navigates to next incomplete item
- Shortcuts work without interfering with text input in notes fields

**Technical Notes:**
- Use keyboard event listeners with proper focus management
- Disable shortcuts when focus in text input
- Display shortcut hints in tooltips

**Story Points:** 5

---

### CHK-7.3: Search Within Checklists
**As a** COBRA operational user  
**I want to** search for specific items across my checklists  
**So that** I can quickly find tasks by keyword

**Acceptance Criteria:**
- Search bar in checklist detail view header
- Real-time filter as user types (no search button needed)
- Searches item text, notes, and status
- Clear search button (X) appears when text entered
- Search highlights matching text in results
- Empty state when no matches: "No items match 'keyword'"
- Search persists when switching between checklists (useful for finding same item in multiple checklists)
- Keyboard shortcut: Ctrl/Cmd + F focuses search

**Technical Notes:**
- Client-side filtering for performance (small data sets)
- Consider server-side search if checklists grow very large (>500 items)

**Story Points:** 3

---

### CHK-7.4: Print/PDF Export
**As a** COBRA operational user  
**I want to** print checklists or export to PDF  
**So that** field teams can use paper copies during operations

**Acceptance Criteria:**
- "Print" button in checklist header
- Print preview shows formatted checklist with: header info, all items, completion status, notes
- Option to include: completed items only, incomplete only, or all items
- Option to include notes
- PDF export maintains formatting and COBRA branding
- Checkboxes rendered as ☐ (empty) or ☑ (complete)
- Print layout optimized (remove navigation, compact spacing)
- Footer includes: printed by [user], printed date/time, page numbers

**Technical Notes:**
- Use browser print CSS media queries (@media print)
- PDF generation via browser print or server-side if more control needed
- Consider header/footer on every printed page

**Story Points:** 5

---

### CHK-7.5: Checklist Templates from Existing Instance
**As a** COBRA operational user  
**I want to** create a template from an existing checklist instance  
**So that** I can formalize ad-hoc checklists for future use

**Acceptance Criteria:**
- "Save as Template" button on instance detail view (admin users only)
- Dialog prompts for template name, description, category/tags
- All items copied to template (completion status reset)
- Notes optionally copied as item notes in template
- Confirmation shows template created with link to edit template
- Original instance unchanged
- New template appears in template library immediately

**Technical Notes:**
- API Endpoint: `POST /api/checklists/instances/{id}/save-as-template`
- Deep copy of items with status reset

**Story Points:** 3

---

### CHK-7.6: Undo Recent Action
**As a** COBRA operational user  
**I want to** undo my last checklist action  
**So that** I can correct mistakes without contacting an administrator

**Acceptance Criteria:**
- "Undo" button appears (toast notification or floating action button) after: marking item complete, changing status, adding note
- Undo available for 30 seconds after action
- Clicking undo reverts change immediately
- Toast shows: "Action undone" with optional "Redo" button
- Undo not available for: deleting items, archiving checklists, bulk operations
- Undo state clears on page navigation
- Only one level of undo (no undo history stack)

**Technical Notes:**
- Track last action in client-side state
- API must support reverting specific changes by ID/timestamp
- Consider edge cases: what if someone else modified the same item?

**Story Points:** 5

---

## Epic 8: Advanced Features

### CHK-8.1: Recurring Checklist Auto-Creation
**As a** COBRA administrator  
**I want to** automatically create checklists on a schedule  
**So that** routine checklists (daily, per-shift) are created without manual intervention

**Acceptance Criteria:**
- Configure templates with recurrence rules: daily, every X hours, per operational period
- Specify: start date/time, recurrence pattern, end condition (after N occurrences or end date)
- Auto-created instances named with timestamp: "[Template Name] - [Date/Time]"
- Assigned to default positions configured in template
- Notification sent when new instance created
- Can disable recurrence without deleting template
- Recurrence respects event active status (don't create for closed events)
- Admin view shows upcoming scheduled checklist creations

**Technical Notes:**
- Background job scheduler (Azure Functions timer trigger, Hangfire, or similar)
- Store recurrence rules in JSON configuration column
- API Endpoint: `PUT /api/checklists/templates/{id}/recurrence`

**Story Points:** 13

---

### CHK-8.2: Conditional Items
**As a** COBRA administrator  
**I want to** show/hide checklist items based on other item values  
**So that** checklists adapt dynamically to situation

**Acceptance Criteria:**
- Configure item conditions: "Show if [Item X] is [completed/specific status]"
- Conditional items hidden by default until condition met
- Condition met displays item with animation (fade in)
- Can have multiple conditions (AND/OR logic)
- Condition logic displayed in item configuration
- Conditional items don't count toward progress until visible
- Example use case: "If 'Evacuation Required' = Yes, show evacuation-specific items"

**Technical Notes:**
- ItemConditions table with parent/child item relationships and condition logic
- Client-side evaluation of conditions for performance
- Server validates conditions on update to prevent invalid states

**Story Points:** 13

---

### CHK-8.3: Checklist Item Due Dates
**As a** COBRA operational user  
**I want to** assign due dates to checklist items  
**So that** time-sensitive tasks are completed on schedule

**Acceptance Criteria:**
- Optional due date/time field on each item
- Date picker with time selection
- Items with due dates show countdown: "Due in 2 hours"
- Overdue items highlighted in red with warning icon
- Sort items by due date
- Filter: "Due today", "Due this operational period", "Overdue", "No due date"
- Dashboard shows count of overdue items across all checklists
- Notification when item becomes overdue: "[Item Name] is now overdue"
- Can extend due date with audit trail

**Technical Notes:**
- Add DueDate datetime field to items
- Background job checks for newly overdue items every 15 minutes
- Timezone handling critical (store UTC, display in event timezone)

**Story Points:** 8

---

### CHK-8.4: Priority Levels
**As a** COBRA operational user  
**I want to** assign priority levels to checklist items  
**So that** critical tasks are completed first

**Acceptance Criteria:**
- Priority options: Critical, High, Medium, Low (default: Medium)
- Priority badge displayed with item using color coding (Critical = red, High = orange, Medium = blue, Low = gray)
- Sort by priority (Critical first)
- Filter by priority
- Critical items show warning icon
- Cannot archive checklist with incomplete critical items (similar to required items)
- Dashboard shows count of incomplete critical items

**Technical Notes:**
- Add Priority enum to items
- Use C5 color palette for consistency
- Critical priority chip uses Lava Red #E42217

**Story Points:** 3

---

### CHK-8.5: Attach Files to Items
**As a** COBRA operational user  
**I want to** attach files or photos to checklist items  
**So that** I can provide supporting documentation

**Acceptance Criteria:**
- "Attach File" button on each item
- File upload dialog with drag-and-drop support
- File type restrictions: images (jpg, png, gif), documents (pdf, docx, xlsx), max 10MB per file
- Multiple attachments per item (max 10 files)
- Thumbnail preview for images
- File list shows: filename, size, uploaded by, uploaded timestamp
- Click file to download or view
- Delete attachment with confirmation (own attachments only, admins can delete any)
- Attachments included in checklist exports

**Technical Notes:**
- Azure Blob Storage for file storage
- API Endpoint: `POST /api/checklists/instances/{instanceId}/items/{itemId}/attachments`
- Generate SAS tokens for secure file access
- Virus scanning on upload

**Story Points:** 8

---

### CHK-8.6: Checklist Collaboration Chat
**As a** COBRA operational user  
**I want to** discuss checklist items with team members in real-time  
**So that** we can coordinate without leaving the checklist interface

**Acceptance Criteria:**
- Chat panel slides in from right side of checklist view
- Chat shows all messages related to this checklist instance
- Send text messages with @mention support
- Mention specific items: "See item #5"
- Message timestamp and sender (name + position)
- Real-time delivery via WebSocket
- Message history persists
- Unread message count badge
- Notifications when mentioned
- Can attach images to chat messages

**Technical Notes:**
- Reuse existing COBRA messaging infrastructure if available
- WebSocket for real-time chat
- Store messages in ChecklistMessages table with ChecklistInstanceId FK

**Story Points:** 13

---

## Epic 9: Performance and Technical

### CHK-9.1: Offline Capability
**As a** COBRA field operations user  
**I want to** view and edit checklists while offline  
**So that** I can work in areas without network connectivity

**Acceptance Criteria:**
- Checklist data caches locally (IndexedDB or localStorage)
- Offline indicator displays when network unavailable
- Can view cached checklists in read-only mode
- Can mark items complete offline (queued for sync)
- Pending changes show visual indicator (e.g., cloud with X icon)
- Auto-sync when network restored with success notification
- Conflict resolution: if same item changed offline and by someone else, show conflict dialog
- User chooses which version to keep or merges changes manually

**Technical Notes:**
- Service Worker for offline detection and caching
- Queue pending changes in IndexedDB
- Background sync API for automatic retry
- Conflict detection via version/timestamp comparison

**Story Points:** 13

---

### CHK-9.2: Performance Optimization for Large Checklists
**As a** COBRA system administrator  
**I want** checklists to perform well even with 500+ items  
**So that** users have responsive experience

**Acceptance Criteria:**
- Virtual scrolling for large item lists (render only visible items)
- Lazy load item notes/history on expand
- Debounce search input (300ms)
- Optimistic UI updates don't wait for server response
- Paginate item history if more than 50 entries
- Loading states for slow operations
- No perceived lag when marking items complete
- Support 100+ concurrent users per checklist instance

**Technical Notes:**
- Use React Virtuoso or similar for virtual scrolling
- Implement pagination on server for large result sets
- WebSocket connection pooling for many concurrent users
- Consider Redis caching for frequently accessed checklists

**Story Points:** 8

---

### CHK-9.3: API Rate Limiting and Error Handling
**As a** COBRA system administrator  
**I want** proper API rate limiting and error handling  
**So that** system remains stable under heavy load

**Acceptance Criteria:**
- Rate limit: 100 requests per minute per user
- Rate limit exceeded shows friendly message: "You're working too fast. Please wait a moment."
- Retry logic for transient failures (3 retries with exponential backoff)
- Network errors show toast: "Connection issue. Retrying..."
- Server errors (500) show: "Something went wrong. Please try again or contact support."
- User actions queued locally during outage, replay on reconnect
- No data loss from failed requests

**Technical Notes:**
- Implement rate limiting middleware in API
- Client-side retry logic with exponential backoff
- Queue pattern for critical operations

**Story Points:** 5

---

## Epic 10: Administration and Configuration

### CHK-10.1: System Settings for Checklist Module
**As a** COBRA system administrator  
**I want to** configure checklist module settings  
**So that** I can tune behavior for my organization

**Acceptance Criteria:**
- Settings page accessible from admin menu
- Configurable settings:
  - Default auto-archive after X days of inactivity
  - Enable/disable auto-create triggers globally
  - Default status options for new templates
  - Maximum items per checklist (default 1000)
  - Enable/disable specific features (dependencies, attachments, chat, etc.)
  - Real-time update frequency (WebSocket or polling interval)
- Changes take effect immediately (no restart required)
- Audit log of setting changes

**Technical Notes:**
- Store settings in SystemConfiguration table
- Cache settings in memory, refresh on change
- API Endpoint: `GET/PUT /api/system/checklist-settings`

**Story Points:** 5

---

### CHK-10.2: Audit Log for All Checklist Actions
**As a** COBRA compliance officer  
**I want to** view complete audit trail of all checklist actions  
**So that** I can meet FEMA documentation requirements

**Acceptance Criteria:**
- Audit log captures: user, position, timestamp, action type, before/after values
- Actions logged: create, edit, complete, delete, archive, restore, export
- Searchable by: date range, user, checklist, action type
- Export audit log to CSV
- Immutable log entries (cannot edit or delete)
- Log retention policy (configurable, default 7 years)
- Performance: logging doesn't slow down user operations

**Technical Notes:**
- Separate AuditLog table with partitioning by date
- Async logging to avoid blocking operations
- Index on commonly filtered fields (UserId, ChecklistInstanceId, Timestamp)

**Story Points:** 5

---

### CHK-10.3: Checklist Usage Analytics
**As a** COBRA system administrator  
**I want to** view checklist usage statistics  
**So that** I can understand adoption and optimize the system

**Acceptance Criteria:**
- Dashboard shows: total checklists created, active checklists, total items completed, average completion time
- Charts: checklists created over time, most-used templates, position usage distribution
- Filter by: date range, event, position, template category
- Identify: unused templates, most active users, peak usage times
- Export statistics to Excel
- Refresh data daily (nightly batch job)
- **Smart suggestion analytics:**
  - Click-through rate per suggestion section (Recommended, Recently Used, Other, All)
  - Percentage of checklists created via smart suggestions vs. manual search
  - Template discovery time (time from picker open to template selection)
  - Insight: "Recommended templates have 85% CTR vs. 12% for All Templates"

**Technical Notes:**
- Pre-aggregate data for performance
- API Endpoint: `GET /api/checklists/admin/usage-statistics`
- Consider Azure Application Insights for deeper analytics
- Track suggestion interactions via Application Insights custom events

**Story Points:** 8

---

## Epic 11: Import and Migration

### CHK-11.1: Import Checklist from Excel/CSV
**As a** COBRA administrator  
**I want to** import checklist items from Excel or CSV files  
**So that** I can quickly migrate existing organizational checklists without manual re-entry

**Acceptance Criteria:**
- Upload Excel (.xlsx) or CSV file via drag-and-drop or file picker
- Preview imported data with column mapping UI
- Map columns to: Item Text, Item Type, Category/Section, Notes, Display Order
- Auto-detect common column headers ("Task", "Action", "Step", "Description", "Checklist Item")
- Validate import: required fields present, character limits, duplicates highlighted
- Option to create new template or add items to existing template
- Import summary shows: items imported, items skipped (with reasons), warnings
- Undo import option within 5 minutes
- Support common Excel structures:
  - Single column lists
  - Multi-column with metadata
  - Merged cells (common in formatted checklists)
  - Multiple sheets (select which sheet to import)

**Technical Notes:**
- Use SheetJS (xlsx) library for Excel parsing
- Max file size: 5MB, max rows: 1000
- API Endpoint: `POST /api/templates/import`
- Store import history for audit
- Consider background processing for large files

**Adoption Likelihood:** Very High (95%)  
**Story Points:** 5

---

### CHK-11.2: Import from Word Document (Basic)
**As a** COBRA administrator  
**I want to** import checklist items from Word documents  
**So that** I can migrate SOPs and procedures that exist in document format

**Acceptance Criteria:**
- Upload Word (.docx) file
- Extract text content with structure recognition:
  - Numbered lists → individual items with display order
  - Bullet lists → individual items
  - Checkbox symbols (☐, □, ○) → checkbox items
  - Section headers → item categories/groups
- Preview extracted items before import
- User can:
  - Accept/reject individual items
  - Edit extracted text
  - Merge/split items
  - Add missed items manually
- Import into new or existing template
- Track import source in template metadata

**Technical Notes:**
- Use mammoth.js for Word document parsing
- Focus on structure extraction, not AI interpretation
- Max file size: 10MB
- API Endpoint: `POST /api/templates/import/word`

**Adoption Likelihood:** High (85%)  
**Story Points:** 8

---

### CHK-11.3: Cross-Event Template Availability
**As a** COBRA multi-event user  
**I want to** use templates across different events  
**So that** I don't recreate the same checklists for each incident

**Acceptance Criteria:**
- Templates exist at organization level (not event-specific)
- Creating instance associates with specific event
- Template library shows all org templates regardless of current event
- Template usage statistics show usage across all events
- "Most used in events like this" smart suggestion based on event category
- Template creator can optionally restrict to specific event types
- Event-specific templates tagged with event category restrictions

**Technical Notes:**
- Verify current architecture supports org-level templates
- Add EventCategoryRestrictions to template if needed
- Update smart suggestions to leverage cross-event usage data

**Adoption Likelihood:** High (85%)  
**Story Points:** 3

**Implementation Status:** 🟡 Partial - Architecture supports this, verify UX complete

---

## Epic 12: COBRA Deep Integration

### CHK-12.1: Link Checklist Item to C5 Attachments
**As a** COBRA operational user  
**I want to** link existing C5 attachments to specific checklist items  
**So that** evidence and documentation is associated with the task that required it

**Acceptance Criteria:**
- "Link Attachment" button on each checklist item (icon: paperclip)
- Opens C5 attachment browser filtered to current event
- Can select one or multiple attachments to link
- Linked attachments display as thumbnails/chips below item
- Click attachment to open C5 attachment viewer
- Can unlink attachment without deleting the attachment itself
- Reverse view: from attachment detail, show linked checklist items
- Links persist through checklist archive/restore
- Different from CHK-8.5 (Attach Files): this links to EXISTING attachments, not uploading new files

**Technical Notes:**
- Many-to-many relationship: ChecklistItems ↔ Attachments
- API: `POST /api/checklists/{id}/items/{itemId}/attachments/link`
- Uses existing C5 attachment infrastructure
- No file upload in checklist—just linking

**Adoption Likelihood:** High (85%)  
**Story Points:** 3

---

### CHK-12.2: Reference Document Quick Links
**As a** COBRA template administrator  
**I want to** attach reference document links to template items  
**So that** users can access SOPs, guides, and procedures directly from the checklist

**Acceptance Criteria:**
- Template editor: "Add Reference" button on each item
- Link types supported:
  - C5 Organization Files (browse and select)
  - External URL (with validation)
  - C5 Form reference (e.g., "See ICS-214")
- Reference displays as icon + label below item text
- Click reference to open document in new tab/modal
- Multiple references per item (max 5)
- References copy to instances created from template
- Instance users can view but not edit references

**Technical Notes:**
- Store references as JSON array on TemplateItem
- Reference schema: `{ type: 'orgFile' | 'url' | 'form', target: string, label: string }`
- Validate URLs server-side
- C5 org files require file picker integration

**Adoption Likelihood:** High (80%)  
**Story Points:** 5

---

### CHK-12.3: Shift Handoff Summary
**As an** incoming shift operator  
**I want to** see a structured handoff summary when taking over checklists  
**So that** I understand what's complete, what's in progress, and what needs immediate attention

**Acceptance Criteria:**
- "Generate Handoff Summary" action on checklist or from landing page
- Summary includes:
  - Checklist name, event, operational period
  - Overall progress percentage
  - Items completed this shift (with who/when)
  - Items in progress (partial status, assigned to)
  - Blocked items with notes
  - Critical/overdue items highlighted
  - Recent notes (last 4 hours)
- Outgoing user can add "Handoff Notes" free-text field
- Summary viewable as modal or exportable as PDF
- Handoff notes timestamped and attributed
- Previous handoff summaries archived and viewable
- Follows I-PASS structure: Illness severity, Patient summary, Action list, Situation awareness, Synthesis

**Technical Notes:**
- Follows I-PASS handoff structure from healthcare research
- API: `GET /api/checklists/{id}/handoff-summary`
- Store handoff notes in separate HandoffNotes table
- Consider operational period boundaries for "this shift" calculation

**Adoption Likelihood:** Very High (90%)  
**Story Points:** 5

---

### CHK-12.4: Predictive Checklist Triggering
**As a** COBRA system administrator  
**I want** checklists to be suggested or auto-created based on event data and external triggers  
**So that** operational teams are proactive rather than reactive

**Acceptance Criteria:**
- Configure triggers based on:
  - Weather data integration (NWS alerts → hurricane prep checklist)
  - Event escalation (severity increase → additional checklists)
  - Time-based patterns (08:00 daily → shift briefing checklist)
  - Operational period start (new op period → position-specific checklists)
  - Event status changes (activation, demobilization phases)
- Trigger creates notification: "Suggested: [Checklist] due to [trigger reason]"
- User can accept (create checklist) or dismiss
- Auto-create option for high-confidence triggers
- Trigger history and effectiveness analytics
- Duplicate prevention: don't suggest if instance already exists
- Admin configuration UI for trigger rules

**Technical Notes:**
- Event-driven architecture for trigger evaluation
- Integration with external data sources (NWS API, etc.)
- Background job for periodic trigger evaluation
- Store trigger rules in TriggerConfiguration table
- Consider false positive management

**Adoption Likelihood:** High (80%)  
**Story Points:** 13

---

### CHK-12.5: Suggest ICS Form Actions from Checklist
**As a** COBRA planning section chief  
**I want to** see suggestions for ICS forms that should be completed based on checklist progress  
**So that** I don't miss required documentation

**Acceptance Criteria:**
- Analysis panel shows "Suggested Forms" based on:
  - Checklist template category
  - Completed items (e.g., "Briefing complete" suggests ICS-201 update)
  - Current operational period status
- Suggestions include:
  - Form type (ICS-201, 202, 204, 214, etc.)
  - Reason for suggestion
  - "Create Form" action button
- Creating form navigates to C5 forms module with context pre-filled
- Dismissing suggestion logs it (don't show again for this instance)
- Configurable: Admin can define item-to-form mappings in template

**Technical Notes:**
- Rule-based suggestions initially, AI-enhanced later
- Configuration stored in template metadata
- Integration with C5 forms API

**Adoption Likelihood:** Medium (70%)  
**Story Points:** 8

---

## Non-Functional Requirements

### CHK-NFR-1: Accessibility (WCAG 2.1 AA Compliance)
**Requirement:** Checklist interface must be fully keyboard navigable and screen reader compatible

**Acceptance Criteria:**
- All interactive elements keyboard accessible (tab order logical)
- ARIA labels on all form controls
- Focus indicators visible (minimum 2px border, Cobalt Blue #0020C2)
- Screen reader announces status changes
- Color not sole indicator of status (use icons + text)
- Contrast ratios meet WCAG AA standards (4.5:1 for text)
- Test with NVDA and JAWS screen readers

**Story Points:** 8

---

### CHK-NFR-2: Security and Authentication
**Requirement:** All checklist operations must enforce proper authentication and authorization

**Acceptance Criteria:**
- All API endpoints require valid bearer token
- Position-based authorization enforced server-side
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize user input)
- CSRF protection on state-changing operations
- Sensitive data (if any) encrypted at rest and in transit
- Session timeout: 1 hour of inactivity
- Audit log records authentication events

**Story Points:** 5

---

### CHK-NFR-3: Performance Benchmarks
**Requirement:** Checklist operations must meet performance targets

**Acceptance Criteria:**
- Page load time: <2 seconds on 4G connection
- Item completion update: <500ms perceived latency
- Real-time update delivery: <1 second from action to broadcast
- API response time: 95th percentile <1 second
- Support 100 concurrent users per checklist instance
- Support 1000+ checklist instances per event
- Database queries optimized (no N+1 queries)

**Story Points:** 5

---

### CHK-NFR-4: Browser and Device Compatibility
**Requirement:** Checklist interface must work across common browsers and devices

**Acceptance Criteria:**
- Desktop browsers: Chrome (last 2 versions), Firefox (last 2 versions), Edge (last 2 versions), Safari (last 2 versions)
- Mobile browsers: iOS Safari (last 2 versions), Chrome Android (last 2 versions)
- Tablet support: iPad, Android tablets
- Minimum screen width: 320px (small mobile)
- Touch and mouse input supported
- Progressive enhancement (core functionality works without JavaScript)

**Story Points:** 3

---

### CHK-NFR-5: Data Backup and Recovery
**Requirement:** Checklist data must be backed up and recoverable

**Acceptance Criteria:**
- Automated daily backups to Azure Blob Storage
- Point-in-time recovery capability (last 30 days)
- Backup verification (restore test) monthly
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 24 hours
- Backup includes: templates, instances, completion history, notes, attachments

**Story Points:** 3

---

## User Scenarios (UX Validation)

The following scenarios describe typical user workflows for UX testing and validation. They are derived from [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md).

### Scenario 1: First-Time Contributor

**User:** Maria, Safety Officer, just assigned to a wildfire

**Expected Workflow:**
1. Opens app on mobile → Sees empty "My Checklists"
2. Taps "Create Checklist" button
3. Bottom sheet shows: "Recommended for Safety Officer"
4. Sees "Daily Safety Briefing" (most used by Safety Officers)
5. Taps "Use Template" → Auto-fills: Event, Op Period, Position
6. Taps "Create" → Immediately starts working on checklist

**Success Criteria:**
- Total time: **30 seconds or less**
- Training required: **5 minutes** (shown the button, told to tap it)
- Zero navigation to Template Library required

---

### Scenario 2: Experienced Contributor

**User:** John, Operations Chief, has used app many times

**Expected Workflow:**
1. Opens app → Sees 3 active checklists
2. Taps "Create Checklist" → Suggestions include "Recently Used"
3. Sees template used yesterday → One tap to reuse
4. Modifies checklist name → Creates

**Success Criteria:**
- Total time: **15 seconds**
- Training required: **Already knows the flow**

---

### Scenario 3: Readonly Observer

**User:** Inspector from regulatory agency

**Expected Workflow:**
1. Opens app → Sees checklists shared with them
2. Taps checklist → Opens detail view
3. Sees 🔒 lock icon and "Read-only access" banner
4. Can scroll through items, see completion status
5. Can view notes and history
6. **Cannot** toggle checkboxes (grayed out)

**Success Criteria:**
- Training required: **10-15 minutes** (how to navigate, export)
- Clear understanding of read-only limitations

---

### Scenario 4: Admin Creating Template

**User:** Planning Chief setting up templates for hurricane season

**Expected Workflow:**
1. Opens Template Library
2. Clicks "Create New Template"
3. Uses visual editor with drag-drop
4. Adds items from Item Library
5. Sets metadata:
   - Category: "Weather"
   - Event categories: ["Hurricane", "Tropical Storm"]
   - Recommended positions: ["Logistics Chief", "Shelter Manager"]
   - Estimated time: 20 minutes
6. Preview → Validates → Saves
7. Template immediately available to Contributors

**Success Criteria:**
- Training required: **2-4 hours** (template design, best practices)
- Can create basic template in **<15 minutes** after training

---

## Success Metrics

The following metrics define success criteria for the Checklist tool. These should be tracked via Application Insights and user testing.

### Contributor Efficiency (30-minute training goal)

| Metric | Target |
|--------|--------|
| Can create checklist in < 1 minute (after 10-minute training) | 90% of users |
| Can complete items without assistance | 95% of users |
| Prefer mobile app over desktop | 80% of users |
| Request features from Template Library | < 5% of users |

### Admin Effectiveness (3-4 hour training goal)

| Metric | Target |
|--------|--------|
| Can create basic template in < 15 minutes | 100% of trained admins |
| Can use Item Library effectively | 90% of trained admins |
| Understand analytics dashboard | 80% of trained admins |
| Can troubleshoot common user issues | 100% of trained admins |

### System Adoption

| Metric | Target |
|--------|--------|
| Instances created via smart suggestions (not manual search) | 70%+ |
| Templates used at least once per month | 60%+ |
| Templates unused after 90 days | < 10% |

---

## Open Questions (Requiring Product Decisions)

The following questions were identified during requirements gathering and need product owner decisions before implementation:

### OQ-1: Multi-Position Workflows
**Question:** Can a user have multiple positions simultaneously?

**Example:** Safety Officer + Operations Section Chief

**Considerations:**
- Should smart suggestions merge results from all positions?
- Which position is used for audit attribution?
- Current implementation: First selected position is "primary"

**Status:** 🟡 Partially addressed - Primary position used for attribution, all positions used for suggestions

---

### OQ-2: Template Visibility Filtering
**Question:** Should Contributors see ALL templates or only relevant ones?

**Options:**
1. Show all active templates in search
2. Auto-filter by user's position
3. Auto-filter by current event category

**Status:** 🟡 Smart suggestions prioritize relevant templates, but full list available via search

---

### OQ-3: Permission Inheritance
**Question:** If user is Manage at org level, are they Manage at event level?

**Considerations:**
- Can permissions be scoped to specific events?
- Should there be event-level permission overrides?

**Status:** ⚪ Not yet addressed - POC uses single permission level

---

### OQ-4: Readonly Sharing Mechanism
**Question:** How do Readonly users get access to checklists?

**Options:**
1. Explicit sharing by checklist owner
2. Automatic based on event participation
3. Shared link with access token

**Status:** ⚪ Not yet addressed - POC doesn't implement sharing

---

## Technical Debt and Documentation

### TD-1: Comprehensive API Documentation
**Description:** Document all checklist API endpoints with Swagger/OpenAPI spec

**Tasks:**
- Document request/response schemas
- Include authentication requirements
- Provide example requests/responses
- Document error codes and messages
- Add rate limiting information
- Generate interactive API documentation page

**Story Points:** 3

---

### TD-2: Component Library Documentation
**Description:** Document all React components with Storybook

**Tasks:**
- Create stories for each checklist component
- Document props and usage examples
- Include accessibility notes
- Show all component states (loading, error, empty, populated)
- Add interaction tests

**Story Points:** 5

---

### TD-3: User Guide and Training Materials
**Description:** Create end-user documentation for checklist feature

**Tasks:**
- Write step-by-step guide for common workflows
- Create video tutorials (3-5 minutes each)
- Screenshot-based quick reference guide
- FAQ document
- Admin configuration guide
- Keyboard shortcuts cheat sheet

**Story Points:** 8

---

## Future Considerations (Beyond MVP)

> See [CHECKLIST_ROADMAP.md](./CHECKLIST_ROADMAP.md) for detailed medium-term, long-term, and future vision stories.

### Future-1: Mobile Native App
- Dedicated iOS/Android apps for better offline experience
- Push notifications for checklist updates
- Native camera integration for attachments

### Future-2: AI/ML Enhancements
- Predictive item completion time estimates
- Smart template suggestions based on incident type
- Anomaly detection (e.g., "This item usually completes faster")
- Natural language processing for smart item search
- **Collaborative filtering:** "Users similar to you also used these templates"
- **Personalized recency window:** ML-based window per user (7-60 days based on usage frequency)

### Future-3: Advanced Integrations
- Integration with external task management tools (Jira, Asana)
- Two-way sync with Microsoft Planner/Tasks
- Voice input for hands-free checklist completion
- QR code scanning for item completion

### Future-4: Gamification
- Achievement badges for completion milestones
- Leaderboards (appropriate for non-crisis scenarios)
- Streak tracking for recurring checklist completion

### Future-5: Smart Suggestion Enhancements
- **Template suggestion analytics:** Track click-through rate per section, measure suggestion effectiveness
- **Time-based suggestions:** Morning = "Daily Briefing" templates, End of shift = "Shift Handoff" templates
- **Real-time suggestion updates:** WebSocket live suggestions, "3 other users just used this" badge
- **Smart auto-creation prompts:** System detects context (new operational period) and prompts "Create shift briefing?"

---

## Story Estimation Reference

**Story Points Scale:**
- **1-2 points:** Simple changes, well-understood, minimal dependencies
- **3 points:** Straightforward feature, some unknowns, standard patterns
- **5 points:** Moderate complexity, new patterns, multiple components
- **8 points:** Complex feature, significant unknowns, cross-cutting concerns
- **13 points:** Very complex, major new functionality, extensive testing needed

**Velocity Consideration:**
Your stated maximum capacity: 8 story points per sprint

**Recommended MVP for Sprint 1-2:**
- CHK-1.1 (5) + CHK-1.3 (3) = 8 points
- CHK-2.1 (5) + CHK-2.3 (5) - 2 = 8 points
- CHK-3.1 (3) + CHK-3.2 (3) + CHK-2.4 (5) - 3 = 8 points

This gives you core template management, instance creation, and basic item interaction in 3 sprints (24 points).

---

**Total Story Points (All Stories):** ~400 points  
**Estimated Timeline at 8 pts/sprint:** ~50 sprints (~12.5 months assuming 2-week sprints)

**Recommended Phased Approach:**
- **Phase 1 (MVP):** CHK-1.1-1.3, CHK-2.1-2.4, CHK-3.1-3.2, CHK-6.1 = ~40 points (5 sprints)
- **Phase 2 (Import & Integration):** CHK-11.1-11.3, CHK-12.1-12.3 = ~29 points (4 sprints)
- **Phase 3 (Collaboration):** CHK-2.7, CHK-3.3-3.4, CHK-4.1-4.2 = ~35 points (4-5 sprints)
- **Phase 4 (Advanced):** CHK-12.4-12.5, analytics, remaining features = ~80 points (10 sprints)
- **Phase 5 (Polish):** NFRs, mobile optimization, remaining features = remainder

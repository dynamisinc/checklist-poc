# Landing Page & Dashboard User Stories

> **Created:** 2025-11-29
> **Status:** Implementation Complete - Ready for User Testing
> **Epic:** Dashboard & Landing Page Experience

## Overview

This document describes user stories for the landing page/dashboard experience variants. These stories address feedback that the checklist UX "did not feel like a simple checklist and was too confusing."

The implementation provides **4 different landing page experiences** that can be switched via configuration to test what resonates with users.

---

## Epic: Landing Page Experience

### Story LP-1: Config-Based Landing Page Variants
**As a** product owner
**I want to** test different landing page layouts with my small user base (~20 users)
**So that** I can determine which UX approach best serves infrequent users under stress

**Acceptance Criteria:**
- [x] System supports 4 landing page variants: Control, Task-First, Role-Adaptive, Summary Cards
- [x] Variant can be switched via Profile Menu setting
- [x] Variant can be overridden via URL parameter (`?landing=taskFirst`)
- [x] Variant persists across sessions via localStorage
- [x] Switching variants does not require page reload
- [x] Each variant serves different user personas

**Technical Notes:**
- Configuration stored in `localStorage.landingPageVariant`
- URL parameter: `landing` (values: `control`, `taskFirst`, `roleAdaptive`, `summaryCards`)
- Uses same pattern as checklist detail variants

**Story Points:** 3

**Implementation:**
- `src/frontend/src/experiments/landingPageConfig.ts`
- `src/frontend/src/experiments/useLandingVariant.ts`
- `src/frontend/src/pages/LandingPage.tsx`

---

### Story LP-2: Task-First Minimal Landing Page
**As an** incident operator
**I want to** see a simple list of items that need my attention right now
**So that** I can complete my tasks quickly without cognitive overload

**Acceptance Criteria:**
- [x] Shows attention banner with count of incomplete items
- [x] Displays simple list of incomplete items (not cards)
- [x] Each item shows: item text, parent checklist name, status badge (if applicable)
- [x] Single tap/click navigates directly to item in checklist
- [x] Quick stats shown: active checklists count, completed today count
- [x] "Create New Checklist" button accessible
- [x] "View All Checklists" button to access full card view
- [x] Limited to 10 items with "+N more" indicator
- [x] Success state when all items complete: "All caught up!"

**Target Persona:** Operators who need quick task completion under stress

**Philosophy:** "What needs my attention right now?"

**Story Points:** 5

**Implementation:**
- `src/frontend/src/components/landing-variants/LandingTaskFirst.tsx`

---

### Story LP-3: Role-Adaptive Dashboard
**As a** section chief or incident commander
**I want to** see different views based on my role (tasks, team overview, insights)
**So that** I can switch between operator and oversight modes without navigating away

**Acceptance Criteria:**
- [x] Tabbed interface with 3 tabs: My Tasks, Team Overview, Insights
- [x] **My Tasks Tab:**
  - Shows incomplete items for current user's position
  - Same UX as Task-First variant
  - Count badge on tab
- [x] **Team Overview Tab:**
  - Table view of all checklists (not just user's position)
  - Columns: Checklist name, Position, Progress bar, Last Activity
  - Click row to navigate to checklist detail
  - Requires elevated permissions (Manage role)
- [x] **Insights Tab:**
  - Summary cards: Active checklists, Completion rate, Blocked items, In Progress items
  - List of blocked items with navigation
  - List of in-progress items
  - Success alert when no blocking issues
- [x] "Create Checklist" button accessible from all tabs

**Target Persona:** Mixed roles - operators, leadership, analysts

**Philosophy:** "Different users get what they need without separate pages"

**Story Points:** 8

**Implementation:**
- `src/frontend/src/components/landing-variants/LandingRoleAdaptive.tsx`

---

### Story LP-4: Summary Cards Landing Page
**As a** returning user
**I want to** see key statistics at a glance before diving into details
**So that** I can quickly assess my workload and prioritize

**Acceptance Criteria:**
- [x] 3 summary cards at top:
  - Incomplete Items (count, warning color if > 0, success color if 0)
  - Active Checklists (count with drill-down)
  - Completed Today (count + overall completion percentage)
- [x] Cards are clickable for drill-down
- [x] Below cards: list of top 5 items needing attention
- [x] "View all X items" link when more than 5 incomplete
- [x] Empty state when no checklists
- [x] "Create Checklist" button accessible

**Target Persona:** Users who want quick status overview before diving in

**Philosophy:** "Glanceable summary with easy drill-down"

**Story Points:** 5

**Implementation:**
- `src/frontend/src/components/landing-variants/LandingSummaryCards.tsx`

---

### Story LP-5: Control Variant (Current UX)
**As a** current user
**I want to** continue using the existing card-based layout
**So that** I don't experience disruption if the new variants don't suit me

**Acceptance Criteria:**
- [x] Card-based layout with grouped sections by operational period
- [x] Current Operational Period section most prominent
- [x] Incident-Level Checklists section
- [x] Previous Operational Periods collapsible
- [x] Filters: search, operational period, completion status
- [x] Real-time update notifications via SignalR
- [x] "Create Checklist" button with template picker dialog

**Target Persona:** Users familiar with current UX

**Story Points:** 0 (Already implemented)

**Implementation:**
- `src/frontend/src/pages/MyChecklistsPage.tsx` (existing)

---

## Non-Functional Requirements

### NFR-LP-1: Performance
- Landing page variants should load within 500ms
- Variant switching should be instantaneous (no server round-trip)
- Item click should navigate to checklist detail within 200ms

### NFR-LP-2: Accessibility
- All variants must support keyboard navigation
- Screen reader compatible
- Color contrast meets WCAG 2.1 AA standards

### NFR-LP-3: Persistence
- Variant selection persists across browser sessions
- Works across browser tabs (via storage events)

---

## Implementation Files

| File | Purpose |
|------|---------|
| `src/frontend/src/experiments/landingPageConfig.ts` | Variant configuration and storage |
| `src/frontend/src/experiments/useLandingVariant.ts` | React hook for variant state |
| `src/frontend/src/pages/LandingPage.tsx` | Variant switching wrapper |
| `src/frontend/src/components/landing-variants/LandingTaskFirst.tsx` | Task-First variant |
| `src/frontend/src/components/landing-variants/LandingRoleAdaptive.tsx` | Role-Adaptive variant |
| `src/frontend/src/components/landing-variants/LandingSummaryCards.tsx` | Summary Cards variant |
| `src/frontend/src/components/ProfileMenu.tsx` | Variant selector UI |

---

## Testing Instructions

### How to Switch Landing Page Variants

1. **Profile Menu (Recommended)**
   - Click the profile button in the top-right corner
   - Scroll to "Landing Page Variant" section
   - Select desired variant
   - Page updates immediately

2. **URL Parameter**
   - Append `?landing=taskFirst` to any URL
   - Valid values: `control`, `taskFirst`, `roleAdaptive`, `summaryCards`
   - Example: `http://localhost:5173/checklists?landing=roleAdaptive`

3. **Browser Console**
   ```javascript
   localStorage.setItem('landingPageVariant', 'taskFirst');
   location.reload();
   ```

### Test Scenarios

1. **Task-First Variant**
   - Verify incomplete items appear in list
   - Click an item and verify navigation to checklist detail
   - Create a new checklist and verify it appears
   - Complete all items and verify "All caught up!" message

2. **Role-Adaptive Variant**
   - Switch between tabs and verify content changes
   - Verify Team Overview only shows data for Manage role
   - Verify Insights shows correct blocked/in-progress counts
   - Click items in Insights and verify navigation

3. **Summary Cards Variant**
   - Verify card counts are accurate
   - Click cards and verify drill-down behavior
   - Verify "View all X items" link works

4. **Variant Persistence**
   - Set variant, close browser, reopen - verify variant persists
   - Set variant in one tab, verify it updates in another tab

---

## Future Enhancements (Backlog)

### Story LP-6: Operational Period Summary View
**As an** incoming shift supervisor
**I want to** see a summary of the current operational period
**So that** I can quickly understand the state of operations during shift handoff

**Acceptance Criteria (Proposed):**
- Summary by position: which positions have incomplete items
- Progress bars for each checklist in the period
- Timeline of recent activity
- Handoff notes section (future feature)

**Story Points:** 8 (Not implemented - backlog)

---

### Story LP-7: Event Summary Dashboard
**As an** incident commander
**I want to** see an event-level summary across all operational periods
**So that** I can assess overall incident response progress

**Acceptance Criteria (Proposed):**
- Operational period progress comparison
- Critical items across all periods
- Resource utilization metrics
- Incident timeline

**Story Points:** 13 (Not implemented - backlog)

---

## Metrics to Track

When testing with users, consider tracking:

1. **Task completion time** - How long to complete a checklist item from landing page?
2. **Navigation depth** - How many clicks to reach a specific item?
3. **Error rate** - How often do users get "lost"?
4. **Variant preference** - Which variant do users naturally settle on?
5. **Feature discovery** - Do users find and use the variant switcher?

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-29 | 1.0.0 | Initial implementation of 4 landing page variants |

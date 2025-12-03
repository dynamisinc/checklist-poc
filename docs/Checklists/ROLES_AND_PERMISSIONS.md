# Roles and Permissions - COBRA Checklist POC

> **Document Version:** 2.0.0
> **Last Updated:** 2025-12-03
> **Status:** Reference Document
> **Purpose:** Permission model design and capability reference

## Overview

The COBRA Checklist system implements a four-tier permission model aligned with C5 Design System standards. The model balances security with usability, ensuring emergency responders can access what they need without unnecessary friction.

> **📋 For user stories and acceptance criteria**, see [USER-STORIES.md](./USER-STORIES.md)
> **🔧 For implementation details**, see [SMART_SUGGESTIONS_AND_PERMISSIONS.md](./SMART_SUGGESTIONS_AND_PERMISSIONS.md)

### Design Philosophy

- **Mobile-first** - 70%+ of Contributors use mobile devices in the field
- **Minimal training** - Contributors: 30 minutes, Admins: 3-4 hours
- **Context-aware** - Smart defaults based on position and event category
- **Progressive disclosure** - Hide complexity from casual users

---

## Permission Levels

| Role | Access Level | Typical Users | Training Time |
|------|--------------|---------------|---------------|
| **None** | No access | Unauthorized users | N/A |
| **Readonly** | View only | Observers, auditors, external stakeholders | 15 minutes |
| **Contributor** | Create instances, interact with items | Field responders, section staff | **30 minutes** |
| **Manage** | Full administrative access | Incident commanders, system admins | 3-4 hours |

---

## Detailed Capabilities Matrix

### Feature Access by Role

| Feature | None | Readonly | Contributor | Manage |
|---------|------|----------|-------------|--------|
| **Navigation** |
| My Checklists (nav) | ❌ | ✅ | ✅ | ✅ |
| Template Library (nav) | ❌ | ❌ | ❌ | ✅ |
| Item Library (nav) | ❌ | ❌ | ❌ | ✅ |
| Analytics (nav) | ❌ | ❌ | ❌ | ✅ |
| **Templates** |
| View templates | ❌ | ❌ | ✅ (context only) | ✅ |
| Preview template | ❌ | ❌ | ✅ | ✅ |
| Create template | ❌ | ❌ | ❌ | ✅ |
| Edit template | ❌ | ❌ | ❌ | ✅ |
| Duplicate template | ❌ | ❌ | ❌ | ✅ |
| Archive template | ❌ | ❌ | ❌ | ✅ |
| View analytics | ❌ | ❌ | ❌ | ✅ |
| **Checklist Instances** |
| View own checklists | ❌ | ✅ | ✅ | ✅ |
| View all checklists | ❌ | ❌ | ❌ | ✅ |
| Create from template | ❌ | ❌ | ✅ | ✅ |
| Edit checklist metadata | ❌ | ❌ | ✅ (own) | ✅ |
| Archive checklist | ❌ | ❌ | ✅ (own) | ✅ |
| **Checklist Items** |
| View items | ❌ | ✅ | ✅ | ✅ |
| Toggle item completion | ❌ | ❌ | ✅ | ✅ |
| Change item status | ❌ | ❌ | ✅ | ✅ |
| Add item notes | ❌ | ❌ | ✅ | ✅ |
| Edit item text | ❌ | ❌ | ❌ | ✅ |
| Add/remove items | ❌ | ❌ | ❌ | ✅ |
| Reorder items | ❌ | ❌ | ❌ | ✅ |
| **Item Library** |
| View library | ❌ | ❌ | ❌ | ✅ |
| Create library item | ❌ | ❌ | ❌ | ✅ |
| Edit library item | ❌ | ❌ | ❌ | ✅ |
| Save template item to library | ❌ | ❌ | ❌ | ✅ |
| Add from library (template editor) | ❌ | ❌ | ❌ | ✅ |

---

## Role Details

### None - No Access

**Purpose:** Default state for unauthorized users or users not assigned to the tool.

**Access:**
- Cannot see the COBRA Checklist tool in C5
- Redirected to error page if attempting direct URL access

**Use Cases:**
- Users not involved in incident management
- Contractors without tool access
- Visitors to the C5 platform

---

### Readonly - View Only

**Purpose:** Observers who need visibility but should not modify data.

**Typical Users:**
- External auditors
- Legal/compliance reviewers
- Observers from other agencies
- Debrief participants (post-incident)

**Navigation:**
```
┌──────────────────────────────────┐
│  COBRA Checklist  [My Checklists]│  ← Only one nav item
└──────────────────────────────────┘
```

**What They See:**
- My Checklists page (filtered to checklists shared with them)
- Checklist detail pages (read-only)
- Item statuses and completion
- Item notes and history
- **Cannot** interact with checkboxes/dropdowns

**UI Indicators:**
- 🔒 Lock icon on all interactive elements
- Banner: "You have read-only access to this checklist"
- Tooltips: "Contact the checklist owner to request changes"

---

### Contributor - Field Responder

**Purpose:** Front-line users who create and work on checklists during operations.

**Typical Users:**
- Safety Officers
- Operations Section Chiefs
- Planning Section Chiefs
- Logistics Coordinators
- Finance/Admin staff
- Strike Team Leaders
- Division/Group Supervisors

**Navigation (Mobile):**
```
┌─────────────────────────────────┐
│  COBRA Checklist   [Profile ▼] │
│                                  │
│  ┌────────┐ ┌────────┐         │
│  │   My   │ │ Create │         │
│  │Checks  │ │Checklist│         │
│  └────────┘ └────────┘         │
└─────────────────────────────────┘
```

**Navigation (Desktop):**
```
┌──────────────────────────────────────────────┐
│  COBRA Checklist  [My Checklists] [Profile ▼]│
└──────────────────────────────────────────────┘
```

**What They CAN Do:**
- Create new checklist instances from approved templates
- Complete checklist items (toggle checkboxes, change status)
- Add notes to items
- Mark items as N/A
- Archive completed checklists (own only)
- View item history and attribution

**What They CANNOT Do:**
- Create or edit templates (admin task)
- Access Item Library (admin tool)
- View system analytics
- Modify template-level settings
- Permanently delete checklists

---

### Manage - System Administrator

**Purpose:** Full control over templates, analytics, and system configuration.

**Typical Users:**
- Incident Commanders
- System administrators
- Planning Chiefs (template management)
- Training coordinators

**Navigation (Full Access):**
```
┌────────────────────────────────────────────────────────────┐
│  COBRA  [My Checklists] [Template Library] [Item Library]  │
│         [Profile ▼]                                        │
└────────────────────────────────────────────────────────────┘
```

**Key Capabilities:**

#### Template Management
- Create templates from scratch or duplicate existing
- Full template editor with drag-drop reordering
- Item Library integration (save/reuse common items)
- Template validation warnings
- Archive/restore templates
- View template usage analytics

#### Item Library
- Create reusable checklist items
- Organize by category
- Track usage counts
- Add to templates with one click
- Edit library items globally

#### Analytics & Insights
- Dashboard with system metrics
- Most/least used templates
- Popular library items
- Usage trends over time
- Template effectiveness scoring

---

## Template Discovery by Role

### Contributor: Context-Driven Discovery

**Goal:** Get to work quickly with minimal navigation.

**Flow:**
```
My Checklists → Tap "Create Checklist"
    ↓
Smart Suggestions (Bottom Sheet)
    ├── 📋 Suggested for Your Position (3 templates)
    ├── 🔥 Fire Response Templates (2 templates)
    ├── 🕐 Recently Used (2 templates)
    └── 🔍 Search All Templates (escape hatch)
    ↓
Template Preview (inline)
    ↓
Quick Instance Creation (auto-filled)
    ↓
Working Checklist
```

**Design Principles:**
- **3 taps from home to working checklist**
- Zero typing required (smart defaults)
- Search available but not required
- Preview embedded in flow

### Manage: Full Library Access

**Goal:** Browse, analyze, and manage all templates.

**Flow:**
```
Template Library (dedicated page)
    ├── Analytics Dashboard (collapsible)
    ├── Search & Filters
    ├── Category Groups
    ├── Template Cards
    │   ├── Preview
    │   ├── Edit
    │   ├── Duplicate
    │   └── Analytics
    └── Create New Template
```

**Design Principles:**
- Full visibility into all templates
- Analytics for decision-making
- Bulk operations (future)
- Admin-specific actions visible

---

## Smart Template Suggestions

### Ranking Algorithm

Templates are suggested to Contributors based on additive scoring:

```
Score = PositionMatch + EventCategoryMatch + RecentlyUsed + Popularity

Where:
  PositionMatch      = +1000 points (if template.RecommendedPositions contains user's position)
  EventCategoryMatch = +500 points (if template.EventCategories matches current event)
  RecentlyUsed       = 0-200 points (scaled: 30 days ago=0, today=200)
  Popularity         = 0-100 points (capped at 50 uses, 2 points per use)
```

> **Note:** See [USER-STORIES.md](./USER-STORIES.md#story-17-smart-template-suggestions) for the authoritative specification.
> See [SMART_SUGGESTIONS_AND_PERMISSIONS.md](./SMART_SUGGESTIONS_AND_PERMISSIONS.md) for implementation details.

**Factors:**

1. **Position Match (+1000 points)** - Highest priority
   - Template metadata: `recommendedPositions: ["Safety Officer", "Ops Chief"]`

2. **Event Category Match (+500 points)**
   - Primary category: Fire, Flood, Medical, Concert, etc.
   - Template metadata: `eventCategories: ["Fire", "Wildfire"]`

3. **Recently Used (+0-200 points)**
   - User's last 5 templates within 30-day window
   - Linear decay: `(30 - daysAgo) / 30 * 200`

4. **Popularity Score (+0-100 points)**
   - Formula: `Math.Min(usageCount * 2, 100)`
   - Capped at 50 uses to prevent runaway effect

---

## References

- [USER-STORIES.md](./USER-STORIES.md) - User stories, scenarios, success metrics, open questions
- [SMART_SUGGESTIONS_AND_PERMISSIONS.md](./SMART_SUGGESTIONS_AND_PERMISSIONS.md) - Implementation details
- [../Core/USER-STORIES.md](../Core/USER-STORIES.md) - Platform-level permission stories
- [CLAUDE.md](../CLAUDE.md) - Development guide

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-03 | 2.0.0 | Refocused as reference doc; moved user scenarios, success metrics, open questions, future enhancements to USER-STORIES.md |
| 2025-11-21 | 1.0.0 | Initial document creation |

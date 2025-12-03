# COBRA Platform - Core User Stories

> **Created:** 2025-12-03
> **Status:** Active
> **Scope:** Platform-level features that apply to all tools

## Overview

This document contains user stories for **core platform functionality** that is shared across all COBRA tools (Checklists, Chat, Analytics, etc.). Tool-specific user stories are maintained in their respective directories (e.g., `docs/Checklists/USER-STORIES.md`).

### Document Organization

```
docs/
├── Core/                           # Platform-level (this document)
│   ├── USER-STORIES.md             # Core platform stories
│   └── NFR.md                      # Non-functional requirements
│
├── Checklists/                     # Checklist tool specific
│   ├── USER-STORIES.md
│   └── ...
│
├── Chat/                           # Chat tool specific
│   └── USER-STORIES.md
│
└── ... other tools
```

---

## Epic: Authentication & Authorization

### Story Core-1: Role-Based Permission System
**As a** platform administrator
**I want** a 4-tier permission system (None, Readonly, Contributor, Manage)
**So that** access to features is controlled based on user capability across all tools

**Acceptance Criteria:**
- [ ] Four permission roles defined with clear capability boundaries:
  - **None:** No access to platform
  - **Readonly:** View only, no edits (5-15 minute training)
  - **Contributor:** Create/edit own content (30 minute training)
  - **Manage:** Full administrative access (2-4 hour training)
- [ ] Permission checks enforced both client-side (UI) and server-side (API)
- [ ] Declarative permission checking via `usePermissions()` React hook
- [ ] Hook returns boolean flags for all capabilities:
  ```typescript
  const {
    canCreateTemplate,
    canEditTemplate,
    canCreateInstance,
    canViewTemplateLibrary,
    canAccessItemLibrary,
    canInteractWithItems,
    isReadonly,
    isContributor,
    isManage,
    currentRole
  } = usePermissions();
  ```
- [ ] Navigation conditionally renders based on role
- [ ] Actions conditionally display/enable based on role
- [ ] Clear visual indicators when actions are disabled due to permissions
- [ ] Hook listens to custom `profileChanged` event for reactivity
- [ ] Role stored in localStorage (POC) / JWT claims (production)

**Technical Notes:**
- POC: `usePermissions` hook reads from `localStorage.mockUserProfile`
- Production: Replace with JWT token claims from authentication provider
- Server-side: All API endpoints must validate permissions (not just client-side)
- Capability matrix documented in `docs/Core/ROLES_AND_PERMISSIONS.md`

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Frontend: `src/frontend/src/shared/hooks/usePermissions.ts`
- Documentation: `docs/Checklists/ROLES_AND_PERMISSIONS.md` (to be moved to Core)

---

### Story Core-2: Profile Management for POC Demo
**As a** POC evaluator or demo user
**I want to** easily switch between different positions and permission roles
**So that** I can test and demonstrate role-based functionality without authentication

**Acceptance Criteria:**
- [ ] **Profile Menu** accessible from app header (avatar/profile icon)
- [ ] **Position selection:**
  - Checkbox list of common ICS positions
  - Can select multiple positions simultaneously
  - Primary position = first selected position (used for attribution)
  - Positions: Safety Officer, Operations Section Chief, Planning Section Chief, Logistics Section Chief, Finance/Admin Section Chief, Public Information Officer, Liaison Officer, Incident Commander
- [ ] **Role selection:**
  - Dropdown with four options: None, Readonly, Contributor, Manage
  - Each option shows description of capabilities
  - Role displayed with visual indicator (badge)
- [ ] **Profile persistence:**
  - Uses localStorage key: `mockUserProfile`
  - Stores: `{ positions: string[], role: PermissionRole }`
  - Survives page refresh and browser restart
- [ ] **Reactivity:**
  - Changing profile immediately updates entire app
  - Custom `profileChanged` event broadcasts change
  - `usePermissions` hook listens and re-evaluates
  - Navigation items refresh based on new role
  - No page refresh required
- [ ] **Cross-tab synchronization:**
  - Storage event listener syncs profile across browser tabs
  - Changing profile in one tab updates all tabs
- [ ] **Visual feedback:**
  - Current position(s) and role displayed in profile menu header
  - Active selections highlighted
  - Auto-save behavior (no explicit save button)
  - Success indicator when profile changes applied
- [ ] **Mobile optimization:**
  - Touch targets minimum 48x48 pixels
  - Menu accessible and usable on mobile devices

**Technical Notes:**
- Component: `ProfileMenu.tsx`
- localStorage key: `mockUserProfile`
- Custom event: `window.dispatchEvent(new Event('profileChanged'))`
- Production replacement: Read position/role from JWT token claims
- Server-side: No authentication in POC (would require JWT validation in production)

**Story Points:** 3

**Implementation Status:** ✅ Complete
- Frontend: `src/frontend/src/core/components/ProfileMenu.tsx`

---

### Story Core-3: Multi-Position User Support
**As a** COBRA user with multiple ICS responsibilities
**I want to** select and maintain multiple positions in my profile
**So that** I can access content and see suggestions relevant to all my roles

**Acceptance Criteria:**
- [ ] Checkbox list allows selecting multiple positions simultaneously
- [ ] Primary position = first selected position (used for audit attribution)
- [ ] All selected positions displayed in profile menu header
- [ ] Tools that use position context (e.g., smart suggestions) consider all positions
- [ ] Position badges show all active positions where relevant
- [ ] Switching positions does not require page reload
- [ ] Position array stored in profile: `{ positions: ["Safety Officer", "Operations Chief"], ... }`

**Technical Notes:**
- Multi-position support is foundational for tools like Checklists (smart suggestions merge from all positions)
- Each tool defines how it uses multi-position context in its own user stories

**Story Points:** 2

**Implementation Status:** ✅ Complete (included in Core-2)

---

### Story Core-4: Readonly User Visual Indicators
**As a** Readonly user (auditor, observer, or stakeholder)
**I want to** see clear visual indicators of my read-only status
**So that** I understand what I can and cannot do without confusion

**Acceptance Criteria:**
- [ ] 🔒 Lock icon appears on all interactive elements (buttons, checkboxes, dropdowns, text fields)
- [ ] Contextual banner at top of editable views: "You have read-only access to this [item]"
- [ ] Tooltips on disabled elements: "Contact the owner to request changes" or similar
- [ ] Grayed-out styling on all disabled controls (opacity or color change)
- [ ] Create/Edit/Delete buttons hidden entirely (not just disabled)
- [ ] View-only actions remain functional:
  - Export/Download
  - Print
  - Copy link/Share (if applicable)
  - Search/Filter
  - Expand/Collapse sections
- [ ] Readonly indicator in navigation or header showing current access level

**Technical Notes:**
- Pattern applies consistently across all tools
- Each tool implements these indicators for its specific UI components
- Use shared COBRA styled components for consistency

**Story Points:** 3

**Implementation Status:** 🚧 Partial (pattern defined, not fully implemented across all tools)

---

## Epic: Platform Observability

### Story Core-5: Application Insights Integration
**As a** platform administrator
**I want** comprehensive application telemetry via Azure Application Insights
**So that** I can monitor system health, diagnose issues, and track usage across all tools

**Acceptance Criteria:**
- [ ] **Request telemetry:**
  - All HTTP requests logged with duration, status code, URL
  - User context included (email, position, role)
  - Request/response size tracked
- [ ] **Exception tracking:**
  - All unhandled exceptions captured with full stack traces
  - Exception type, message, and context logged
  - Correlation IDs for tracing across services
- [ ] **Custom events:**
  - Key platform operations logged as custom events
  - Tool-specific events defined in respective tool stories
  - Example events: `UserProfileChanged`, `PermissionDenied`, `SessionStarted`
- [ ] **Performance metrics:**
  - API response times (P50, P95, P99)
  - Database query durations
  - Frontend page load times (if client-side SDK added)
- [ ] **User attribution:**
  - All telemetry includes user email (when available)
  - Position and role included in custom dimensions
- [ ] **Configuration:**
  - Connection string configurable via `appsettings.json`
  - Can disable in development via configuration
  - Sampling rate configurable for high-volume scenarios
- [ ] **Documentation:**
  - Kusto query examples for common scenarios documented
  - Setup guide for Azure portal configuration
  - Dashboard template for key metrics

**Technical Notes:**
- Package: `Microsoft.ApplicationInsights.AspNetCore`
- Configuration in `appsettings.json`: `ApplicationInsights.ConnectionString`
- Registered in `Program.cs`: `builder.Services.AddApplicationInsightsTelemetry()`
- Custom events via `TelemetryClient.TrackEvent()`

**Story Points:** 5

**Implementation Status:** ✅ Complete
- Backend: Application Insights configured in `Program.cs`
- Documentation: `docs/AZURE_APP_INSIGHTS_SETUP.md`

---

### Story Core-6: Structured Logging Standards
**As a** developer or support engineer
**I want** consistent, structured logging across all platform components
**So that** I can efficiently diagnose issues and trace operations

**Acceptance Criteria:**
- [ ] **Log levels used consistently:**
  - **Debug:** Detailed diagnostic information (disabled in production)
  - **Information:** Normal operations, CRUD with entity IDs
  - **Warning:** Not found cases, fallback scenarios, degraded operations
  - **Error:** Exceptions, validation failures, authorization failures
  - **Critical:** System failures, data corruption risks
- [ ] **Required context in all logs:**
  - Timestamp (UTC)
  - Log level
  - User email (when authenticated)
  - User position (when available)
  - Operation/method name
  - Entity ID (when applicable)
  - Correlation ID (for request tracing)
- [ ] **Sensitive data handling:**
  - Passwords, tokens, secrets NEVER logged
  - PII logged only at Debug level (disabled in production)
  - Connection strings redacted
- [ ] **Log output:**
  - Console output in development
  - Application Insights in production
  - Structured JSON format for machine parsing
- [ ] **Log retention:**
  - Minimum 90 days in production
  - Configurable via Application Insights settings

**Technical Notes:**
- Use `ILogger<T>` dependency injection pattern
- Structured logging with named parameters: `_logger.LogInformation("Created {EntityType} with ID {EntityId}", "Template", id)`
- Configure in `appsettings.json` under `Logging` section

**Story Points:** 3

**Implementation Status:** ✅ Complete (pattern established)
- Logging configured in all service classes
- Application Insights integration captures logs

---

## Epic: User Experience Foundation

### Story Core-7: COBRA Design System Compliance
**As a** COBRA platform user
**I want** a consistent visual experience across all tools
**So that** I can navigate and use the platform intuitively

**Acceptance Criteria:**
- [ ] All UI components use COBRA styled components (not raw MUI)
- [ ] Color palette from `cobraTheme.ts` used consistently:
  - Primary: Cobalt Blue (#0020C2)
  - Error/Delete: Lava Red (#E42217)
  - Success: Green (#008000)
  - Selected/Highlight: White Blue (#DBE9FA)
- [ ] Typography: Roboto font family throughout
- [ ] Spacing constants from `CobraStyles.ts`:
  - `Padding.MainWindow` (18px)
  - `Padding.DialogContent` (15px)
  - `Spacing.FormFields` (12px)
- [ ] Button standards:
  - Minimum 48x48 pixels (touch targets)
  - Primary (filled) for main actions
  - Secondary (outlined) for supporting actions
  - Link style for cancel/navigation
- [ ] Button order in dialogs: Cancel (left) → Delete (center) → Save (right)
- [ ] Mobile-responsive layouts (breakpoints at 600px, 900px, 1200px)

**Technical Notes:**
- Theme: `src/frontend/src/theme/cobraTheme.ts`
- Styled components: `src/frontend/src/theme/styledComponents/`
- Style constants: `src/frontend/src/theme/CobraStyles.ts`
- Documentation: `docs/COBRA_STYLING_INTEGRATION.md`

**Story Points:** 0 (Already implemented - reference story)

**Implementation Status:** ✅ Complete

---

### Story Core-8: Error Handling and User Feedback
**As a** platform user
**I want** clear feedback when operations succeed or fail
**So that** I know the result of my actions and can recover from errors

**Acceptance Criteria:**
- [ ] **Success feedback:**
  - Toast notification for successful operations: "Template saved successfully"
  - Toast auto-dismisses after 5 seconds
  - Toast can be manually dismissed
- [ ] **Error feedback:**
  - Toast notification for errors with user-friendly message
  - Technical details hidden (logged to console/App Insights)
  - Actionable guidance when possible: "Please try again" or "Contact support"
  - Error toast persists until dismissed (doesn't auto-dismiss)
- [ ] **Loading states:**
  - Loading indicator during async operations
  - Buttons disabled during submission
  - Skeleton loaders for content areas
- [ ] **Validation feedback:**
  - Inline validation errors on form fields
  - Error messages clear and specific: "Name is required" not "Invalid input"
  - Validation on blur and on submit
- [ ] **Network error handling:**
  - "Connection issue. Retrying..." message with retry logic
  - Offline indicator when network unavailable
  - Queued operations indicator (if offline support enabled)
- [ ] **404/Not Found handling:**
  - Friendly message: "[Item] not found"
  - Navigation options to return to valid state

**Technical Notes:**
- Toast library: `react-toastify`
- Error boundary: `src/frontend/src/core/components/ErrorBoundary.tsx`
- API error handling in `src/frontend/src/core/services/api.ts`

**Story Points:** 5

**Implementation Status:** 🚧 Partial

---

## Epic: Demo and Testing Support

### Story Core-9: Platform Demo Seed Data
**As a** demo facilitator or evaluator
**I want** realistic seed data pre-loaded in the platform
**So that** I can demonstrate capabilities without manual setup

**Acceptance Criteria:**
- [ ] Seed data available for all active tools
- [ ] Data represents realistic scenarios (emergency management context)
- [ ] Multiple user personas represented in sample data
- [ ] SQL seed scripts provided (`database/seed-*.sql`)
- [ ] EF Core seed data in migrations (optional)
- [ ] Documentation on how to reset to seed state
- [ ] Seed data includes metadata for smart features (e.g., RecommendedPositions)

**Technical Notes:**
- Tool-specific seed data defined in respective tool stories
- Core platform provides structure; tools provide content
- Reset script: `database/reset-to-seed.sql` (drops and recreates)

**Story Points:** 2

**Implementation Status:** 🚧 Partial (Checklist seed data complete)

---

## Cross-Reference: Tool-Specific Extensions

Each tool extends core platform stories with tool-specific requirements:

### Checklists Tool
- **Extends Core-1:** Contributor can only archive own checklists (ownership check)
- **Extends Core-5:** Custom events: `ChecklistCreated`, `ItemCompleted`, `TemplateCreated`
- **Extends Core-9:** 3 sample templates (Safety, ICS Forms, Logistics)

### Chat Tool
- **Extends Core-1:** Channel-specific permissions (owner, member, viewer)
- **Extends Core-5:** Custom events: `MessageSent`, `ChannelCreated`, `ExternalMessageReceived`
- **Extends Core-9:** Sample channels and messages

See respective `docs/[Tool]/USER-STORIES.md` for full details.

---

## Story Estimation Reference

**Story Points Scale:**
- **1-2 points:** Simple changes, well-understood, minimal dependencies
- **3 points:** Straightforward feature, some unknowns, standard patterns
- **5 points:** Moderate complexity, new patterns, multiple components
- **8 points:** Complex feature, significant unknowns, cross-cutting concerns
- **13 points:** Very complex, major new functionality, extensive testing needed

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-03 | 1.0.0 | Initial creation - extracted platform stories from Checklists docs |

---

## References

- [Core NFR.md](./NFR.md) - Platform non-functional requirements
- [COBRA Styling Guide](../COBRA_STYLING_INTEGRATION.md) - Design system documentation
- [CLAUDE.md](../CLAUDE.md) - Development guide for AI assistants
- [Checklists User Stories](../Checklists/USER-STORIES.md) - Checklist tool specific stories

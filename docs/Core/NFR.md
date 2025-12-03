# COBRA Platform - Non-Functional Requirements

> **Created:** 2025-12-03
> **Status:** Active
> **Scope:** Platform-level NFRs that apply to all tools

## Overview

This document defines non-functional requirements (NFRs) for the COBRA platform. These requirements apply across all tools and establish baseline quality standards.

Tool-specific NFRs are documented in their respective `docs/[Tool]/` directories.

---

## NFR-1: Training Time Requirements

**Requirement:** System must be learnable within role-specific training windows to support infrequent users under stress.

**Rationale:** COBRA users access the system during emergencies, often with months between uses. The interface must be self-explanatory and minimize cognitive load.

### Acceptance Criteria

| Role | Max Training Time | Success Metric |
|------|------------------|----------------|
| **Readonly** | 5-15 minutes | Can navigate to any content, export data |
| **Contributor** | 30 minutes | Can create content and complete tasks without assistance |
| **Manage** | 2-4 hours | Can configure system, create templates, manage users |

### Measurement

- [ ] Readonly users productive within 15 minutes (measured: time to first successful export)
- [ ] 90% of Contributors can complete primary task in <1 minute after 10-minute training
- [ ] 95% of Contributors can complete tasks without assistance after full training
- [ ] Manage users can create a template within 15 minutes after training

### Design Implications

- Progressive disclosure: Hide advanced options initially
- Smart defaults: Auto-populate from context
- Self-explanatory labels: Avoid domain jargon
- Immediate feedback: Users should never wonder "did that work?"
- Forgiving design: Easy recovery from mistakes (soft delete, undo)

---

## NFR-2: Logging Standards

**Requirement:** All operations must be logged with consistent format and appropriate level for diagnostics and audit compliance.

### Log Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **Debug** | Detailed diagnostic info (disabled in production) | Variable values, loop iterations |
| **Information** | Normal operations | CRUD operations, entity IDs, user actions |
| **Warning** | Not found cases, fallback scenarios | Missing optional data, degraded service |
| **Error** | Exceptions, validation failures | API errors, auth failures |
| **Critical** | System failures | Database unavailable, data corruption |

### Required Context

All log entries must include:
- [ ] Timestamp (UTC ISO 8601 format)
- [ ] Log level
- [ ] Logger name (class/component)
- [ ] Message with structured parameters
- [ ] Correlation ID (for request tracing)

When available:
- [ ] User email
- [ ] User position
- [ ] Entity ID
- [ ] Operation name

### Sensitive Data

- [ ] Passwords, tokens, secrets: **NEVER** logged
- [ ] PII: Only at Debug level (disabled in production)
- [ ] Connection strings: Redacted
- [ ] Request bodies: Logged at Debug only, with sensitive fields masked

### Log Retention

- Production: Minimum 90 days
- Development: 7 days
- Configurable via Application Insights settings

### Example

```csharp
// ✅ GOOD - Structured logging with context
_logger.LogInformation(
    "Created {EntityType} {EntityId} by {UserEmail} in position {Position}",
    "Template",
    template.Id,
    userContext.Email,
    userContext.Position
);

// ❌ BAD - String interpolation, missing context
_logger.LogInformation($"Created template {template.Id}");
```

---

## NFR-3: Performance Benchmarks

**Requirement:** Platform operations must meet performance targets to support real-time collaboration during emergencies.

### Response Time Targets

| Operation | Target (P95) | Maximum |
|-----------|--------------|---------|
| Page load (initial) | <2 seconds | 5 seconds |
| Page load (subsequent) | <1 second | 2 seconds |
| API response (read) | <500ms | 1 second |
| API response (write) | <1 second | 2 seconds |
| Real-time update delivery | <1 second | 3 seconds |
| Item completion (perceived) | <200ms | 500ms |

### Scalability Targets

- [ ] Support 100 concurrent users per tool instance
- [ ] Support 1000+ active entities per tool (e.g., checklists, channels)
- [ ] Database queries optimized (no N+1 queries)
- [ ] API pagination for large result sets (>50 items)

### Measurement

- Application Insights tracks P50, P95, P99 response times
- Load testing before major releases
- Performance regression alerts configured

---

## NFR-4: Accessibility (WCAG 2.1 AA)

**Requirement:** Platform must be fully accessible to users with disabilities, meeting WCAG 2.1 AA standards.

### Acceptance Criteria

- [ ] All interactive elements keyboard accessible (logical tab order)
- [ ] ARIA labels on all form controls
- [ ] Focus indicators visible (minimum 2px border, Cobalt Blue #0020C2)
- [ ] Screen reader announces status changes
- [ ] Color not sole indicator of status (use icons + text)
- [ ] Contrast ratios meet AA standards (4.5:1 for text, 3:1 for large text)
- [ ] Text resizable to 200% without loss of content
- [ ] No content flashes more than 3 times per second

### Testing

- [ ] Tested with NVDA screen reader
- [ ] Tested with JAWS screen reader
- [ ] Keyboard-only navigation verified
- [ ] axe-core automated testing in CI pipeline

---

## NFR-5: Browser and Device Compatibility

**Requirement:** Platform must work across common browsers and devices used by emergency management personnel.

### Desktop Browsers

| Browser | Versions | Status |
|---------|----------|--------|
| Chrome | Last 2 major versions | Required |
| Firefox | Last 2 major versions | Required |
| Edge | Last 2 major versions | Required |
| Safari | Last 2 major versions | Required |

### Mobile Browsers

| Browser | Versions | Status |
|---------|----------|--------|
| iOS Safari | Last 2 major versions | Required |
| Chrome Android | Last 2 major versions | Required |

### Device Support

- [ ] Minimum screen width: 320px (small mobile)
- [ ] Tablet support: iPad, Android tablets
- [ ] Touch and mouse input supported
- [ ] Responsive breakpoints: 600px (sm), 900px (md), 1200px (lg)

### Progressive Enhancement

- [ ] Core functionality works without JavaScript (graceful degradation)
- [ ] Enhanced features require modern browser capabilities
- [ ] Clear messaging when browser doesn't support required features

---

## NFR-6: Security

**Requirement:** Platform must protect user data and prevent unauthorized access.

### Authentication (Production)

- [ ] All API endpoints require valid bearer token
- [ ] Session timeout: 1 hour of inactivity
- [ ] Token refresh mechanism
- [ ] Multi-factor authentication support (future)

### Authorization

- [ ] Role-based authorization enforced server-side
- [ ] Position-based authorization where applicable
- [ ] Resource ownership validation (e.g., can only edit own content)
- [ ] Audit log records authorization events

### Data Protection

- [ ] SQL injection prevention (parameterized queries via EF Core)
- [ ] XSS prevention (output encoding, Content Security Policy)
- [ ] CSRF protection on state-changing operations
- [ ] Sensitive data encrypted at rest (Azure SQL TDE)
- [ ] All traffic encrypted in transit (HTTPS/TLS 1.2+)

### POC Exceptions

For POC phase, the following are deferred:
- Real authentication (using mock middleware)
- Multi-factor authentication
- Full penetration testing

---

## NFR-7: Data Backup and Recovery

**Requirement:** Platform data must be backed up and recoverable to meet FEMA audit requirements.

### Backup Requirements

- [ ] Automated daily backups to Azure Blob Storage
- [ ] Point-in-time recovery capability (last 30 days)
- [ ] Backup verification (restore test) monthly
- [ ] Geo-redundant backup storage

### Recovery Objectives

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | 4 hours |
| **RPO** (Recovery Point Objective) | 24 hours |

### Backup Scope

Includes:
- All database tables (templates, instances, items, users, audit logs)
- File attachments (Azure Blob Storage)
- Configuration data

Excludes:
- Application logs (retained in Application Insights)
- Temporary/cache data

---

## NFR-8: Audit Compliance

**Requirement:** All data modifications must be traceable for FEMA audit compliance.

### Audit Fields

All entities must include:
- [ ] `CreatedBy` - Email of creator
- [ ] `CreatedByPosition` - ICS position of creator
- [ ] `CreatedAt` - UTC timestamp
- [ ] `LastModifiedBy` - Email of last modifier
- [ ] `LastModifiedByPosition` - Position of last modifier
- [ ] `LastModifiedAt` - UTC timestamp

For soft-deleted entities:
- [ ] `ArchivedBy` - Email of user who archived
- [ ] `ArchivedAt` - UTC timestamp of archival
- [ ] `IsArchived` - Boolean flag

### Audit Log

- [ ] Separate audit log table for sensitive operations
- [ ] Immutable entries (cannot edit or delete)
- [ ] Retention: 7 years minimum (FEMA requirement)
- [ ] Searchable by: date range, user, entity, action type

### Automatic Population

- [ ] Audit fields NOT in request DTOs
- [ ] Service layer automatically populates from UserContext
- [ ] Prevents client-side tampering

---

## NFR-9: Availability

**Requirement:** Platform must be available during emergency operations.

### Availability Target

- [ ] 99.5% uptime (allows ~44 hours downtime/year)
- [ ] Planned maintenance during low-usage windows (announced 48 hours ahead)
- [ ] Unplanned downtime communicated within 15 minutes

### Monitoring

- [ ] Health check endpoint: `GET /health`
- [ ] Uptime monitoring via Azure Application Insights
- [ ] Alerting for downtime >5 minutes
- [ ] Status page for users (future)

### Graceful Degradation

- [ ] Read operations continue if write database unavailable
- [ ] Offline mode for critical features (future)
- [ ] Clear user messaging during degraded state

---

## NFR-10: Internationalization (Future)

**Requirement:** Platform should be designed for future internationalization support.

### Current State (POC)

- English only
- US date/time formats
- US timezone handling

### Future-Ready Design

- [ ] All user-facing strings externalized (not hardcoded)
- [ ] Date/time stored as UTC, displayed in user timezone
- [ ] Number formatting uses locale-aware functions
- [ ] RTL layout support in CSS (future)
- [ ] No text embedded in images

---

## Summary Matrix

| NFR | Priority | Status |
|-----|----------|--------|
| NFR-1: Training Time | High | ✅ Design complete |
| NFR-2: Logging Standards | High | ✅ Implemented |
| NFR-3: Performance | High | 🚧 Partial |
| NFR-4: Accessibility | Medium | 🚧 Partial |
| NFR-5: Browser Compatibility | High | ✅ Implemented |
| NFR-6: Security | High | 🚧 POC exceptions |
| NFR-7: Backup/Recovery | Medium | ✅ Azure defaults |
| NFR-8: Audit Compliance | High | ✅ Implemented |
| NFR-9: Availability | Medium | ✅ Azure defaults |
| NFR-10: Internationalization | Low | 📋 Future |

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-03 | 1.0.0 | Initial creation - consolidated platform NFRs |

---

## References

- [Core User Stories](./USER-STORIES.md) - Platform functional requirements
- [UI Patterns](../UI_PATTERNS.md) - UX design guidelines
- [CLAUDE.md](../CLAUDE.md) - Development guide

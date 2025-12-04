# COBRA Teams Integration Documentation

## Overview

This folder contains comprehensive documentation for the Microsoft Teams integration with COBRA's Unified Communications (UC) system. The integration enables bi-directional messaging between Microsoft Teams channels and COBRA event channels.

**Epic:** UC-TI (Unified Communications - Teams Integration)

---

## Document Index

### Planning & Requirements

| Document | Audience | Description |
|----------|----------|-------------|
| [TEAMS-INTEGRATION-USER-STORIES.md](../TEAMS-INTEGRATION-USER-STORIES.md) | Product, Dev | Complete user stories with UC-TI prefix |

### Customer-Facing Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [TEAMS-CUSTOMER-INSTALLATION-GUIDE.md](TEAMS-CUSTOMER-INSTALLATION-GUIDE.md) | IT Admins | Step-by-step installation walkthrough |
| [TEAMS-O365-PERMISSION-REQUIREMENTS.md](TEAMS-O365-PERMISSION-REQUIREMENTS.md) | Security, Compliance | Detailed permission analysis and approval checklist |
| [TEAMS-ADMIN-CENTER-DEPLOYMENT-GUIDE.md](TEAMS-ADMIN-CENTER-DEPLOYMENT-GUIDE.md) | Teams Admins | Org-wide deployment via Admin Center |
| [TEAMS-END-USER-GUIDE.md](TEAMS-END-USER-GUIDE.md) | End Users | How to use the integration day-to-day |

### Developer Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| [TEAMS-DEVELOPER-DOCUMENTATION.md](TEAMS-DEVELOPER-DOCUMENTATION.md) | Developers | Architecture, implementation, troubleshooting |
| [TEAMS-SIDELOADING-GUIDE.md](TEAMS-SIDELOADING-GUIDE.md) | Developers, QA | Testing and local development setup |
| [TEAMS-VIDEO-WALKTHROUGH-SCRIPT.md](TEAMS-VIDEO-WALKTHROUGH-SCRIPT.md) | Training | Script for demo/training video |

---

## User Story Reference

All user stories use the **UC-TI** prefix (Unified Communications - Teams Integration):

### Feature Groups

| Feature | Stories | Description |
|---------|---------|-------------|
| Bot Development | UC-TI-001 to UC-TI-006 | Core bot infrastructure |
| COBRA Integration | UC-TI-007 to UC-TI-012 | Database, services, SignalR |
| Customer Onboarding | UC-TI-013 to UC-TI-017 | Installation, permissions, setup |
| Channel Management | UC-TI-018 to UC-TI-021 | Linking/unlinking Teams channels |
| Message Display | UC-TI-022, UC-TI-023 | UI for Teams messages in COBRA |
| Error Handling | UC-TI-024, UC-TI-025 | Resilience and recovery |
| Documentation | UC-TI-026 to UC-TI-028 | Guides and training materials |

---

## Implementation Phases

### Phase 1: Bot Foundation
- UC-TI-001: Create Bot Framework SDK project
- UC-TI-002: Register Azure Bot Service
- UC-TI-003: Create Azure AD App Registration
- UC-TI-006: Local development environment
- UC-TI-005: Teams App Manifest

### Phase 2: Basic Integration
- UC-TI-007: Integrate with UC POC database
- UC-TI-008: Store conversation references
- UC-TI-009: Implement inbound message handler
- UC-TI-010: Implement outbound proactive messaging
- UC-TI-011: Create external channel mapping

### Phase 3: RSC & Full Bi-Directional
- UC-TI-004: Configure RSC permissions
- UC-TI-022: Display Teams messages in COBRA
- UC-TI-023: Display Teams channels in channel list
- UC-TI-012: Integrate with announcements broadcast

### Phase 4: Channel Management
- UC-TI-018: List available Teams for linking
- UC-TI-019: Link Teams channel to COBRA event
- UC-TI-020: Unlink Teams channel
- UC-TI-021: Handle bot removal from team
- UC-TI-017: Create in-app onboarding flow

### Phase 5: Customer Deployment & Documentation
- UC-TI-013: Customer installation guide
- UC-TI-014: O365 tenant permission requirements
- UC-TI-015: Teams Admin Center deployment
- UC-TI-016: Sideloading for testing
- UC-TI-026: Developer documentation
- UC-TI-027: End user guide

### Phase 6: Hardening
- UC-TI-024: Handle Teams API failures
- UC-TI-025: Handle conversation reference expiration
- UC-TI-028: Video walkthrough

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Bot Framework | Microsoft Bot Framework SDK v4 |
| Runtime | .NET 8 / ASP.NET Core |
| Database | SQL Server (shared with UC POC) |
| Real-time | SignalR (shared with UC POC) |
| Cards | Adaptive Cards v1.4 |
| Hosting | Azure App Service (or Azure Functions) |
| Auth | Azure AD + RSC |

---

## Key Dependencies

### Internal Dependencies
- UC POC Infrastructure (UC-001 through UC-025)
- `IChatService` interface
- `IChannelService` interface
- SignalR hub configuration
- `PocDbContext` and database schema

### External Dependencies
- Azure subscription (Bot Service registration - free tier)
- Microsoft 365 tenant for testing
- Azure AD App Registration

---

## Complexity Comparison with GroupMe

| Aspect | GroupMe | Teams Bot |
|--------|---------|-----------|
| Outbound | Simple HTTP POST | Proactive messaging with ConversationReference |
| Inbound | Webhook callback | Bot Framework Activity handler |
| Auth Setup | Access token | Azure AD App + Bot Registration |
| Customer Setup | Share group link | Install Teams app in team |
| Receive All Messages | Automatic | Requires RSC permissions |
| SDK Support | None (raw HTTP) | Full Bot Framework SDK |
| Development Effort | 1-2 days | 5-7 days |

---

## Quick Links

### Microsoft Documentation
- [Bot Framework SDK](https://docs.microsoft.com/en-us/azure/bot-service/)
- [Teams Platform](https://docs.microsoft.com/en-us/microsoftteams/platform/)
- [RSC Permissions](https://docs.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Adaptive Cards](https://adaptivecards.io/)

### Azure Resources
- [Azure Portal](https://portal.azure.com)
- [Teams Admin Center](https://admin.teams.microsoft.com)
- [Teams Developer Portal](https://dev.teams.microsoft.com)

---

## Document Maintenance

| Document | Owner | Review Frequency |
|----------|-------|------------------|
| User Stories | Product | Per sprint |
| Customer Guides | Customer Success | Quarterly |
| Developer Docs | Engineering | Per release |
| Permission Docs | Security | Annually |

---

*Last Updated: December 2025*

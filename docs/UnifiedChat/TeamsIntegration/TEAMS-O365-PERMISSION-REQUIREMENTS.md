# COBRA Teams Integration - O365 Tenant Permission Requirements

## Overview

This document details all permissions required by the COBRA Communications bot for Microsoft Teams integration. It is intended for IT administrators, security teams, and compliance officers who need to evaluate and approve the integration.

---

## Executive Summary

| Category | Permissions Required | Risk Level | Admin Consent |
|----------|---------------------|------------|---------------|
| Azure AD | 1 (User.Read) | Low | No |
| RSC (Teams) | 2 (Channel messages, Team settings) | Medium | Team Owner |
| Graph API | None | N/A | N/A |

**Key Points:**
- No tenant-wide admin consent required
- Permissions are scoped to teams where the bot is installed
- No access to private chats, emails, or files
- Read-only access (bot cannot modify or delete messages)

---

## Permission Categories

### 1. Azure AD Application Permissions

These permissions are configured in the Azure AD app registration and apply to the bot's identity.

| Permission | Type | Consent Type | Description |
|------------|------|--------------|-------------|
| `User.Read` | Delegated | User | Read the signed-in user's basic profile |

**What this allows:**
- Bot can identify users who interact with it
- Required for linking COBRA accounts to Teams users
- Does NOT allow reading other users' profiles

**What this does NOT allow:**
- Access to user's email, calendar, or files
- Access to other users' information
- Any write/modify operations

---

### 2. Resource-Specific Consent (RSC) Permissions

RSC permissions are Teams-specific and are granted by Team Owners when the app is installed. These permissions are scoped only to the team(s) where the bot is installed.

| Permission | Type | Granted By | Scope |
|------------|------|-----------|-------|
| `ChannelMessage.Read.Group` | Application | Team Owner | Installed team only |
| `TeamSettings.Read.Group` | Application | Team Owner | Installed team only |

#### ChannelMessage.Read.Group

**Purpose:** Enables the bot to receive all channel messages without requiring @mentions.

**What this allows:**
- Bot receives a copy of every message posted in channels of the installed team
- Includes message content, sender name, timestamp, and attachments
- Messages are forwarded to COBRA for unified communications view

**What this does NOT allow:**
- Access to messages in teams where bot is NOT installed
- Access to private chats between users
- Ability to modify or delete messages
- Access to message history before bot installation (by default)

#### TeamSettings.Read.Group

**Purpose:** Enables the bot to read team and channel metadata.

**What this allows:**
- Read team name, description, and settings
- Read list of channels in the team
- Read channel names and descriptions

**What this does NOT allow:**
- Modify team or channel settings
- Create or delete channels
- Access team membership or user details

---

### 3. Tenant-Level Settings Required

The following tenant settings must be configured to allow the bot to function:

| Setting | Location | Required Value | Default |
|---------|----------|----------------|---------|
| Custom apps | Teams Admin Center → Permission policies | Allow | Varies |
| RSC for apps | Teams Admin Center → Org-wide settings | Enabled | Enabled |
| App installation | Teams Admin Center → Setup policies | Allow users to install apps | Enabled |

---

## Data Flow & Storage

### Inbound Messages (Teams → COBRA)

```
Teams Channel → Azure Bot Service → COBRA Bot → COBRA Database
                    (Microsoft)      (Your hosting)
```

1. User posts message in Teams channel
2. Microsoft's Bot Service routes message to COBRA bot endpoint
3. COBRA bot processes and stores message in COBRA database
4. Message appears in COBRA's unified communications view

**Data stored in COBRA:**
- Message content (text)
- Sender display name
- Timestamp
- Attachment URLs (not attachment content)
- Channel/team identifiers

### Outbound Messages (COBRA → Teams)

```
COBRA User → COBRA Bot → Azure Bot Service → Teams Channel
                             (Microsoft)
```

1. User sends message in COBRA channel linked to Teams
2. COBRA bot sends message via Bot Service
3. Message appears in Teams channel with COBRA attribution

**Data flow:**
- Message content
- Sender attribution (e.g., "[John Smith via COBRA]")
- No COBRA-internal metadata exposed to Teams

---

## Security Considerations

### Authentication & Authorization

| Aspect | Implementation |
|--------|----------------|
| Bot authentication | Azure AD app with client credentials |
| User authentication | OAuth 2.0 (when linking COBRA accounts) |
| Message signing | HMAC validation on all Bot Service messages |
| Transport security | TLS 1.2+ for all communications |

### Data Residency

| Data | Location |
|------|----------|
| Messages in Teams | Microsoft 365 tenant (your data residency settings) |
| Messages in COBRA | COBRA infrastructure (see COBRA data residency docs) |
| Bot Service routing | Azure (temporary, not persisted) |
| Conversation references | COBRA database (encrypted at rest) |

### Compliance Alignment

The COBRA Teams integration is designed to support common compliance frameworks:

| Framework | Consideration |
|-----------|---------------|
| **GDPR** | Messages processed with consent; deletion requests honor both systems |
| **HIPAA** | PHI in messages subject to BAA with both Microsoft and COBRA |
| **FedRAMP** | COBRA infrastructure certified; Microsoft GCC available for Teams |
| **SOC 2** | Audit logging maintained in both systems |

> **Note:** Consult your compliance team for specific requirements. This integration does not change your existing Microsoft 365 compliance posture.

---

## Risk Assessment

### Low Risk

- **Delegated User.Read:** Standard permission for any app identifying users
- **Read-only access:** Bot cannot modify or delete any Teams content
- **Team-scoped:** Permissions only apply to teams where explicitly installed

### Medium Risk

- **ChannelMessage.Read.Group:** Bot receives all channel messages
  - *Mitigation:* Only installed in teams where this is desired; team owners control installation
  
- **Data duplication:** Messages stored in both Teams and COBRA
  - *Mitigation:* COBRA follows retention policies; data can be purged per policy

### Mitigating Controls

1. **Least privilege:** Only permissions required for functionality are requested
2. **Team owner consent:** RSC permissions require explicit team owner approval
3. **Audit trail:** All bot activity logged in COBRA and available for review
4. **Revocation:** Removing the bot immediately stops data flow
5. **No tenant-wide access:** Bot has no access outside installed teams

---

## Permission Comparison

How COBRA compares to common Teams integrations:

| Integration Type | Typical Permissions | COBRA Bot |
|------------------|--------------------|-----------| 
| Notification-only bot | None or minimal | ✓ More permissions |
| Interactive bot | User.Read | ✓ Same |
| Full collaboration app | Mail.Read, Files.ReadWrite, etc. | ✓ Fewer permissions |
| Admin/compliance tool | Full tenant read access | ✓ Much fewer permissions |

---

## Frequently Asked Questions

### Does the bot have access to private chats?

**No.** The `ChannelMessage.Read.Group` permission only applies to channels in teams where the bot is installed. Private 1:1 chats and private group chats without the bot are not accessible.

### Can the bot read messages from before it was installed?

**By default, no.** The bot only receives messages posted after installation. When linking an existing team, users can optionally choose to import recent history (up to 30 days), but this is opt-in.

### Can the bot delete or modify messages in Teams?

**No.** The bot has read-only access to messages. It cannot edit, delete, or react to messages in Teams.

### What happens if we remove the bot?

Message flow stops immediately. Historical messages remain in both Teams and COBRA. No data is deleted from either system.

### Can we limit which channels the bot monitors?

The current version monitors all channels in the installed team. Channel-level filtering is on the roadmap for a future release.

### Does this require Global Admin approval?

**No.** The bot does not require tenant-wide admin consent. Team Owners can install and grant RSC permissions for their teams. However, your organization may have policies requiring IT approval for any custom app.

### Is the bot compliant with our DLP policies?

The bot processes messages through standard Teams infrastructure, so existing DLP policies apply to the Teams side. Messages sent to COBRA are subject to COBRA's security controls.

---

## Approval Checklist

For IT Security / Compliance teams reviewing this integration:

### Technical Review
- [ ] Reviewed Azure AD permissions (User.Read only)
- [ ] Reviewed RSC permissions (ChannelMessage.Read.Group, TeamSettings.Read.Group)
- [ ] Confirmed no tenant-wide admin consent required
- [ ] Verified read-only access (no write/delete capabilities)
- [ ] Reviewed data flow diagrams

### Policy Review
- [ ] Custom app policy allows this application
- [ ] RSC permissions enabled for apps
- [ ] Data residency requirements satisfied
- [ ] Retention policy alignment confirmed

### Risk Acceptance
- [ ] Risk assessment reviewed and accepted
- [ ] Mitigating controls deemed sufficient
- [ ] Business justification documented
- [ ] Incident response plan includes this integration

### Approval
- [ ] IT Security approval: _____________ Date: _______
- [ ] Compliance approval: _____________ Date: _______
- [ ] Business owner approval: _________ Date: _______

---

## Technical Reference

### App Registration Details

```
Application Name: COBRA Communications
Application ID: [Provided by COBRA]
Tenant Type: Multi-tenant (or Single-tenant for dedicated deployments)
Redirect URIs: https://[cobra-domain]/auth/teams/callback
```

### Required API Permissions (Azure AD)

```json
{
  "requiredResourceAccess": [
    {
      "resourceAppId": "00000003-0000-0000-c000-000000000000",
      "resourceAccess": [
        {
          "id": "e1fe6dd8-ba31-4d61-89e7-88639da4683d",
          "type": "Scope"
        }
      ]
    }
  ]
}
```

### RSC Permissions (Teams Manifest)

```json
{
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {
          "name": "ChannelMessage.Read.Group",
          "type": "Application"
        },
        {
          "name": "TeamSettings.Read.Group",
          "type": "Application"
        }
      ]
    }
  }
}
```

---

## Contact Information

### COBRA Security Team
- Email: security@cobra5.com
- For: Security questionnaires, penetration test reports, compliance documentation

### COBRA Support
- Email: support@cobra5.com
- For: Technical implementation questions

### Microsoft Resources
- [Teams app permissions](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/device-capabilities/native-device-permissions)
- [RSC permissions](https://docs.microsoft.com/en-us/microsoftteams/platform/graph-api/rsc/resource-specific-consent)
- [Teams Admin Center](https://admin.teams.microsoft.com)

---

*Document Version: 1.0*  
*Last Updated: December 2025*  
*Classification: Internal / Customer-Facing*

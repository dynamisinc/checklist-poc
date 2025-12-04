# COBRA Teams Integration - Customer Installation Guide

## Overview

This guide walks you through installing and configuring the COBRA Communications bot in your Microsoft Teams environment. The integration enables bi-directional messaging between COBRA event channels and your Teams channels, ensuring emergency communications reach all stakeholders regardless of which platform they're using.

**Estimated Time:** 15-30 minutes

**Who Should Perform This:** Microsoft 365 Administrator or Teams Administrator

---

## Prerequisites

Before beginning installation, verify the following:

### Licensing Requirements

- [ ] Microsoft 365 license that includes Microsoft Teams
- [ ] Users who will interact with the bot have Teams access

### Administrative Access

- [ ] Teams Administrator role, or
- [ ] Global Administrator role, or
- [ ] Team Owner (for single-team installation only)

### Tenant Configuration

- [ ] Custom apps are allowed in your tenant (see [Tenant Settings](#tenant-settings-verification))
- [ ] RSC (Resource-Specific Consent) permissions are enabled

### COBRA Requirements

- [ ] Active COBRA account with appropriate permissions
- [ ] At least one COBRA event created to link to Teams

---

## Tenant Settings Verification

Before installing the bot, verify your tenant allows custom apps and RSC permissions.

### Step 1: Check Custom App Policy

1. Navigate to **Teams Admin Center**: https://admin.teams.microsoft.com
2. Go to **Teams apps** → **Permission policies**
3. Select the policy that applies to your users (or **Global (Org-wide default)**)
4. Under **Custom apps**, verify the setting is **Allow all apps** or that the COBRA app is specifically allowed

![Permission Policy Location](images/permission-policy.png)

### Step 2: Enable RSC Permissions

1. In Teams Admin Center, go to **Teams apps** → **Permission policies**
2. Select your policy
3. Scroll to **Resource-specific consent**
4. Ensure **Let users consent to resource-specific permissions** is enabled

> **Note:** If these settings are restricted by your organization's policy, contact your IT security team for approval before proceeding.

---

## Installation Methods

Choose the installation method that fits your needs:

| Method                                                         | Best For                     | Admin Level Required                |
| -------------------------------------------------------------- | ---------------------------- | ----------------------------------- |
| [Teams Admin Center](#method-1-teams-admin-center-recommended) | Organization-wide deployment | Teams Admin                         |
| [Direct Upload to Team](#method-2-direct-upload-to-team)       | Single team or pilot testing | Team Owner                          |
| [Sideloading](#method-3-sideloading-for-development)           | Development/testing only     | Developer with sideload permissions |

---

## Method 1: Teams Admin Center (Recommended)

This method adds the app to your organization's app catalog, making it available for all teams.

### Step 1: Obtain the App Package

1. Download the COBRA Teams app package from your COBRA administrator or the COBRA customer portal
2. The package is a `.zip` file containing:
   - `manifest.json` - App configuration
   - `color.png` - Color icon (192x192)
   - `outline.png` - Outline icon (32x32)

### Step 2: Upload to Org App Catalog

1. Go to **Teams Admin Center**: https://admin.teams.microsoft.com
2. Navigate to **Teams apps** → **Manage apps**
3. Click **+ Upload new app**
4. Select **Upload** and choose the COBRA app package (.zip file)
5. Review the app details and click **Add**

![Upload App](images/upload-app.png)

### Step 3: Configure App Availability

1. After upload, find "COBRA Communications" in the app list
2. Click on the app name to open details
3. Under **Status**, ensure it shows **Allowed**
4. Optionally, configure **Assignments** to control which users can install

### Step 4: Install in Specific Teams

Now that the app is in your catalog, install it in the teams that need it:

1. Open **Microsoft Teams** (desktop or web)
2. Navigate to the team where you want the bot
3. Click the **+** (Add a tab) next to the channel tabs, or go to **Apps**
4. Search for "COBRA Communications"
5. Click **Add** and select **Add to a team**
6. Choose the specific team and channel
7. Click **Set up a bot**

### Step 5: Grant RSC Permissions

When installing, you'll be prompted to grant permissions:

![RSC Consent](images/rsc-consent.png)

Review the permissions and click **Accept**:

- **Read channel messages** - Required for receiving messages
- **Read team settings** - Required for team/channel information

---

## Method 2: Direct Upload to Team

Use this method to install in a single team without adding to the org catalog.

### Step 1: Enable App Upload for Team

1. In Microsoft Teams, go to the target team
2. Click **⋯** (More options) next to the team name
3. Select **Manage team**
4. Go to **Settings** → **Member permissions**
5. Enable **Allow members to upload custom apps**

### Step 2: Upload the App

1. In Microsoft Teams, click **Apps** in the left sidebar
2. At the bottom, click **Manage your apps**
3. Click **Upload an app**
4. Select **Upload a custom app**
5. Choose the COBRA app package (.zip file)
6. Select the team to install to
7. Click **Add**

### Step 3: Grant RSC Permissions

Review and accept the RSC permissions when prompted.

---

## Method 3: Sideloading (For Development)

> **Warning:** Sideloading is intended for development and testing only. For production use, follow Method 1 or 2.

See the separate [Sideloading Guide](TEAMS-SIDELOADING-GUIDE.md) for detailed instructions.

---

## Post-Installation Configuration

After the bot is installed, complete these steps to enable message flow.

### Step 1: Verify Bot Installation

1. Go to the Teams channel where the bot was installed
2. The bot should post a welcome message:

> 👋 **Welcome to COBRA Communications!**
>
> I'm now connected to this channel and ready to bridge communications with COBRA.
>
> **Next Steps:**
>
> - Use `/link` to connect this channel to a COBRA event
> - Use `/help` to see available commands
> - Use `/status` to check connection status

If you don't see the welcome message, @mention the bot: `@COBRA Communications help`

### Step 2: Link to COBRA Event

1. In the Teams channel, type: `@COBRA Communications link`
2. The bot will present an Adaptive Card with event selection
3. Sign in to COBRA if prompted
4. Select the COBRA event to link to this channel
5. Confirm the linkage

![Link Event Card](images/link-event.png)

### Step 3: Verify Message Flow

1. **Test inbound:** Post a message in the Teams channel and verify it appears in COBRA
2. **Test outbound:** Send a message from the COBRA channel and verify it appears in Teams

---

## Managing the Integration

### View Connection Status

In Teams, type: `@COBRA Communications status`

The bot will respond with:

- Connection status (Connected/Disconnected)
- Linked COBRA event name
- Last message timestamp
- Any current issues

### Unlink from COBRA Event

In Teams, type: `@COBRA Communications unlink`

This stops message flow but preserves historical messages in both systems.

### Remove the Bot

1. Go to the team's **Manage team** settings
2. Navigate to **Apps**
3. Find "COBRA Communications"
4. Click **⋯** and select **Remove**

> **Note:** Removing the bot will stop all message flow. Historical messages are preserved in COBRA.

---

## Troubleshooting

### Bot Not Responding

1. Verify the bot is installed in the channel (check **Manage team** → **Apps**)
2. Try @mentioning the bot directly: `@COBRA Communications help`
3. Check if the bot appears in the channel member list
4. Verify your tenant allows the app (see [Tenant Settings](#tenant-settings-verification))

### Messages Not Appearing in COBRA

1. Check connection status: `@COBRA Communications status`
2. Verify the channel is linked to a COBRA event
3. Ensure RSC permissions were granted during installation
4. Contact COBRA support if issues persist

### Messages Not Appearing in Teams

1. Verify the COBRA channel is linked to this Teams channel
2. Check that the Teams channel shows as "Connected" in COBRA
3. Try sending a test message from COBRA
4. Check for any error indicators in COBRA

### Permission Denied Errors

1. Verify you have appropriate permissions in both Teams and COBRA
2. Contact your Teams administrator to check app policies
3. Ensure RSC permissions were granted during installation

### "App Not Found" When Searching

1. Verify the app was uploaded to your org catalog
2. Check that the app is marked as "Allowed"
3. Verify your user account is covered by the app permission policy
4. Wait a few minutes - catalog updates can take time to propagate

---

## Security Considerations

### Data Access

The COBRA bot accesses the following data:

| Data Type          | Access Level        | Purpose                               |
| ------------------ | ------------------- | ------------------------------------- |
| Channel messages   | Read all (with RSC) | Capture messages for COBRA            |
| Team/channel info  | Read                | Display channel names, link correctly |
| User display names | Read                | Attribute messages to senders         |

### Data Storage

- Messages are stored in COBRA's secure database
- Messages remain in Teams (the bot doesn't delete anything)
- COBRA follows your organization's data retention policies

### Compliance

- The integration supports Microsoft 365 compliance features
- Messages in Teams remain subject to your eDiscovery and retention policies
- COBRA maintains its own audit trail for compliance

---

## Getting Help

### COBRA Support

- Email: support@cobrasoftware.com
- Portal: https://www.cobrasoftware.com
- Include: Tenant ID, Team name, Error messages

### Microsoft Teams Support

- Teams Admin Center has built-in diagnostics
- Microsoft 365 admin center for tenant-wide issues

---

## Appendix: Quick Reference Commands

| Command                        | Description                 |
| ------------------------------ | --------------------------- |
| `@COBRA Communications help`   | Show available commands     |
| `@COBRA Communications status` | Check connection status     |
| `@COBRA Communications link`   | Link channel to COBRA event |
| `@COBRA Communications unlink` | Unlink from COBRA event     |

---

_Document Version: 1.0_  
_Last Updated: December 2025_

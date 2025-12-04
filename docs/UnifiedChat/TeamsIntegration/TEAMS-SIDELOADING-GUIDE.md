# COBRA Teams Integration - Sideloading Guide for Development

## Overview

Sideloading allows developers and testers to install custom Teams apps directly without going through the organization's app catalog. This is the fastest way to test the COBRA Communications bot during development.

**Audience:** Developers, QA testers, pilot users

**Warning:** Sideloading is intended for development and testing only. For production deployment, use the [Teams Admin Center Deployment Guide](TEAMS-ADMIN-CENTER-DEPLOYMENT-GUIDE.md).

---

## Prerequisites

### Tenant Requirements

| Requirement | How to Verify |
|-------------|---------------|
| Sideloading enabled | Teams Admin Center → Setup policies |
| Custom apps allowed | Teams Admin Center → Permission policies |
| Developer Preview (optional) | Teams → Settings → About → Developer Preview |

### User Requirements

- Member of a team where you want to test
- Sideloading permissions granted by admin
- Teams desktop or web client (mobile has limited sideloading)

### Files Needed

- COBRA Teams app package (.zip file) containing:
  - `manifest.json`
  - `color.png` (192x192 pixels)
  - `outline.png` (32x32 pixels)

---

## Enable Sideloading in Your Tenant

If sideloading is not enabled, a Teams Administrator must enable it:

### Step 1: Access Teams Admin Center

1. Go to https://admin.teams.microsoft.com
2. Sign in with admin credentials

### Step 2: Modify Setup Policy

1. Navigate to **Teams apps** → **Setup policies**
2. Select **Global (Org-wide default)** or create a new policy
3. Enable **Upload custom apps**
4. Click **Save**

![Enable Sideloading](images/enable-sideloading.png)

### Step 3: Wait for Propagation

Policy changes can take up to 24 hours. For immediate testing:
- Sign out of Teams completely
- Clear Teams cache
- Sign back in

---

## Sideloading Methods

### Method 1: Upload via Apps Menu (Recommended)

**Best for:** Quick testing, individual developers

1. Open Microsoft Teams (desktop or web)
2. Click **Apps** in the left sidebar
3. Click **Manage your apps** (bottom of Apps panel)
4. Click **Upload an app**
5. Select **Upload a custom app**
6. Choose your COBRA app package (.zip file)
7. Select the team to install to
8. Click **Add**

![Upload Custom App](images/upload-custom-app.png)

### Method 2: Upload via Team Settings

**Best for:** Team owners adding to their team

1. Go to the target team
2. Click **⋯** next to the team name
3. Select **Manage team**
4. Go to **Apps** tab
5. Click **Upload a custom app** (bottom right)
6. Select your app package
7. Click **Add**

### Method 3: Using Teams Toolkit (VS Code)

**Best for:** Active development with hot reload

1. Install Teams Toolkit extension in VS Code
2. Open your bot project
3. Press **F5** or click **Run and Debug**
4. Teams Toolkit will:
   - Start local bot server
   - Create tunnel (ngrok or dev tunnels)
   - Generate temporary manifest
   - Sideload to Teams

```
// .vscode/launch.json configuration
{
  "name": "Debug in Teams",
  "type": "pwa-node",
  "request": "launch",
  "program": "${workspaceFolder}/src/index.ts",
  "preLaunchTask": "Start Teams App Locally"
}
```

### Method 4: Using Developer Portal

**Best for:** Testing manifest changes, validating app

1. Go to https://dev.teams.microsoft.com
2. Click **Apps** → **Import app**
3. Upload your app package
4. Use the portal to:
   - Validate manifest
   - Test in Teams
   - Generate new package

---

## Local Development Setup

For active development, you'll need to expose your local bot to the internet.

### Option A: ngrok (Traditional)

1. Download and install ngrok: https://ngrok.com
2. Start your bot locally (default port 3978)
3. Create tunnel:
   ```bash
   ngrok http 3978
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update your bot's messaging endpoint in Azure Bot Registration:
   ```
   https://abc123.ngrok.io/api/messages
   ```
6. Update manifest.json if needed
7. Re-upload app package to Teams

**Note:** Free ngrok URLs change on restart. Consider ngrok paid plan for stable URLs.

### Option B: Dev Tunnels (Recommended for VS Code)

1. Install Dev Tunnels extension in VS Code
2. Or use CLI:
   ```bash
   # Install
   winget install Microsoft.devtunnel
   
   # Login
   devtunnel user login
   
   # Create persistent tunnel
   devtunnel create --allow-anonymous
   
   # Start tunnel
   devtunnel port create -p 3978
   devtunnel host
   ```
3. Use the provided URL for your bot endpoint

### Option C: Azure Dev Tunnels (Teams Toolkit)

Teams Toolkit handles this automatically when you press F5.

---

## Updating a Sideloaded App

When you make changes to your bot:

### Code Changes Only (No Manifest Change)

1. Restart your local bot server
2. No re-upload needed - Teams will connect to new instance

### Manifest Changes

1. Update `manifest.json`
2. Increment version number
3. Re-create .zip package
4. Remove old app from team:
   - Go to team → **Manage team** → **Apps**
   - Find COBRA app → **⋯** → **Remove**
5. Upload new package using any sideloading method

### Quick Iteration Tip

For rapid testing, keep the manifest version the same and use the "Update" option:
1. Go to **Apps** → **Manage your apps**
2. Find your app
3. Click **⋯** → **Update**
4. Select new package

---

## Debugging Sideloaded Apps

### View Bot Logs

**Local development:**
```bash
# If using Node.js
DEBUG=botbuilder:* node index.js

# If using .NET
dotnet run --verbosity detailed
```

**Check Bot Framework Emulator:**
1. Download Bot Framework Emulator
2. Connect to `http://localhost:3978/api/messages`
3. Test messages directly

### Teams Developer Tools

1. In Teams desktop, press **Ctrl+Shift+I** (Windows) or **Cmd+Option+I** (Mac)
2. Check Console tab for JavaScript errors
3. Check Network tab for failed API calls

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| App won't upload | Invalid manifest | Validate in Developer Portal |
| Bot not responding | Tunnel not running | Check ngrok/dev tunnel status |
| "Unable to reach app" | Wrong endpoint URL | Verify messaging endpoint in Azure |
| Messages not received | RSC not granted | Re-install app, accept permissions |
| 401 Unauthorized | App ID/password mismatch | Check .env matches Azure registration |

---

## Testing Checklist

### Installation Tests
- [ ] App uploads successfully
- [ ] RSC consent dialog appears
- [ ] Bot posts welcome message
- [ ] Bot appears in team's app list

### Inbound Message Tests
- [ ] Bot receives @mention messages
- [ ] Bot receives channel messages (RSC)
- [ ] Messages appear in COBRA
- [ ] Sender attribution is correct
- [ ] Timestamps are accurate

### Outbound Message Tests
- [ ] Messages sent from COBRA appear in Teams
- [ ] Sender attribution shows correctly
- [ ] Formatting is preserved
- [ ] Adaptive Cards render properly

### Command Tests
- [ ] `/help` command works
- [ ] `/status` command returns correct info
- [ ] `/link` command presents event selection
- [ ] `/unlink` command disconnects properly

### Error Handling Tests
- [ ] Bot handles malformed messages gracefully
- [ ] Network interruption recovery
- [ ] Invalid command response
- [ ] Unauthorized user handling

---

## Removing Sideloaded Apps

### From a Specific Team

1. Go to team → **Manage team** → **Apps**
2. Find COBRA app
3. Click **⋯** → **Remove**

### From Personal Apps

1. Click **Apps** in left sidebar
2. Click **Manage your apps**
3. Find app → **⋯** → **Remove**

### Complete Cleanup (Development)

```powershell
# PowerShell - Remove from all locations
# Requires MicrosoftTeams module

Connect-MicrosoftTeams
$apps = Get-CsTeamsApp | Where-Object {$_.DisplayName -eq "COBRA Communications"}
foreach ($app in $apps) {
    Remove-CsTeamsApp -Id $app.Id
}
```

---

## Manifest Validation

Before sideloading, validate your manifest:

### Using Developer Portal

1. Go to https://dev.teams.microsoft.com
2. Click **Tools** → **App validation**
3. Upload your package
4. Review any errors or warnings

### Common Manifest Errors

| Error | Fix |
|-------|-----|
| Invalid icon dimensions | Color: 192x192, Outline: 32x32 |
| Missing required field | Add all required fields per schema |
| Invalid URL format | Use HTTPS, no trailing slash |
| Version format wrong | Use semver: "1.0.0" |
| ID not a GUID | Generate valid UUID |

### Sample Valid Manifest

```json
{
  "$schema": "https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "{{BOT_APP_ID}}",
  "packageName": "com.cobra.teams.bot",
  "developer": {
    "name": "COBRA Systems",
    "websiteUrl": "https://cobra5.com",
    "privacyUrl": "https://cobra5.com/privacy",
    "termsOfUseUrl": "https://cobra5.com/terms"
  },
  "name": {
    "short": "COBRA Communications",
    "full": "COBRA Emergency Communications Bot"
  },
  "description": {
    "short": "Bridge Teams with COBRA emergency management",
    "full": "Enables bi-directional messaging between Microsoft Teams channels and COBRA emergency events."
  },
  "icons": {
    "color": "color.png",
    "outline": "outline.png"
  },
  "accentColor": "#0020C2",
  "bots": [
    {
      "botId": "{{BOT_APP_ID}}",
      "scopes": ["team", "groupchat"],
      "supportsFiles": false,
      "isNotificationOnly": false,
      "commandLists": [
        {
          "scopes": ["team"],
          "commands": [
            {"title": "help", "description": "Show available commands"},
            {"title": "status", "description": "Check connection status"},
            {"title": "link", "description": "Link to COBRA event"}
          ]
        }
      ]
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["cobra5.com", "*.azurewebsites.net"],
  "webApplicationInfo": {
    "id": "{{BOT_APP_ID}}",
    "resource": "api://cobra5.com/{{BOT_APP_ID}}"
  },
  "authorization": {
    "permissions": {
      "resourceSpecific": [
        {"name": "ChannelMessage.Read.Group", "type": "Application"},
        {"name": "TeamSettings.Read.Group", "type": "Application"}
      ]
    }
  }
}
```

---

## Related Documentation

- [Customer Installation Guide](TEAMS-CUSTOMER-INSTALLATION-GUIDE.md)
- [Teams Admin Center Deployment](TEAMS-ADMIN-CENTER-DEPLOYMENT-GUIDE.md)
- [Developer Documentation](TEAMS-DEVELOPER-DOCUMENTATION.md)
- [Microsoft: Sideload apps in Teams](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/apps-upload)

---

*Document Version: 1.0*  
*Last Updated: December 2025*

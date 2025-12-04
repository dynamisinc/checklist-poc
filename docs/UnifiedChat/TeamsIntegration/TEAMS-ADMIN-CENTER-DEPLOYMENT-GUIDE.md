# COBRA Teams Integration - Teams Admin Center Deployment Guide

## Overview

This guide covers deploying the COBRA Communications bot organization-wide using the Microsoft Teams Admin Center. This approach provides centralized control over app availability, policies, and monitoring.

**Audience:** Microsoft 365 Administrators, Teams Administrators

**Prerequisites:**
- Teams Administrator or Global Administrator role
- COBRA Teams app package (.zip file)
- Familiarity with Teams Admin Center

---

## Deployment Options

| Option | Description | Use Case |
|--------|-------------|----------|
| **Org-wide catalog** | App available to all users | Standard enterprise deployment |
| **Controlled rollout** | App available to specific groups | Phased deployment, pilot programs |
| **Pre-installed** | App automatically installed for users | High-priority deployment |
| **Pinned app** | App pinned to Teams sidebar | Ensure visibility and adoption |

---

## Part 1: Upload to Organization App Catalog

### Step 1: Access Teams Admin Center

1. Navigate to https://admin.teams.microsoft.com
2. Sign in with your administrator account
3. Verify you see the admin navigation on the left

### Step 2: Navigate to Manage Apps

1. In the left navigation, click **Teams apps**
2. Click **Manage apps**
3. You'll see a list of all apps in your organization

![Manage Apps Navigation](images/admin-manage-apps.png)

### Step 3: Upload the App Package

1. Click **+ Upload new app** (top right, next to search)
2. In the dialog, click **Upload**
3. Select the COBRA app package (.zip file)
4. Wait for validation to complete

![Upload Dialog](images/admin-upload-dialog.png)

### Step 4: Review App Details

After upload, the app details page appears:

1. **Review permissions:** Verify the listed permissions match expectations
2. **Check manifest:** Ensure app name and description are correct
3. **Verify icons:** Both color and outline icons should display

### Step 5: Set Publishing Status

1. Find **Publishing status** section
2. Default is **Submitted** - change to **Publish** to make available
3. Click **Publish** to confirm

The app is now in your organization's app catalog.

---

## Part 2: Configure App Permissions Policy

Control which users can install and use the app.

### Step 1: Navigate to Permission Policies

1. Go to **Teams apps** → **Permission policies**
2. You'll see existing policies (including Global default)

### Step 2: Choose Policy Approach

**Option A: Allow in Global Policy (All Users)**

1. Click **Global (Org-wide default)**
2. Under **Custom apps**, ensure setting is **Allow all apps** or add COBRA specifically
3. Click **Save**

**Option B: Create Targeted Policy**

1. Click **+ Add** to create new policy
2. Name the policy (e.g., "COBRA Emergency Responders")
3. Configure custom apps setting
4. Click **Save**
5. Assign policy to users/groups (see Step 3)

### Step 3: Assign Policy to Users (if using targeted policy)

1. Go to **Users** → **Manage users**
2. Select users who should have access
3. Click **Edit settings**
4. Under **App permission policy**, select your policy
5. Click **Apply**

**Bulk assignment via PowerShell:**
```powershell
# Install Teams PowerShell module if needed
Install-Module -Name MicrosoftTeams

# Connect to Teams
Connect-MicrosoftTeams

# Assign policy to security group
$group = Get-AzureADGroup -SearchString "Emergency Response Team"
$members = Get-AzureADGroupMember -ObjectId $group.ObjectId

foreach ($member in $members) {
    Grant-CsTeamsAppPermissionPolicy -Identity $member.UserPrincipalName -PolicyName "COBRA Emergency Responders"
}
```

---

## Part 3: Configure App Setup Policy (Optional)

Setup policies control how apps appear for users - including pinning and pre-installation.

### Step 1: Navigate to Setup Policies

1. Go to **Teams apps** → **Setup policies**
2. View existing policies

### Step 2: Create or Modify Policy

**To pre-install COBRA for users:**

1. Click **+ Add** or select existing policy to modify
2. Name the policy (e.g., "COBRA Pre-installed")
3. Under **Installed apps**, click **+ Add apps**
4. Search for "COBRA Communications"
5. Select the app and click **Add**
6. Click **Save**

**To pin COBRA to sidebar:**

1. In the same policy, find **Pinned apps**
2. Click **+ Add apps**
3. Search for and select "COBRA Communications"
4. Use arrows to set position in pinned list
5. Click **Save**

### Step 3: Assign Setup Policy

1. Go to **Users** → **Manage users**
2. Select target users
3. Click **Edit settings**
4. Under **App setup policy**, select your policy
5. Click **Apply**

> **Note:** Policy changes can take up to 24 hours to propagate to all users.

---

## Part 4: Monitor App Usage

### View App Analytics

1. Go to **Analytics & reports** → **Usage reports**
2. Select **Apps usage** report
3. Filter for "COBRA Communications"

Available metrics:
- Active users (daily, weekly, monthly)
- Total installs
- Installations by team
- Usage trends

### View App Status

1. Go to **Teams apps** → **Manage apps**
2. Search for "COBRA Communications"
3. Click the app name
4. View:
   - Publishing status
   - Blocked status
   - Version information
   - Recent activity

---

## Part 5: Update the App

When a new version of COBRA is released:

### Step 1: Obtain Updated Package

1. Download new app package from COBRA
2. Verify version number is incremented

### Step 2: Upload Update

1. Go to **Teams apps** → **Manage apps**
2. Find "COBRA Communications"
3. Click **⋯** → **Upload new version**
4. Select the new package
5. Review changes and confirm

### Step 3: Notify Users (Optional)

Consider notifying users of updates, especially for significant changes:

- Teams announcement in relevant channels
- Email notification
- Intranet post

---

## Part 6: Block or Remove the App

### To Block the App (Reversible)

1. Go to **Teams apps** → **Manage apps**
2. Find "COBRA Communications"
3. Toggle **Status** to **Blocked**

Blocked apps:
- Cannot be installed by new users
- Existing installations stop functioning
- App remains in catalog for easy unblocking

### To Remove the App (Permanent)

1. Go to **Teams apps** → **Manage apps**
2. Find "COBRA Communications"
3. Click **⋯** → **Delete**
4. Confirm deletion

> **Warning:** Deleting removes the app from all teams. This action cannot be undone - you'll need to re-upload the package.

---

## Troubleshooting

### App Not Appearing in Catalog

1. Verify upload completed successfully (check for error messages)
2. Ensure publishing status is "Published"
3. Check permission policies allow the app
4. Wait 15-30 minutes for propagation

### Users Can't Find or Install App

1. Verify user's permission policy allows custom apps
2. Check if app is blocked at org level
3. Verify user has Teams license
4. Have user clear Teams cache and restart

### App Installation Failing

1. Check app validation results for errors
2. Verify manifest is valid (use App Studio to validate)
3. Ensure icons meet size requirements
4. Check for special characters in manifest fields

### Policy Changes Not Taking Effect

1. Policy propagation can take up to 24 hours
2. Have user sign out and back into Teams
3. Clear Teams cache
4. Verify policy is assigned to the specific user

---

## PowerShell Reference

Common Teams PowerShell commands for app management:

```powershell
# Connect to Teams
Connect-MicrosoftTeams

# List all custom apps
Get-CsTeamsApp | Where-Object {$_.DistributionMethod -eq "organization"}

# Get specific app details
Get-CsTeamsApp -Id "com.cobra.teams.bot"

# Block an app
Set-CsTeamsApp -Id "com.cobra.teams.bot" -Status "Blocked"

# Unblock an app
Set-CsTeamsApp -Id "com.cobra.teams.bot" -Status "Allowed"

# View app permission policies
Get-CsTeamsAppPermissionPolicy

# View app setup policies
Get-CsTeamsAppSetupPolicy

# Assign setup policy to user
Grant-CsTeamsAppSetupPolicy -Identity "user@domain.com" -PolicyName "COBRA Pre-installed"

# View users with specific policy
Get-CsOnlineUser | Where-Object {$_.TeamsAppSetupPolicy -eq "COBRA Pre-installed"}
```

---

## Governance Recommendations

### Change Management

1. Test updates in pilot group before org-wide deployment
2. Document all policy changes
3. Maintain rollback plan (keep previous app version)
4. Communicate changes to stakeholders

### Security

1. Regularly review app permissions
2. Monitor app usage for anomalies
3. Include in quarterly access reviews
4. Document in app inventory/CMDB

### Compliance

1. Document business justification for app
2. Maintain record of approvals
3. Include in compliance audits
4. Review data handling alignment

---

## Related Documentation

- [Customer Installation Guide](TEAMS-CUSTOMER-INSTALLATION-GUIDE.md)
- [O365 Permission Requirements](TEAMS-O365-PERMISSION-REQUIREMENTS.md)
- [Sideloading Guide](TEAMS-SIDELOADING-GUIDE.md)
- [Microsoft: Manage apps in Teams Admin Center](https://docs.microsoft.com/en-us/microsoftteams/manage-apps)
- [Microsoft: Teams app permission policies](https://docs.microsoft.com/en-us/microsoftteams/teams-app-permission-policies)

---

*Document Version: 1.0*  
*Last Updated: December 2025*

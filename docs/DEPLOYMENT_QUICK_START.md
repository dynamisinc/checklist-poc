# Quick Start: Deploy to Azure

This guide gets your app deployed to Azure in ~10 minutes.

## Prerequisites

1. **Azure Subscription** - [Sign up for free](https://azure.microsoft.com/free/)
2. **Azure CLI** - [Install here](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **PowerShell** (Windows users - already installed)

## Step 1: Login to Azure

```powershell
# Login
az login

# Set your subscription (if you have multiple)
az account list --output table
az account set --subscription "YOUR_SUBSCRIPTION_NAME"
```

## Step 2: Choose Unique Names

Azure requires globally unique names. Replace these with your own:

```powershell
$resourceGroup = "rg-checklist-poc"
$appName = "checklist-poc-YOUR-INITIALS"  # Must be globally unique!
$sqlServer = "checklist-sql-YOUR-INITIALS"  # Must be globally unique!
$sqlDatabase = "ChecklistPOC"
$sqlAdminUser = "checklistadmin"
$sqlPassword = ConvertTo-SecureString "YourStrongPassword123!" -AsPlainText -Force
```

**Example:**
```powershell
$appName = "checklist-poc-jdoe"
$sqlServer = "checklist-sql-jdoe"
```

## Step 3: Create Azure Resources

Run the setup script (from repository root):

```powershell
.\setup-azure-resources.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $sqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword `
  -Location "eastus" `
  -AppServiceOS "Linux"
```

**This creates:**
- Resource group
- Azure SQL Server + Database (FREE tier)
- App Service Plan (B1 Linux - $13/month)
- Web App

**Duration:** ~5 minutes

## Step 4: Deploy Your Application

Run the deployment script:

```powershell
.\deploy-to-azure.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $sqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword
```

**This does:**
1. Builds React frontend
2. Copies frontend to backend wwwroot
3. Publishes .NET app
4. Creates deployment ZIP
5. Deploys to Azure
6. Applies database migrations

**Duration:** ~3 minutes

## Step 5: Access Your App

Your app is now live!

```
https://YOUR-APP-NAME.azurewebsites.net
```

**Test it:**
- Main app: `https://checklist-poc-jdoe.azurewebsites.net`
- API docs: `https://checklist-poc-jdoe.azurewebsites.net/swagger`

## Step 6: Share with SMEs

Send this to your SMEs:

```
🔗 Checklist POC: https://YOUR-APP-NAME.azurewebsites.net

Login as any position:
- Incident Commander
- Operations Chief
- Safety Officer
- Logistics Chief
- Planning Chief

(No password needed - this is a POC with mock authentication)
```

---

## Troubleshooting

### "App name is already taken"

Choose a different `$appName` (must be globally unique):

```powershell
$appName = "checklist-poc-jdoe-v2"
```

### "First page load is slow"

This is expected. Azure SQL Serverless auto-pauses after 1 hour of inactivity. First access after pause takes 30-60 seconds.

### "Cannot connect to database"

Add your IP to SQL firewall:

```powershell
az sql server firewall-rule create `
  --resource-group $resourceGroup `
  --server $sqlServer `
  --name MyIP `
  --start-ip-address YOUR_IP `
  --end-ip-address YOUR_IP
```

### "Frontend shows 404"

Ensure frontend was built and copied:

```powershell
# Rebuild and redeploy
.\deploy-to-azure.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $sqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword
```

---

## Cost Management

### View Current Costs

```powershell
# In Azure Portal:
# Cost Management + Billing > Cost Analysis
# Filter by Resource Group: rg-checklist-poc
```

### Stop App When Not Demoing

```powershell
# Stop (no charges while stopped)
az webapp stop --name $appName --resource-group $resourceGroup

# Start
az webapp start --name $appName --resource-group $resourceGroup
```

### Delete Everything When Done

```powershell
# WARNING: This deletes all resources permanently
az group delete --name $resourceGroup --yes --no-wait
```

---

## Redeploy After Code Changes

```powershell
# Just run the deploy script again
.\deploy-to-azure.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $sqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword `
  -SkipMigrations  # Skip if DB hasn't changed
```

---

## Monitor Logs

```powershell
# Stream live logs
az webapp log tail --name $appName --resource-group $resourceGroup
```

---

## Full Documentation

See [`docs/AZURE_DEPLOYMENT.md`](docs/AZURE_DEPLOYMENT.md) for:
- Detailed architecture
- Cost breakdown
- Advanced configuration
- Application Insights setup
- Custom domain setup

---

## Estimated Costs

| Component | Cost/Month |
|-----------|-----------|
| App Service (B1 Linux) | $13 |
| SQL Database (Free Tier) | $0-5 |
| Bandwidth | $0-1 |
| **TOTAL** | **~$15-20/month** |

For low SME usage, you'll likely stay under $20/month.

---

## Need Help?

- Check [`docs/AZURE_DEPLOYMENT.md`](docs/AZURE_DEPLOYMENT.md) for detailed troubleshooting
- View logs: `az webapp log tail --name $appName --resource-group $resourceGroup`
- Azure Support: [Create support ticket](https://portal.azure.com/#blade/Microsoft_Azure_Support/HelpAndSupportBlade)

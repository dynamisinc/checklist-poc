# Deploy to Azure Using Your Existing SQL Server

This guide shows how to deploy the Checklist POC using your **existing Azure SQL Server** instance. You'll just add a new database to your existing server.

## Benefits of Using Existing SQL Server

✅ **No new SQL Server costs** - Reuse your existing free tier server
✅ **Faster setup** - Skip SQL Server creation
✅ **Simplified management** - One SQL Server to manage
✅ **Same firewall rules** - Existing rules apply to new database

---

## Prerequisites

1. **Existing Azure SQL Server** with free tier available
2. **SQL Server admin credentials**
3. **Azure CLI** installed and logged in
4. **PowerShell** (Windows)

---

## Step 1: Find Your Existing SQL Server Details

### Option A: Using Azure Portal
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **SQL servers**
3. Note down:
   - **Server name** (e.g., `my-sql-server`)
   - **Resource group** (e.g., `rg-my-resources`)
   - **Admin username** (e.g., `sqladmin`)
   - **Admin password** (you should have this saved)

### Option B: Using Azure CLI
```powershell
# List all SQL servers in your subscription
az sql server list --output table

# Get specific server details
az sql server show --name YOUR_SERVER_NAME --resource-group YOUR_RG
```

---

## Step 2: Check Your Free Tier Quota

Azure SQL Database free tier allows **up to 10 databases** per subscription.

```powershell
# List existing databases on your SQL Server
az sql db list `
  --server YOUR_SERVER_NAME `
  --resource-group YOUR_RG `
  --output table

# Count them - you can have up to 10 free tier databases
```

**Important:** Each database in the free tier gets:
- 100,000 vCore seconds/month (FREE)
- 32 GB storage (FREE)
- Serverless auto-pause

---

## Step 3: Set Your Variables

```powershell
# Your existing SQL Server details
$resourceGroup = "rg-my-resources"           # YOUR resource group
$existingSqlServer = "my-sql-server"         # YOUR SQL Server name (without .database.windows.net)
$sqlAdminUser = "sqladmin"                   # YOUR SQL admin username
$sqlPassword = ConvertTo-SecureString "YourPassword123!" -AsPlainText -Force  # YOUR password

# New resources for this app
$appName = "checklist-poc-YOUR-INITIALS"    # Must be globally unique!
$sqlDatabase = "ChecklistPOC"               # New database name
```

**Example:**
```powershell
$resourceGroup = "rg-my-free-resources"
$existingSqlServer = "myfreesqlserver2024"
$sqlAdminUser = "sqladmin"
$sqlPassword = ConvertTo-SecureString "MySecureP@ss123" -AsPlainText -Force
$appName = "checklist-poc-jdoe"
$sqlDatabase = "ChecklistPOC"
```

---

## Step 4: Create Azure Resources (Using Existing SQL)

Run the setup script:

```powershell
.\setup-azure-resources-existing-sql.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -ExistingSqlServer $existingSqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword `
  -AppServiceOS "Linux"
```

**This will:**
1. ✅ Verify your existing SQL Server
2. ✅ Add firewall rules (if needed)
3. ✅ Create new database "ChecklistPOC" (FREE tier)
4. ✅ Create App Service Plan (B1 Linux - $13/month)
5. ✅ Create Web App
6. ✅ Configure connection string

**Duration:** ~3 minutes

---

## Step 5: Deploy Your Application

```powershell
.\deploy-to-azure.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $existingSqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword
```

**This will:**
1. Build React frontend
2. Copy frontend to backend wwwroot
3. Publish .NET app
4. Deploy to Azure
5. Apply database migrations

**Duration:** ~3 minutes

---

## Step 6: Access Your App

```
https://YOUR-APP-NAME.azurewebsites.net
```

Test it:
- Main app: `https://checklist-poc-jdoe.azurewebsites.net`
- API docs: `https://checklist-poc-jdoe.azurewebsites.net/swagger`

---

## Verify Your Database Was Created

### Azure Portal
1. Go to your SQL Server in Azure Portal
2. Click **Databases** in the left menu
3. You should see **ChecklistPOC** listed

### Azure CLI
```powershell
az sql db list `
  --server $existingSqlServer `
  --resource-group $resourceGroup `
  --output table
```

---

## Cost Breakdown (Using Existing SQL)

| Service | Monthly Cost | Notes |
|---------|-------------|-------|
| **Existing SQL Server** | $0 | Already have it |
| **New Database (ChecklistPOC)** | $0-5 | Free tier (within quota) |
| **App Service (B1 Linux)** | ~$13 | New cost |
| **Bandwidth** | $0-1 | First 100GB FREE |
| **TOTAL** | **~$13-15/month** | 💰 Cheaper than full setup! |

**Savings:** By reusing your SQL Server, you're only paying for the App Service!

---

## Managing Multiple Databases on One Server

### View All Databases
```powershell
az sql db list `
  --server $existingSqlServer `
  --resource-group $resourceGroup `
  --query "[].{Name:name, Status:status, Edition:edition, Capacity:currentSku.capacity}" `
  --output table
```

### Check Free Tier Usage
Each database gets its own **100,000 vCore seconds/month** allocation. You can have up to 10 free tier databases simultaneously.

### Monitor Database Size
```powershell
az sql db show `
  --server $existingSqlServer `
  --resource-group $resourceGroup `
  --name $sqlDatabase `
  --query "{Name:name, MaxSize:maxSizeBytes, CurrentSize:currentBackupStorageUsed}"
```

---

## Troubleshooting

### Issue: "SQL Server not found"

**Check spelling and resource group:**
```powershell
# List all SQL servers
az sql server list --output table

# Verify server exists in specified RG
az sql server show --name $existingSqlServer --resource-group $resourceGroup
```

### Issue: "Cannot create database - quota exceeded"

You've reached the 10 database limit for free tier.

**Solutions:**
1. Delete an unused database:
   ```powershell
   az sql db delete --name UNUSED_DB --server $existingSqlServer --resource-group $resourceGroup --yes
   ```

2. Use a paid tier (Basic - ~$5/month):
   ```powershell
   az sql db create `
     --resource-group $resourceGroup `
     --server $existingSqlServer `
     --name $sqlDatabase `
     --edition Basic
   ```

### Issue: "Cannot connect to database from local machine"

Add your IP to firewall:
```powershell
# Get your IP
$myIp = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content.Trim()

# Add firewall rule
az sql server firewall-rule create `
  --resource-group $resourceGroup `
  --server $existingSqlServer `
  --name MyDevMachine `
  --start-ip-address $myIp `
  --end-ip-address $myIp
```

### Issue: "Database already exists"

The script will detect this and ask if you want to continue. If you choose **Yes**, it will:
- Use the existing database
- Apply any missing migrations
- Keep existing data

---

## Clean Up When Done

### Delete Only the App (Keep Database)
```powershell
# Delete App Service
az webapp delete --name $appName --resource-group $resourceGroup --yes

# Delete App Service Plan
az appservice plan delete --name "$appName-plan" --resource-group $resourceGroup --yes
```

### Delete Database Too
```powershell
# Delete the database
az sql db delete `
  --name $sqlDatabase `
  --server $existingSqlServer `
  --resource-group $resourceGroup `
  --yes
```

**Note:** This does NOT delete your SQL Server - it only removes the ChecklistPOC database.

---

## Deploying Updates

After making code changes, just redeploy:

```powershell
.\deploy-to-azure.ps1 `
  -ResourceGroup $resourceGroup `
  -AppName $appName `
  -SqlServer $existingSqlServer `
  -SqlDatabase $sqlDatabase `
  -SqlAdminUser $sqlAdminUser `
  -SqlAdminPassword $sqlPassword `
  -SkipMigrations  # Skip if DB schema hasn't changed
```

---

## Viewing Connection String

If you need the connection string for troubleshooting:

```powershell
# Via Azure CLI
az webapp config connection-string list `
  --name $appName `
  --resource-group $resourceGroup

# Via Azure Portal
# App Service → Configuration → Connection strings → DefaultConnection
```

---

## FAQ

**Q: Will this affect my other databases on the same SQL Server?**
A: No. Each database is isolated. The new ChecklistPOC database won't affect your other databases.

**Q: Can I use the same database for dev and production?**
A: Not recommended. Create separate databases:
- `ChecklistPOC-Dev`
- `ChecklistPOC-Prod`

**Q: How do I back up the database?**
A: Azure SQL automatically creates backups. You can also create manual backups:
```powershell
az sql db export `
  --server $existingSqlServer `
  --name $sqlDatabase `
  --admin-user $sqlAdminUser `
  --admin-password "YourPassword" `
  --storage-uri "https://yourstorageaccount.blob.core.windows.net/backups/checklist.bacpac"
```

**Q: Can I share this SQL Server with team members?**
A: Yes! Just give them the server name and create separate databases for each app.

---

## Next Steps

1. ✅ Deploy using the steps above
2. ✅ Test the app thoroughly
3. ✅ Share with SMEs for feedback
4. ✅ Monitor costs in Azure Portal
5. ✅ Clean up when done

---

## Related Documentation

- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - Full deployment from scratch
- [docs/AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md) - Comprehensive deployment guide
- [Azure SQL Free Tier Docs](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer)

---

**Questions?** Check the main [AZURE_DEPLOYMENT.md](docs/AZURE_DEPLOYMENT.md) guide for detailed troubleshooting.

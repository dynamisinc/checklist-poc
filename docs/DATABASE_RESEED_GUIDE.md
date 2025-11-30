# Production Database Reseed Guide

> **Last Updated:** 2025-11-30
> **Purpose:** Steps to clear and reseed the Azure SQL production database

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- SQL Server command-line tools (`sqlcmd`) installed
- .NET SDK installed (for EF Core migrations)
- Access to the production database credentials

## Production Database Connection Details

| Property | Value |
|----------|-------|
| Server | `sql-c5seeder-eastus2.database.windows.net` |
| Database | `ChecklistPOC` |
| User | `checklistapp` |
| Password | Retrieved from App Service configuration (see below) |
| Port | 1433 |

**Connection String Format:**
```
Server=tcp:sql-c5seeder-eastus2.database.windows.net,1433;Initial Catalog=ChecklistPOC;User ID=checklistapp;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### How to Retrieve the SQL Password

The SQL password is stored in the Azure App Service configuration. Use the Azure CLI to retrieve it:

```bash
# 1. Login to Azure (if not already logged in)
az login

# 2. Get the connection string from the App Service configuration
az webapp config connection-string list \
  --name checklist-poc-app \
  --resource-group c5-poc-eastus2-rg \
  --output table
```

This will display the connection string including the password. Look for the `DefaultConnection` entry.

**Alternative: Extract just the password from the connection string:**

```bash
# Get the full connection string and parse out the password
az webapp config connection-string list \
  --name checklist-poc-app \
  --resource-group c5-poc-eastus2-rg \
  --query "[?name=='DefaultConnection'].value" \
  --output tsv
```

The password is the value after `Password=` in the connection string (before the next semicolon).

**Example connection string format:**
```
Server=tcp:sql-c5seeder-eastus2.database.windows.net,1433;Initial Catalog=ChecklistPOC;User ID=checklistapp;Password=YOUR_PASSWORD_HERE;Encrypt=True;...
```

> **Note:** The App Service name (`checklist-poc-app`) and resource group (`c5-poc-eastus2-rg`) are defined in [deploy/azure-config.json](../deploy/azure-config.json).

## Step-by-Step Reseed Process

### Step 1: Stop Any Running Local Processes

If you have the ChecklistAPI running locally, stop it first to avoid build locks:

```powershell
# Kill any running ChecklistAPI processes
Get-Process -Name ChecklistAPI -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Step 2: Clear All Data from Production Tables

Clear data in reverse dependency order to avoid foreign key constraint violations:

```bash
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -Q "
-- Clear all data in reverse dependency order
DELETE FROM ChecklistItems;
DELETE FROM ChecklistInstances;
DELETE FROM TemplateItems;
DELETE FROM Templates;
DELETE FROM ItemLibraryEntries;
DELETE FROM OperationalPeriods;
DELETE FROM Events;
DELETE FROM EventCategories;
PRINT 'All data cleared';
"
```

### Step 3: Apply EF Core Migrations (If Schema Changed)

If the database schema is out of date (missing tables or columns), apply EF Core migrations:

```bash
cd src/backend/ChecklistAPI

dotnet ef database update --connection "Server=tcp:sql-c5seeder-eastus2.database.windows.net,1433;Initial Catalog=ChecklistPOC;User ID=checklistapp;Password=<PASSWORD>;Encrypt=True;TrustServerCertificate=False;Connection Timeout=60;"
```

**Common Migration Issues:**
- If migrations fail due to data type conversion errors (e.g., string to GUID), you must clear the affected tables first (Step 2)
- If the build is locked, stop any running ChecklistAPI processes (Step 1)

### Step 4: Verify Tables Exist

Confirm all required tables are present:

```bash
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -Q "
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE='BASE TABLE'
ORDER BY TABLE_NAME
"
```

**Expected Tables:**
- `__EFMigrationsHistory`
- `ChecklistInstances`
- `ChecklistItems`
- `EventCategories`
- `Events`
- `ItemLibraryEntries`
- `OperationalPeriods`
- `TemplateItems`
- `Templates`

### Step 5: Run Seed Scripts in Order

Execute seed scripts in the correct dependency order:

```bash
# 1. Events and Event Categories (must be first - other tables reference Events)
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -i "c:\Code\checklist-poc\database\seed-events.sql"

# 2. Templates (independent, but should be before checklists)
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -i "c:\Code\checklist-poc\database\seed-templates.sql"

# 3. Item Library (independent)
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -i "c:\Code\checklist-poc\database\seed-item-library.sql"

# 4. Operational Periods (depends on Events)
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -i "c:\Code\checklist-poc\database\seed-operational-periods.sql"

# 5. Checklists (depends on Templates, Events, and Operational Periods)
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -i "c:\Code\checklist-poc\database\seed-checklists.sql"
```

### Step 6: Verify Seed Data

Confirm data was loaded correctly:

```bash
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -Q "
SELECT 'Events' as TableName, COUNT(*) as RecordCount FROM Events
UNION ALL SELECT 'EventCategories', COUNT(*) FROM EventCategories
UNION ALL SELECT 'Templates', COUNT(*) FROM Templates
UNION ALL SELECT 'TemplateItems', COUNT(*) FROM TemplateItems
UNION ALL SELECT 'ItemLibraryEntries', COUNT(*) FROM ItemLibraryEntries
UNION ALL SELECT 'OperationalPeriods', COUNT(*) FROM OperationalPeriods
UNION ALL SELECT 'ChecklistInstances', COUNT(*) FROM ChecklistInstances
UNION ALL SELECT 'ChecklistItems', COUNT(*) FROM ChecklistItems
"
```

**Expected Record Counts (as of 2025-11-30):**

| Table | Records |
|-------|---------|
| Events | 5 |
| EventCategories | 49 |
| Templates | 3 |
| TemplateItems | 34 |
| ItemLibraryEntries | 36 |
| OperationalPeriods | 3 |
| ChecklistInstances | 4 |
| ChecklistItems | 41 |

## Seed Data Overview

### Events Created

| Event ID | Name | Type | Status |
|----------|------|------|--------|
| `00000000-0000-0000-0000-000000000001` | POC Demo Event | Unplanned | Active |
| `22222222-2222-2222-2222-222222222002` | Hurricane Milton Response | Unplanned | Active |
| `22222222-2222-2222-2222-222222222005` | Wildfire - Northern Region | Unplanned | Active |
| `22222222-2222-2222-2222-222222222004` | EOC Full-Scale Exercise 2025 | Planned | Active |
| `22222222-2222-2222-2222-222222222003` | Earthquake Response | Unplanned | Archived |

### Templates Created

1. **Daily Safety Briefing** - 7 checkbox items (Safety category)
2. **Incident Commander Initial Actions** - 12 mixed items (ICS Forms category)
3. **Emergency Shelter Opening Checklist** - 15 status items (Logistics category)

### Checklists Created

1. **Safety Briefing - Nov 20, 2025** - 42.86% complete (3/7 items)
2. **IC Initial Actions - Hurricane Milton** - 0% complete (new)
3. **Shelter Opening - Oakwood Community Center** - 93.33% complete (14/15 items)
4. **Safety Briefing - Nov 19, 2025 (ARCHIVED)** - 100% complete (for testing archive management)

## Troubleshooting

### "Conversion failed when converting from a character string to uniqueidentifier"

This occurs when applying migrations that change column types (e.g., string EventId to GUID) and there's existing data.

**Solution:** Clear all data from affected tables first (Step 2), then apply migrations.

### "Build failed" when running EF migrations

The ChecklistAPI project may be locked by a running process.

**Solution:**
```powershell
# Find and kill the process
Get-Process -Name ChecklistAPI -ErrorAction SilentlyContinue | Stop-Process -Force

# Or find by port
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

### sqlcmd: "Error occurred while opening or operating on file"

This happens when using Unix-style paths in sqlcmd on Windows.

**Solution:** Use Windows-style paths with escaped backslashes:
```bash
# Wrong
sqlcmd -i /c/Code/checklist-poc/database/seed-events.sql

# Correct
sqlcmd -i "c:\Code\checklist-poc\database\seed-events.sql"
```

### Connection timeout

Azure SQL may take time to wake up if it's been idle.

**Solution:** Increase the connection timeout:
```
Connection Timeout=60;
```

## Quick Reference: One-Liner Scripts

### Clear and Reseed Everything (PowerShell)

```powershell
$server = "sql-c5seeder-eastus2.database.windows.net"
$db = "ChecklistPOC"
$user = "checklistapp"
$pass = "<PASSWORD>"
$baseDir = "c:\Code\checklist-poc"

# Clear data
sqlcmd -S $server -d $db -U $user -P $pass -Q "DELETE FROM ChecklistItems; DELETE FROM ChecklistInstances; DELETE FROM TemplateItems; DELETE FROM Templates; DELETE FROM ItemLibraryEntries; DELETE FROM OperationalPeriods; DELETE FROM Events; DELETE FROM EventCategories;"

# Run seed scripts
@("seed-events.sql", "seed-templates.sql", "seed-item-library.sql", "seed-operational-periods.sql", "seed-checklists.sql") | ForEach-Object {
    Write-Host "Running $_..."
    sqlcmd -S $server -d $db -U $user -P $pass -i "$baseDir\database\$_"
}

Write-Host "Done!"
```

### Verify Production Data (Bash)

```bash
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -U checklistapp -P '<PASSWORD>' -Q "
SELECT 'Total Events: ' + CAST(COUNT(*) AS VARCHAR) FROM Events;
SELECT 'Total Checklists: ' + CAST(COUNT(*) AS VARCHAR) FROM ChecklistInstances;
SELECT 'Active Checklists: ' + CAST(SUM(CASE WHEN IsArchived=0 THEN 1 ELSE 0 END) AS VARCHAR) FROM ChecklistInstances;
"
```

## Related Documentation

- [Azure Deployment Guide](./AZURE_DEPLOYMENT_GUIDE.md) - Full deployment instructions
- [Database Schema](../database/schema.sql) - Complete schema definition
- [CLAUDE.md](../CLAUDE.md) - Development environment setup

# Setting Up Entra ID SQL Access - Manual Steps

## What We've Done Already ✅

1. ✅ Created SQL Database: `ChecklistPOC`
2. ✅ Created Web App: `checklist-poc-app`
3. ✅ Enabled managed identity on Web App
   - **Principal ID:** `58895d85-8f1a-468a-8444-c362398e90d2`
   - **Identity Name:** `checklist-poc-app`

## What You Need to Do (5 minutes)

### Option 1: Using Azure Portal Query Editor (Easiest)

1. **Go to Azure Portal:** https://portal.azure.com

2. **Navigate to your SQL Database:**
   - Search for "SQL databases"
   - Click on **ChecklistPOC**

3. **Open Query Editor:**
   - In the left menu, click **Query editor (preview)**
   - Click **Continue as tbull@dynamis.com** (uses your Entra ID)

4. **Run this SQL script:**

```sql
-- Create user for the managed identity
CREATE USER [checklist-poc-app] FROM EXTERNAL PROVIDER;

-- Grant necessary permissions
ALTER ROLE db_datareader ADD MEMBER [checklist-poc-app];
ALTER ROLE db_datawriter ADD MEMBER [checklist-poc-app];
ALTER ROLE db_ddladmin ADD MEMBER [checklist-poc-app];

-- Grant additional permissions for EF Core migrations
GRANT CREATE TABLE TO [checklist-poc-app];
GRANT ALTER ON SCHEMA::dbo TO [checklist-poc-app];
GRANT EXECUTE TO [checklist-poc-app];
GRANT VIEW DEFINITION TO [checklist-poc-app];

-- Verify it worked
SELECT
    dp.name AS UserName,
    dp.type_desc AS UserType,
    r.name AS RoleName
FROM sys.database_principals dp
LEFT JOIN sys.database_role_members drm ON dp.principal_id = drm.member_principal_id
LEFT JOIN sys.database_principals r ON drm.role_principal_id = r.principal_id
WHERE dp.name = 'checklist-poc-app';
```

5. **Click "Run"**

6. **Verify:** You should see output showing the user and roles assigned

---

### Option 2: Using SQL Server Management Studio (SSMS)

1. **Open SSMS**

2. **Connect to SQL Server:**
   - Server: `sql-c5seeder-eastus2.database.windows.net`
   - Authentication: **Azure Active Directory - Universal with MFA**
   - Login: `tbull@dynamis.com`
   - Database: `ChecklistPOC`

3. **Run the SQL script** from Option 1

---

### Option 3: Using Azure Data Studio

1. **Open Azure Data Studio**

2. **New Connection:**
   - Server: `sql-c5seeder-eastus2.database.windows.net`
   - Authentication: **Azure Active Directory - Universal**
   - Account: `tbull@dynamis.com`
   - Database: `ChecklistPOC`

3. **Run the SQL script** from Option 1

---

### Option 4: Using sqlcmd with Interactive Auth

```powershell
# Install sqlcmd if not already installed
winget install Microsoft.SQLCmd

# Connect with interactive auth
sqlcmd -S sql-c5seeder-eastus2.database.windows.net -d ChecklistPOC -G -U tbull@dynamis.com

# Then paste and run the SQL script
```

---

## Why This Step is Needed

Azure doesn't allow granting SQL permissions via Azure CLI or PowerShell for security reasons. You must be authenticated as a SQL admin (which you are via Entra ID) to grant permissions to the managed identity.

**This is a one-time setup** - once done, the app will automatically authenticate using its managed identity.

---

## What Happens After This

Once you've run the SQL script:

1. The Web App's managed identity will have access to the database
2. No passwords needed - completely secure
3. We'll configure the connection string to use Entra ID
4. Deploy the app with `.\deploy.ps1`

---

## Troubleshooting

### Error: "User already exists"
This means the user was already created. Just run the GRANT statements:

```sql
ALTER ROLE db_datareader ADD MEMBER [checklist-poc-app];
ALTER ROLE db_datawriter ADD MEMBER [checklist-poc-app];
ALTER ROLE db_ddladmin ADD MEMBER [checklist-poc-app];
GRANT CREATE TABLE TO [checklist-poc-app];
GRANT ALTER ON SCHEMA::dbo TO [checklist-poc-app];
GRANT EXECUTE TO [checklist-poc-app];
GRANT VIEW DEFINITION TO [checklist-poc-app];
```

### Error: "Cannot authenticate"
Make sure you're connecting to the **ChecklistPOC** database specifically, not the master database.

### Error: "Permission denied"
Make sure you're logged in as `tbull@dynamis.com` (the Entra ID admin).

---

## After Running the SQL Script

**Let me know when done** and I'll:
1. Configure the Entra ID connection string
2. Update the backend code to use Managed Identity
3. Deploy the application

---

**Estimated time:** 2-5 minutes depending on which tool you use.

**Recommended:** Use Azure Portal Query Editor (Option 1) - it's the easiest!
